-- 001_core_schema.sql
-- RailSaathi Foundation Schema
-- Run FIRST before any other migration.
-- Prerequisites: A Supabase project with Auth enabled.

-- ─── USERS TABLE ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone               VARCHAR(15) UNIQUE NOT NULL,
  name                VARCHAR(100),
  supabase_auth_uid   VARCHAR(128) UNIQUE,
  -- NOTE: firebase_uid kept for backward compat during migration, remove in v2
  firebase_uid        VARCHAR(128) UNIQUE,
  emergency_contacts  TEXT[] DEFAULT '{}',
  preferred_class     VARCHAR(5) DEFAULT 'SL',
  -- SL | 3A | 2A | 1A | GEN
  frequent_routes     TEXT[] DEFAULT '{}',
  is_verified         BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_supabase_auth_uid ON users(supabase_auth_uid);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- ─── JOURNEYS TABLE ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journeys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pnr                 VARCHAR(10) NOT NULL,
  train_number        VARCHAR(10),
  train_name          VARCHAR(100),
  boarding_station    VARCHAR(10),
  destination_station VARCHAR(10),
  travel_date         DATE,
  coach               VARCHAR(10),
  berth               VARCHAR(10),
  class               VARCHAR(5),
  status              VARCHAR(20),
  -- CONFIRMED | RAC | WL
  raw_api_response    JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pnr)
);

CREATE INDEX IF NOT EXISTS idx_journeys_user_id ON journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_journeys_pnr ON journeys(pnr);
CREATE INDEX IF NOT EXISTS idx_journeys_travel_date ON journeys(travel_date);
CREATE INDEX IF NOT EXISTS idx_journeys_user_travel_date ON journeys(user_id, travel_date);

-- ─── ADMIN USERS TABLE ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  role        VARCHAR(20) DEFAULT 'viewer',
  -- viewer | zone_officer | superadmin
  zone        VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='users_own_data'
  ) THEN
    CREATE POLICY "users_own_data" ON users
      FOR ALL USING (supabase_auth_uid = auth.uid()::text);
  END IF;
END $$;

ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='journeys' AND policyname='journeys_own_data'
  ) THEN
    CREATE POLICY "journeys_own_data" ON journeys
      FOR ALL USING (
        user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
      );
  END IF;
END $$;

-- admin_users is managed by service role only — no RLS needed
-- (dashboard reads directly via Supabase anon key with service role for writes)

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at') THEN
    CREATE TRIGGER users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'journeys_updated_at') THEN
    CREATE TRIGGER journeys_updated_at
      BEFORE UPDATE ON journeys
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
