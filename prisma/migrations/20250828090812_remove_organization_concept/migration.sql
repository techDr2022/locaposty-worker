/*
  Warnings:

  - You are about to drop the column `organizationId` on the `AIReplyTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReportJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_OrganizationToUser` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `AIReplyTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."AIReplyTemplate" DROP CONSTRAINT "AIReplyTemplate_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Location" DROP CONSTRAINT "Location_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Organization" DROP CONSTRAINT "Organization_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ReportJob" DROP CONSTRAINT "ReportJob_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_OrganizationToUser" DROP CONSTRAINT "_OrganizationToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_OrganizationToUser" DROP CONSTRAINT "_OrganizationToUser_B_fkey";

-- AlterTable
ALTER TABLE "public"."AIReplyTemplate" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Location" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "ctaUrl" TEXT,
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "razorpayOrderId" TEXT;

-- DropTable
DROP TABLE "public"."Organization";

-- DropTable
DROP TABLE "public"."ReportJob";

-- DropTable
DROP TABLE "public"."_OrganizationToUser";

-- DropEnum
DROP TYPE "public"."ReportFrequency";

-- AddForeignKey
ALTER TABLE "public"."AIReplyTemplate" ADD CONSTRAINT "AIReplyTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
