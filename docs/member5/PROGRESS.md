# PROGRESS.md — Context Tracker
# Member 5 — Demand Intelligence & Station Amenity System
# FAR AWAY 2026 — RailSaathi Platform
#
# HOW TO USE THIS FILE:
# Update every checkbox after completing a slice.
# If you close Antigravity and start a new session, paste the ENTIRE
# content of this file as your first message. The AI will have full
# context of what is built, what is pending, and what decisions were made.

---

## Module Summary

I am building two connected features for RailSaathi:

FEATURE A — Travel Demand Intelligence
Unreserved (general class) passengers declare travel intent before
boarding. The system aggregates these into a demand forecast that shows
Railways which routes are about to be overloaded and which are
under-utilised. Passengers get a crowding prediction before they travel.

FEATURE B — Station Amenity Discovery
Passengers arriving at a station can see a schematic map of the station
with amenity locations overlaid: toilets, water, food stalls, medical
room, pre-paid auto stand, cloak room. Amenity statuses are crowd-sourced
(working / broken). Licensed vendors can be discovered and rated. Unlicensed
hawkers can be reported.

Both features plug into Member 1's spine (auth, context) and feed data
into Member 1's admin dashboard (demand map, station management table).

---

## Tech Stack

| Layer           | Technology                              | Owned By        |
|-----------------|-----------------------------------------|-----------------|
| Mobile Screens  | React Native (Expo)                     | Me              |
| Backend Routes  | Node.js + Express (Member 1's server)   | Me (one file)   |
| Database Tables | Supabase (Member 1's project)           | Me (migration)  |
| File Storage    | Supabase Storage                        | Me (new bucket) |
| Auth / Context  | Firebase + JWT + RailSaathiContext      | Member 1        |
| Deployment      | Render + Vercel + Supabase              | Member 1        |

---

## My Files in the Monorepo

I touch ONLY these paths:

```
railsaathi/
├── apps/mobile/src/screens/station/     ← I own this entire folder
│   ├── StationHomeScreen.js
│   ├── TravelIntentScreen.js
│   ├── CrowdingForecastScreen.js
│   ├── StationMapScreen.js
│   ├── AmenityDetailScreen.js
│   ├── VendorListScreen.js
│   ├── HawkerReportScreen.js
│   ├── components/
│   │   ├── StationSchematic.js
│   │   ├── AmenityMarker.js
│   │   ├── CrowdingBar.js
│   │   ├── VendorCard.js
│   │   └── DemandChart.js
│   ├── services/
│   │   └── stationService.js
│   └── hooks/
│       └── useStation.js
│
├── services/api/src/routes/
│   └── amenities.js                     ← I create this file
│
└── supabase/migrations/
    └── 005_amenities.sql                ← I create this file
```

---

## Dependencies on Member 1

Before I can fully integrate, I need Member 1 to have completed:
- [ ] Supabase project live (need SUPABASE_URL + SUPABASE_SERVICE_KEY)
- [ ] JWT_SECRET (for testing protected endpoints locally)
- [ ] verifyToken middleware at services/api/src/middleware/auth.js
- [ ] supabaseClient at services/api/src/db/supabaseClient.js
- [ ] apiClient at apps/mobile/src/services/apiClient.js
- [ ] RailSaathiContext exposing:
      currentUser.id, currentUser.preferred_class
      activeJourney.boarding_station, .destination_station, .travel_date

## Dependencies on Member 3

- [ ] station_coordinates table seeded with 50 stations (Member 3 owns this)
      I use station_code as a foreign key in my amenities table.
      Confirm with Member 3 before running 005_amenities.sql.

---

## Database Tables I Own (005_amenities.sql)

### travel_intents
Stores unreserved passenger travel declarations.
Key columns: user_id, from_station, to_station, travel_date, train_preference,
passenger_count, did_travel (bool, default false), is_surge (bool, computed),
created_at.
Unique constraint: one intent per user per travel_date per route.

### amenities
Stores physical amenity locations per station.
Key columns: station_code, amenity_type (TOILET | WATER | FOOD_STALL |
MEDICAL | AUTO_STAND | CLOAK_ROOM | ATM | WAITING_ROOM),
platform_number, description, is_licensed (bool), status
(WORKING | BROKEN | UNKNOWN), last_status_update, lat, lng,
schematic_x, schematic_y (for SVG map overlay), created_at.

### amenity_ratings
One row per user rating of an amenity.
Key columns: amenity_id, user_id, rating (1-5), comment, created_at.
Unique constraint: one rating per user per amenity.

### hawker_reports
Crowd-sourced unlicensed vendor reports.
Key columns: user_id, station_code, location_description, lat, lng,
status (ACTIVE | REVIEWED | DISMISSED), created_at.

---

## API Endpoints I Own (amenities.js)

Base path: /api/amenities

Protected endpoints (require JWT):
- POST   /api/amenities/intent              — declare travel intent
- GET    /api/amenities/intent/my           — get my declared intents
- DELETE /api/amenities/intent/:id          — cancel an intent
- GET    /api/amenities/stations/:code      — get station amenities
- PATCH  /api/amenities/:id/status          — update amenity status (crowd)
- POST   /api/amenities/:id/rate            — rate an amenity
- POST   /api/amenities/hawker-report       — report unlicensed vendor

Public endpoints (no auth):
- GET    /api/amenities/public/demand-map   — aggregated demand by route
- GET    /api/amenities/public/crowding/:from/:to/:date — crowding prediction

---

## Completed Slices

### Day 1 — Backend Foundation
- [ ] 5.1 — Environment setup (clone repo, .env, npm install, health check)
- [ ] 5.2 — Database migration (005_amenities.sql applied in Supabase)
- [ ] 5.3 — Amenity seed data (4 stations × 8 amenity types = 32 rows minimum)
- [ ] 5.4 — service-layer functions in amenity-service.js:
            computeCrowdingScore(), computeIsSurge(), buildDemandSummary()

### Day 2 — Travel Intent Endpoints
- [ ] 5.5 — POST /api/amenities/intent (with duplicate guard)
- [ ] 5.6 — GET /api/amenities/intent/my
- [ ] 5.7 — DELETE /api/amenities/intent/:id
- [ ] 5.8 — GET /api/amenities/public/demand-map (no auth)
- [ ] 5.9 — GET /api/amenities/public/crowding/:from/:to/:date (no auth)

### Day 3 — Amenity Endpoints + Mobile API Layer
- [ ] 5.10 — GET /api/amenities/stations/:code
- [ ] 5.11 — PATCH /api/amenities/:id/status (crowd-sourced working/broken)
- [ ] 5.12 — POST /api/amenities/:id/rate
- [ ] 5.13 — POST /api/amenities/hawker-report
- [ ] 5.14 — stationService.js (mobile API layer, all functions)

### Day 4 — Mobile Screens
- [ ] 5.15 — StationHomeScreen (entry point, two feature tiles)
- [ ] 5.16 — TravelIntentScreen (multi-field form)
- [ ] 5.17 — CrowdingForecastScreen (crowding score + chart)
- [ ] 5.18 — StationMapScreen (SVG schematic + amenity markers)
- [ ] 5.19 — AmenityDetailScreen (status toggle + ratings)
- [ ] 5.20 — VendorListScreen (licensed food stalls with ratings)
- [ ] 5.21 — HawkerReportScreen (unlicensed vendor report form)

### Day 5 — Integration + Seed
- [ ] 5.22 — Seed travel intents (200 records across 8 routes)
- [ ] 5.23 — Integration handoff to Member 1
- [ ] 5.24 — End-to-end test on integrated app

### Day 6 — Demo Prep
- [ ] 5.25 — Demo script rehearsed (see Demo Script section below)

---

## Key Decisions Made

(Fill in as you make decisions during development)

Examples of things to record here:
- "Used schematic_x / schematic_y as percentage-based SVG coordinates
   so the schematic scales to any screen width"
- "Skipped real-time crowding from GPS — used declared intent count only
   for the MVP crowding score"
- "Used a lookup table for historical crowding patterns instead of an
   ML model — hardcoded by route and day-of-week"
- "Decided to build station schematics for ADI, NDLS, MMCT, SBC only"

---

## Crowding Score Algorithm (document here once implemented)

```
computeCrowdingScore(fromStation, toStation, travelDate):

  1. Get declared intent count for this route+date from travel_intents table
  2. Get day of week from travelDate
  3. Look up historical baseline from ROUTE_BASELINE lookup table
     (hardcoded in amenity-service.js based on known patterns)
  4. Combine: score = min(10, (intentCount / baseline) * historicalWeight)
  5. Return: { score: 0-10, label: 'Low'|'Moderate'|'High'|'Very High'|'Extreme',
               recommendation: string }

ROUTE_BASELINE (fill in after implementing):
  NDLS-MMCT Monday: ___
  NDLS-MMCT Friday: ___
  ADI-MMCT Monday:  ___
  (etc.)
```

---

## Station Schematics Built

SVG schematics are hand-coded in StationSchematic.js.
Mark which stations are done:

- [ ] ADI — Ahmedabad Junction
      Platforms: ___  Amenities mapped: ___
- [ ] NDLS — New Delhi
      Platforms: ___  Amenities mapped: ___
- [ ] MMCT — Mumbai Central
      Platforms: ___  Amenities mapped: ___
- [ ] SBC — Bengaluru City
      Platforms: ___  Amenities mapped: ___

Note: schematics do not need to be architecturally accurate.
They need to be usable — passengers can read them on a phone.
Use simplified rectangles for platforms, circles for amenity markers.

---

## Seed Data Status

### Amenity seed (scripts/seed-amenities.js)
- [ ] Written
- [ ] Run successfully
- Stations covered: ___
- Total amenity rows: ___

### Travel intent seed (scripts/seed-intents.js)
- [ ] Written
- [ ] Run successfully
- Routes covered: ___
- Total intent rows: ___
- Surge routes (is_surge=true): ___

---

## Live Endpoints (fill in when working locally)

```
POST /api/amenities/intent              → tested ✓/✗
GET  /api/amenities/intent/my           → tested ✓/✗
GET  /api/amenities/public/demand-map   → tested ✓/✗
GET  /api/amenities/public/crowding/... → tested ✓/✗
GET  /api/amenities/stations/:code      → tested ✓/✗
PATCH /api/amenities/:id/status         → tested ✓/✗
POST  /api/amenities/:id/rate           → tested ✓/✗
POST  /api/amenities/hawker-report      → tested ✓/✗
```

---

## What Member 1 Needs From Me (Integration Checklist)

Hand these off on Day 5:

- [ ] 005_amenities.sql committed and applied in Supabase
- [ ] services/api/src/routes/amenities.js committed and tested
- [ ] services/api/src/services/amenity-service.js committed
- [ ] apps/mobile/src/screens/station/ all files committed
- [ ] Mock context replaced with useRailSaathi() in all screens
- [ ] All hardcoded localhost URLs replaced with API_BASE_URL constant
- [ ] No .env values hardcoded in any committed file
- [ ] Seed scripts committed and run (amenities + travel intents)
- [ ] Demand map endpoint working without auth header
- [ ] Crowding prediction endpoint working without auth header
- [ ] Admin dashboard data confirmed: demand-map route feeds the
      Demand Forecast page that Member 1 builds

Exact line for Member 1 to add in index.js:
  app.use('/api/amenities', require('./routes/amenities'))

---

## Demo Script (90 seconds — rehearse before Day 6)

Practice this until it flows naturally without reading:

[0s]   Open Station tab → StationHomeScreen
       Two tiles visible: "Demand Forecast" and "Station Map"

[5s]   Tap "Demand Forecast" → TravelIntentScreen
       Say: "An unreserved passenger is planning to travel tomorrow."

[10s]  Fill intent form:
       From: ADI (Ahmedabad), To: MMCT (Mumbai), Date: tomorrow, Count: 1
       Tap Submit

[20s]  → CrowdingForecastScreen appears:
       Route: ADI → MMCT
       Crowding Score: 8/10 — VERY HIGH
       Bar chart shows Monday morning peak
       Recommendation: "Consider 11:45 AM Shatabdi — score 4/10"
       Say: "She now knows her 7 AM train will be overloaded.
             Railways knows this route needs an extra coach."

[35s]  Tap back → StationHomeScreen → Tap "Station Map"
       → StationMapScreen: "Select Station"
       Select: ADI (Ahmedabad Junction)

[40s]  → SVG schematic of Ahmedabad Junction appears
       Amenity markers visible on platforms
       Say: "She just arrived. She needs a toilet."

[45s]  Tap the toilet marker on Platform 1
       → AmenityDetailScreen: "Platform 1 Toilet — WORKING"
       Last confirmed: 20 minutes ago
       Rating: 3.2/5 (47 ratings)
       Tap "Mark as Working" → counter updates

[55s]  Navigate to VendorListScreen
       Show: 3 licensed food stalls with ratings
       Say: "Licensed vendors are discoverable. No more hunting for food."

[65s]  Tap "Report Unlicensed Hawker" → HawkerReportScreen
       GPS fills automatically
       Select: Food Hawker → Tap Report
       Say: "Station managers get an alert. Revenue leakage tracked."

[80s]  Switch to admin dashboard on laptop:
       Demand Forecast page shows ADI-MMCT spike
       Say: "For the first time, Railways can see this coming 24 hours ahead."

Total: ~85 seconds.

The single most important moment: the Crowding Score screen showing 8/10
with the recommendation for an alternate train. That is the insight that
does not exist anywhere in Indian Railways today.

---

## Blockers / Questions

(Fill in as they arise — clear them before moving to the next slice)

Current blockers:
- Waiting for: SUPABASE_URL and SUPABASE_SERVICE_KEY from Member 1
- Waiting for: Confirmation that Member 3 has seeded station_coordinates
  (I reference station_code in my amenities table — need those rows to exist)
- Waiting for: apiClient.js from Member 1 (needed for stationService.js)

---

## Log of Prompts

### Prompt M1-4 — Completed
- **What was built:** StationNavigator with safe dynamic import fallback
- **Files created:** apps/mobile/src/navigation/StationNavigator.js
- **Files modified:** apps/mobile/src/constants/index.js (added STATION_HOME, STATION_DETAIL, STATION_MAP), apps/mobile/src/navigation/AppNavigator.js (wired StationNavigator)
- **Notes:** Uses try/catch require so app doesn't crash before Member 5 adds their screens.
- **Completion:** M1: 4 / 8 prompts (50%)

