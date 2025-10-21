-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('MATCH', 'CLAIM', 'ARCHIVE', 'DELETE', 'RESTORE');

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" "AdminAction" NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_itemType_itemId_idx" ON "ActivityLog"("itemType", "itemId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "FoundItem_category_status_idx" ON "FoundItem"("category", "status");

-- CreateIndex
CREATE INDEX "FoundItem_status_createdAt_idx" ON "FoundItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FoundItem_userId_idx" ON "FoundItem"("userId");

-- CreateIndex
CREATE INDEX "LostItem_category_status_idx" ON "LostItem"("category", "status");

-- CreateIndex
CREATE INDEX "LostItem_status_createdAt_idx" ON "LostItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LostItem_userId_idx" ON "LostItem"("userId");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
