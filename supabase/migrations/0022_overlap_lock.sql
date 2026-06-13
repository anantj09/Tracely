-- 0022_overlap_lock.sql
-- Member 2 — Journey Overlap Locking Support
-- Run AFTER 002_tatkal.sql

-- 1. Alter tatkal_requests table to add departure_datetime and arrival_datetime
ALTER TABLE tatkal_requests 
  ADD COLUMN IF NOT EXISTS departure_datetime TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrival_datetime TIMESTAMPTZ;

-- 2. Create tatkal_journey_locks table
CREATE TABLE IF NOT EXISTS tatkal_journey_locks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  passenger_name  VARCHAR(100) NOT NULL,
  pnr             VARCHAR(10) NOT NULL,
  lock_start      TIMESTAMPTZ NOT NULL,
  lock_end        TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indices for tatkal_journey_locks
CREATE INDEX IF NOT EXISTS idx_journey_locks_user_id ON tatkal_journey_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_locks_passenger ON tatkal_journey_locks(passenger_name);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE tatkal_journey_locks ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS policy for owner
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tatkal_journey_locks' AND policyname = 'tatkal_journey_locks_owner'
  ) THEN
    CREATE POLICY "tatkal_journey_locks_owner" ON tatkal_journey_locks
      FOR ALL USING (
        user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text OR firebase_uid = auth.uid()::text)
      );
  END IF;
END $$;
