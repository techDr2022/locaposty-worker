/*
  Warnings:

  - You are about to drop the column `gmbPostId` on the `Location` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Location" DROP COLUMN "gmbPostId";

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "gmbPostName" TEXT;
