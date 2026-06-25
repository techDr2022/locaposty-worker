// import { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma";

/**
 * Register Pub/Sub notifications for a Google Business Profile account
 * @param googleAccountId - The GoogleAccount ID in our database
 * @param gmbAccountId - The GMB account ID from Google (e.g., "accounts/123456789")
 * @returns Promise<boolean> - Success status
 */

export async function registerGBPNotifications(
  googleAccountId: string,
  gmbAccountId: string,
  accessToken: string
): Promise<boolean> {
  try {
    console.log(
      `Registering Pub/Sub notifications for account: ${gmbAccountId}`
    );

    // Ensure accountId has the correct format
    const accountId = gmbAccountId.startsWith("accounts/")
      ? gmbAccountId
      : `accounts/${gmbAccountId}`;

    const apiUrl = `https://mybusinessnotifications.googleapis.com/v1/${accountId}/notificationSetting?updateMask=pubsub_topic,notification_types`;
    console.log(apiUrl);
    console.log(accessToken);

    const payload = {
      name: `${accountId}/notificationSetting`,
      notificationTypes: ["NEW_REVIEW", "UPDATED_REVIEW"],
      pubsubTopic: "projects/gmb-scheduling-450909/topics/gbp-reviews-topic",
    };

    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to register notifications for ${accountId}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Failed to register notifications: ${response.status} ${response.statusText}`
      );
    }

    const responseData = await response.json();
    console.log(
      `Successfully registered notifications for ${accountId}:`,
      responseData
    );

    // Update the GoogleAccount record to mark notifications as registered
    await prisma.googleAccount.update({
      where: { id: googleAccountId },
      data: {
        notificationRegistered: true,
        notificationRegisteredAt: new Date(),
      },
    });

    console.log(
      `Updated GoogleAccount ${googleAccountId} with notification status`
    );
    return true;
  } catch (error) {
    console.error(
      `Error registering notifications for account ${gmbAccountId}:`,
      error
    );
    throw error;
  }
}

/**
 * Unregister Pub/Sub notifications for a Google Business Profile account
 * @param googleAccountId - The GoogleAccount ID in our database
 * @param gmbAccountId - The GMB account ID from Google (e.g., "accounts/123456789")
 * @param accessToken - Valid Google access token
 * @returns Promise<boolean> - Success status
 */
export async function unregisterGBPNotifications(
  googleAccountId: string,
  gmbAccountId: string,
  accessToken: string
): Promise<boolean> {
  try {
    console.log(
      `Unregistering Pub/Sub notifications for account: ${gmbAccountId}`
    );

    // Ensure accountId has the correct format
    const accountId = gmbAccountId.startsWith("accounts/")
      ? gmbAccountId
      : `accounts/${gmbAccountId}`;

    // Try to clear notifications by setting notificationTypes to empty array
    // First attempt: only update notification_types
    const apiUrl = `https://mybusinessnotifications.googleapis.com/v1/${accountId}/notificationSetting?updateMask=notification_types`;

    const payload = {
      name: `${accountId}/notificationSetting`,
      notificationTypes: [],
    };

    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Handle 404 gracefully - if notifications aren't registered, that's fine
    if (response.status === 404) {
      console.log(
        `Notifications not found for ${accountId}, treating as already unregistered`
      );
      // Still update the database to mark as unregistered
      await prisma.googleAccount.update({
        where: { id: googleAccountId },
        data: {
          notificationRegistered: false,
          notificationRegisteredAt: null,
        },
      });
      return true;
    }

    if (!response.ok) {
      const errorText = await response.text();

      // Handle specific error cases gracefully
      if (response.status === 400) {
        try {
          const errorData = JSON.parse(errorText);
          const errorReason = errorData?.error?.details?.[0]?.reason;

          // If the error is about sharing pubsub topic across versions, this is acceptable
          // The notificationTypes being empty effectively disables notifications
          if (errorReason === "SHARES_PUBSUB_TOPIC_MESSAGE_ACROSS_VERSIONS") {
            console.log(
              `Pubsub topic shared across versions for ${accountId}, but notifications are effectively disabled`
            );
            // Update the database to mark as unregistered since notificationTypes is empty
            await prisma.googleAccount.update({
              where: { id: googleAccountId },
              data: {
                notificationRegistered: false,
                notificationRegisteredAt: null,
              },
            });
            return true;
          }
        } catch (parseError) {
          // If we can't parse the error, continue with normal error handling
        }
      }

      console.error(`Failed to unregister notifications for ${accountId}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Failed to unregister notifications: ${response.status} ${response.statusText}`
      );
    }

    const responseData = await response.json();
    console.log(
      `Successfully unregistered notifications for ${accountId}:`,
      responseData
    );

    // Update the GoogleAccount record to mark notifications as unregistered
    await prisma.googleAccount.update({
      where: { id: googleAccountId },
      data: {
        notificationRegistered: false,
        notificationRegisteredAt: null,
      },
    });

    console.log(
      `Updated GoogleAccount ${googleAccountId} with notification status`
    );
    return true;
  } catch (error) {
    console.error(
      `Error unregistering notifications for account ${gmbAccountId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get notification registration status for a Google Account
 * @param googleAccountId - The GoogleAccount ID in our database
 * @returns Promise<{registered: boolean, registeredAt: Date | null}>
 */
export async function getNotificationStatus(googleAccountId: string): Promise<{
  registered: boolean;
  registeredAt: Date | null;
}> {
  const googleAccount = await prisma.googleAccount.findUnique({
    where: { id: googleAccountId },
    select: {
      notificationRegistered: true,
      notificationRegisteredAt: true,
    },
  });

  if (!googleAccount) {
    throw new Error(`GoogleAccount ${googleAccountId} not found`);
  }

  return {
    registered: googleAccount.notificationRegistered,
    registeredAt: googleAccount.notificationRegisteredAt,
  };
}
