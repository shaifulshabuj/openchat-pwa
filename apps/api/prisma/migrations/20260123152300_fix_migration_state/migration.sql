-- Fix migration state for failed SQLite migration
-- Mark the old SQLite migration as applied (even though it never existed in PostgreSQL)
-- This prevents Prisma from blocking future migrations

-- The failed migration 20260123084811_add_message_status tried to run SQLite commands 
-- against a PostgreSQL database. We need to mark it as "applied" in the migration table
-- so Prisma doesn't try to run it again.

-- Update the migration status in the _prisma_migrations table
UPDATE "_prisma_migrations" 
SET 
  "applied_steps_count" = 1,
  "finished_at" = NOW()
WHERE 
  "migration_name" = '20260123084811_add_message_status' 
  AND "finished_at" IS NULL;

-- If the migration record doesn't exist, this will have no effect (which is fine)
-- The important part is that future migrations can now proceed