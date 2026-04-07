/*
  Warnings:

  - A unique constraint covering the columns `[reviewId,locationId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Review_reviewId_key";

-- CreateIndex
CREATE INDEX "GoogleAccount_userId_idx" ON "public"."GoogleAccount"("userId");

-- CreateIndex
CREATE INDEX "Location_googleAccountId_idx" ON "public"."Location"("googleAccountId");

-- CreateIndex
CREATE INDEX "Location_gmbAccountId_idx" ON "public"."Location"("gmbAccountId");

-- CreateIndex
CREATE INDEX "Location_createdAt_idx" ON "public"."Location"("createdAt");

-- CreateIndex
CREATE INDEX "Post_locationId_idx" ON "public"."Post"("locationId");

-- CreateIndex
CREATE INDEX "Post_userId_idx" ON "public"."Post"("userId");

-- CreateIndex
CREATE INDEX "Post_status_scheduledAt_idx" ON "public"."Post"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Review_locationId_idx" ON "public"."Review"("locationId");

-- CreateIndex
CREATE INDEX "Review_locationId_status_idx" ON "public"."Review"("locationId", "status");

-- CreateIndex
CREATE INDEX "Review_createTime_idx" ON "public"."Review"("createTime");

-- CreateIndex
CREATE UNIQUE INDEX "Review_reviewId_locationId_key" ON "public"."Review"("reviewId", "locationId");
