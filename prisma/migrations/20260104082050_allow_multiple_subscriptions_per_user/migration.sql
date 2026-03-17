-- DropIndex
DROP INDEX "public"."Subscription_userId_key";

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "public"."Subscription"("userId", "status");
