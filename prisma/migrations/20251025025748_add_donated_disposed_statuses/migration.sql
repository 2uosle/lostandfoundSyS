-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminAction" ADD VALUE 'DONATE';
ALTER TYPE "AdminAction" ADD VALUE 'DISPOSE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ItemStatus" ADD VALUE 'DONATED';
ALTER TYPE "ItemStatus" ADD VALUE 'DISPOSED';

-- DropIndex
DROP INDEX "public"."idx_activitylog_userid_created";

-- DropIndex
DROP INDEX "public"."idx_founditems_userid_status";

-- DropIndex
DROP INDEX "public"."idx_lostitems_userid_status";

-- DropIndex
DROP INDEX "public"."idx_notifications_userid_read_created";
