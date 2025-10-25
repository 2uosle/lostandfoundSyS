-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_lostitems_userid_status" ON "LostItem"("userId", "status");
CREATE INDEX IF NOT EXISTS "idx_founditems_userid_status" ON "FoundItem"("userId", "status");

-- Add index on notification reads for faster unread queries
CREATE INDEX IF NOT EXISTS "idx_notifications_userid_read_created" ON "Notification"("userId", "read", "createdAt" DESC);

-- Add partial indexes for pending items (frequently queried in matching)
CREATE INDEX IF NOT EXISTS "idx_lostitems_pending" ON "LostItem"("category", "lostDate") WHERE "status" = 'PENDING';
CREATE INDEX IF NOT EXISTS "idx_founditems_pending" ON "FoundItem"("category", "foundDate") WHERE "status" = 'PENDING';

-- Add index for activity log queries
CREATE INDEX IF NOT EXISTS "idx_activitylog_userid_created" ON "ActivityLog"("userId", "createdAt" DESC);
