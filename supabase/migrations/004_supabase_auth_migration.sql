-- 004_supabase_auth_migration.sql
-- Migrates users table from firebase_uid to supabase_auth_uid
-- Run AFTER 001_core_schema.sql

-- Add new column
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_auth_uid VARCHAR(128) UNIQUE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_supabase_auth_uid ON users(supabase_auth_uid);

-- Keep firebase_uid for now (don't drop it — existing data may reference it)
-- Once all users have migrated, firebase_uid can be dropped in a future migration

-- Update RLS policies to use supabase_auth_uid instead of firebase_uid
-- (Supabase auth.uid() returns the Supabase Auth UUID — same as supabase_auth_uid)
DROP POLICY IF EXISTS "users_own_data" ON users;
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (supabase_auth_uid = auth.uid()::text);

DROP POLICY IF EXISTS "journeys_own_data" ON journeys;
CREATE POLICY "journeys_own_data" ON journeys
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
  );
