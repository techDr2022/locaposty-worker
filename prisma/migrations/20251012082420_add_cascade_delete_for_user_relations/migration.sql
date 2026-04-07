-- DropForeignKey
ALTER TABLE "public"."Location" DROP CONSTRAINT "Location_googleAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ReviewReply" DROP CONSTRAINT "ReviewReply_userId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "public"."GoogleAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewReply" ADD CONSTRAINT "ReviewReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
