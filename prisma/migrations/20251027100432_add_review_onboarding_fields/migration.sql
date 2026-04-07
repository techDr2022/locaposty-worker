/*
  Warnings:

  - The values [PROFESSIONAL,CASUAL,EMPATHETIC,ENTHUSIASTIC] on the enum `ReplyTone` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `brandVoice` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `customInstructions` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `negativeResponseStyle` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `positiveResponseStyle` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `notificationRegistered` on the `GoogleAccount` table. All the data in the column will be lost.
  - You are about to drop the column `notificationRegisteredAt` on the `GoogleAccount` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ReplyTone_new" AS ENUM ('FORMAL', 'FRIENDLY', 'APOLOGETIC');
ALTER TABLE "public"."AIReplyTemplate" ALTER COLUMN "tone" DROP DEFAULT;
ALTER TABLE "public"."Location" ALTER COLUMN "replyTonePreference" TYPE "public"."ReplyTone_new" USING ("replyTonePreference"::text::"public"."ReplyTone_new");
ALTER TABLE "public"."AIReplyTemplate" ALTER COLUMN "tone" TYPE "public"."ReplyTone_new" USING ("tone"::text::"public"."ReplyTone_new");
ALTER TYPE "public"."ReplyTone" RENAME TO "ReplyTone_old";
ALTER TYPE "public"."ReplyTone_new" RENAME TO "ReplyTone";
DROP TYPE "public"."ReplyTone_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."AIReplyTemplate_locationId_idx";

-- DropIndex
DROP INDEX "public"."AIReplyTemplate_userId_idx";

-- DropIndex
DROP INDEX "public"."AIReplyTemplate_userId_isDefault_idx";

-- DropIndex
DROP INDEX "public"."AIReplyTemplate_userId_locationId_isDefault_idx";

-- AlterTable
ALTER TABLE "public"."AIReplyTemplate" DROP COLUMN "brandVoice",
DROP COLUMN "customInstructions",
DROP COLUMN "negativeResponseStyle",
DROP COLUMN "positiveResponseStyle",
ADD COLUMN     "autoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoReplyDelayMins" INTEGER,
ADD COLUMN     "maxStarReply" INTEGER,
ADD COLUMN     "minStarReply" INTEGER,
ADD COLUMN     "negativePrompt" TEXT,
ADD COLUMN     "neutralPrompt" TEXT,
ADD COLUMN     "positivePrompt" TEXT,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "name" SET DEFAULT 'Default Auto Reply',
ALTER COLUMN "tone" DROP DEFAULT,
ALTER COLUMN "language" DROP DEFAULT,
ALTER COLUMN "replyLength" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."GoogleAccount" DROP COLUMN "notificationRegistered",
DROP COLUMN "notificationRegisteredAt";

-- AlterTable
ALTER TABLE "public"."LocationReplySettings" ALTER COLUMN "autoReplyEnabled" SET DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "hasCompletedReviewSetup" BOOLEAN NOT NULL DEFAULT false;
