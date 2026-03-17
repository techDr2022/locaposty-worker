/*
  Warnings:

  - You are about to drop the column `autoEnabled` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `autoReplyDelayMins` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `maxStarReply` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `minStarReply` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `negativePrompt` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `neutralPrompt` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `positivePrompt` on the `AIReplyTemplate` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ReplyTone" ADD VALUE 'PROFESSIONAL';
ALTER TYPE "public"."ReplyTone" ADD VALUE 'CASUAL';
ALTER TYPE "public"."ReplyTone" ADD VALUE 'EMPATHETIC';
ALTER TYPE "public"."ReplyTone" ADD VALUE 'ENTHUSIASTIC';

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
ADD COLUMN     "positiveResponseStyle" TEXT;
