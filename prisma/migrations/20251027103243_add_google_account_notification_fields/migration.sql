-- AlterTable
ALTER TABLE "public"."GoogleAccount" ADD COLUMN     "notificationRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationRegisteredAt" TIMESTAMP(3);
