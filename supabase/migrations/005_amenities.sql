-- Run AFTER 001_core_schema.sql and 003_complaints.sql (station_coordinates must exist from Member 3)

DROP TABLE IF EXISTS travel_intents CASCADE;

CREATE TABLE IF NOT EXISTS travel_intents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  from_station        VARCHAR(10) NOT NULL,
  to_station          VARCHAR(10) NOT NULL,
  travel_date         DATE NOT NULL,
  preferred_train     VARCHAR(10),
  class               VARCHAR(5) DEFAULT 'GEN',

  -- Crowding prediction result (stored at time of submission)
  crowding_score      NUMERIC(3,1),
  crowding_label      VARCHAR(20),
  -- COMFORTABLE | MODERATE | VERY_CROWDED

  -- Whether user actually travelled (can be updated later)
  did_travel          BOOLEAN,

  -- Surge detection
  is_surge_route      BOOLEAN DEFAULT false,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intents_user_id ON travel_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_intents_route ON travel_intents(from_station, to_station);
CREATE INDEX IF NOT EXISTS idx_intents_travel_date ON travel_intents(travel_date);
CREATE INDEX IF NOT EXISTS idx_intents_created_at ON travel_intents(created_at);

CREATE TABLE IF NOT EXISTS amenities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_code        VARCHAR(10) NOT NULL,
  -- References station_coordinates.station_code (soft reference, no FK)

  amenity_type        VARCHAR(20) NOT NULL,
  -- TOILET | WATER | FOOD_STALL | MEDICAL | CLOAK_ROOM | ATM |
  -- PREPAID_AUTO | WAITING_ROOM | ENQUIRY | PLATFORM_ENTRY

  label               VARCHAR(100),
  -- Human label: "Platform 1 Toilet", "Main Gate Water Point"

  platform_number     VARCHAR(5),
  -- Which platform it is on (null for concourse-level amenities)

  -- Schematic coordinates (within the station SVG coordinate space)
  -- The schematic is 1000x600 units. These are unitless x/y positions.
  schematic_x         NUMERIC(7,2),
  schematic_y         NUMERIC(7,2),

  -- Current crowd-sourced status
  current_status      VARCHAR(20) DEFAULT 'UNKNOWN',
  -- WORKING | BROKEN | CONFIRMED_BROKEN | UNKNOWN

  last_vote_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amenities_station ON amenities(station_code);
CREATE INDEX IF NOT EXISTS idx_amenities_type ON amenities(amenity_type);
CREATE INDEX IF NOT EXISTS idx_amenities_status ON amenities(current_status);

CREATE TABLE IF NOT EXISTS amenity_votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id      UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote            VARCHAR(10) NOT NULL,
  -- WORKING | BROKEN

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_amenity_id ON amenity_votes(amenity_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON amenity_votes(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS unique_vote_per_hour ON amenity_votes (amenity_id, user_id, date_trunc('hour', created_at AT TIME ZONE 'UTC'));

CREATE TABLE IF NOT EXISTS vendors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_code        VARCHAR(10) NOT NULL,

  name                VARCHAR(100) NOT NULL,
  category            VARCHAR(20) NOT NULL,
  -- FOOD | BEVERAGES | SNACKS | BOOKS | PHARMACY

  licence_number      VARCHAR(50),
  platform_number     VARCHAR(5),
  stall_number        VARCHAR(20),
  operating_hours     VARCHAR(50),
  -- e.g. "06:00 - 22:00"

  -- Schematic coordinates
  schematic_x         NUMERIC(7,2),
  schematic_y         NUMERIC(7,2),

  -- Ratings (denormalised for performance)
  average_rating      NUMERIC(3,2) DEFAULT 0,
  review_count        INTEGER DEFAULT 0,

  is_active           BOOLEAN DEFAULT true,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_station ON vendors(station_code);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);

CREATE TABLE IF NOT EXISTS vendor_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_vendor_id ON vendor_reviews(vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_review_per_day ON vendor_reviews (vendor_id, user_id, date_trunc('day', created_at AT TIME ZONE 'UTC'));

CREATE TABLE IF NOT EXISTS hawker_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station_code    VARCHAR(10) NOT NULL,
  description     VARCHAR(200),
  schematic_x     NUMERIC(7,2),
  schematic_y     NUMERIC(7,2),
  status          VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING | REVIEWED | ACTIONED
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hawker_station ON hawker_reports(station_code);
CREATE INDEX IF NOT EXISTS idx_hawker_status ON hawker_reports(status);

CREATE TABLE IF NOT EXISTS station_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station_code    VARCHAR(10) NOT NULL,
  lat             NUMERIC(10, 7),
  lng             NUMERIC(10, 7),
  expires_at      TIMESTAMPTZ NOT NULL,
  -- Set to NOW() + 2 hours on creation
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_station ON station_checkins(station_code);
CREATE INDEX IF NOT EXISTS idx_checkins_expires ON station_checkins(expires_at);
-- Composite index for active check-ins lookup
CREATE INDEX IF NOT EXISTS idx_checkins_active ON station_checkins(station_code, created_at, expires_at);

-- Travel intents: users see only their own
ALTER TABLE travel_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intents_own" ON travel_intents;
CREATE POLICY "intents_own" ON travel_intents
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
  );

-- Amenities: public read, authenticated write
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "amenities_public_read" ON amenities;
CREATE POLICY "amenities_public_read" ON amenities FOR SELECT USING (true);
DROP POLICY IF EXISTS "amenities_auth_update" ON amenities;
CREATE POLICY "amenities_auth_update" ON amenities FOR UPDATE USING (
  auth.uid() IS NOT NULL
);

-- Amenity votes: users insert their own
ALTER TABLE amenity_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "votes_own_insert" ON amenity_votes;
CREATE POLICY "votes_own_insert" ON amenity_votes FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
);
DROP POLICY IF EXISTS "votes_public_read" ON amenity_votes;
CREATE POLICY "votes_public_read" ON amenity_votes FOR SELECT USING (true);

-- Vendors: public read
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendors_public_read" ON vendors;
CREATE POLICY "vendors_public_read" ON vendors FOR SELECT USING (true);

-- Vendor reviews: users see all, insert own
ALTER TABLE vendor_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_public_read" ON vendor_reviews;
CREATE POLICY "reviews_public_read" ON vendor_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "reviews_own_insert" ON vendor_reviews;
CREATE POLICY "reviews_own_insert" ON vendor_reviews FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
);

-- Hawker reports: users insert own
ALTER TABLE hawker_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hawker_own_insert" ON hawker_reports;
CREATE POLICY "hawker_own_insert" ON hawker_reports FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
);

-- Station checkins: users own
ALTER TABLE station_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checkins_own" ON station_checkins;
CREATE POLICY "checkins_own" ON station_checkins FOR ALL USING (
  user_id = (SELECT id FROM users WHERE supabase_auth_uid = auth.uid()::text)
);
