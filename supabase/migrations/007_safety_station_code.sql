-- supabase/migrations/007_safety_station_code.sql
-- Member 4 — Real-Time Safety & Incident System
-- Adds the missing station_code column to the safety_events table

ALTER TABLE public.safety_events 
ADD COLUMN IF NOT EXISTS station_code VARCHAR(10);
