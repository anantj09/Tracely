-- ============================================================
-- 003_complaints.sql
-- Member 3 — Grievance & Complaint System
-- 
-- Prerequisites:
-- - This migration must be run AFTER 001_core_schema.sql.
-- - Run in the Supabase SQL Editor.
-- 
-- Storage Bucket Note:
-- - After running this migration, you must manually create a Supabase
--   Storage bucket named "complaint-photos" with Public access enabled
--   (this setup cannot be performed via SQL).
-- ============================================================

-- Table: complaints
CREATE TABLE IF NOT EXISTS complaints (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_number    VARCHAR(20) UNIQUE NOT NULL,
  -- Format: RS-YYYYMMDD-XXXXX (e.g. RS-20260614-84729)
  complaint_type      VARCHAR(20) NOT NULL,
  -- Valid values: CLEANLINESS | AC_HEATING | STAFF | FOOD | SAFETY | OVERCROWDING | AMENITY | OTHER
  description         TEXT NOT NULL,
  photo_url           TEXT,
  pnr_number          VARCHAR(10),
  train_number        VARCHAR(10),
  train_name          VARCHAR(100),
  coach               VARCHAR(10),
  berth               VARCHAR(10),
  station_code        VARCHAR(10) NOT NULL,
  station_name        VARCHAR(100),
  travel_date         DATE,
  station_lat         NUMERIC(10, 7),
  station_lng         NUMERIC(10, 7),
  status              VARCHAR(20) DEFAULT 'SUBMITTED',
  -- SUBMITTED | ACKNOWLEDGED | IN_PROGRESS | RESOLVED | REJECTED
  is_safety_complaint BOOLEAN GENERATED ALWAYS AS (complaint_type = 'SAFETY') STORED,
  priority            VARCHAR(10) DEFAULT 'NORMAL',
  -- NORMAL | HIGH | CRITICAL
  is_reopened         BOOLEAN DEFAULT false,
  reopen_count        INTEGER DEFAULT 0,
  reopen_deadline     TIMESTAMPTZ,
  expo_push_token     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for complaints
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_station_code ON complaints(station_code);
CREATE INDEX IF NOT EXISTS idx_complaints_complaint_type ON complaints(complaint_type);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_train_number ON complaints(train_number);
CREATE INDEX IF NOT EXISTS idx_complaints_is_safety ON complaints(is_safety_complaint) WHERE is_safety_complaint = true;
CREATE INDEX IF NOT EXISTS idx_complaints_reference ON complaints(reference_number);

-- Table: complaint_timeline
CREATE TABLE IF NOT EXISTS complaint_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id    UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  from_status     VARCHAR(20),
  to_status       VARCHAR(20) NOT NULL,
  note            TEXT,
  changed_by      VARCHAR(50),
  -- 'SYSTEM' | 'ADMIN' | 'USER'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for complaint_timeline
CREATE INDEX IF NOT EXISTS idx_timeline_complaint_id ON complaint_timeline(complaint_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created_at ON complaint_timeline(created_at);

-- Table: station_coordinates
CREATE TABLE IF NOT EXISTS station_coordinates (
  station_code    VARCHAR(10) PRIMARY KEY,
  station_name    VARCHAR(100) NOT NULL,
  city            VARCHAR(100),
  state           VARCHAR(100),
  lat             NUMERIC(10, 7) NOT NULL,
  lng             NUMERIC(10, 7) NOT NULL,
  zone            VARCHAR(10)
);

-- ROW-LEVEL SECURITY POLICIES

-- Complaints RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'complaints' AND policyname = 'complaints_own_read'
  ) THEN
    CREATE POLICY "complaints_own_read" ON complaints
      FOR SELECT USING (
        user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text)
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'complaints' AND policyname = 'complaints_own_insert'
  ) THEN
    CREATE POLICY "complaints_own_insert" ON complaints
      FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text)
      );
  END IF;
END $$;

-- Timeline RLS
ALTER TABLE complaint_timeline ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'complaint_timeline' AND policyname = 'timeline_owner_read'
  ) THEN
    CREATE POLICY "timeline_owner_read" ON complaint_timeline
      FOR SELECT USING (
        complaint_id IN (
          SELECT id FROM complaints
          WHERE user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text)
        )
      );
  END IF;
END $$;

-- Station coordinates are public (needed for heat map without login)
ALTER TABLE station_coordinates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'station_coordinates' AND policyname = 'stations_public_read'
  ) THEN
    CREATE POLICY "stations_public_read" ON station_coordinates
      FOR SELECT USING (true);
  END IF;
END $$;
