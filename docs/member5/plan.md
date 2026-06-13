# Implementation Plan (plan.md)
# Member 5 — Demand Intelligence & Station Amenity System
# FAR AWAY 2026 — RailSaathi Platform

---

## Overview
6 days. You work independently from Members 2, 3, 4. You need from Member 1:
Supabase URL + service key, repo clone, JWT middleware path. Get these by
end of Day 1. One important dependency: Member 3 seeds the
station_coordinates table in 003_complaints.sql. Your checkin endpoint
reads from it. Confirm with Member 3 that the table has the 4 demo stations
(NDLS, CSTM, ADI, SBC) seeded before you test the checkin endpoint.

Your module has two distinct parts — backend (Days 1–2) and mobile (Days 3–4).
The station schematic JSON files are the most time-consuming piece. Build
them on Day 2 in parallel with the remaining API endpoints.

All slices are atomic — complete and test each before moving to the next.

---

## Day 1 — Backend Foundation

### Slice 5.1 — Environment Setup
Steps:
1. Clone the GitHub repo from Member 1
2. Navigate to services/api/
3. Get from Member 1: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
4. Create local .env with these values (never commit it)
5. npm install — confirm all dependencies are installed
6. Run: node src/index.js → confirm GET /api/health returns 200
7. Install react-native-svg in the mobile app folder for later:
   cd apps/mobile && npx expo install react-native-svg

Acceptance test: Server starts without errors. Health check returns 200.
react-native-svg is in apps/mobile/package.json.

---

### Slice 5.2 — Database Migration
Steps:
1. Open Supabase SQL editor (URL from Member 1)
2. Confirm Member 3's 003_complaints.sql is already applied
   (check that station_coordinates table exists — you need it for checkin)
3. Paste and run supabase/migrations/005_amenities.sql containing:
   - travel_intents table + indexes + RLS
   - amenities table + indexes + RLS
   - amenity_votes table + indexes + RLS + unique constraint
   - vendors table + indexes + RLS
   - vendor_reviews table + indexes + RLS + unique constraint
   - hawker_reports table + indexes + RLS
   - station_checkins table + indexes + RLS
   (Full SQL from ARCHITECTURE.md Section 3)
4. In Supabase Table Editor: confirm all 6 tables exist
5. Confirm the unique constraints:
   - amenity_votes: unique (amenity_id, user_id, date_trunc('hour', created_at))
   - vendor_reviews: unique (vendor_id, user_id, DATE(created_at))

Acceptance test: All 6 tables visible. Both unique constraints listed in
the indexes tab for their respective tables.

---

### Slice 5.3 — Service Layer
Steps:
1. Create services/api/src/services/demand-service.js
   Add the following (pure functions, no DB calls):

   calculateCrowdingScore(fromStation, toStation, travelDate, intentCount):
   - Uses KNOWN_CONGESTED_ROUTES lookup table (full table in ARCHITECTURE.md Section 4)
   - Applies day-of-week modifier (Monday/Friday +1, weekend +0.5)
   - Applies intent modifier (every 10 intents on same route/date = +0.5, cap +2)
   - Caps at 10, rounds to 1 decimal
   - Returns the numeric score

   getCrowdingLabel(score):
   - score >= 8: 'VERY_CROWDED'
   - score >= 5: 'MODERATE'
   - else: 'COMFORTABLE'

   getAlternateTrains(fromStation, toStation):
   - Returns a hardcoded array of 2 alternate trains for known congested routes
   - For NDLS-MMCT: return [{ train_number: '12953', name: 'August Kranti Rajdhani' }]
   - For unknown routes: return empty array []
   - This is a hardcoded lookup table — no DB call needed

   haversineDistance(lat1, lng1, lat2, lng2):
   - Pure distance function in metres
   - Full formula in ARCHITECTURE.md Section 4 (checkin endpoint)

2. Write a simple test at the bottom of the file (comment-gated):
   ```javascript
   // Quick self-test — run: node src/services/demand-service.js
   // console.log(calculateCrowdingScore('NDLS', 'MMCT', '2026-06-16', 25))
   // Should return between 8.0 and 10.0 (high congestion route, 25 intents)
   // console.log(haversineDistance(28.64, 77.21, 28.65, 77.22))
   // Should return approximately 1500 metres
   ```

Acceptance test:
- calculateCrowdingScore('NDLS', 'MMCT', '2026-06-16', 25) returns >= 8.0
- calculateCrowdingScore('NDLS', 'MMCT', '2026-06-16', 0) returns between 7.0 and 9.5
  (Monday/Friday modifier applies)
- getCrowdingLabel(8.5) returns 'VERY_CROWDED'
- getCrowdingLabel(5.5) returns 'MODERATE'
- getCrowdingLabel(3.0) returns 'COMFORTABLE'
- haversineDistance(28.6419, 77.2194, 28.6419, 77.2194) returns 0
- haversineDistance(28.6419, 77.2194, 28.6519, 77.2294) returns approx 1400–1600m

---

### Slice 5.4 — Travel Intent Endpoint
Steps:
1. Create services/api/src/routes/amenities.js
2. Install express-validator if not already in package.json:
   npm install express-validator (only if not already installed)
3. Implement POST /api/amenities/intent (protected with verifyToken):

   Step A — Validate:
   - from_station: non-empty string, max 7 chars, uppercase only
   - to_station: same, must be different from from_station
   - travel_date: valid date string, must be today or future
     ```javascript
     const today = new Date().toISOString().slice(0, 10)
     if (travel_date < today) return res.status(400).json({ error: 'Travel date must be today or future' })
     ```
   - class: must be 'GEN' only for this feature (others not relevant)

   Step B — Count existing intents for same route + date:
   ```javascript
   const { count } = await supabase
     .from('travel_intents')
     .select('id', { count: 'exact', head: true })
     .eq('from_station', from_station)
     .eq('to_station', to_station)
     .eq('travel_date', travel_date)
   ```

   Step C — Calculate score and label using demand-service.js

   Step D — Insert into travel_intents table with crowding_score,
   crowding_label, is_surge_route

   Step E — Get alternate trains from getAlternateTrains()

   Step F — Return 201 with intent + crowding result + alternate_trains

4. Implement GET /api/amenities/intents (protected):
   - Query travel_intents WHERE user_id = req.user.user_id
   - Order by travel_date ASC
   - Return array

5. Register route temporarily for local testing:
   In LOCAL copy of index.js: app.use('/api/amenities', require('./routes/amenities'))

Acceptance test:
- POST with NDLS → MMCT on a future Monday → crowding_score >= 8.0, label VERY_CROWDED
- POST with from_station === to_station → 400
- POST with past date → 400
- POST twice for same route+date → second post should still succeed
  (users can declare intent multiple times — that is intentional, it adds to the count)
- GET intents returns only the current user's intents

---

## Day 2 — Remaining Endpoints + Station Schematics

### Slice 5.5 — Station Data Endpoints
Steps:
1. Implement GET /api/amenities/station/:code (NO AUTH required):
   - Validate code is 2–7 chars
   - Fetch from station_coordinates: station name for the code
     If not found: 404 { error: 'Station not found' }
   - Fetch all amenities WHERE station_code = code
   - Fetch all vendors WHERE station_code = code AND is_active = true
   - Return combined object: { station_code, station_name, amenities, vendors }
   - Add cache header: Cache-Control: public, max-age=60
     (station layout changes rarely — 1 minute stale is fine)

2. Register this route BEFORE any /:id routes to avoid path conflicts.

Acceptance test:
- GET /api/amenities/station/NDLS without auth header → 200
  (amenities and vendors are empty before seeding — that is expected)
- GET /api/amenities/station/XXXX → 404
- Response shape matches the contract in ARCHITECTURE.md Section 4

---

### Slice 5.6 — Amenity Vote Endpoint
Steps:
1. Implement POST /api/amenities/vote (protected):

   Step A — Validate:
   - amenity_id: required, must be a valid UUID
   - vote: must be 'WORKING' or 'BROKEN'

   Step B — Confirm amenity exists:
   ```javascript
   const { data: amenity } = await supabase
     .from('amenities').select('*').eq('id', amenity_id).single()
   if (!amenity) return res.status(404).json({ error: 'Amenity not found' })
   ```

   Step C — Insert into amenity_votes:
   ```javascript
   const { error: insertError } = await supabase
     .from('amenity_votes')
     .insert({ amenity_id, user_id: req.user.user_id, vote })
   // If unique constraint violation (already voted this hour):
   if (insertError?.code === '23505') {
     return res.status(429).json({
       error: 'You already voted for this amenity recently.',
       code: 'ALREADY_VOTED'
     })
   }
   ```

   Step D — Count recent votes (last 2 hours) and recalculate status:
   ```javascript
   const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
   const { data: recentVotes } = await supabase
     .from('amenity_votes')
     .select('vote')
     .eq('amenity_id', amenity_id)
     .gte('created_at', twoHoursAgo)

   const brokenCount = recentVotes.filter(v => v.vote === 'BROKEN').length
   const workingCount = recentVotes.filter(v => v.vote === 'WORKING').length

   let newStatus = amenity.current_status
   if (brokenCount >= 3) newStatus = 'CONFIRMED_BROKEN'
   else if (workingCount >= 3 && amenity.current_status === 'CONFIRMED_BROKEN')
     newStatus = 'WORKING'
   else if (brokenCount > workingCount) newStatus = 'BROKEN'
   else if (workingCount > brokenCount) newStatus = 'WORKING'
   ```

   Step E — Update amenity: current_status, last_vote_at, updated_at

   Step F — If newStatus changed TO 'CONFIRMED_BROKEN': log admin alert:
   ```javascript
   console.log(`[AMENITY_ALERT] station=${amenity.station_code} ` +
     `amenity=${amenity.label} status=CONFIRMED_BROKEN at=${new Date().toISOString()}`)
   ```
   In production this would fire a real admin notification. For MVP: log is enough.
   The admin dashboard reads directly from the amenities table.

   Step G — Return updated amenity object

Acceptance test:
- Vote BROKEN on an amenity → status changes to BROKEN
- Vote BROKEN 3 times (3 different user UUIDs in test) → status CONFIRMED_BROKEN
- Vote again within same hour with same user → 429
- Vote WORKING 3 times after CONFIRMED_BROKEN → status reverts to WORKING

---

### Slice 5.7 — Vendor Review + Hawker + Checkin Endpoints
Steps:
1. Implement POST /api/amenities/vendor-review (protected):
   - Validate: vendor_id (UUID), rating (integer 1–5), comment (optional, max 100)
   - Confirm vendor exists
   - Insert into vendor_reviews
   - If unique constraint violation: 409 "Already reviewed today"
   - Recalculate average_rating and review_count on vendors table
     (fetch all reviews for vendor, compute average, update)
   - Return updated vendor object

2. Implement POST /api/amenities/hawker-report (protected):
   - Validate: station_code required, description optional max 200,
     schematic_x and schematic_y optional numbers
   - Insert into hawker_reports
   - Log: [HAWKER_REPORT] station=<code> at=<timestamp>
   - Return 201 with created report

3. Implement POST /api/amenities/checkin (protected):
   - Validate: station_code required, lat/lng required valid coordinates
   - Fetch station from station_coordinates: get station's lat/lng
   - Call haversineDistance(user_lat, user_lng, station_lat, station_lng)
   - If > 500 metres: 400 "You don't appear to be at this station."
   - Insert into station_checkins with expires_at = NOW() + 2 hours
   - Count active check-ins at station (where expires_at > NOW())
   - Return 201 with { checkin: record, active_count: number, is_crowded: count >= 10 }

4. Implement GET /api/amenities/demand/forecast (no auth for MVP):
   - Query travel_intents GROUP BY from_station, to_station, travel_date
     for the next 7 days
   - For each route+date combo: apply calculateCrowdingScore()
   - Return forecast array + surge_alerts (where is_surge = true)

Acceptance test:
- Review with rating 5 → vendor average_rating updates correctly
- Second review same day same user → 409
- Hawker report → record created in DB, log appears
- Checkin within 500m → 201 with is_crowded based on count
- Checkin from wrong location (simulate by using far-off lat/lng) → 400
- Demand forecast returns data grouped by route and date

---

### Slice 5.8 — Station Schematic JSON Files
This is your most creative and time-consuming slice. Build all 4 station
JSON files. They are static files bundled with the app — no DB call needed.

Steps:
1. Create apps/mobile/src/screens/station/data/stations/ folder
2. For each station, create a JSON file using the structure from ARCHITECTURE.md Section 5.
   Coordinate space: always 1000 wide × 600 tall.

NDLS.json (New Delhi — 16 platforms, largest station):
- 8 representative platforms (P1 through P8) as horizontal rectangles
  spaced 60 units apart vertically starting at y=80
- Each platform: x1=50, x2=950, height=35 (y1 to y2)
- Track lines between each platform pair
- Main concourse rectangle: x1=50, y1=440, x2=950, y2=560
- Two entry gates: Ajmeri Gate (left) and Paharganj (right)
- FOB (foot over bridge) as a thin rectangle across all platforms at x=500

CSTM.json (Mumbai CST — heritage terminus, 18 platforms):
- Two sets of platforms: suburban (left half) and mainline (right half)
- Suburban: 9 platforms at x1=50 to x2=480
- Mainline: 9 platforms at x1=520 to x2=950
- Central building structure between them
- Main entrance at bottom centre

ADI.json (Ahmedabad Junction — 12 platforms):
- 6 platforms per side, two rows facing each other
- Central concourse between them
- Bus station connector at left edge

SBC.json (Bengaluru City — 10 platforms):
- 5 platforms, each with two sides (a and b labelling)
- Main entry at bottom, FOB at x=400
- Retiring rooms block at top right

3. Keep the JSON simple — platforms + concourse + 2 entry gates is enough.
   Judges will not check architectural accuracy. They will check that it
   renders clearly and amenity markers appear in sensible positions.

Acceptance test:
- Each JSON file is valid JSON (run: node -e "require('./NDLS.json')" for each)
- Each has at least 3 platforms, 1 concourse structure, and 2 entry gates
- Schematic renders on device without errors when passed to SchematicMap.js

---

### Slice 5.9 — Seed Station Amenities and Vendors
Steps:
1. Create scripts/seed-amenities.js
2. Insert amenities for all 4 stations using the coordinates from
   ARCHITECTURE.md Section 6 (NDLS table). Create similar tables for CSTM, ADI, SBC.
   Minimum per station:
   - 2 TOILET amenities (different platforms)
   - 2 WATER amenities
   - 2 FOOD_STALL amenities
   - 1 MEDICAL
   - 1 CLOAK_ROOM
   - 1 ATM
   - 1 PREPAID_AUTO
   Total per station: ~10 amenities. Total: ~40 amenities across 4 stations.

3. Insert vendors for all 4 stations using the table from ARCHITECTURE.md Section 6.
   Minimum per station: 4 vendors.
   Pre-set realistic average_ratings and review_counts on the vendor rows.
   Total: ~16 vendors.

4. Insert synthetic travel intents:
   - 200 intents across the 10 known congested routes in demand-service.js
   - Dates spread across the next 14 days
   - A few routes should have 10+ intents on the same date to trigger surge
   - Mix of all classes but mostly GEN

5. Insert synthetic station checkins:
   - 15 active checkins at NDLS (to show a crowded station in the dashboard)
   - 3 at CSTM
   - expires_at set to 2 hours from NOW() for the NDLS batch

6. Run: node scripts/seed-amenities.js
7. Verify:
   - GET /api/amenities/station/NDLS returns 10+ amenities and 4+ vendors
   - GET /api/amenities/demand/forecast shows at least 3 surge alert routes

Acceptance test: All 4 stations return amenities and vendors from the API.
Demand forecast shows surge alerts. NDLS shows is_crowded: true.

---

## Day 3 — Mobile Screens (Core)

### Slice 5.10 — stationService.js (Mobile API Layer)
Steps:
1. Create apps/mobile/src/screens/station/services/stationService.js
2. Implement all API calls using apiClient from Member 1:
   ```javascript
   import apiClient from '../../../../services/apiClient'
   import { API_BASE_URL } from '../../../../constants'

   export const declareIntent = (data) =>
     apiClient.post('/amenities/intent', data)
   export const getMyIntents = () =>
     apiClient.get('/amenities/intents')
   export const getStationData = (code) =>
     fetch(`${API_BASE_URL}/amenities/station/${code}`).then(r => r.json())
   export const voteAmenity = (data) =>
     apiClient.post('/amenities/vote', data)
   export const submitVendorReview = (data) =>
     apiClient.post('/amenities/vendor-review', data)
   export const reportHawker = (data) =>
     apiClient.post('/amenities/hawker-report', data)
   export const checkIn = (data) =>
     apiClient.post('/amenities/checkin', data)
   export const getDemandForecast = () =>
     fetch(`${API_BASE_URL}/amenities/demand/forecast`).then(r => r.json())
   ```

Acceptance test: Each function exists and calls the correct endpoint.

---

### Slice 5.11 — StationHomeScreen
Steps:
1. Create apps/mobile/src/screens/station/StationHomeScreen.js
2. Layout: three primary action tiles in a column:
   Tile 1: 🚂 "Plan My Journey" — crowding prediction for general travel
   Tile 2: 🗺️ "Find at Station" — station schematic and amenity finder
   Tile 3: 📍 "Check In" — GPS check-in for crowding signal
3. Below tiles: "My Journey Plans" section showing last 2 declared intents
   with their crowding score badges (green/yellow/red)
4. On mount: call getMyIntents() and show last 2
5. Each tile navigates to its respective screen

Acceptance test: Home loads. Tiles navigate correctly. Last intents show
with correct crowding colour.

---

### Slice 5.12 — IntentFormScreen + CrowdingResultScreen
Steps:
1. Create apps/mobile/src/screens/station/IntentFormScreen.js
   - Origin station: TextInput (autocapitalize, max 7 chars)
     Show hint: "e.g. NDLS for New Delhi, MMCT for Mumbai"
   - Destination station: same
   - Travel date: DateTimePicker from @react-native-community/datetimepicker
     Minimum date: today. No past dates.
   - Train number: optional TextInput
   - Class: locked to GEN (display-only with explanation)
   - Submit button: calls declareIntent(), shows loading indicator
   - On success: navigate to CrowdingResultScreen with result data
   - On error: show error message inline

2. Create apps/mobile/src/screens/station/CrowdingResultScreen.js
   Receives the API response as a navigation param.
   - Large colour-coded gauge (CrowdingGauge component):
     Score 1–3: green background, "Likely Comfortable"
     Score 4–6: yellow/amber background, "Moderate Crowding Expected"
     Score 7–10: red background, "Very Crowded — Plan Ahead"
   - Score shown as large number (e.g. "8.5 / 10")
   - Route summary: NDLS → MMCT, 16 Jun 2026, Train 12951 (if given)
   - If is_surge_route is true: warning card shown with alternate_trains list
     Each alternate train shown as a tappable row with its own crowding score
   - "Save Plan" button: goes back to StationHomeScreen (intent already saved)
   - "Declare Another Journey" button: goes back to IntentFormScreen

3. Create apps/mobile/src/screens/station/components/CrowdingGauge.js
   - Props: score (number), label (string)
   - Large circular or bar visual using React Native Animated
   - Colour changes based on score ranges above
   - Animates in when the screen mounts (Animated.timing from 0 to score)

Acceptance test:
- Submit NDLS→MMCT future date → CrowdingResultScreen shows red with score >= 7.0
- Submit CSTM→PUNE future Wednesday → moderate or comfortable
- Alternate trains shown only when is_surge_route is true
- Score animates on mount

---

### Slice 5.13 — StationSelectScreen + SchematicMap Component
Steps:
1. Create apps/mobile/src/screens/station/StationSelectScreen.js
   - Four station cards in a list:
     Mumbai CST (CSTM), New Delhi (NDLS), Ahmedabad Jn (ADI), Bengaluru City (SBC)
   - Each card: station name, city, quick stats ("10 amenities, 4 vendors")
   - Tap a card: call getStationData(code), then navigate to StationSchematicScreen
     with the station data + amenities + vendors as params

2. Create apps/mobile/src/screens/station/components/SchematicMap.js
   This is your most technically complex component.

   Props: stationData (JSON from local file), amenities (array), vendors (array)
   State: selectedItem (null | amenity | vendor), mapOffset (pan), mapScale (zoom)

   Implementation:
   Step A — Get device width: import { Dimensions } from 'react-native'
   const scale = Dimensions.get('window').width / 1000
   (The schematic is 1000 units wide, scale everything by this factor)

   Step B — Render using react-native-svg:
   ```javascript
   import Svg, { Rect, Line, Text, Circle, G } from 'react-native-svg'

   // Render platforms
   stationData.platforms.map(p =>
     <Rect x={p.x1*scale} y={p.y1*scale}
           width={(p.x2-p.x1)*scale} height={(p.y2-p.y1)*scale}
           fill="#E8E8E8" stroke="#999" strokeWidth="1" />
   )
   // Render tracks (thinner lines between platforms)
   stationData.tracks.map(t =>
     <Line x1={t.x1*scale} y1={t.y1*scale}
           x2={t.x2*scale} y2={t.y2*scale}
           stroke="#555" strokeWidth="1" />
   )
   // Render structures (concourse, entries)
   stationData.structures.map(s =>
     <Rect x={s.x1*scale} y={s.y1*scale}
           width={(s.x2-s.x1)*scale} height={(s.y2-s.y1)*scale}
           fill="#F5F0E8" stroke="#AAA" strokeWidth="1" />
   )
   // Render amenity markers
   amenities.map(a =>
     <AmenityMarker x={a.schematic_x*scale} y={a.schematic_y*scale}
                    type={a.amenity_type} status={a.current_status}
                    onPress={() => setSelectedItem({ type: 'amenity', data: a })} />
   )
   // Render vendor markers
   vendors.map(v =>
     <VendorMarker x={v.schematic_x*scale} y={v.schematic_y*scale}
                   category={v.category}
                   onPress={() => setSelectedItem({ type: 'vendor', data: v })} />
   )
   ```

   Step C — When selectedItem is set, show a bottom sheet panel
   with the amenity or vendor details (rendered inline below the SVG,
   not a modal — simpler and more reliable).

3. Create AmenityMarker.js:
   - Small coloured circle: green=WORKING, red=BROKEN/CONFIRMED_BROKEN, grey=UNKNOWN
   - Emoji icon inside the circle based on type:
     TOILET=🚻, WATER=💧, FOOD_STALL=🍽️, MEDICAL=➕, ATM=💳,
     CLOAK_ROOM=🧳, PREPAID_AUTO=🛺, WAITING_ROOM=🪑,
     ENQUIRY=ℹ️, PLATFORM_ENTRY=🚪
   - Use react-native-svg <Circle> and <Text> (SVG Text, not RN Text)

4. Create VendorMarker.js:
   - Small coloured square: blue for all vendors
   - Star icon inside: ⭐
   - Tiny rating text below the square

Acceptance test:
- Station schematic renders for NDLS without crash
- At least 3 amenity markers visible at correct schematic positions
- Tapping a marker shows the bottom sheet with correct details
- Vendor markers visible and distinct from amenity markers

---

## Day 4 — Remaining Mobile Screens

### Slice 5.14 — StationSchematicScreen (full screen host)
Steps:
1. Create apps/mobile/src/screens/station/StationSchematicScreen.js
2. Receives stationCode from navigation params
3. On mount: load local station JSON from data/stations/<code>.json
   then fetch live amenity/vendor data from getStationData(code)
4. Merges the live status data from API into the static schematic coordinates
5. Shows:
   - Station name header
   - SchematicMap component (full width, scrollable vertically if needed)
   - Legend bar below map: amenity type colour guide
   - "Report Unlicensed Vendor" button at bottom
6. When SchematicMap calls back with a selected item:
   - If amenity: show AmenityDetailScreen (navigate with amenity data)
   - If vendor: show VendorDetailScreen (navigate with vendor data)

Acceptance test: Screen loads for all 4 station codes. Map renders with
live status data from the API. Tap navigates to detail screens.

---

### Slice 5.15 — AmenityDetailScreen + StatusToggle
Steps:
1. Create apps/mobile/src/screens/station/AmenityDetailScreen.js
   Receives amenity object via navigation params.
   Shows:
   - Amenity type icon (large)
   - Label: "Platform 1 Toilet"
   - Status badge: WORKING (green) / BROKEN (red) / UNKNOWN (grey) / CONFIRMED_BROKEN (dark red)
   - Last updated: "Updated 23 minutes ago" (relative time)
   - Platform number if present

2. Create StatusToggle.js component:
   - Two buttons side by side: [✓ Working] [✗ Broken]
   - Currently active button is highlighted
   - On press: calls voteAmenity({ amenity_id, vote })
   - Loading state while API call is in progress
   - On success: update the displayed status on the screen
   - On 429 error: show "You recently voted — please wait" toast

3. If status is CONFIRMED_BROKEN: show a red banner at the top:
   "This amenity has been reported broken by multiple users.
   Station manager has been notified."

Acceptance test: Vote WORKING → status updates on screen.
Vote immediately again → 429 toast shown.
CONFIRMED_BROKEN status shows the red banner.

---

### Slice 5.16 — VendorDetailScreen + RateVendorScreen
Steps:
1. Create apps/mobile/src/screens/station/VendorDetailScreen.js
   Receives vendor object via navigation params.
   Shows:
   - Vendor name (large)
   - Category badge
   - Star rating display (e.g. ⭐ 4.2 / 87 reviews)
   - Stall number, platform, operating hours
   - "Rate this vendor" button → navigates to RateVendorScreen
   - "Report as unlicensed" link → navigates to ReportHawkerScreen

2. Create apps/mobile/src/screens/station/RateVendorScreen.js
   - StarRating component: 5 tappable stars (highlight on tap)
   - Comment TextInput: optional, max 100 chars
   - Submit button: calls submitVendorReview()
   - On success: show "Thank you for your review!" and navigate back
   - On 409 (already reviewed today): show "You already reviewed this today"

3. Create StarRating.js component:
   - Props: value (number), onChange (function), editable (bool)
   - 5 star icons in a row
   - Tapping a star sets the value to that star's index
   - When editable=false: renders the average_rating as a display

Acceptance test:
- Rate vendor 5 stars → review_count and average_rating update on the vendor
- Rate same vendor again same day → 409 shown correctly

---

### Slice 5.17 — ReportHawkerScreen + CheckInScreen
Steps:
1. Create apps/mobile/src/screens/station/ReportHawkerScreen.js
   - Station code pre-filled (from previous screen's context)
   - Description TextInput: optional, max 200 chars, placeholder:
     "Describe the unlicensed vendor or their location"
   - Submit button: calls reportHawker()
   - On success: "Report submitted. Station management has been notified."
   - Navigate back after 2 seconds

2. Create apps/mobile/src/screens/station/CheckInScreen.js
   - Station selector: show all 4 demo stations
   - "Use GPS" button: calls Expo Location.getCurrentPositionAsync()
     Shows: "Getting your location..." while waiting
   - After GPS: calls checkIn({ station_code, lat, lng })
   - Success: "Checked in to NDLS. 15 people here right now."
     Show is_crowded as a badge: "CROWDED" (red) or "Not crowded" (green)
   - 400 error: "You don't appear to be at this station.
     You are approximately X km away."
     Calculate the distance client-side and show it in the error.

Acceptance test:
- Hawker report creates record in DB
- Check-in within 500m of station → success with active count
- Check-in from far-away coords → 400 with distance message

---

### Slice 5.18 — Seed Travel Intents for Demand Dashboard
Steps:
1. Add to seed-amenities.js or create seed-intents.js:
   Insert 200 travel intents:
   - Cover all 10 routes in KNOWN_CONGESTED_ROUTES
   - Dates: next 7 days
   - Ensure NDLS→MMCT on the nearest Monday has 25+ intents (triggers surge)
   - Ensure NDLS→MMCT on Wednesday has only 8 intents (no surge — shows contrast)
   - Mixed users (create 5-10 synthetic user UUIDs for variety)
2. Run the seed
3. Verify: GET /api/amenities/demand/forecast returns surge_alerts array
   with at least 2 routes flagged

Acceptance test: Demand forecast endpoint returns surge alerts. Admin dashboard
demand page (Member 1's) shows the bar chart with visible spikes.

---

## Day 5 — Integration

### Slice 5.19 — Hand Off to Member 1
Steps:
1. Push all code to GitHub main branch
2. Replace all mock context with real useRailSaathi() calls:
   ```javascript
   // Before (mock):
   const currentUser = { id: 'test-uuid', preferred_class: 'GEN' }
   // After (real):
   const { currentUser } = useRailSaathi()
   ```
3. Replace all hardcoded localhost URLs with API_BASE_URL from constants
4. Ensure stationService.getStationData() and getDemandForecast() use
   API_BASE_URL (they call fetch directly, not apiClient, since no auth needed)
5. Remove all debug console.log statements that print user data
6. Tell Member 1 the exact line to add in index.js:
   app.use('/api/amenities', require('./routes/amenities'))
7. Confirm Member 3 has seeded station_coordinates (required for checkin)
8. Run end-to-end integration test:
   - Declare intent → crowding result appears
   - Open NDLS schematic → amenity markers visible
   - Vote an amenity broken → status changes
   - Rate a vendor → rating updates
   - Check in → active count returned
9. Confirm demand forecast data feeds Member 1's admin dashboard correctly

---

## Day 6 — Demo Prep

### Slice 5.20 — Demo Script (90 seconds)
Practice this exact sequence:

[0s]   Open Station tab → StationHomeScreen
[5s]   Tap "Plan My Journey"
[7s]   IntentFormScreen: type NDLS, MMCT, pick next Monday, submit
[12s]  CrowdingResultScreen: large red gauge, score 8.5, "Very Crowded"
       Say: "This passenger now knows to take the alternate train"
[20s]  Alternate train row shows August Kranti Rajdhani, score 5.0
[25s]  Go back, tap "Find at Station"
[27s]  StationSelectScreen → tap "New Delhi"
[30s]  NDLS schematic renders: platforms visible, colour-coded amenity dots
[35s]  Tap a red toilet marker
[37s]  AmenityDetail: "Platform 1 Toilet — BROKEN — reported 2 hours ago"
[42s]  Tap "✓ Working" → status updates to WORKING in real time
[47s]  Go back to schematic, tap a vendor marker (Haldiram's)
[50s]  VendorDetail: "Haldiram's Snacks — ⭐ 4.2 — 87 reviews"
[55s]  Tap Rate → tap 5 stars → Submit → "Thank you"
[60s]  Switch to admin dashboard:
       Demand forecast page — bar chart with red spike on NDLS→MMCT Monday
       Say: "Railways now knows which trains to add coaches to on Monday"

Total: 60 seconds. The schematic map rendering is your visual hook.
The crowding prediction is your data story. Both must work first try.
