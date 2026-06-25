-- CreateEnum
CREATE TYPE "public"."BackgroundJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "public"."BackgroundJobStatus" NOT NULL DEFAULT 'QUEUED',
    "userId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackgroundJob_userId_idx" ON "public"."BackgroundJob"("userId");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_idx" ON "public"."BackgroundJob"("status");

-- CreateIndex
CREATE INDEX "BackgroundJob_createdAt_idx" ON "public"."BackgroundJob"("createdAt");
