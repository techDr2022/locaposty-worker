/*
  Warnings:

  - You are about to drop the column `accessToken` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `tokenExpiresAt` on the `Location` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Location" DROP COLUMN "accessToken",
DROP COLUMN "refreshToken",
DROP COLUMN "tokenExpiresAt",
ADD COLUMN     "googleAccountId" TEXT;

-- CreateTable
CREATE TABLE "public"."GoogleAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmbAccountId" TEXT NOT NULL,
    "gmbAccountName" TEXT NOT NULL,
    "email" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAccount_gmbAccountId_key" ON "public"."GoogleAccount"("gmbAccountId");

-- AddForeignKey
ALTER TABLE "public"."GoogleAccount" ADD CONSTRAINT "GoogleAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "public"."GoogleAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
