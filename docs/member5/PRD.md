# Product Requirements Document (PRD)
# Member 5 — Demand Intelligence & Station Amenity System
# FAR AWAY 2026 — RailSaathi Platform

---

## 1. Purpose & Ownership

Member 5 owns the demand intelligence layer and the station amenity
discovery system of RailSaathi. This means: the backend routes, the
database tables, the mobile screens under the Station tab, and the
data pipelines that turn passenger travel intent into actionable
demand forecasts for Railways.

You work independently from Members 2, 3, and 4. You depend on Member 1
only for three things: the shared apiClient.js utility, the verifyToken
middleware, and the RailSaathiContext which gives you the current user's
profile and active journey. Both are available by end of Day 2.

Your module solves two distinct but connected problems. First: Indian
Railways runs its unreserved coaches completely blind — no data on how
many people will board at each station, causing chronic 300% overcrowding
on some routes and empty coaches on others. You build the first-ever
demand signal for unreserved travel by asking passengers to declare their
travel intent before they travel. Second: at most Indian stations, a
passenger cannot find a functional toilet, a licensed food vendor, or a
clean water point. You build the station discovery layer that no official
Railways app has ever attempted — a schematic indoor map of major stations
with crowd-sourced amenity status updates.

These two features may seem unrelated, but they share the same insight:
Railways is flying blind at both the network level (demand) and the
station level (amenity condition). Your module gives them eyes at both
scales simultaneously.

---

## 2. What You Are Building

### 2.1 Travel Intent Declaration System
Any user planning to travel in an unreserved (general) coach can declare
their intent before they travel: origin, destination, date, and preferred
train if known. This is not a booking — there is no ticket, no payment.
It is a signal. In exchange for declaring intent, the user receives:
a crowding prediction for their planned journey (based on historical
patterns + current declared intents), and an alert if their route is
expected to be severely overcrowded with a suggestion to take an
alternate train.

### 2.2 Demand Intelligence Dashboard (for Admin)
Feeds data into Member 1's admin dashboard: a 7-day demand forecast by
route (derived from declared intents + historical patterns), a surge
alert list (routes where demand is spiking beyond capacity), and a
station-level crowding estimate. This gives Railway officials the first
real-time demand signal for unreserved travel they have ever had.

### 2.3 Station Schematic Map
A manually-digitised schematic map for 4 major stations (Mumbai CST,
New Delhi, Ahmedabad Junction, Bengaluru City). Not GPS-accurate
architectural plans — simple, usable platform layout drawings built
in SVG-style coordinates. Amenity markers overlaid on the schematic.
Tap any marker to see status, rating, and last-updated time.

### 2.4 Amenity Status Layer (Crowd-Sourced)
Passengers can mark any amenity as Working or Broken. Status updates
are crowd-sourced and timestamped. If 3 or more users mark an amenity
as broken within 2 hours, it is flagged as CONFIRMED_BROKEN and an
alert fires to the station manager's feed on the admin dashboard.

### 2.5 Vendor Discovery and Rating
Licensed vendors registered on the platform are discoverable on the
station map. Passengers can rate them (1-5 stars) after a visit.
Vendors with ratings below 3.0 get flagged in the admin feed.
Unlicensed vendor reports: any user can tap a location and report
an unlicensed hawker — this creates an alert for the station manager.

### 2.6 Platform Crowding Estimation (GPS Cluster Signal)
When multiple users with active travel intents are detected at the same
station at the same time (via GPS check-in on the app), the system
flags the station as CROWDED. This is a proxy signal: many people
at a station with a travel intent declared = crowding is happening.
Simple, requires no hardware, works with existing smartphone GPS.

---

## 3. What You Are NOT Building
- The complaint system (Member 3)
- The SOS or safety system (Member 4)
- The Tatkal module (Member 2)
- Actual indoor positioning / Bluetooth beacons (hardware)
- Real-time GPS tracking of all users (privacy violation, battery drain)
  — GPS is only read at the moment the user explicitly checks in
- Payment processing or food ordering fulfilment
  — you build the discovery and ordering UI but not the payment backend
- The OTP login or user profile (Member 1)
- The main admin dashboard shell (Member 1 owns that)

---

## 4. Target Users

### Citizen-Facing
- Unreserved / general class passengers planning travel
  (the largest and most underserved segment of Indian rail travel)
- Any passenger arriving at a station needing to find amenities
- Passengers who want to rate or report vendor quality

### Government-Facing (Admin Dashboard via Member 1)
- Station Masters: see amenity status and vendor reports at their station
- Zone officers: see demand forecasts and surge alerts for their routes
- Ministry analysts: see nationwide unreserved demand patterns

---

## 5. Core MVP Features

### Feature 1 — Travel Intent Declaration
Fields:
- Origin station (text input with autocomplete from station_coordinates table)
- Destination station (same)
- Travel date (date picker — must be today or future)
- Preferred train number (optional)
- Class: only GEN (general) for this feature — reserved travel has IRCTC

After submission: system calculates a crowding prediction score (1–10)
and displays it as a traffic-light indicator:
- 1–3: Green — "Likely comfortable"
- 4–6: Yellow — "Moderate crowding expected"
- 7–10: Red — "Very crowded — consider alternate train or date"

### Feature 2 — Crowding Prediction Engine
Not ML. Simple rule-based calculation for the MVP:

Score = BASE_SCORE + INTENT_MODIFIER + DAY_MODIFIER

BASE_SCORE per route (hard-coded from known congested routes):
- Mumbai-Pune GEN on Monday morning: 8
- Delhi-Lucknow GEN on weekend: 7
- Any metro-adjacent route on Friday evening: 7
- All other routes default: 4

INTENT_MODIFIER:
For every 10 declared intents on this route+date, add +0.5 to score
(capped at +2)

DAY_MODIFIER:
- Monday / Friday: +1
- Weekend: +0.5
- Weekday: 0

Cap final score at 10.

### Feature 3 — Station Schematic Map
Four stations for MVP. Each station has:
- A JSON-defined schematic: platform positions, entry gates, key landmarks
- Amenity markers at (x, y) coordinates within the schematic
- Rendered as a zoomable/pannable SVG-like view using React Native's
  react-native-svg or a simple scaled Image with TouchableOpacity overlays

Amenity types per station:
TOILET | WATER | FOOD_STALL | MEDICAL | CLOAK_ROOM | ATM |
PREPAID_AUTO | WAITING_ROOM | ENQUIRY | PLATFORM_ENTRY

### Feature 4 — Crowd-Sourced Amenity Status
Each amenity has a status: WORKING | BROKEN | UNKNOWN
Any logged-in user can toggle the status for any amenity.
Voting logic:
- Each vote is stored as a separate amenity_votes row
- Current status = most recent vote within last 4 hours
  (if no vote in 4 hours: status reverts to UNKNOWN)
- If 3+ BROKEN votes in last 2 hours: status = CONFIRMED_BROKEN,
  alert fires to admin dashboard
- If 3+ WORKING votes after a CONFIRMED_BROKEN: status = WORKING,
  alert fires "Amenity restored"

### Feature 5 — Vendor Discovery and Rating
Vendor profile stored in database:
- Name, stall number, station, platform, licence number, category
  (FOOD | BEVERAGES | SNACKS | BOOKS | PHARMACY)
- Displayed on station schematic as a vendor marker
- Tap vendor marker: see name, category, rating, hours
- Rate vendor: 1–5 stars + optional text comment (max 100 chars)
- Average rating computed from all reviews
- Unlicensed vendor report: tap empty location on map → "Report unlicensed vendor here"
  → description field → submit → admin alert

### Feature 6 — Platform Check-In and Crowding Signal
User arriving at a station taps "Check In to Station".
App reads GPS, confirms they are within 500 metres of the selected
station (using Haversine distance formula), stores a check-in record.
If 10+ users check into the same station within a 30-minute window:
system marks station as CROWDED in the admin dashboard.
Check-ins expire after 2 hours automatically (updated_at logic).

---

## 6. User Flows

### Flow 1 — Declare Travel Intent
Station tab → "Plan My Journey" →
Origin, destination, date form →
Submit →
Crowding score shown (traffic light) →
If score >= 7: warning + alternate train suggestions
Intent saved to DB

### Flow 2 — Find Amenity at Station
Station tab → "Find at Station" →
Select station (4 options) →
Station schematic loads →
Tap amenity marker →
Bottom sheet: type, status, last updated, distance (from entry gate) →
Working/Broken toggle button (logged-in users only)

### Flow 3 — Find and Rate a Vendor
Station schematic → Tap vendor marker →
Vendor card: name, rating, hours →
"Rate this vendor" → 1–5 stars + comment →
Submit → Rating saved

### Flow 4 — Report Unlicensed Vendor
Station schematic → Long press on any empty area →
"Report unlicensed vendor here?" →
Description field (optional) →
Submit → Admin alert created

### Flow 5 — Check In to Station
Station tab → "Check In" →
GPS check (are you within 500m of the station?) →
If yes: check-in confirmed, station crowding count incremented →
If no: "You don't seem to be at this station"

### Flow 6 — View Demand Map (Admin)
Admin dashboard → Demand page →
Bar chart: intent count by route, next 7 days →
Surge alert list: routes above threshold →
Station crowding: table of current CROWDED stations

---

## 7. Success Criteria for Demo Day
- Travel intent declaration form works end-to-end
- Crowding score shows correct colour (green/yellow/red) after submission
- Station schematic loads for all 4 stations with amenity markers visible
- Tapping an amenity marker shows its status and last updated time
- Working/Broken toggle updates the status in real time (or near real time)
- CONFIRMED_BROKEN: mark an amenity broken 3 times → admin dashboard
  shows the alert
- Vendor card shows name, rating, and tap-to-rate works
- Unlicensed vendor report creates an admin alert
- Check-in within 500m of station succeeds
- Admin dashboard demand page shows route bar chart with seeded data
- Surge alert appears for any route with 10+ declared intents
