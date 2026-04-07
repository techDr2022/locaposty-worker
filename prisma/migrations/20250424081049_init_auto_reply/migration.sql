-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "autoPostEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastFetchedTimestamp" TIMESTAMP(3),
ADD COLUMN     "replyTonePreference" "ReplyTone";

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "isProcessed" BOOLEAN NOT NULL DEFAULT false;
