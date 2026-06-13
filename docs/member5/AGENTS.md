# AGENTS.md — AI Coding Rules
# Member 5 — Demand Intelligence & Station Amenity System
# FAR AWAY 2026 — RailSaathi Platform

---

## Identity
You are building the Demand Intelligence and Station Amenity module of
RailSaathi. Your job is to give unreserved passengers a crowding prediction
before they travel, and give every passenger at a station a discoverable
map of working amenities and licensed vendors. You work independently.
You hand off one route file and one migration file on Day 5.

---

## Non-Negotiable Rules

### Code Structure
- Keep every file under 300 lines. Split if larger.
- stationService.js is your ONLY file for API calls from the mobile side.
  No raw fetch() calls inside screen files.
- Route handler (amenities.js) only validates input and calls service functions.
  Business logic (crowding score, amenity vote counting, Haversine formula,
  vendor rating recalculation) lives in demand-service.js.
- SchematicMap.js is a pure rendering component. It takes data as props.
  It does NOT fetch data. It does NOT call any API. It renders. That is all.
- Each station's schematic JSON is a static data file. It is NOT fetched
  from the API. It is imported directly in StationSchematicScreen.js.
  This means the schematic works offline and has zero API latency.

### Naming Conventions
- Files: kebab-case
- React components: PascalCase
- Variables/functions: camelCase
- DB columns: snake_case
- Constants: SCREAMING_SNAKE_CASE
- Station codes: always UPPERCASE (NDLS, MMCT, ADI, SBC, CSTM)

### API Rules
- Every response: { "data": ..., "message": "..." } for success
- Every error: { "error": "Human message", "code": "ERROR_CODE" }
- Correct HTTP status codes always.
- GET /api/amenities/station/:code — NO auth required. Public data.
- GET /api/amenities/demand/forecast — NO auth required for MVP.
  Add TODO comment for admin auth in production.
- All POST endpoints require verifyToken.
- Never trust user_id from the request body. Always use req.user.user_id.

### Crowding Score Rules
calculateCrowdingScore() must live in demand-service.js as a pure function.
It takes: (fromStation, toStation, travelDate, intentCount)
It returns: a number between 1.0 and 10.0, rounded to 1 decimal place.
It must be deterministic: same inputs always produce same output.
The KNOWN_CONGESTED_ROUTES object is defined in demand-service.js as
a module-level constant. It is never fetched from a database.
Never use ML or probability. This is a simple rule-based formula.
Document the formula in a comment above the function.

### Amenity Vote Counting Rules
This is your most important business logic. The vote counting must happen
ATOMICALLY — meaning: insert vote, count recent votes, update status,
all in the same request, in the correct order.
Never count votes asynchronously or in a background job.
The CONFIRMED_BROKEN threshold is exactly 3 BROKEN votes in the last 2 hours.
If you use a different threshold in your code, it must be a named constant:
const CONFIRMED_BROKEN_THRESHOLD = 3
const VOTE_WINDOW_HOURS = 2
Never hardcode 3 and 2 as magic numbers in the counting logic.

### Haversine Distance Formula Rules
The Haversine formula must live in demand-service.js as a standalone function.
Never inline it in the route handler.
The acceptable check-in radius is 500 metres. This is a named constant:
const CHECKIN_RADIUS_METRES = 500
If the station code does not exist in station_coordinates table, return 400
with a clear message: "Station not found." Do not crash.

### Schematic Map Rules
The coordinate space is always 1000 × 600 units.
Scale factor = deviceWidth / 1000 (use Dimensions.get('window').width).
Every marker must have a minimum tap target of 44 × 44 dp (iOS HIG rule).
If a marker would overlap another marker within 20 units, offset it slightly
(+15 units in X or Y) so both are tappable.
The map must be pannable and zoomable using React Native Gesture Handler
PanGestureHandler + PinchGestureHandler.
If react-native-gesture-handler is not available, make the map scrollable
inside a ScrollView with horizontal and vertical scroll enabled.
Never block the screen with a non-scrollable fixed schematic.

### Station JSON Files
All four JSON files must exist before you write SchematicMap.js.
The JSON is the source of truth for the schematic rendering.
Coordinates in the JSON are in the 1000×600 space — confirm they look
sensible (platforms horizontally across the middle of the space,
concourse at the bottom, entry gates at the very bottom edge).
Write the JSON first, then render it.

### Vendor Rating Recalculation
After inserting a review, always recalculate the vendor's average_rating
by querying ALL reviews for that vendor (not just updating incrementally).
Incremental average updates accumulate floating-point errors over time.
Full recalculation from source is correct and fast enough for the MVP.

### Check-In Spam Prevention
A user can only have one active check-in per station at a time.
Before inserting a new check-in, delete any existing unexpired check-in
for the same user + station:
```javascript
await supabase.from('station_checkins')
  .delete()
  .eq('user_id', userId)
  .eq('station_code', stationCode)
  .gt('expires_at', new Date().toISOString())
```
Then insert the new one. This prevents a user from inflating the crowding
count by checking in multiple times.

### Mobile Rules
- Every screen has loading, data, and error states.
- The CrowdingResultScreen must show the traffic light colour prominently.
  Green / Yellow / Red must be immediately obvious without reading any text.
  Use a large coloured circle or banner, not just a coloured dot.
- StationSchematicScreen must handle the case where the API returns no amenities
  for a station (show the schematic with no markers, not an error).
- StationSelectScreen shows only the 4 supported stations. Do not show
  a search field suggesting all stations work — be honest about MVP scope.
- AmenityDetailScreen must show the last_vote_at as a relative time:
  "Last updated 2 hours ago", not a raw timestamp.
- The Working/Broken toggle must be optimistically updated in UI
  (show the new status immediately) while the API call is in flight.
  If the API call fails, revert the UI. Never leave the user staring at a
  spinner for a status toggle — it must feel instant.

### Testing Rules
- Test crowding score for known routes: NDLS→MMCT on a Monday should
  score higher than a Wednesday (dayModifier difference).
- Test intent modifier: submit 10 intents for the same route/date
  and confirm the score increases by 0.5.
- Test vote counting: submit 3 BROKEN votes → amenity status becomes
  CONFIRMED_BROKEN. Submit 3 WORKING votes → status becomes WORKING.
- Test duplicate vote: same user, same amenity, within 1 hour → 429.
- Test duplicate review: same user, same vendor, same day → 409.
- Test check-in within range: 400m from NDLS → 201. 1km away → 400.
- Test station endpoint without auth: GET /api/amenities/station/NDLS
  → 200 with amenities and vendors.
- Test demand forecast: returns intents for next 7 days with correct
  surge flags.

### Git Rules
- Only commit files inside your designated paths.
- Never modify Member 1's files or Member 3's station_coordinates table.
- Commit message format: feat(amenities): description
  Example: feat(amenities): add amenity vote counting with CONFIRMED_BROKEN logic
- Commit after every working slice.

---

## What to Build First (Priority Order)
1. 005_amenities.sql — run in Supabase, confirm all 6 tables exist
2. Seed station amenities and vendors for NDLS (minimum viable demo station)
3. demand-service.js (crowding engine + Haversine)
4. POST /api/amenities/intent (crowding prediction endpoint)
5. GET /api/amenities/station/:code (station data endpoint)
6. POST /api/amenities/vote (amenity status voting)
7. POST /api/amenities/vendor-review
8. POST /api/amenities/hawker-report
9. POST /api/amenities/checkin
10. GET /api/amenities/demand/forecast
11. Write all 4 station JSON files (NDLS, CSTM, ADI, SBC)
12. SchematicMap.js renderer (using the JSON files)
13. StationHomeScreen + StationSelectScreen
14. StationSchematicScreen + AmenityDetailScreen
15. VendorDetailScreen + RateVendorScreen
16. IntentFormScreen + CrowdingResultScreen
17. CheckInScreen + ReportHawkerScreen
18. Seed remaining stations + intents (for admin demand chart)

---

## What NOT to Do
- Do not build real-time GPS tracking of users.
  GPS is read only at the moment the user explicitly taps Check In.
- Do not create or recreate the station_coordinates table.
  Member 3 owns that table. You reference it, not recreate it.
- Do not build a food ordering or payment system.
  Discovery and rating only — no transactions.
- Do not try to build accurate indoor positioning using Bluetooth or WiFi.
  The schematic is a hand-drawn approximation, not architectural-grade.
- Do not use react-native-maps for the schematic.
  react-native-maps is for outdoor GPS maps. Use react-native-svg for schematics.
- Do not use any ML model for crowding prediction.
  Rule-based formula only. Simple and explainable to judges.
- Do not build a vendor registration flow.
  Vendors are pre-seeded by you. In production, Railways would register them.
- Do not create a separate Express server.
  Your routes plug into Member 1's server.

---

## Integration Checklist (Day 5)
When Member 1 asks you to hand off:
- [ ] 005_amenities.sql applied in Supabase (all 6 tables exist)
- [ ] station_coordinates table NOT modified (Member 3 owns it)
- [ ] Amenities seeded for all 4 stations (NDLS, CSTM, ADI, SBC)
- [ ] Vendors seeded for all 4 stations (minimum 5 vendors each)
- [ ] Travel intents seeded (50+ records for demand chart)
- [ ] services/api/src/routes/amenities.js committed and tested
- [ ] services/api/src/services/demand-service.js committed
- [ ] All station/ screens committed
- [ ] All 4 station JSON files committed in data/stations/
- [ ] Mock context replaced with useRailSaathi() in all screens
- [ ] All hardcoded localhost URLs replaced with API_BASE_URL
- [ ] Station endpoint works without auth header
- [ ] Demand forecast endpoint works without auth header
- [ ] No .env values hardcoded anywhere
- [ ] Told Member 1 the exact line:
      app.use('/api/amenities', require('./routes/amenities'))
- [ ] Installed react-native-svg and added to package.json:
      npx expo install react-native-svg
