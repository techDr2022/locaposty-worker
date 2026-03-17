-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InsightType" ADD VALUE 'WEBSITE_CLICKS';
ALTER TYPE "InsightType" ADD VALUE 'CALL_CLICKS';
ALTER TYPE "InsightType" ADD VALUE 'BUSINESS_IMPRESSIONS_MOBILE_MAPS';
ALTER TYPE "InsightType" ADD VALUE 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH';
ALTER TYPE "InsightType" ADD VALUE 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS';
ALTER TYPE "InsightType" ADD VALUE 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH';
ALTER TYPE "InsightType" ADD VALUE 'BUSINESS_BOOKINGS';
ALTER TYPE "InsightType" ADD VALUE 'BUSINESS_FOOD_ORDERS';
ALTER TYPE "InsightType" ADD VALUE 'BUSINESS_FOOD_MENU_CLICKS';
ALTER TYPE "InsightType" ADD VALUE 'BUSINESS_CONVERSATIONS';
