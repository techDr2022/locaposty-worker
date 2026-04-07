-- CreateEnum
CREATE TYPE "public"."BillingStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."SubscriptionStatus" ADD VALUE 'PENDING';
ALTER TYPE "public"."SubscriptionStatus" ADD VALUE 'GRACE';
ALTER TYPE "public"."SubscriptionStatus" ADD VALUE 'SUSPENDED';

-- CreateTable
CREATE TABLE "public"."BillingInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "public"."BillingStatus" NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "failureReason" TEXT,
    "razorpayPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingInvoice_userId_idx" ON "public"."BillingInvoice"("userId");

-- CreateIndex
CREATE INDEX "BillingInvoice_subscriptionId_idx" ON "public"."BillingInvoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "BillingInvoice_status_idx" ON "public"."BillingInvoice"("status");

-- CreateIndex
CREATE INDEX "BillingInvoice_createdAt_idx" ON "public"."BillingInvoice"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."BillingInvoice" ADD CONSTRAINT "BillingInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
