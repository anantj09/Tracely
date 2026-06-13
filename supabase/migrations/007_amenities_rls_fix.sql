-- 007_amenities_rls_fix.sql
-- Fixes RLS policies on Member 5 tables to use supabase_auth_uid
-- instead of firebase_uid (Supabase Auth migration — Prompt 18)
-- Run AFTER 005_amenities.sql in Supabase SQL Editor.
-- All policies use DO $$ IF NOT EXISTS $$ guards for idempotency.

-- ─── TRAVEL_INTENTS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "intents_own" ON travel_intents;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'travel_intents' AND policyname = 'intents_own_supabase'
  ) THEN
    CREATE POLICY "intents_own_supabase" ON travel_intents
      FOR ALL USING (
        user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
      );
  END IF;
END $$;

-- ─── AMENITY_VOTES ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "votes_own_insert" ON amenity_votes;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'amenity_votes' AND policyname = 'votes_own_insert_supabase'
  ) THEN
    CREATE POLICY "votes_own_insert_supabase" ON amenity_votes
      FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
      );
  END IF;
END $$;

-- votes_public_read is already correct (no user check) — leave it

-- ─── VENDOR_REVIEWS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "reviews_own_insert" ON vendor_reviews;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_reviews' AND policyname = 'reviews_own_insert_supabase'
  ) THEN
    CREATE POLICY "reviews_own_insert_supabase" ON vendor_reviews
      FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
      );
  END IF;
END $$;

-- ─── HAWKER_REPORTS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hawker_own_insert" ON hawker_reports;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hawker_reports' AND policyname = 'hawker_own_insert_supabase'
  ) THEN
    CREATE POLICY "hawker_own_insert_supabase" ON hawker_reports
      FOR INSERT WITH CHECK (
        user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
      );
  END IF;
END $$;

-- ─── STATION_CHECKINS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "checkins_own" ON station_checkins;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'station_checkins' AND policyname = 'checkins_own_supabase'
  ) THEN
    CREATE POLICY "checkins_own_supabase" ON station_checkins
      FOR ALL USING (
        user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
      );
  END IF;
END $$;

-- amenities_public_read and amenities_auth_update are already correct — leave them
-- vendors_public_read is already correct — leave it
-- reviews_public_read is already correct — leave it

-- ─── UPDATED_AT TRIGGERS (missing from 005_amenities.sql) ───────────────────
-- update_updated_at_column() was created in 001_core_schema.sql

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'travel_intents_updated_at') THEN
    CREATE TRIGGER travel_intents_updated_at
      BEFORE UPDATE ON travel_intents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'amenities_updated_at') THEN
    CREATE TRIGGER amenities_updated_at
      BEFORE UPDATE ON amenities
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vendors_updated_at') THEN
    CREATE TRIGGER vendors_updated_at
      BEFORE UPDATE ON vendors
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
