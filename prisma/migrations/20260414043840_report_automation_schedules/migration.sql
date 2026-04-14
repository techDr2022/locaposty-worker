-- CreateEnum
CREATE TYPE "public"."ReportScheduleType" AS ENUM ('MONTHLY', 'CUSTOM');

-- AlterTable
ALTER TABLE "public"."Location" ADD COLUMN     "reportEmail" TEXT;

-- AlterTable
ALTER TABLE "public"."Report" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "recipientEmail" TEXT,
ADD COLUMN     "reportPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "reportPeriodStart" TIMESTAMP(3),
ADD COLUMN     "scheduleId" TEXT,
ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."ReportSchedule" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" "public"."ReportScheduleType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "dayOfMonth" INTEGER,
    "sendTimeLocal" TEXT,
    "runAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportSchedule_enabled_nextRunAt_idx" ON "public"."ReportSchedule"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "ReportSchedule_locationId_idx" ON "public"."ReportSchedule"("locationId");

-- CreateIndex
CREATE INDEX "ReportSchedule_locationId_type_idx" ON "public"."ReportSchedule"("locationId", "type");

-- CreateIndex
CREATE INDEX "Report_locationId_createdAt_idx" ON "public"."Report"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "public"."Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_scheduleId_idx" ON "public"."Report"("scheduleId");

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."ReportSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportSchedule" ADD CONSTRAINT "ReportSchedule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
