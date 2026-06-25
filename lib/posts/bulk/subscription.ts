import { SubscriptionPlan } from "@/lib/generated/prisma";
import { verifySubscription } from "@/lib/subscription-verification";
import { PlanEligibilityResult } from "@/lib/posts/bulk/types";

const BULK_ALLOWED_PLANS = new Set<SubscriptionPlan>([
  SubscriptionPlan.PREMIUM,
  SubscriptionPlan.ENTERPRISE,
]);

export async function verifyBulkPlanEligibility(
  userId: string,
): Promise<PlanEligibilityResult> {
  const verification = await verifySubscription(userId);
  const plan = verification.subscription?.plan ?? null;
  const status = verification.subscription?.status ?? null;

  if (!verification.valid) {
    return {
      allowed: false,
      reason: verification.reason || "Active subscription required.",
      plan,
      status,
    };
  }

  if (!plan || !BULK_ALLOWED_PLANS.has(plan)) {
    return {
      allowed: false,
      reason:
        "Bulk AI scheduling is available only on PREMIUM and ENTERPRISE plans.",
      plan,
      status,
    };
  }

  return { allowed: true, plan, status };
}
