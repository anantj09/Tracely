# Architecture & Design Document
# Member 5 — Demand Intelligence & Station Amenity System
# FAR AWAY 2026 — RailSaathi Platform

---

## 1. Technology Stack

Member 5 does NOT set up any infrastructure. Member 1 owns the repo,
Supabase project, Render deployment, and Expo app. You only add files
inside the existing structure.

| Layer              | Technology                         | Owned By        |
|--------------------|------------------------------------|-----------------|
| Mobile Screens     | React Native (Expo)                | You             |
| Schematic Maps     | react-native-svg + custom renderer | You             |
| Backend Routes     | Node.js + Express                  | You (new file)  |
| Database Tables    | Supabase (PostgreSQL)              | You (migration) |
| File Storage       | Supabase Storage                   | You (new bucket)|
| Location Check     | Expo Location (Haversine formula)  | You             |
| Auth / Context     | Firebase + JWT + RailSaathiContext | Member 1        |
| Deployment         | Render + Vercel + Supabase         | Member 1        |

---

## 2. Where Your Files Live in the Monorepo

You touch ONLY these locations. Do not modify anything outside these paths.

```
railsaathi/
├── apps/
│   └── mobile/
│       └── src/
│           └── screens/
│               └── station/                  ← YOU OWN THIS ENTIRE FOLDER
│                   ├── StationHomeScreen.js
│                   ├── IntentFormScreen.js
│                   ├── CrowdingResultScreen.js
│                   ├── StationSelectScreen.js
│                   ├── StationSchematicScreen.js
│                   ├── AmenityDetailScreen.js
│                   ├── VendorDetailScreen.js
│                   ├── RateVendorScreen.js
│                   ├── ReportHawkerScreen.js
│                   ├── CheckInScreen.js
│                   ├── components/
│                   │   ├── SchematicMap.js       ← core map renderer
│                   │   ├── AmenityMarker.js
│                   │   ├── VendorMarker.js
│                   │   ├── CrowdingGauge.js
│                   │   ├── StatusToggle.js
│                   │   └── StarRating.js
│                   ├── data/
│                   │   ├── stations/
│                   │   │   ├── CSTM.json         ← Mumbai CST schematic
│                   │   │   ├── NDLS.json         ← New Delhi schematic
│                   │   │   ├── ADI.json          ← Ahmedabad schematic
│                   │   │   └── SBC.json          ← Bengaluru schematic
│                   ├── services/
│                   │   └── stationService.js
│                   └── hooks/
│                       └── useStation.js
│
├── services/
│   └── api/
│       └── src/
│           └── routes/
│               └── amenities.js              ← YOU CREATE THIS FILE
│
└── supabase/
    └── migrations/
        └── 005_amenities.sql                 ← YOU CREATE THIS FILE
```

---

## 3. Database Schema — Member 5 Tables

Run 005_amenities.sql in Supabase SQL editor AFTER Member 1 has run
001_core_schema.sql. Note: station_coordinates table is already created
by Member 3 in 003_complaints.sql. Do NOT recreate it.

### Table: travel_intents
Stores every declared travel intent.

```sql
CREATE TABLE travel_intents (
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

CREATE INDEX idx_intents_user_id ON travel_intents(user_id);
CREATE INDEX idx_intents_route ON travel_intents(from_station, to_station);
CREATE INDEX idx_intents_travel_date ON travel_intents(travel_date);
CREATE INDEX idx_intents_created_at ON travel_intents(created_at);
```

### Table: amenities
One row per amenity per station. Pre-seeded for the 4 demo stations.

```sql
CREATE TABLE amenities (
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

CREATE INDEX idx_amenities_station ON amenities(station_code);
CREATE INDEX idx_amenities_type ON amenities(amenity_type);
CREATE INDEX idx_amenities_status ON amenities(current_status);
```

### Table: amenity_votes
One row per vote cast by a user on an amenity status.

```sql
CREATE TABLE amenity_votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id      UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote            VARCHAR(10) NOT NULL,
  -- WORKING | BROKEN

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- One vote per user per amenity per hour (prevent spam)
  CONSTRAINT unique_vote_per_hour
    UNIQUE (amenity_id, user_id, date_trunc('hour', created_at))
);

CREATE INDEX idx_votes_amenity_id ON amenity_votes(amenity_id);
CREATE INDEX idx_votes_created_at ON amenity_votes(created_at);
```

### Table: vendors
Licensed vendors registered at stations.

```sql
CREATE TABLE vendors (
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

CREATE INDEX idx_vendors_station ON vendors(station_code);
CREATE INDEX idx_vendors_category ON vendors(category);
```

### Table: vendor_reviews
One row per review submitted by a user for a vendor.

```sql
CREATE TABLE vendor_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  -- One review per user per vendor per day
  CONSTRAINT unique_review_per_day
    UNIQUE (vendor_id, user_id, DATE(created_at))
);

CREATE INDEX idx_reviews_vendor_id ON vendor_reviews(vendor_id);
```

### Table: hawker_reports
Unlicensed vendor reports filed by passengers.

```sql
CREATE TABLE hawker_reports (
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

CREATE INDEX idx_hawker_station ON hawker_reports(station_code);
CREATE INDEX idx_hawker_status ON hawker_reports(status);
```

### Table: station_checkins
GPS-based check-ins at stations for crowding signal.

```sql
CREATE TABLE station_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station_code    VARCHAR(10) NOT NULL,
  lat             NUMERIC(10, 7),
  lng             NUMERIC(10, 7),
  expires_at      TIMESTAMPTZ NOT NULL,
  -- Set to NOW() + 2 hours on creation
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkins_station ON station_checkins(station_code);
CREATE INDEX idx_checkins_expires ON station_checkins(expires_at);
-- Partial index for active check-ins only
CREATE INDEX idx_checkins_active ON station_checkins(station_code, created_at)
  WHERE expires_at > NOW();
```

### Row-Level Security

```sql
-- Travel intents: users see only their own
ALTER TABLE travel_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intents_own" ON travel_intents
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
  );

-- Amenities: public read, authenticated write
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amenities_public_read" ON amenities FOR SELECT USING (true);
CREATE POLICY "amenities_auth_update" ON amenities FOR UPDATE USING (
  auth.uid() IS NOT NULL
);

-- Amenity votes: users insert their own
ALTER TABLE amenity_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_own_insert" ON amenity_votes FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
);
CREATE POLICY "votes_public_read" ON amenity_votes FOR SELECT USING (true);

-- Vendors: public read
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors_public_read" ON vendors FOR SELECT USING (true);

-- Vendor reviews: users see all, insert own
ALTER TABLE vendor_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON vendor_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_own_insert" ON vendor_reviews FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
);

-- Hawker reports: users insert own
ALTER TABLE hawker_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hawker_own_insert" ON hawker_reports FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
);

-- Station checkins: users own
ALTER TABLE station_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins_own" ON station_checkins FOR ALL USING (
  user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
);
```

---

## 4. API Contracts — Member 5 Endpoints

All endpoints live in services/api/src/routes/amenities.js
Base path: /api/amenities
Protected unless noted.

---

### POST /api/amenities/intent
Declare a travel intent and get crowding prediction.

Request body:
```json
{
  "from_station": "NDLS",
  "to_station": "MMCT",
  "travel_date": "2026-06-16",
  "preferred_train": "12951",
  "class": "GEN"
}
```

Validations:
- from_station, to_station: 2–7 uppercase chars
- travel_date: today or future date
- from_station !== to_station

Server-side logic:
1. Count existing intents for same route + date:
   ```javascript
   const { count } = await supabase
     .from('travel_intents')
     .select('id', { count: 'exact' })
     .eq('from_station', from_station)
     .eq('to_station', to_station)
     .eq('travel_date', travel_date)
   ```
2. Calculate crowding score (see crowding engine below)
3. Determine label and is_surge:
   score >= 8 → VERY_CROWDED, is_surge = true
   score >= 5 → MODERATE
   else → COMFORTABLE
4. Insert into travel_intents
5. Return 201 with intent + crowding result

Response (201):
```json
{
  "data": {
    "id": "uuid",
    "from_station": "NDLS",
    "to_station": "MMCT",
    "travel_date": "2026-06-16",
    "crowding_score": 8.5,
    "crowding_label": "VERY_CROWDED",
    "is_surge_route": true,
    "alternate_trains": [
      { "train_number": "12953", "name": "August Kranti Rajdhani", "crowding_score": 5.0 }
    ]
  },
  "message": "Intent declared. This route is expected to be very crowded."
}
```

---

### Crowding Prediction Engine
Lives in services/api/src/services/demand-service.js

```javascript
const KNOWN_CONGESTED_ROUTES = {
  'MMCT-PUNE': { base: 8, label: 'Mumbai-Pune' },
  'PUNE-MMCT': { base: 8, label: 'Pune-Mumbai' },
  'NDLS-LKO':  { base: 7, label: 'Delhi-Lucknow' },
  'LKO-NDLS':  { base: 7, label: 'Lucknow-Delhi' },
  'NDLS-PNBE': { base: 7, label: 'Delhi-Patna' },
  'PNBE-NDLS': { base: 7, label: 'Patna-Delhi' },
  'CSTM-BSL':  { base: 7, label: 'Mumbai-Bhusawal' },
  'HWH-PNBE':  { base: 7, label: 'Howrah-Patna' },
  'MAS-BZA':   { base: 6, label: 'Chennai-Vijayawada' },
  'SBC-MAS':   { base: 6, label: 'Bengaluru-Chennai' },
}

function calculateCrowdingScore(fromStation, toStation, travelDate, intentCount) {
  const routeKey = `${fromStation}-${toStation}`
  const base = KNOWN_CONGESTED_ROUTES[routeKey]?.base ?? 4

  const date = new Date(travelDate)
  const dayOfWeek = date.getDay() // 0=Sun, 6=Sat
  const dayModifier =
    dayOfWeek === 1 || dayOfWeek === 5 ? 1.0 :  // Monday/Friday
    dayOfWeek === 0 || dayOfWeek === 6 ? 0.5 :  // Weekend
    0

  const intentModifier = Math.min(Math.floor(intentCount / 10) * 0.5, 2.0)

  const score = Math.min(base + dayModifier + intentModifier, 10)
  return Math.round(score * 10) / 10 // round to 1 decimal
}
```

---

### GET /api/amenities/intents
Get all declared intents for the logged-in user.

Response (200): Array of intent objects ordered by travel_date ASC.

---

### GET /api/amenities/station/:code
Get all data for a station: amenities list + vendors list.
No auth required (public data).

Path param: code = station code (e.g. NDLS)

Response (200):
```json
{
  "data": {
    "station_code": "NDLS",
    "station_name": "New Delhi",
    "amenities": [
      {
        "id": "uuid",
        "amenity_type": "TOILET",
        "label": "Platform 1 Toilet",
        "platform_number": "1",
        "schematic_x": 120.0,
        "schematic_y": 340.0,
        "current_status": "WORKING",
        "last_vote_at": "2026-06-14T20:00:00.000Z"
      }
    ],
    "vendors": [
      {
        "id": "uuid",
        "name": "Haldiram's Snacks",
        "category": "FOOD",
        "platform_number": "2",
        "stall_number": "F-14",
        "operating_hours": "06:00 - 22:00",
        "average_rating": 4.2,
        "review_count": 87,
        "schematic_x": 340.0,
        "schematic_y": 180.0
      }
    ]
  }
}
```

---

### POST /api/amenities/vote
Cast a working/broken vote for an amenity.

Request body:
```json
{
  "amenity_id": "uuid",
  "vote": "BROKEN"
}
```

Validations:
- amenity_id must exist
- vote must be WORKING or BROKEN
- One vote per user per amenity per hour (unique constraint handles this;
  catch the constraint error and return 429 Too Many Requests)

Server-side logic:
1. Insert vote into amenity_votes
2. Count recent votes (last 2 hours) for this amenity:
   ```javascript
   const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
   const { data: recentVotes } = await supabase
     .from('amenity_votes')
     .select('vote')
     .eq('amenity_id', amenity_id)
     .gte('created_at', twoHoursAgo.toISOString())
   ```
3. Count BROKEN votes vs WORKING votes
4. Update amenity current_status:
   - If BROKEN votes >= 3: current_status = 'CONFIRMED_BROKEN', fire admin alert
   - If WORKING votes >= 3 and current was CONFIRMED_BROKEN: current_status = 'WORKING'
   - If BROKEN >= WORKING: current_status = 'BROKEN'
   - If WORKING > BROKEN: current_status = 'WORKING'
5. Update amenity: current_status, last_vote_at = NOW(), updated_at = NOW()
6. Return updated amenity

Response (200): Updated amenity object.
Response (429): { "error": "You already voted for this amenity recently." }

---

### POST /api/amenities/vendor-review
Submit a rating for a vendor.

Request body:
```json
{
  "vendor_id": "uuid",
  "rating": 4,
  "comment": "Good samosas, a bit slow."
}
```

Validations:
- vendor_id must exist
- rating: integer 1–5
- comment: optional, max 100 chars
- One review per user per vendor per day (unique constraint)

Server-side logic:
1. Insert into vendor_reviews
2. Recalculate vendor average_rating and review_count:
   ```javascript
   const { data: reviews } = await supabase
     .from('vendor_reviews')
     .select('rating')
     .eq('vendor_id', vendor_id)
   const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
   await supabase.from('vendors')
     .update({ average_rating: avg.toFixed(2), review_count: reviews.length })
     .eq('id', vendor_id)
   ```
3. Return updated vendor object

Response (201): { data: { vendor: updatedVendor }, message: "Review submitted." }
Response (409): { error: "You already reviewed this vendor today." }

---

### POST /api/amenities/hawker-report
Report an unlicensed vendor.

Request body:
```json
{
  "station_code": "NDLS",
  "description": "Selling uncovered food near platform 3",
  "schematic_x": 450.0,
  "schematic_y": 220.0
}
```

Response (201): Created hawker_report object.

---

### POST /api/amenities/checkin
Check into a station (GPS-verified).

Request body:
```json
{
  "station_code": "NDLS",
  "lat": 28.6419,
  "lng": 77.2194
}
```

Server-side logic:
1. Fetch station coordinates from station_coordinates table
2. Calculate Haversine distance between user's GPS and station GPS:
   ```javascript
   function haversineDistance(lat1, lng1, lat2, lng2) {
     const R = 6371e3 // Earth radius in metres
     const φ1 = lat1 * Math.PI/180
     const φ2 = lat2 * Math.PI/180
     const Δφ = (lat2-lat1) * Math.PI/180
     const Δλ = (lng2-lng1) * Math.PI/180
     const a = Math.sin(Δφ/2)**2 +
               Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2
     return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
   }
   ```
3. If distance > 500 metres: return 400
   { error: "You don't appear to be at this station.", code: "NOT_AT_STATION" }
4. Insert station_checkin with expires_at = NOW() + 2 hours
5. Count active check-ins at this station (where expires_at > NOW()):
   If count >= 10: flag the station (update a Redis key or a simple
   in-memory Map on the server for MVP)
6. Return 201 with check-in record + current crowding count

---

### GET /api/amenities/demand/forecast (Admin — no admin check for MVP)
Returns demand forecast for the next 7 days across all routes.

Response (200):
```json
{
  "data": {
    "forecast": [
      {
        "from_station": "NDLS",
        "to_station": "MMCT",
        "dates": [
          { "date": "2026-06-15", "intent_count": 23, "crowding_score": 8.5, "is_surge": true },
          { "date": "2026-06-16", "intent_count": 11, "crowding_score": 6.0, "is_surge": false }
        ]
      }
    ],
    "surge_alerts": [
      { "from_station": "NDLS", "to_station": "MMCT",
        "date": "2026-06-15", "intent_count": 23, "score": 8.5 }
    ]
  }
}
```

---

## 5. Station Schematic Data Format

Each station's JSON file lives in apps/mobile/src/screens/station/data/stations/
The schematic coordinate space is always 1000 units wide × 600 units tall.
Scale to the device screen by multiplying by (screenWidth / 1000).

### JSON Structure
```json
{
  "station_code": "NDLS",
  "station_name": "New Delhi Railway Station",
  "platforms": [
    { "id": "P1", "label": "Platform 1", "x1": 50, "y1": 100, "x2": 950, "y2": 140 },
    { "id": "P2", "label": "Platform 2", "x1": 50, "y1": 180, "x2": 950, "y2": 220 },
    { "id": "P3", "label": "Platform 3", "x1": 50, "y1": 260, "x2": 950, "y2": 300 }
  ],
  "structures": [
    { "type": "CONCOURSE", "label": "Main Concourse", "x1": 50, "y1": 400, "x2": 950, "y2": 550 },
    { "type": "ENTRY", "label": "Ajmeri Gate Entry", "x1": 50, "y1": 530, "x2": 200, "y2": 570 },
    { "type": "ENTRY", "label": "Paharganj Entry",  "x1": 800, "y1": 530, "x2": 950, "y2": 570 }
  ],
  "tracks": [
    { "id": "T1", "x1": 50, "y1": 140, "x2": 950, "y2": 180 },
    { "id": "T2", "x1": 50, "y1": 220, "x2": 950, "y2": 260 }
  ]
}
```

### SchematicMap.js Renderer
```javascript
// The SchematicMap component:
// 1. Takes stationData (JSON), amenities (array), vendors (array)
// 2. Scales all coordinates by (deviceWidth / 1000)
// 3. Renders:
//    - Platform rectangles (light grey fill, dark border)
//    - Track lines (thin dark lines between platforms)
//    - Structure rectangles (concourse, entries)
//    - AmenityMarker at (schematic_x, schematic_y) for each amenity
//    - VendorMarker at (schematic_x, schematic_y) for each vendor
// 4. Uses react-native-svg <Svg>, <Rect>, <Line>, <Circle>, <Text>

import Svg, { Rect, Line, Circle, Text, G } from 'react-native-svg'
```

---

## 6. Station Schematic Seed Data

### NDLS (New Delhi) — Amenities to Pre-Seed
Pre-seed these in the amenities table (schematic_x/y are approximate):

| Type           | Label                     | Platform | x    | y   |
|----------------|---------------------------|----------|------|-----|
| TOILET         | Platform 1 Toilet         | 1        | 120  | 120 |
| TOILET         | Platform 8 Toilet         | 8        | 880  | 120 |
| WATER          | Platform 1 Water Point    | 1        | 200  | 120 |
| WATER          | Concourse Water Point     | null     | 500  | 460 |
| FOOD_STALL     | Platform 1 Refreshments   | 1        | 300  | 120 |
| FOOD_STALL     | Concourse Food Court      | null     | 600  | 460 |
| MEDICAL        | Medical Room              | null     | 750  | 460 |
| CLOAK_ROOM     | Cloak Room                | null     | 150  | 460 |
| ATM            | SBI ATM                   | null     | 400  | 460 |
| PREPAID_AUTO   | Prepaid Auto Stand        | null     | 900  | 550 |
| WAITING_ROOM   | Waiting Room              | null     | 250  | 460 |
| ENQUIRY        | Enquiry Counter           | null     | 500  | 540 |

Create similar sets for CSTM, ADI, and SBC.

### Vendors to Pre-Seed (NDLS example)
| Name                | Category  | Platform | Stall | Rating | x   | y   |
|---------------------|-----------|----------|-------|--------|-----|-----|
| Haldiram's Snacks   | FOOD      | 1        | F-02  | 4.2    | 350 | 120 |
| Nescafe Kiosk       | BEVERAGES | 2        | B-05  | 3.8    | 350 | 200 |
| Indian Oil Bakery   | SNACKS    | null     | C-11  | 4.0    | 650 | 460 |
| Wheeler's Books     | BOOKS     | 3        | K-03  | 4.5    | 700 | 280 |
| Jan Aushadhi        | PHARMACY  | null     | P-01  | 4.7    | 800 | 460 |

---

## 7. Mobile Screen Architecture

### Navigation inside Station tab
```
StationTab (bottom tab)
└── StationStack (stack navigator)
    ├── StationHomeScreen          (default — 3 tiles: Plan, Find, Check In)
    ├── IntentFormScreen           (declare travel intent)
    ├── CrowdingResultScreen       (show prediction result)
    ├── StationSelectScreen        (pick one of 4 stations)
    ├── StationSchematicScreen     (the map with markers)
    ├── AmenityDetailScreen        (bottom sheet for amenity)
    ├── VendorDetailScreen         (vendor card + reviews)
    ├── RateVendorScreen           (star rating form)
    ├── ReportHawkerScreen         (unlicensed vendor report)
    └── CheckInScreen              (GPS check-in)
```

---

## 8. Local Development Setup

```bash
cd railsaathi/services/api
# .env needs: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
node src/index.js
```

### Test key endpoints
```bash
TOKEN="eyJ..."

# 1. Declare intent
curl -X POST http://localhost:3000/api/amenities/intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from_station":"NDLS","to_station":"MMCT","travel_date":"2026-06-16","class":"GEN"}'

# 2. Get station data (no auth)
curl http://localhost:3000/api/amenities/station/NDLS

# 3. Vote on amenity
curl -X POST http://localhost:3000/api/amenities/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amenity_id":"<uuid>","vote":"BROKEN"}'

# 4. Get demand forecast
curl http://localhost:3000/api/amenities/demand/forecast
```

### Temporarily mock context for mobile testing
```javascript
// Top of StationHomeScreen.js — remove before Day 5
const currentUser = { id: 'test-uuid', preferred_class: 'GEN' }
const activeJourney = {
  train_number: '12951',
  boarding_station: 'NDLS'
}
// Replace with:
// const { currentUser, activeJourney } = useRailSaathi()
```

### Testing the Schematic Map
To test without a real device:
1. Run on Expo Go (scan QR code)
2. Navigate to StationSchematicScreen with NDLS data
3. Confirm platforms render as rectangles
4. Confirm amenity markers appear at correct positions
5. Tap a marker: bottom sheet appears with amenity details
