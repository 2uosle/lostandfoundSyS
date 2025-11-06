-- CreateTable
CREATE TABLE "DeclinedMatch" (
    "id" TEXT NOT NULL,
    "lostItemId" TEXT NOT NULL,
    "foundItemId" TEXT NOT NULL,
    "declinedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeclinedMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeclinedMatch_lostItemId_idx" ON "DeclinedMatch"("lostItemId");

-- CreateIndex
CREATE INDEX "DeclinedMatch_foundItemId_idx" ON "DeclinedMatch"("foundItemId");

-- CreateIndex
CREATE UNIQUE INDEX "DeclinedMatch_lostItemId_foundItemId_key" ON "DeclinedMatch"("lostItemId", "foundItemId");
