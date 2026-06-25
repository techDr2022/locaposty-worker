import { SubscriptionStatus, SubscriptionPlan } from "./generated/prisma";
import { prisma } from "./prisma";

/**
 * User type with subscriptions array
 */
type UserWithSubscriptions = {
  subscriptions: Array<{
    id: string;
    status: SubscriptionStatus;
    plan: SubscriptionPlan | null;
    razorpaySubscriptionId: string | null;
    createdAt: Date;
    trialStartedAt: Date | null;
    trialEndsAt: Date | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    [key: string]: unknown;
  }>;
};

/**
 * Check if a subscription should have access based on status and currentPeriodEnd
 * CANCELED subscriptions have access until currentPeriodEnd
 */
export function subscriptionHasAccess(
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  } | null
): boolean {
  if (!subscription) {
    return false;
  }

  // ACTIVE and TRIALING always have access
  if (
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.TRIALING
  ) {
    return true;
  }

  // CANCELED subscriptions have access until currentPeriodEnd
  if (subscription.status === SubscriptionStatus.CANCELED) {
    if (!subscription.currentPeriodEnd) {
      return false; // No end date means no access
    }
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    return now <= periodEnd; // Access if currentPeriodEnd hasn't passed
  }

  return false;
}

/**
 * Get the active subscription for a user
 * Returns the subscription with ACTIVE, TRIALING, or CANCELED (if currentPeriodEnd hasn't passed) status
 * TRIALING is considered as active since users in trial have full access
 * CANCELED subscriptions are considered active if currentPeriodEnd hasn't passed
 */
export function getActiveSubscription(user: UserWithSubscriptions | null) {
  if (!user || !user.subscriptions) {
    return null;
  }

  // First, try to find ACTIVE or TRIALING subscriptions
  const activeOrTrialing = user.subscriptions.find(
    (sub) =>
      sub.status === SubscriptionStatus.ACTIVE ||
      sub.status === SubscriptionStatus.TRIALING
  );

  if (activeOrTrialing) {
    return activeOrTrialing;
  }

  // If no ACTIVE or TRIALING, check for CANCELED with valid currentPeriodEnd
  const canceledWithAccess = user.subscriptions.find(
    (sub) =>
      sub.status === SubscriptionStatus.CANCELED && subscriptionHasAccess(sub)
  );

  return canceledWithAccess || null;
}

/**
 * Get the most recent subscription for a user
 * Returns the subscription with the latest createdAt date, or null if none exists
 */
export function getMostRecentSubscription(user: UserWithSubscriptions | null) {
  if (!user || !user.subscriptions || user.subscriptions.length === 0) {
    return null;
  }
  return (
    user.subscriptions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0] || null
  );
}

/**
 * Find subscription by Razorpay subscription ID
 * Returns the subscription matching the Razorpay ID, or null if not found
 */
export function getSubscriptionByRazorpayId(
  user: UserWithSubscriptions | null,
  razorpaySubscriptionId: string
) {
  if (!user || !user.subscriptions) {
    return null;
  }
  return (
    user.subscriptions.find(
      (sub) => sub.razorpaySubscriptionId === razorpaySubscriptionId
    ) || null
  );
}

/**
 * Get subscription for display/authorization purposes
 * Returns active subscription if available, otherwise most recent subscription
 */
export function getSubscriptionForUser(user: UserWithSubscriptions | null) {
  const active = getActiveSubscription(user);
  if (active) {
    return active;
  }
  return getMostRecentSubscription(user);
}

/**
 * Check if a trial has expired and update subscription status to EXPIRED
 * This is a common helper function to handle trial expiry logic consistently
 *
 * @param subscriptionId - The subscription ID to check and update
 * @param trialEndsAt - The trial end date (optional, will be fetched if not provided)
 * @returns Promise<boolean> - Returns true if trial was expired and status was updated, false otherwise
 */
export async function checkAndUpdateExpiredTrial(
  subscriptionId: string,
  trialEndsAt?: Date | null
): Promise<boolean> {
  try {
    // Fetch subscription if trialEndsAt is not provided
    if (!trialEndsAt) {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        select: {
          status: true,
          trialEndsAt: true,
        },
      });

      if (!subscription) {
        console.error(`Subscription ${subscriptionId} not found`);
        return false;
      }

      // Only check if subscription is in TRIALING status
      if (subscription.status !== SubscriptionStatus.TRIALING) {
        return false;
      }

      trialEndsAt = subscription.trialEndsAt;
    }

    // Check if trial has expired
    if (!trialEndsAt) {
      return false;
    }

    const now = new Date();
    const trialEnd = new Date(trialEndsAt);

    if (now > trialEnd) {
      // Trial has expired, update status to EXPIRED
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: SubscriptionStatus.EXPIRED },
      });
      console.log(
        `Updated expired TRIALING subscription ${subscriptionId} to EXPIRED`
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error(
      `Failed to check/update expired trial for subscription ${subscriptionId}:`,
      error
    );
    return false;
  }
}

/**
 * Check and update all expired trials for a user
 * This helper function processes all TRIALING subscriptions for a user and updates expired ones to EXPIRED
 *
 * @param userId - The user ID to check subscriptions for
 * @returns Promise<number> - Returns the number of subscriptions updated
 */
export async function checkAndUpdateAllExpiredTrials(
  userId: string
): Promise<number> {
  try {
    const now = new Date();

    // Find all TRIALING subscriptions for the user
    const trialingSubscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        status: SubscriptionStatus.TRIALING,
        trialEndsAt: {
          not: null,
        },
      },
    });

    let updatedCount = 0;

    // Check each subscription and update if expired
    for (const subscription of trialingSubscriptions) {
      if (
        subscription.trialEndsAt &&
        new Date(subscription.trialEndsAt) <= now
      ) {
        try {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.EXPIRED },
          });
          console.log(
            `Updated expired TRIALING subscription ${subscription.id} to EXPIRED`
          );
          updatedCount++;
        } catch (error) {
          console.error(
            `Failed to update expired TRIALING subscription ${subscription.id}:`,
            error
          );
        }
      }
    }

    return updatedCount;
  } catch (error) {
    console.error(
      `Failed to check/update expired trials for user ${userId}:`,
      error
    );
    return 0;
  }
}
