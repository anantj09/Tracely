-- 002_tatkal.sql
-- Member 2 — Tatkal Verified Booking Ecosystem
-- Run AFTER 001_core_schema.sql

-- ─── TATKAL REQUESTS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tatkal_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Journey details
  from_station        VARCHAR(10) NOT NULL,
  to_station          VARCHAR(10) NOT NULL,
  travel_date         DATE NOT NULL,
  train_number        VARCHAR(10) NOT NULL,
  class               VARCHAR(5) NOT NULL,  -- SL, 3A, 2A, 1A, GEN

  -- Passenger details (JSON array — supports up to 6 passengers)
  passengers          JSONB NOT NULL,
  -- Shape: [{ name, age, gender, berth_preference }]
  -- MUST include the account holder as one passenger

  -- Urgency
  is_urgent           BOOLEAN DEFAULT false,
  urgency_reason      VARCHAR(20),  -- medical | bereavement | official | personal
  urgency_document_url TEXT,
  urgency_score       NUMERIC(3,1) DEFAULT 0.0,

  -- Execution
  scheduled_fire_time TIMESTAMPTZ NOT NULL,  -- 10:00 AM or 11:00 AM on travel_date - 1
  status              VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING | FIRED | CONFIRMED | FAILED | CANCELLED

  -- Result (from IRCTC or simulation)
  simulated_pnr       VARCHAR(10),
  result_payload      JSONB,

  -- Anti-hoarding
  booking_date        DATE NOT NULL,  -- the date this request was created

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Anti-hoarding constraint: one request per user per booking date per train_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_tatkal_one_per_day
  ON tatkal_requests(user_id, booking_date, train_number)
  WHERE status NOT IN ('CANCELLED', 'FAILED');

-- Auxiliary indices for tatkal_requests
CREATE INDEX IF NOT EXISTS idx_tatkal_user_id ON tatkal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tatkal_status ON tatkal_requests(status);
CREATE INDEX IF NOT EXISTS idx_tatkal_fire_time ON tatkal_requests(scheduled_fire_time);
CREATE INDEX IF NOT EXISTS idx_tatkal_travel_date ON tatkal_requests(travel_date);

-- Trigger for tatkal_requests updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tatkal_requests_updated_at') THEN
    CREATE TRIGGER tatkal_requests_updated_at
      BEFORE UPDATE ON tatkal_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- ─── TATKAL SURRENDERS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tatkal_surrenders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Ticket details
  pnr                 VARCHAR(10) NOT NULL,
  from_station        VARCHAR(10) NOT NULL,
  to_station          VARCHAR(10) NOT NULL,
  travel_date         DATE NOT NULL,
  train_number        VARCHAR(10) NOT NULL,
  class               VARCHAR(5) NOT NULL,

  -- Status
  status              VARCHAR(20) DEFAULT 'LISTED',
  -- LISTED | MATCHED | COMPLETED | WITHDRAWN

  listed_at           TIMESTAMPTZ DEFAULT NOW(),
  matched_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Auxiliary indices for tatkal_surrenders
CREATE INDEX IF NOT EXISTS idx_surrenders_status ON tatkal_surrenders(status);
CREATE INDEX IF NOT EXISTS idx_surrenders_owner ON tatkal_surrenders(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_surrenders_travel_date ON tatkal_surrenders(travel_date);

-- Trigger for tatkal_surrenders updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tatkal_surrenders_updated_at') THEN
    CREATE TRIGGER tatkal_surrenders_updated_at
      BEFORE UPDATE ON tatkal_surrenders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE tatkal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tatkal_surrenders ENABLE ROW LEVEL SECURITY;

-- tatkal_requests owner policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tatkal_requests' AND policyname = 'tatkal_requests_owner'
  ) THEN
    CREATE POLICY "tatkal_requests_owner" ON tatkal_requests
      FOR ALL USING (
        user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text OR firebase_uid = auth.uid()::text)
      );
  END IF;
END $$;

-- tatkal_surrenders select policy (publicly readable)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tatkal_surrenders' AND policyname = 'surrenders_read_all'
  ) THEN
    CREATE POLICY "surrenders_read_all" ON tatkal_surrenders
      FOR SELECT USING (true);
  END IF;
END $$;

-- tatkal_surrenders owner insert policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tatkal_surrenders' AND policyname = 'surrenders_owner_insert'
  ) THEN
    CREATE POLICY "surrenders_owner_insert" ON tatkal_surrenders
      FOR INSERT WITH CHECK (
        owner_user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text OR firebase_uid = auth.uid()::text)
      );
  END IF;
END $$;

-- tatkal_surrenders owner update policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tatkal_surrenders' AND policyname = 'surrenders_owner_update'
  ) THEN
    CREATE POLICY "surrenders_owner_update" ON tatkal_surrenders
      FOR UPDATE USING (
        owner_user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text OR firebase_uid = auth.uid()::text)
      );
  END IF;
END $$;
