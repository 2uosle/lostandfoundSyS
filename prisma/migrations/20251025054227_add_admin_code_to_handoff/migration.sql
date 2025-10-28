-- PostgreSQL Migration
/*
  Warnings:

  - You are about to drop the column `finderVerified` on the `HandoffSession` table. All the data in the column will be lost.
  - You are about to drop the column `ownerVerified` on the `HandoffSession` table. All the data in the column will be lost.
  - Added the required column `adminCode` to the `HandoffSession` table without a default value. This is not possible if the table is not empty.

*/

-- AlterTable
ALTER TABLE "HandoffSession" 
  DROP COLUMN IF EXISTS "finderVerified",
  DROP COLUMN IF EXISTS "ownerVerified",
  ADD COLUMN "adminAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "adminCode" TEXT NOT NULL DEFAULT '000000',
  ADD COLUMN "adminVerifiedFinder" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "adminVerifiedOwner" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "finderVerifiedAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ownerVerifiedAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Remove the temporary default for adminCode
ALTER TABLE "HandoffSession" ALTER COLUMN "adminCode" DROP DEFAULT;
