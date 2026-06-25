import { prisma } from "./prisma";
import { refreshLocationToken } from "./refreshLocationToken";

/**
 * Post a reply to Google Business Profile
 * @param reviewReplyId - The ReviewReply ID to post
 * @returns Promise<{success: boolean, error?: string}>
 */
export async function postReplyToGoogle(reviewReplyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`Posting reply to Google for ReviewReply: ${reviewReplyId}`);

    // Fetch the reply with review and location
    const reply = await prisma.reviewReply.findUnique({
      where: { id: reviewReplyId },
      include: {
        review: {
          include: {
            location: {
              include: {
                googleAccount: true,
              },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new Error(`ReviewReply ${reviewReplyId} not found`);
    }

    if (reply.isPublished) {
      console.log(`Reply ${reviewReplyId} is already published`);
      return {
        success: true,
      };
    }

    const { review } = reply;
    const { location } = review;

    // Check if location has required GMB data
    if (!location.gmbAccountId || !location.gmbLocationId) {
      throw new Error(
        `Location ${location.id} missing GMB account or location ID`
      );
    }

    // Get fresh access token for the location
    let accessToken: string;
    try {
      accessToken = await refreshLocationToken(location.id);
    } catch (tokenError) {
      console.error(
        `Token refresh failed for location ${location.id}:`,
        tokenError
      );
      throw new Error(
        `Authentication failed for location ${location.id}. Please reconnect the location.`
      );
    }

    // Construct the API URL
    const accountId = location.gmbAccountId.startsWith("accounts/")
      ? location.gmbAccountId.replace("accounts/", "")
      : location.gmbAccountId;

    const locationId = location.gmbLocationId.startsWith("locations/")
      ? location.gmbLocationId.replace("locations/", "")
      : location.gmbLocationId;

    const apiUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${review.reviewId}/reply`;

    console.log(`Posting to Google API: ${apiUrl}`);

    // Post the reply to Google
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: reply.content,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to post reply to Google:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        apiUrl,
      });
      throw new Error(
        `Failed to post reply to Google: ${response.status} ${response.statusText}`
      );
    }

    const responseData = await response.json();
    console.log(`Successfully posted reply to Google:`, responseData);

    // Update the reply record as published
    await prisma.reviewReply.update({
      where: { id: reviewReplyId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        source: "AUTO_POSTED",
      },
    });

    // Update the review status
    await prisma.review.update({
      where: { id: review.id },
      data: {
        status: "REPLIED",
      },
    });

    console.log(`Updated reply ${reviewReplyId} as published`);
    return {
      success: true,
    };
  } catch (error) {
    console.error(
      `Error posting reply to Google for ReviewReply ${reviewReplyId}:`,
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Post multiple replies to Google Business Profile
 * @param reviewReplyIds - Array of ReviewReply IDs to post
 * @returns Promise<{success: boolean, results: Array<{replyId: string, success: boolean, error?: string}>}>
 */
export async function postMultipleRepliesToGoogle(
  reviewReplyIds: string[]
): Promise<{
  success: boolean;
  results: Array<{
    replyId: string;
    success: boolean;
    error?: string;
  }>;
}> {
  console.log(`Posting ${reviewReplyIds.length} replies to Google`);

  const results = await Promise.allSettled(
    reviewReplyIds.map(async (replyId) => {
      const result = await postReplyToGoogle(replyId);
      return {
        replyId,
        success: result.success,
        error: result.error,
      };
    })
  );

  const processedResults = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        replyId: reviewReplyIds[index],
        success: false,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown error",
      };
    }
  });

  const successCount = processedResults.filter((r) => r.success).length;
  const overallSuccess = successCount === reviewReplyIds.length;

  console.log(
    `Posted ${successCount}/${reviewReplyIds.length} replies successfully`
  );

  return {
    success: overallSuccess,
    results: processedResults,
  };
}

/**
 * Check if a reply can be posted (not already published and has valid content)
 * @param reviewReplyId - The ReviewReply ID to check
 * @returns Promise<{canPost: boolean, reason?: string}>
 */
export async function canPostReply(reviewReplyId: string): Promise<{
  canPost: boolean;
  reason?: string;
}> {
  try {
    const reply = await prisma.reviewReply.findUnique({
      where: { id: reviewReplyId },
      include: {
        review: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!reply) {
      return {
        canPost: false,
        reason: "Reply not found",
      };
    }

    if (reply.isPublished) {
      return {
        canPost: false,
        reason: "Reply already published",
      };
    }

    if (!reply.content || reply.content.trim().length === 0) {
      return {
        canPost: false,
        reason: "Reply content is empty",
      };
    }

    if (
      !reply.review.location.gmbAccountId ||
      !reply.review.location.gmbLocationId
    ) {
      return {
        canPost: false,
        reason: "Location missing GMB account or location ID",
      };
    }

    return {
      canPost: true,
    };
  } catch (error) {
    console.error(`Error checking if reply can be posted:`, error);
    return {
      canPost: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
