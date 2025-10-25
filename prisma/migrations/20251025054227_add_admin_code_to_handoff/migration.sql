/*
  Warnings:

  - You are about to drop the column `finderVerified` on the `HandoffSession` table. All the data in the column will be lost.
  - You are about to drop the column `ownerVerified` on the `HandoffSession` table. All the data in the column will be lost.
  - Added the required column `adminCode` to the `HandoffSession` table without a default value. This is not possible if the table is not empty.

*/

-- First, add adminCode column with a temporary default value
ALTER TABLE "HandoffSession" ADD COLUMN "adminCode" TEXT NOT NULL DEFAULT '000000';

-- Then remove the default for future inserts
ALTER TABLE "HandoffSession" ALTER COLUMN "adminCode" DROP DEFAULT;

-- Add the new boolean columns and attempts
ALTER TABLE "HandoffSession" 
ADD COLUMN "adminAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "adminVerifiedFinder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "adminVerifiedOwner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "finderVerifiedAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "ownerVerifiedAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Migrate old verification flags to new mutual verification model
-- If ownerVerified was true, set both ownerVerifiedAdmin and adminVerifiedOwner to true
UPDATE "HandoffSession" 
SET "ownerVerifiedAdmin" = "ownerVerified",
    "adminVerifiedOwner" = "ownerVerified"
WHERE "ownerVerified" = true;

-- If finderVerified was true, set both finderVerifiedAdmin and adminVerifiedFinder to true
UPDATE "HandoffSession" 
SET "finderVerifiedAdmin" = "finderVerified",
    "adminVerifiedFinder" = "finderVerified"
WHERE "finderVerified" = true;

-- Drop the old columns
ALTER TABLE "HandoffSession" 
DROP COLUMN "finderVerified",
DROP COLUMN "ownerVerified";
