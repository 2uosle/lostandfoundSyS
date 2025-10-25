/*
  Warnings:

  - You are about to drop the column `adminVerifiedFinder` on the `HandoffSession` table. All the data in the column will be lost.
  - You are about to drop the column `finderAttempts` on the `HandoffSession` table. All the data in the column will be lost.
  - You are about to drop the column `finderCode` on the `HandoffSession` table. All the data in the column will be lost.
  - You are about to drop the column `finderVerifiedAdmin` on the `HandoffSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "HandoffSession" DROP COLUMN "adminVerifiedFinder",
DROP COLUMN "finderAttempts",
DROP COLUMN "finderCode",
DROP COLUMN "finderVerifiedAdmin";
