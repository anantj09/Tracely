-- ============================================================
-- 006_grant_permissions.sql
-- Fixes 42501 "permission denied for table" errors
--
-- The service_role key should bypass RLS, but it still needs
-- table-level GRANT privileges. This script grants them for
-- every table used by RailSaathi.
--
-- Run this in the Supabase SQL Editor (as postgres/superuser).
-- ============================================================

-- ─── SERVICE ROLE (used by backend API + seed scripts) ──────

GRANT ALL ON TABLE public.users              TO service_role;
GRANT ALL ON TABLE public.journeys           TO service_role;
GRANT ALL ON TABLE public.admin_users        TO service_role;
GRANT ALL ON TABLE public.complaints         TO service_role;
GRANT ALL ON TABLE public.complaint_timeline TO service_role;
GRANT ALL ON TABLE public.station_coordinates TO service_role;
GRANT ALL ON TABLE public.travel_intents     TO service_role;

-- Tables that may or may not exist yet (safe to run after their migrations):
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'safety_events') THEN
    EXECUTE 'GRANT ALL ON TABLE public.safety_events TO service_role';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tatkal_requests') THEN
    EXECUTE 'GRANT ALL ON TABLE public.tatkal_requests TO service_role';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'station_amenities') THEN
    EXECUTE 'GRANT ALL ON TABLE public.station_amenities TO service_role';
  END IF;
END $$;

-- Grant usage on sequences so INSERT with DEFAULT gen_random_uuid() works
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ─── AUTHENTICATED ROLE (logged-in mobile users via Supabase Auth) ──

GRANT SELECT, INSERT, UPDATE ON TABLE public.users              TO authenticated;
GRANT SELECT, INSERT         ON TABLE public.journeys           TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.complaints         TO authenticated;
GRANT SELECT                 ON TABLE public.complaint_timeline TO authenticated;
GRANT SELECT                 ON TABLE public.station_coordinates TO authenticated;
GRANT SELECT, INSERT         ON TABLE public.travel_intents     TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ─── ANON ROLE (public/unauthenticated endpoints like heatmap) ──────

GRANT SELECT ON TABLE public.station_coordinates TO anon;
GRANT SELECT ON TABLE public.complaints          TO anon;
GRANT SELECT ON TABLE public.travel_intents      TO anon;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'safety_events') THEN
    EXECUTE 'GRANT SELECT ON TABLE public.safety_events TO anon';
  END IF;
END $$;

-- ─── SCHEMA-LEVEL ACCESS ────────────────────────────────────

GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- ─── DEFAULT PRIVILEGES (for future tables) ─────────────────

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO authenticated;
