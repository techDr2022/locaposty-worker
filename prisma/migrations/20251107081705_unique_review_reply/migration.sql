/*
  Warnings:

  - A unique constraint covering the columns `[userId,locationId]` on the table `AIReplyTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reviewId]` on the table `ReviewReply` will be added. If there are existing duplicate values, this will fail.

*/

-- Step 1: Remove duplicate ReviewReply entries (keep the most recent one)
DELETE FROM "ReviewReply"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", 
           ROW_NUMBER() OVER (PARTITION BY "reviewId" ORDER BY "createdAt" DESC, "updatedAt" DESC) as rn
    FROM "ReviewReply"
  ) duplicates
  WHERE rn > 1
);

-- Step 2: Remove duplicate AIReplyTemplate entries (keep the most recent one)
DELETE FROM "AIReplyTemplate"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id",
           ROW_NUMBER() OVER (PARTITION BY "userId", "locationId" ORDER BY "updatedAt" DESC, "createdAt" DESC) as rn
    FROM "AIReplyTemplate"
  ) duplicates
  WHERE rn > 1
);

-- Step 3: CreateIndex
CREATE INDEX "AIReplyTemplate_userId_locationId_idx" ON "public"."AIReplyTemplate"("userId", "locationId");

-- Step 4: CreateIndex
CREATE UNIQUE INDEX "AIReplyTemplate_userId_locationId_key" ON "public"."AIReplyTemplate"("userId", "locationId");

-- Step 5: CreateIndex
CREATE UNIQUE INDEX "ReviewReply_reviewId_key" ON "public"."ReviewReply"("reviewId");
