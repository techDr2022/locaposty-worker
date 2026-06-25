import { checkPostLimit } from "@/lib/post-limits";
import { QuotaPreflightResult } from "@/lib/posts/bulk/types";

export async function preflightBulkQuota(
  userId: string,
  locationId: string,
  requestedCount: number,
): Promise<QuotaPreflightResult> {
  const limitCheck = await checkPostLimit(userId, locationId);

  if (!limitCheck.verificationValid || !limitCheck.canCreate) {
    return {
      ok: false,
      reason: limitCheck.verificationReason || "Subscription check failed.",
      postsThisMonth: limitCheck.postsThisMonth,
      postLimit: limitCheck.postLimit,
      remainingPosts: limitCheck.remainingPosts,
    };
  }

  if (requestedCount > limitCheck.remainingPosts) {
    return {
      ok: false,
      reason: `Not enough remaining post quota. Requested ${requestedCount}, remaining ${limitCheck.remainingPosts}.`,
      postsThisMonth: limitCheck.postsThisMonth,
      postLimit: limitCheck.postLimit,
      remainingPosts: limitCheck.remainingPosts,
    };
  }

  return {
    ok: true,
    postsThisMonth: limitCheck.postsThisMonth,
    postLimit: limitCheck.postLimit,
    remainingPosts: limitCheck.remainingPosts,
  };
}
