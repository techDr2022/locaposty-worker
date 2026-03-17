/*
  Warnings:

  - The values [APOLOGETIC] on the enum `ReplyTone` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `autoEnabled` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `autoReplyDelayMins` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `maxStarReply` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `minStarReply` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `negativePrompt` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `neutralPrompt` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `positivePrompt` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - Made the column `name` on table `AIReplyTemplate` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ReplyTone_new" AS ENUM ('PROFESSIONAL', 'FRIENDLY', 'CASUAL', 'FORMAL', 'EMPATHETIC', 'ENTHUSIASTIC');
ALTER TABLE "public"."Location" ALTER COLUMN "replyTonePreference" TYPE "public"."ReplyTone_new" USING ("replyTonePreference"::text::"public"."ReplyTone_new");
ALTER TABLE "public"."AIReplyTemplate" ALTER COLUMN "tone" TYPE "public"."ReplyTone_new" USING ("tone"::text::"public"."ReplyTone_new");
ALTER TYPE "public"."ReplyTone" RENAME TO "ReplyTone_old";
ALTER TYPE "public"."ReplyTone_new" RENAME TO "ReplyTone";
DROP TYPE "public"."ReplyTone_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."AIReplyTemplate" DROP COLUMN "autoEnabled",
DROP COLUMN "autoReplyDelayMins",
DROP COLUMN "maxStarReply",
DROP COLUMN "minStarReply",
DROP COLUMN "negativePrompt",
DROP COLUMN "neutralPrompt",
DROP COLUMN "positivePrompt",
ADD COLUMN     "brandVoice" TEXT,
ADD COLUMN     "customInstructions" TEXT,
ADD COLUMN     "negativeResponseStyle" TEXT,
ADD COLUMN     "positiveResponseStyle" TEXT,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "name" SET DEFAULT 'Default Template',
ALTER COLUMN "tone" SET DEFAULT 'PROFESSIONAL',
ALTER COLUMN "language" SET DEFAULT 'en',
ALTER COLUMN "replyLength" SET DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "hasCompletedLocationSetup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."LocationReplySettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoReplyDelayMins" INTEGER DEFAULT 0,
    "minStarReply" INTEGER NOT NULL DEFAULT 5,
    "maxStarReply" INTEGER NOT NULL DEFAULT 5,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationReplySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationReplySettings_userId_idx" ON "public"."LocationReplySettings"("userId");

-- CreateIndex
CREATE INDEX "LocationReplySettings_locationId_idx" ON "public"."LocationReplySettings"("locationId");

-- CreateIndex
CREATE INDEX "LocationReplySettings_userId_isGlobal_idx" ON "public"."LocationReplySettings"("userId", "isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "LocationReplySettings_userId_locationId_key" ON "public"."LocationReplySettings"("userId", "locationId");

-- CreateIndex
CREATE INDEX "AIReplyTemplate_userId_idx" ON "public"."AIReplyTemplate"("userId");

-- CreateIndex
CREATE INDEX "AIReplyTemplate_locationId_idx" ON "public"."AIReplyTemplate"("locationId");

-- CreateIndex
CREATE INDEX "AIReplyTemplate_userId_isDefault_idx" ON "public"."AIReplyTemplate"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "AIReplyTemplate_userId_locationId_isDefault_idx" ON "public"."AIReplyTemplate"("userId", "locationId", "isDefault");

-- AddForeignKey
ALTER TABLE "public"."LocationReplySettings" ADD CONSTRAINT "LocationReplySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocationReplySettings" ADD CONSTRAINT "LocationReplySettings_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
