/*
  Warnings:

  - The values [FREE] on the enum `SubscriptionPlan` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `content` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `sentiment` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `tone` on the `ReviewReply` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."ReplyLength" AS ENUM ('SHORT', 'MEDIUM', 'LONG');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."SubscriptionPlan_new" AS ENUM ('BASIC', 'PREMIUM', 'ENTERPRISE');
ALTER TABLE "public"."User" ALTER COLUMN "subscriptionPlan" TYPE "public"."SubscriptionPlan_new" USING ("subscriptionPlan"::text::"public"."SubscriptionPlan_new");
ALTER TYPE "public"."SubscriptionPlan" RENAME TO "SubscriptionPlan_old";
ALTER TYPE "public"."SubscriptionPlan_new" RENAME TO "SubscriptionPlan";
DROP TYPE "public"."SubscriptionPlan_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."AIReplyTemplate" DROP COLUMN "content",
DROP COLUMN "sentiment",
ADD COLUMN     "autoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoReplyDelayMins" INTEGER,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "maxStarReply" INTEGER,
ADD COLUMN     "minStarReply" INTEGER,
ADD COLUMN     "negativePrompt" TEXT,
ADD COLUMN     "neutralPrompt" TEXT,
ADD COLUMN     "positivePrompt" TEXT,
ADD COLUMN     "replyLength" "public"."ReplyLength",
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "name" SET DEFAULT 'Default Auto Reply',
ALTER COLUMN "tone" DROP NOT NULL,
ALTER COLUMN "tone" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."GoogleAccount" ADD COLUMN     "notificationRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationRegisteredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."ReviewReply" DROP COLUMN "tone";

-- AddForeignKey
ALTER TABLE "public"."AIReplyTemplate" ADD CONSTRAINT "AIReplyTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
