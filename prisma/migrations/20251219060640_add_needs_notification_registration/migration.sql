-- AlterTable
ALTER TABLE "public"."GoogleAccount" ADD COLUMN     "needsNotificationRegistration" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "GoogleAccount_needsNotificationRegistration_idx" ON "public"."GoogleAccount"("needsNotificationRegistration");
