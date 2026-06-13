-- supabase/migrations/004_safety.sql
-- Member 4 — Real-Time Safety & Incident System
-- Day 1 — Backend Foundation: Base Tables

-- 1. Create safety_events Table
CREATE TABLE IF NOT EXISTS safety_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type          VARCHAR(50) NOT NULL, -- SOS | COMPARTMENT_VIOLATION | HAZARD_REPORT
  alert_subtype       VARCHAR(50),          -- Sub-classification details
  lat                 NUMERIC(10, 7),
  lng                 NUMERIC(10, 7),
  train_number        VARCHAR(15),
  coach               VARCHAR(15),
  berth               VARCHAR(15),
  description         TEXT,
  media_url           TEXT,                 -- Combined media / audio / photo URLs
  status              VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE | ACKNOWLEDGED | RESOLVED | FALSE_ALARM
  priority            VARCHAR(20) DEFAULT 'MEDIUM', -- CRITICAL | HIGH | MEDIUM
  masked_initials     VARCHAR(10),          -- Masked name initials (e.g. "R.K.")
  sms_sent            BOOLEAN DEFAULT false,
  sms_contacts_count  INTEGER DEFAULT 0,
  resolved_at         TIMESTAMPTZ,
  rpf_note            TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create trusted_contacts Table
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                VARCHAR(100),
  phone               VARCHAR(20) NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Legacy Firebase RLS Policies for safety_events
ALTER TABLE safety_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "safety_own_insert" ON safety_events
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "safety_own_read" ON safety_events
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text)
  );

-- 4. Legacy Firebase RLS Policies for trusted_contacts
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_own_all" ON trusted_contacts
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()::text)
  );
