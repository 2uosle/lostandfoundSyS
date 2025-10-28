/*
  Warnings:

  - The `status` column on the `HandoffSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[lostItemId,status]` on the table `HandoffSession` will be added. If there are existing duplicate values, this will fail.

*/

-- Step 1: Create the enum type
CREATE TYPE "HandoffStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'LOCKED');

-- Step 2: Add a temporary column to preserve data
ALTER TABLE "HandoffSession" ADD COLUMN "status_new" "HandoffStatus";

-- Step 3: Migrate existing data to the new column
UPDATE "HandoffSession" SET "status_new" = 
  CASE 
    WHEN "status" = 'ACTIVE' THEN 'ACTIVE'::"HandoffStatus"
    WHEN "status" = 'COMPLETED' THEN 'COMPLETED'::"HandoffStatus"
    WHEN "status" = 'EXPIRED' THEN 'EXPIRED'::"HandoffStatus"
    WHEN "status" = 'LOCKED' THEN 'LOCKED'::"HandoffStatus"
    ELSE 'ACTIVE'::"HandoffStatus"
  END;

-- Step 4: Clean up duplicate ACTIVE sessions per lostItemId (keep oldest, expire rest)
WITH ranked_sessions AS (
  SELECT 
    id,
    "lostItemId",
    "status_new",
    ROW_NUMBER() OVER (PARTITION BY "lostItemId", "status_new" ORDER BY "createdAt" ASC) as rn
  FROM "HandoffSession"
  WHERE "status_new" = 'ACTIVE'
)
UPDATE "HandoffSession"
SET "status_new" = 'EXPIRED'::"HandoffStatus"
WHERE id IN (
  SELECT id FROM ranked_sessions WHERE rn > 1
);

-- Step 5: Drop the old column and rename the new one
ALTER TABLE "HandoffSession" DROP COLUMN "status";
ALTER TABLE "HandoffSession" RENAME COLUMN "status_new" TO "status";

-- Step 6: Set the default and NOT NULL constraint
ALTER TABLE "HandoffSession" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"HandoffStatus";
ALTER TABLE "HandoffSession" ALTER COLUMN "status" SET NOT NULL;

CREATE INDEX "HandoffSession_status_expiresAt_idx" ON "HandoffSession"("status", "expiresAt");

-- Step 8: Create a partial unique index - only enforce uniqueness for ACTIVE sessions
CREATE UNIQUE INDEX "one_active_session_per_lost_item" ON "HandoffSession"("lostItemId") WHERE "status" = 'ACTIVE';
