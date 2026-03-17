-- CreateTable
CREATE TABLE "SearchKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankTrackingResult" (
    "id" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "rankPosition" INTEGER,
    "searchDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchUrl" TEXT,
    "businessUrl" TEXT,
    "businessName" TEXT,
    "htmlSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankTrackingResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchKeyword_keyword_idx" ON "SearchKeyword"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "SearchKeyword_keyword_locationId_key" ON "SearchKeyword"("keyword", "locationId");

-- CreateIndex
CREATE INDEX "RankTrackingResult_keywordId_searchDate_idx" ON "RankTrackingResult"("keywordId", "searchDate");

-- AddForeignKey
ALTER TABLE "SearchKeyword" ADD CONSTRAINT "SearchKeyword_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankTrackingResult" ADD CONSTRAINT "RankTrackingResult_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "SearchKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
