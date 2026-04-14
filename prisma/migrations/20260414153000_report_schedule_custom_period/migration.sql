-- Allow multiple schedules per location (e.g. several CUSTOM runs).
DROP INDEX IF EXISTS "public"."ReportSchedule_locationId_type_key";

-- Custom report period mode (previous calendar month vs explicit range).
DO $$ BEGIN
    CREATE TYPE "public"."CustomReportPeriodType" AS ENUM ('PREVIOUS_MONTH', 'CUSTOM_RANGE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "public"."ReportSchedule"
    ADD COLUMN IF NOT EXISTS "customPeriodType" "public"."CustomReportPeriodType",
    ADD COLUMN IF NOT EXISTS "customStartDate" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "customEndDate" TIMESTAMP(3);
