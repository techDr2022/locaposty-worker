import { Job } from "bullmq";
import { SubscriptionPlan } from "../generated/prisma";
import { generateAIReply } from "../generateAIReply";
import { postReplyToGoogle } from "../postReplyToGoogle";
import { prisma } from "../prisma";
import type { ProcessReviewJobData } from "../queue";
import { refreshLocationToken } from "../refreshLocationToken";
import { safeDb } from "../safeDb";
import { verifySubscription } from "../subscription-verification";

function parseRating(starRating: string | undefined): number {
  switch (starRating) {
    case "FIVE":
      return 5;
    case "FOUR":
      return 4;
    case "THREE":
      return 3;
    case "TWO":
      return 2;
    case "ONE":
      return 1;
    default:
      return 0;
  }
}

export async function processReview(
  job: Job<ProcessReviewJobData>,
): Promise<void> {
  const { reviewPath, eventType, messageId } = job.data;
  console.log(
    `[review-worker] process-review messageId=${messageId} path=${reviewPath}`,
  );

  const parts = reviewPath.split("/");
  if (
    parts.length !== 6 ||
    parts[0] !== "accounts" ||
    parts[2] !== "locations" ||
    parts[4] !== "reviews"
  ) {
    throw new Error(`Invalid review path format: ${reviewPath}`);
  }

  const accountId = parts[1];
  const locationId = parts[3];
  const reviewId = parts[5];

  const locations = await safeDb(() =>
    prisma.location.findMany({
      where: {
        gmbAccountId: `accounts/${accountId}`,
        gmbLocationId: locationId,
      },
      include: { googleAccount: { include: { user: true } } },
    }),
  );

  if (!locations.length) {
    console.warn(
      `[review-worker] No locations found for account=${accountId} location=${locationId}`,
    );
    return;
  }

  const reviewApiUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}`;

  let reviewData: Record<string, unknown> | null = null;
  for (const candidateLocation of locations) {
    try {
      const accessToken = await refreshLocationToken(candidateLocation.id);
      const response = await fetch(reviewApiUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        console.error(
          `[review-worker] Failed to fetch review: ${response.status}`,
          candidateLocation.id,
        );
        continue;
      }
      reviewData = (await response.json()) as Record<string, unknown>;
      break;
    } catch (err) {
      console.error(
        `[review-worker] Token/fetch error for location ${candidateLocation.id}:`,
        err,
      );
    }
  }

  if (!reviewData) {
    throw new Error(
      `Failed to fetch review data from Google for path ${reviewPath}`,
    );
  }

  const rating = parseRating(reviewData.starRating as string | undefined);
  const authorName =
    (reviewData.reviewer as { displayName?: string } | undefined)
      ?.displayName || "Anonymous";
  const authorPhoto =
    (reviewData.reviewer as { profilePhotoUrl?: string } | undefined)
      ?.profilePhotoUrl || null;
  const comment = (reviewData.comment as string | null | undefined) || null;
  const createTime = new Date(
    (reviewData.createTime as string | undefined) || new Date().toISOString(),
  );
  const updateTime = new Date(
    (reviewData.updateTime as string | undefined) ||
      (reviewData.createTime as string | undefined) ||
      new Date().toISOString(),
  );

  for (const location of locations) {
    console.log(
      `[review-worker] Processing review for location ${location.id} (${location.name})`,
    );

    const locationUserId = location.googleAccount?.user?.id;
    if (!locationUserId) {
      console.warn(
        `[review-worker] Location ${location.id} has no associated user, skipping`,
      );
      continue;
    }

    const review = await safeDb(() =>
      prisma.review.upsert({
        where: { reviewId_locationId: { reviewId, locationId: location.id } },
        update: {
          authorName,
          authorPhoto,
          rating,
          comment,
          updateTime,
          isProcessed: false,
          sentiment: null,
        },
        create: {
          locationId: location.id,
          reviewId,
          authorName,
          authorPhoto,
          rating,
          comment,
          createTime,
          updateTime,
          status: "PENDING",
          isProcessed: false,
        },
      }),
    );

    const verification = await verifySubscription(
      locationUserId,
      SubscriptionPlan.PREMIUM,
    );
    if (!verification.valid) {
      console.warn(
        `[review-worker] Subscription check failed for user ${locationUserId}: ${verification.reason}`,
      );
      continue;
    }

    if (!comment || comment.trim().length === 0) {
      console.log(
        `[review-worker] Review ${review.id} has no comment, skipping AI reply`,
      );
      continue;
    }

    console.log(`[review-worker] Generating AI reply for review ${review.id}`);
    const aiResult = await generateAIReply(review.id, locationUserId);

    if (!aiResult.success || !aiResult.replyId) {
      console.error(
        `[review-worker] AI reply failed for review ${review.id}: ${aiResult.error}`,
      );
      continue;
    }

    console.log(`[review-worker] AI reply generated: ${aiResult.replyId}`);

    const replySettings =
      (await safeDb(() =>
        prisma.locationReplySettings.findFirst({
          where: { userId: locationUserId, locationId: location.id },
        }),
      )) ??
      (await safeDb(() =>
        prisma.locationReplySettings.findFirst({
          where: { userId: locationUserId, isGlobal: true },
        }),
      ));

    if (!replySettings) {
      console.log(
        `[review-worker] No reply settings for location ${location.id}, skipping auto-post`,
      );
      continue;
    }
    if (!replySettings.autoReplyEnabled) {
      console.log(
        `[review-worker] Auto-reply disabled for location ${location.id}`,
      );
      continue;
    }
    if (
      rating < replySettings.minStarReply ||
      rating > replySettings.maxStarReply
    ) {
      console.log(
        `[review-worker] Rating ${rating} outside range [${replySettings.minStarReply}, ${replySettings.maxStarReply}], skipping`,
      );
      continue;
    }

    console.log(`[review-worker] Auto-posting reply for review ${review.id}`);
    const postResult = await postReplyToGoogle(aiResult.replyId);
    if (!postResult.success) {
      console.error(`[review-worker] Auto-post failed: ${postResult.error}`);
    }
  }

  console.log(`[review-worker] process-review done — eventType=${eventType}`);
}
