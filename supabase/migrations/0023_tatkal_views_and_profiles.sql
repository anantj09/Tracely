-- 0023_tatkal_views_and_profiles.sql
-- Member 2 — Tatkal View and IRCTC Profile Support

-- 1. Create tatkal_irctc_profiles table
CREATE TABLE IF NOT EXISTS tatkal_irctc_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  irctc_username    VARCHAR(100) NOT NULL,
  irctc_password    TEXT,
  metadata          JSONB DEFAULT '{}',
  is_verified       BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_irctc UNIQUE(user_id, irctc_username)
);

-- Enable RLS
ALTER TABLE tatkal_irctc_profiles ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for owner
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tatkal_irctc_profiles' AND policyname = 'tatkal_irctc_profiles_owner'
  ) THEN
    CREATE POLICY "tatkal_irctc_profiles_owner" ON tatkal_irctc_profiles
      FOR ALL USING (
        user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text OR firebase_uid = auth.uid()::text)
      );
  END IF;
END $$;

-- 2. Create the relative join view for active locks
CREATE OR REPLACE VIEW active_passenger_locks AS
SELECT 
  jl.id AS lock_id,
  jl.user_id,
  jl.passenger_name,
  jl.pnr,
  jl.lock_start,
  jl.lock_end,
  jl.created_at AS lock_created_at,
  tr.id AS request_id,
  tr.from_station,
  tr.to_station,
  tr.train_number,
  tr.class,
  tr.travel_date
FROM tatkal_journey_locks jl
LEFT JOIN tatkal_requests tr ON jl.pnr = tr.simulated_pnr AND jl.user_id = tr.user_id;
