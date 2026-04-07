-- CreateEnum
CREATE TYPE "public"."GmbMediaCategory" AS ENUM ('CATEGORY_UNSPECIFIED', 'COVER', 'PROFILE', 'LOGO', 'EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'FOOD_AND_DRINK', 'MENU', 'COMMON_AREA', 'ROOMS', 'TEAMS', 'ADDITIONAL');

-- AlterEnum
ALTER TYPE "public"."PostType" ADD VALUE 'PHOTO';

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "gmbMediaCategory" "public"."GmbMediaCategory",
ADD COLUMN     "gmbPhotoMediaName" TEXT;
