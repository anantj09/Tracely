/*
MANUAL STEPS REQUIRED (in Supabase Dashboard — cannot be done via SQL):
1. Storage → New bucket → "sos-audio" → Private (Public: OFF)
2. Storage → New bucket → "hazard-photos" → Public (Public: ON)  
3. Database → Replication → safety_events → Toggle ON
4. Verify ALTER TABLE safety_events REPLICA IDENTITY FULL executed (above)
5. Test Realtime: fire curl POST /api/safety/sos → RPF dashboard updates < 3s
6. Test Twilio: add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to services/api/.env and Render env vars
*/

-- 006_safety_rls_fix.sql
-- Fixes RLS policies on safety_events to use supabase_auth_uid
-- instead of firebase_uid (Supabase Auth migration — Prompt 18)
-- Run AFTER 004_safety.sql has been applied.
-- Run in Supabase SQL Editor.

-- ─── DROP OLD FIREBASE-BASED POLICIES ────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert their own events" ON safety_events;
DROP POLICY IF EXISTS "Users can select their own events" ON safety_events;
-- Drop any other legacy firebase_uid policies if present
DROP POLICY IF EXISTS "safety_own_insert" ON safety_events;
DROP POLICY IF EXISTS "safety_own_read" ON safety_events;
DROP POLICY IF EXISTS "contacts_own_all" ON trusted_contacts;

-- ─── RECREATE WITH SUPABASE AUTH ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'safety_events' AND policyname = 'safety_own_insert_supabase'
  ) THEN
    CREATE POLICY "safety_own_insert_supabase" ON safety_events
      FOR INSERT WITH CHECK (
        user_id = (
          SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'safety_events' AND policyname = 'safety_own_read_supabase'
  ) THEN
    CREATE POLICY "safety_own_read_supabase" ON safety_events
      FOR SELECT USING (
        user_id = (
          SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trusted_contacts' AND policyname = 'contacts_own_all_supabase'
  ) THEN
    CREATE POLICY "contacts_own_all_supabase" ON trusted_contacts
      FOR ALL USING (
        user_id = (
          SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text
        )
      );
  END IF;
END $$;

-- ─── ENSURE REPLICA IDENTITY FULL (required for Supabase Realtime) ───────────
-- If not already set (004_safety.sql set it, this is idempotent)
ALTER TABLE safety_events REPLICA IDENTITY FULL;

-- ─── UPDATED_AT TRIGGER (missing from 004_safety.sql) ────────────────────────
-- The update_updated_at_column() function was created in 001_core_schema.sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'safety_events_updated_at'
  ) THEN
    CREATE TRIGGER safety_events_updated_at
      BEFORE UPDATE ON safety_events
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─── SUPABASE REALTIME ENABLE (reminder — must also be done in Dashboard) ────
-- Run in Supabase Dashboard → Database → Replication → safety_events → Enable
-- The SQL above handles REPLICA IDENTITY FULL but the dashboard toggle is separate.

-- ─── STORAGE BUCKET SETUP (cannot be done via SQL — manual steps) ─────────────
-- Do these manually in Supabase Dashboard → Storage:
--
-- Bucket 1: sos-audio
--   - Click "New bucket"
--   - Name: sos-audio
--   - Public: OFF (private)
--   - File size limit: 50MB
--
-- Bucket 2: hazard-photos
--   - Click "New bucket"
--   - Name: hazard-photos
--   - Public: ON
--   - File size limit: 10MB
--
-- Storage RLS policies for hazard-photos (run in SQL Editor):

-- Allow authenticated users to upload to hazard-photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies
    WHERE name = 'hazard_photos_upload' AND bucket_id = 'hazard-photos'
  ) THEN
    INSERT INTO storage.policies (name, bucket_id, definition)
    VALUES (
      'hazard_photos_upload',
      'hazard-photos',
      '(role() = ''authenticated''::text)'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- storage.policies may not be directly insertable in all Supabase versions
  -- Use Dashboard → Storage → hazard-photos → Policies instead
  RAISE NOTICE 'Storage policy setup: use Supabase Dashboard manually';
END $$;
