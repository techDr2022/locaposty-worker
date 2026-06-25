import { prisma } from "./prisma";
import { SubscriptionPlan, SubscriptionStatus } from "./generated/prisma";
import {
  getActiveSubscription,
  subscriptionHasAccess,
} from "./subscription-utils";

export interface SubscriptionVerificationResult {
  valid: boolean;
  reason?: string;
  subscription?: {
    status: SubscriptionStatus | null;
    plan: SubscriptionPlan | null;
    trialStartedAt: Date | null;
    trialEndsAt: Date | null;
  };
}

/**
 * Verifies user subscription status from database (source of truth)
 * Never trust session tokens for authorization - always verify from DB
 *
 * @param userId - User ID to verify
 * @param requiredPlan - Optional: Required subscription plan
 * @param requiredStatuses - Optional: Required subscription statuses (default: ACTIVE, TRIALING)
 * @returns Verification result with subscription details
 */
export async function verifySubscription(
  userId: string,
  requiredPlan?: SubscriptionPlan,
  requiredStatuses?: SubscriptionStatus[]
): Promise<SubscriptionVerificationResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return { valid: false, reason: "User not found" };
    }

    // Get active subscription (ACTIVE, TRIALING, or CANCELED with valid currentPeriodEnd)
    const subscription = getActiveSubscription(user);

    // Default to requiring active, trialing, or canceled (with access) subscriptions
    const validStatuses = requiredStatuses || [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.CANCELED, // CANCELED is valid if currentPeriodEnd hasn't passed
    ];

    // Check if subscription exists and has access
    // For CANCELED subscriptions, we need to check currentPeriodEnd
    const hasAccess = subscription
      ? subscription.status === SubscriptionStatus.CANCELED
        ? subscription.currentPeriodEnd &&
          new Date() <= new Date(subscription.currentPeriodEnd)
        : validStatuses.includes(subscription.status)
      : false;

    if (!subscription || !hasAccess) {
      // Provide specific error messages for different invalid statuses
      let reason = `Subscription status must be one of: ${validStatuses.join(", ")}`;
      if (!subscription) {
        reason = "No active subscription. Please subscribe to access features.";
      } else if (subscription.status === SubscriptionStatus.PENDING) {
        reason =
          "Payment pending. Your subscription will be activated once payment is confirmed.";
      } else if (subscription.status === SubscriptionStatus.SUSPENDED) {
        reason =
          "Subscription suspended. Please update your payment method to reactivate.";
      } else if (subscription.status === SubscriptionStatus.PAST_DUE) {
        reason =
          "Trial period has ended. Please upgrade to continue using features.";
      } else if (subscription.status === SubscriptionStatus.EXPIRED) {
        reason =
          "Subscription expired. Please renew to continue using features.";
      } else if (subscription.status === SubscriptionStatus.CANCELED) {
        // Check if access period has ended
        if (
          subscription.currentPeriodEnd &&
          new Date() <= new Date(subscription.currentPeriodEnd)
        ) {
          // This shouldn't happen as getActiveSubscription should filter this
          reason =
            "Your subscription access will end on " +
            new Date(subscription.currentPeriodEnd).toLocaleDateString();
        } else {
          reason =
            "Subscription canceled. Your access period has ended. Please reactivate to continue using features.";
        }
      } else if (subscription.status === SubscriptionStatus.INACTIVE) {
        reason = "No active subscription. Please subscribe to access features.";
      }

      return {
        valid: false,
        reason,
        subscription: subscription
          ? {
              status: subscription.status,
              plan: subscription.plan,
              trialStartedAt: subscription.trialStartedAt,
              trialEndsAt: subscription.trialEndsAt,
            }
          : {
              status: null,
              plan: null,
              trialStartedAt: null,
              trialEndsAt: null,
            },
      };
    }

    // Check if trial has expired; if so, persist EXPIRED in the database
    if (
      subscription.status === SubscriptionStatus.TRIALING &&
      subscription.trialEndsAt
    ) {
      const now = new Date();
      const trialEnd = new Date(subscription.trialEndsAt);

      if (now > trialEnd) {
        // Persist status change to EXPIRED in the database
        try {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.EXPIRED },
          });
        } catch (error) {
          console.error(
            "Error updating subscription status to EXPIRED in verifySubscription:",
            error
          );
        }

        return {
          valid: false,
          reason: "Trial period has expired",
          subscription: {
            status: SubscriptionStatus.EXPIRED,
            plan: subscription.plan,
            trialStartedAt: subscription.trialStartedAt,
            trialEndsAt: subscription.trialEndsAt,
          },
        };
      }
    }

    // Check if specific plan is required
    if (requiredPlan) {
      if (!subscription.plan || subscription.plan !== requiredPlan) {
        // Check if user has a higher tier plan (e.g., ENTERPRISE > PREMIUM > BASIC)
        const planHierarchy: Record<SubscriptionPlan, number> = {
          [SubscriptionPlan.BASIC]: 1,
          [SubscriptionPlan.PREMIUM]: 2,
          [SubscriptionPlan.ENTERPRISE]: 3,
        };

        const userPlanLevel = subscription.plan
          ? planHierarchy[subscription.plan]
          : 0;
        const requiredPlanLevel = planHierarchy[requiredPlan];

        if (userPlanLevel < requiredPlanLevel) {
          return {
            valid: false,
            reason: `This feature requires ${requiredPlan} plan or higher`,
            subscription: {
              status: subscription.status,
              plan: subscription.plan,
              trialStartedAt: subscription.trialStartedAt,
              trialEndsAt: subscription.trialEndsAt,
            },
          };
        }
      }
    }

    return {
      valid: true,
      subscription: {
        status: subscription.status,
        plan: subscription.plan,
        trialStartedAt: subscription.trialStartedAt,
        trialEndsAt: subscription.trialEndsAt,
      },
    };
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return { valid: false, reason: "Failed to verify subscription" };
  }
}

/**
 * Checks if user has access to a specific feature based on plan
 * This is a convenience wrapper around verifySubscription
 */
export async function hasFeatureAccess(
  userId: string,
  requiredPlan: SubscriptionPlan
): Promise<boolean> {
  const result = await verifySubscription(userId, requiredPlan);
  return result.valid;
}
