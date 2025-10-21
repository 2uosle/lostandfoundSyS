-- DropForeignKey
ALTER TABLE "public"."FoundItem" DROP CONSTRAINT "FoundItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LostItem" DROP CONSTRAINT "LostItem_userId_fkey";

-- AlterTable
ALTER TABLE "FoundItem" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LostItem" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "LostItem" ADD CONSTRAINT "LostItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundItem" ADD CONSTRAINT "FoundItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
