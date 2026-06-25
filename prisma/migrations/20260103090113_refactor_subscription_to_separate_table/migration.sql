/*
  Warnings:

  - The values [GRACE] on the enum `SubscriptionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `currentPeriodEnd` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `currentPeriodStart` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `razorpayCustomerId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `razorpayOrderId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `razorpayPaymentId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionPlan` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStatus` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `trialEndsAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `trialStartedAt` on the `User` table. All the data in the column will be lost.

*/
-- Step 1: Update any GRACE values to PENDING before removing the enum value
UPDATE "public"."User" SET "subscriptionStatus" = 'PENDING' WHERE "subscriptionStatus" = 'GRACE';

-- Step 2: Update enum to remove GRACE
BEGIN;
CREATE TYPE "public"."SubscriptionStatus_new" AS ENUM ('INACTIVE', 'TRIALING', 'PENDING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED', 'EXPIRED');
ALTER TABLE "public"."User" ALTER COLUMN "subscriptionStatus" DROP DEFAULT;
ALTER TABLE "public"."User" ALTER COLUMN "subscriptionStatus" TYPE "public"."SubscriptionStatus_new" USING ("subscriptionStatus"::text::"public"."SubscriptionStatus_new");
ALTER TYPE "public"."SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "public"."SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "public"."SubscriptionStatus_old";
COMMIT;

-- Step 3: Create Subscription table first
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razorpaySubscriptionId" TEXT,
    "razorpayCustomerId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpayOrderId" TEXT,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "plan" "public"."SubscriptionPlan",
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "paymentMethodType" TEXT,
    "paymentMethodLast4" TEXT,
    "paymentMethodBrand" TEXT,
    "paymentMethodNetwork" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create indexes for Subscription
CREATE UNIQUE INDEX "Subscription_userId_key" ON "public"."Subscription"("userId");
CREATE UNIQUE INDEX "Subscription_razorpaySubscriptionId_key" ON "public"."Subscription"("razorpaySubscriptionId");
CREATE INDEX "Subscription_userId_idx" ON "public"."Subscription"("userId");
CREATE INDEX "Subscription_razorpaySubscriptionId_idx" ON "public"."Subscription"("razorpaySubscriptionId");
CREATE INDEX "Subscription_status_idx" ON "public"."Subscription"("status");

-- Step 5: Add foreign key for Subscription
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Migrate data from User to Subscription (if any exists)
INSERT INTO "public"."Subscription" (
    "id",
    "userId",
    "razorpaySubscriptionId",
    "razorpayCustomerId",
    "razorpayPaymentId",
    "razorpayOrderId",
    "status",
    "plan",
    "trialStartedAt",
    "trialEndsAt",
    "currentPeriodStart",
    "currentPeriodEnd",
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid()::text as "id",
    "id" as "userId",
    "subscriptionId" as "razorpaySubscriptionId",
    "razorpayCustomerId",
    "razorpayPaymentId",
    "razorpayOrderId",
    COALESCE("subscriptionStatus", 'INACTIVE'::"public"."SubscriptionStatus") as "status",
    "subscriptionPlan" as "plan",
    "trialStartedAt",
    "trialEndsAt",
    "currentPeriodStart",
    "currentPeriodEnd",
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM "public"."User"
WHERE "subscriptionId" IS NOT NULL OR "subscriptionStatus" IS NOT NULL;

-- Step 7: Update BillingInvoice to make subscriptionId nullable and link to Subscription
ALTER TABLE "public"."BillingInvoice" ALTER COLUMN "subscriptionId" DROP NOT NULL;
-- Update existing subscriptionId values to point to Subscription.id instead of razorpaySubscriptionId
UPDATE "public"."BillingInvoice" bi
SET "subscriptionId" = s."id"
FROM "public"."Subscription" s
WHERE bi."subscriptionId" = s."razorpaySubscriptionId";

-- Step 8: Add foreign key for BillingInvoice to Subscription
ALTER TABLE "public"."BillingInvoice" ADD CONSTRAINT "BillingInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 9: Drop old columns from User
DROP INDEX IF EXISTS "public"."User_subscriptionId_key";
ALTER TABLE "public"."User" DROP COLUMN IF EXISTS "currentPeriodEnd",
DROP COLUMN IF EXISTS "currentPeriodStart",
DROP COLUMN IF EXISTS "razorpayCustomerId",
DROP COLUMN IF EXISTS "razorpayOrderId",
DROP COLUMN IF EXISTS "razorpayPaymentId",
DROP COLUMN IF EXISTS "subscriptionId",
DROP COLUMN IF EXISTS "subscriptionPlan",
DROP COLUMN IF EXISTS "subscriptionStatus",
DROP COLUMN IF EXISTS "trialEndsAt",
DROP COLUMN IF EXISTS "trialStartedAt";
