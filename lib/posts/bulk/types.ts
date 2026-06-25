import { SubscriptionPlan, SubscriptionStatus } from "@/lib/generated/prisma";

export interface BulkGeneratedPost {
  num: number;
  topic: string;
  intent: string;
  primary_keyword: string;
  content: string;
}

export interface BulkScheduleInput {
  locationId: string;
  startDate: string;
  timeOfDay: string;
  count: number;
  timezone?: string;
  cadence?: "DAILY";
}

export interface PlanEligibilityResult {
  allowed: boolean;
  reason?: string;
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus | null;
}

export interface QuotaPreflightResult {
  ok: boolean;
  reason?: string;
  postsThisMonth: number;
  postLimit: number;
  remainingPosts: number;
}

export interface ScheduleConflict {
  postId: string;
  scheduledAt: string;
  status: string;
  title: string;
}
