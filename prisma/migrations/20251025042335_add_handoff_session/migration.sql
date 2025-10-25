-- CreateTable
CREATE TABLE "HandoffSession" (
    "id" TEXT NOT NULL,
    "lostItemId" TEXT NOT NULL,
    "foundItemId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "finderUserId" TEXT NOT NULL,
    "ownerCode" TEXT NOT NULL,
    "finderCode" TEXT NOT NULL,
    "ownerVerified" BOOLEAN NOT NULL DEFAULT false,
    "finderVerified" BOOLEAN NOT NULL DEFAULT false,
    "ownerAttempts" INTEGER NOT NULL DEFAULT 0,
    "finderAttempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandoffSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HandoffSession_lostItemId_idx" ON "HandoffSession"("lostItemId");

-- CreateIndex
CREATE INDEX "HandoffSession_foundItemId_idx" ON "HandoffSession"("foundItemId");

-- CreateIndex
CREATE INDEX "HandoffSession_ownerUserId_idx" ON "HandoffSession"("ownerUserId");

-- CreateIndex
CREATE INDEX "HandoffSession_finderUserId_idx" ON "HandoffSession"("finderUserId");

-- CreateIndex
CREATE INDEX "HandoffSession_status_expiresAt_idx" ON "HandoffSession"("status", "expiresAt");
