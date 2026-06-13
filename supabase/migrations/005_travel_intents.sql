-- ============================================================
-- 005_travel_intents.sql
-- Travel intent signals for Demand Forecast dashboard page
-- Created by Member 1
--
-- Prerequisites:
--   - Run AFTER 001_core_schema.sql
--   - Run in the Supabase SQL Editor
--
-- Usage:
--   DemandPage.jsx reads: from_station, to_station, class, is_surge, travel_date
--   OverviewPage.jsx reads: is_surge (for "Demand Surge Routes" KPI)
-- ============================================================

CREATE TABLE IF NOT EXISTS travel_intents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_station    VARCHAR(10) NOT NULL,
  to_station      VARCHAR(10) NOT NULL,
  class           VARCHAR(5) DEFAULT 'SL',
  travel_date     DATE NOT NULL,
  is_surge        BOOLEAN DEFAULT false,
  is_surge_route  BOOLEAN DEFAULT false,
  -- is_surge_route used by OverviewPage for "Demand Surge Routes" KPI count
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_intents_from_to ON travel_intents(from_station, to_station);
CREATE INDEX IF NOT EXISTS idx_travel_intents_travel_date ON travel_intents(travel_date);
CREATE INDEX IF NOT EXISTS idx_travel_intents_surge ON travel_intents(is_surge) WHERE is_surge = true;
CREATE INDEX IF NOT EXISTS idx_travel_intents_surge_route ON travel_intents(is_surge_route) WHERE is_surge_route = true;
