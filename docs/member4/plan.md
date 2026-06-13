# Implementation Plan (plan.md)
# Member 4 — Real-Time Safety & Incident System
# FAR AWAY 2026 — RailSaathi Platform

---

## Overview
6 days. You work independently from Members 2, 3, 5. You need from Member 1:
Supabase URL + service key, repo clone, JWT middleware path. Get these by
end of Day 1. After that you are fully unblocked.

Build priority is backend-first, realtime-second, mobile-third. The RPF
dashboard live feed is the centrepiece of your demo — test it before
touching mobile screens.

---

## Day 1 — Backend Foundation

### Slice 4.1 — Environment Setup
Steps:
1. Clone the GitHub repo from Member 1
2. Navigate to services/api/
3. Get from Member 1: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
4. Create Twilio account (twilio.com → free trial):
   - Get TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
   - Verify your own phone number under Verified Caller IDs
   - Verify 2 more teammates' numbers
5. Add all env vars to local .env (never commit)
6. npm install twilio
7. Run: node src/index.js → confirm health check

Acceptance test: Server runs. Health check returns 200.
Twilio console shows your verified numbers.

---

### Slice 4.2 — Database Migration + Realtime Setup
Steps:
1. Open Supabase project SQL editor (URL from Member 1)
2. Paste and run supabase/migrations/004_safety.sql
   (safety_events table + all indexes + RLS policies from ARCHITECTURE.md)
3. Confirm table exists in Supabase Table Editor
4. Enable Realtime:
   - Supabase Dashboard → Database → Replication
   - Find safety_events → toggle ON
5. Run in SQL editor:
   ALTER TABLE safety_events REPLICA IDENTITY FULL;
6. Create two Supabase Storage buckets:
   - sos-audio → Private
   - hazard-photos → Public
7. Confirm both buckets exist in Supabase Storage tab

Acceptance test: safety_events table exists with all columns.
Realtime toggle is ON. Both storage buckets exist.

---

### Slice 4.3 — Service Layer
Steps:
1. Create services/api/src/services/safety-service.js
   Add these functions:
   ```javascript
   deriveMaskedInitials(name)
   // "Raj Kumar" → "R.K."
   // "Sita" → "S."
   // null/undefined → "U.U."

   assignPriorityAndType(eventType)
   // SOS → { priority: 'CRITICAL' }
   // COMPARTMENT_VIOLATION → { priority: 'HIGH' }
   // HAZARD_REPORT → { priority: 'MEDIUM' }

   buildSOSMessage(userName, trainNumber, coach, berth, lat, lng)
   // Returns the formatted SMS string (see ARCHITECTURE.md Section 5)

   sanitizeForPublicMap(event)
   // Returns object with ONLY safe fields:
   // id, event_type, alert_subtype, lat, lng, status,
   // train_number, station_code, created_at
   // Strips everything else
   ```

2. Create services/api/src/services/twilioService.js
   (full implementation from ARCHITECTURE.md Section 5)

Acceptance test:
- deriveMaskedInitials('Raj Kumar') === 'R.K.'
- deriveMaskedInitials(null) === 'U.U.'
- assignPriorityAndType('SOS').priority === 'CRITICAL'
- Call twilioService.sendSOS() with a verified phone number →
  SMS arrives on that phone within 60 seconds

---

### Slice 4.4 — SOS Endpoint (Most Critical)
Steps:
1. Create services/api/src/routes/safety.js
2. Install express-validator: npm install express-validator (if not present)
3. Implement POST /api/safety/sos (protected):
   Step A — Validate body:
   - lat, lng: required numbers (validate range: lat -90 to 90, lng -180 to 180)
   - alert_subtype: must be in ['PERSONAL_SAFETY','MEDICAL','THEFT','OTHER']
   - train_number, coach, berth, station_code: optional strings
   Step B — Get user from DB using req.user.user_id
   Step C — Build insert object:
   ```javascript
   const insertObj = {
     user_id: user.id,
     event_type: 'SOS',
     priority: 'CRITICAL',
     status: 'ACTIVE',
     alert_subtype: req.body.alert_subtype,
     train_number: req.body.train_number,
     coach: req.body.coach,
     berth: req.body.berth,
     station_code: req.body.station_code,
     lat: req.body.lat,
     lng: req.body.lng,
     masked_initials: deriveMaskedInitials(user.name)
   }
   ```
   Step D — Insert into safety_events
   Step E — Return 201 IMMEDIATELY (do not await SMS)
   Step F — In setImmediate callback:
   - Fetch user.emergency_contacts from users table
   - For each contact: call twilioService.sendSOS(contact, ...)
   - Update event: sms_sent=true, sms_contacts_count

4. Register route temporarily for local testing:
   In LOCAL index.js: app.use('/api/safety', require('./routes/safety'))

Acceptance test:
```bash
time curl -X POST http://localhost:3000/api/safety/sos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":28.64,"lng":77.21,"alert_subtype":"PERSONAL_SAFETY","train_number":"12951","coach":"B4","berth":"32"}'
# Must complete in under 500ms
# Check Supabase: new ACTIVE CRITICAL row in safety_events
# Check server logs: [SMS] Sent to... (within 5-10 seconds after response)
```

---

## Day 2 — RPF Dashboard + Realtime

### Slice 4.5 — RPF Alert Dashboard (Web)
This is your demo prop. Build it before mobile screens.

Steps:
1. Navigate to apps/dashboard/src/pages/
2. Create RPFDashboardPage.jsx

Layout:
```
┌─────────────────────────────────────────────────────┐
│  🚨 RailSaathi RPF Alert Dashboard          LIVE ●  │
├─────────────────────────────────────────────────────┤
│  Active Alerts: 3    SOS: 1    Compartment: 1       │
│  Hazards: 1          Today's Total: 47              │
├─────────────────────────────────────────────────────┤
│  INCOMING ALERTS FEED                               │
│  ┌───────────────────────────────────────────────┐ │
│  │ 🔴 SOS — CRITICAL                    22:15:03  │ │
│  │ Train 12951 | Coach B4 | Berth 32             │ │
│  │ R.K. | NDLS | 📍 View on Map                  │ │
│  │ [Acknowledge]  [Resolve]  [False Alarm]       │ │
│  └───────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────┐ │
│  │ 🟠 COMPARTMENT VIOLATION — HIGH     21:58:11  │ │
│  │ Train 12952 | Coach S3 | Male Occupant        │ │
│  │ P.S. | CSTM                                   │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

Implementation:
1. Install @supabase/supabase-js in apps/dashboard/ if not already there
2. Create supabaseClient.js in dashboard services (or reuse if Member 1 made one)
3. On mount: GET /api/safety/rpf/live → load initial events into state
4. Subscribe to Supabase Realtime on safety_events (INSERT events)
5. On new INSERT: prepend to state array + play alert beep
6. Each alert card:
   - Color border by priority (red=CRITICAL, orange=HIGH, yellow=MEDIUM)
   - Type badge: SOS | COMPARTMENT | HAZARD
   - Time, train, coach, berth, masked initials, station
   - Google Maps link: https://maps.google.com/?q={lat},{lng}
   - Three action buttons: Acknowledge | Resolve | False Alarm
   - Each button calls PATCH /api/safety/events/:id/resolve
   - On resolve: card fades/moves to "Resolved" section
7. Alert sound: playAlertSound() on every new INSERT (Web Audio API, see ARCHITECTURE.md)
8. Stats bar at top: Active SOS count, Active Compartment count, Today's total

Acceptance test:
- Open RPFDashboardPage in browser
- Fire SOS via curl: new card appears within 3 seconds WITHOUT page refresh
- Alert sound plays
- Acknowledge button works: card status changes in real time
- Page shows correct counts

---

### Slice 4.6 — Remaining API Endpoints
Steps:
1. PATCH /api/safety/sos/:id/audio:
   - Validate audio_url is https:// string
   - Verify event belongs to user and is type SOS
   - Update audio_url
   - Return updated event

2. POST /api/safety/compartment-alert:
   - Validate: train_number, coach required; alert_subtype in valid list
   - Insert: event_type COMPARTMENT_VIOLATION, priority HIGH
   - Return 201

3. POST /api/safety/hazard-report:
   - Validate: lat, lng required; alert_subtype in valid list
   - description optional max 200 chars
   - Insert: event_type HAZARD_REPORT, priority MEDIUM
   - Return 201

4. GET /api/safety/my-events:
   - Query WHERE user_id = req.user.user_id ORDER BY created_at DESC
   - Return array

5. PATCH /api/safety/events/:id/resolve:
   - Validate status: ACKNOWLEDGED | RESOLVED | FALSE_ALARM
   - Update status + rpf_note + resolved_at if RESOLVED
   - Return updated event

6. GET /api/safety/public/map (NO AUTH):
   - SELECT only safe columns (id, event_type, alert_subtype, lat, lng,
     status, train_number, station_code, created_at)
   - Optional query param filters: ?type=SOS&status=ACTIVE
   - Return array

7. GET /api/safety/rpf/live (NO AUTH for MVP):
   - SELECT top 50 events by created_at DESC
   - Returns full event object (including masked_initials) for RPF use
   - Add TODO comment: needs admin auth in production

Acceptance test for each endpoint: fire with curl, confirm correct response,
confirm DB state matches expectation.

---

## Day 3 — Mobile Core Screens

### Slice 4.7 — safetyService.js (Mobile API Layer)
Steps:
1. Create apps/mobile/src/screens/safety/services/safetyService.js
2. Implement all API calls:
   ```javascript
   import apiClient from '../../../../services/apiClient'
   import { API_BASE_URL } from '../../../../constants'

   export const postSOS = (data) => apiClient.post('/safety/sos', data)
   export const updateSOSAudio = (id, audioUrl) =>
     apiClient.patch(`/safety/sos/${id}/audio`, { audio_url: audioUrl })
   export const postCompartmentAlert = (data) =>
     apiClient.post('/safety/compartment-alert', data)
   export const postHazardReport = (data) =>
     apiClient.post('/safety/hazard-report', data)
   export const getMyEvents = () => apiClient.get('/safety/my-events')
   export const resolveEvent = (id, data) =>
     apiClient.patch(`/safety/events/${id}/resolve`, data)

   // Public endpoints — no auth header
   export const getPublicMap = () =>
     fetch(`${API_BASE_URL}/safety/public/map`).then(r => r.json())
   ```

Acceptance test: All functions exist and call correct paths.

---

### Slice 4.8 — SOSButton Component (Standalone)
Steps:
1. Create apps/mobile/src/screens/safety/components/SOSButton.js
2. Import at top: useRailSaathi hook, Expo Location, safetyService
3. Component state: isActive (bool), isDisabled (bool, 5-second cooldown)
4. Press handler:
   Step A — Show Alert.alert confirmation dialog:
   "Send SOS Alert? RPF will be notified and your emergency contacts will receive SMS."
   Buttons: Cancel | Send Alert
   Step B — On "Send Alert": set isActive=true
   Step C — Get GPS: Expo Location.getCurrentPositionAsync()
   Step D — Build payload from activeJourney + GPS
   Step E — Call postSOS(payload) — DO NOT await before returning to screen
   Use Promise approach:
   ```javascript
   const eventPromise = postSOS(payload)
   navigation.navigate('SOSActive', { eventPromise })
   ```
5. Styling: red background, white "SOS" text, 64x64dp, rounded, shadow
6. Disabled state: grey background, "COOLDOWN" text
7. Export as default

Acceptance test: Pressing SOS shows confirmation. Confirming navigates to
SOSActiveScreen. API call is made. Pressing SOS twice in 5 seconds: second
press is ignored (cooldown).

---

### Slice 4.9 — SafetyHomeScreen
Steps:
1. Create apps/mobile/src/screens/safety/SafetyHomeScreen.js
2. Layout:
   - Large SOS button (SOSButton component) centred in top half
   - Text: "Press SOS to alert RPF and your emergency contacts"
   - Three action tiles in a row:
     [Compartment Alert] [Report Hazard] [Safety Map]
   - Bottom: "My Safety Events" link → list of user's past events
   - Settings tile: [Trusted Contacts]
3. Each tile navigates to the respective screen

Acceptance test: All tiles navigate correctly. SOSButton is visible and tappable.

---

### Slice 4.10 — SOSActiveScreen (60-second countdown)
Steps:
1. Create apps/mobile/src/screens/safety/SOSActiveScreen.js
2. Receives eventPromise via navigation params
3. On mount:
   Step A — Resolve eventPromise → get event.id
   Step B — Start 60-second setInterval countdown
   Step C — Start audio recording using Expo Audio
4. Display:
   - Large pulsing red circle (animated) with "SOS ACTIVE"
   - Countdown: "Recording ends in: 0:47"
   - "RPF has been alerted"
   - "SMS sent to X contacts" (update after async SMS completes)
   - Train: 12951 | Coach: B4 | Berth: 32
5. After 60 seconds:
   Step A — Stop recording, get URI
   Step B — Upload to Supabase Storage: sos-audio bucket
   Step C — Call updateSOSAudio(event.id, audioUrl)
   Step D — Show "Evidence recorded and secured"
   Step E — After 2 more seconds, navigate back to SafetyHomeScreen
6. Cancel button: stops recording, marks event as cancelled, navigates back

Pulsing animation:
```javascript
useEffect(() => {
  const pulse = Animated.loop(
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true })
    ])
  )
  pulse.start()
  return () => pulse.stop()
}, [])
```

Acceptance test: Screen shows countdown. Audio permission requested. After 60s:
recording stops, upload called, audio_url PATCH fires, screen returns to home.

---

## Day 4 — Remaining Mobile Screens

### Slice 4.11 — CompartmentAlertScreen
Steps:
1. Create apps/mobile/src/screens/safety/CompartmentAlertScreen.js
2. Pre-fill train_number and coach from activeJourney
3. If no activeJourney: show text inputs for train and coach
4. Issue type picker (radio buttons):
   - Male Occupant in Ladies' Compartment
   - Harassment
   - Threatening Behaviour
5. Submit button: call postCompartmentAlert(payload)
6. On success: show "Alert sent to RPF at next station" with a checkmark
7. Auto-navigate back to SafetyHomeScreen after 3 seconds

Acceptance test: Full flow under 10 seconds from tap to confirmation.
Alert appears in RPF dashboard.

---

### Slice 4.12 — HazardReportScreen
Steps:
1. Create apps/mobile/src/screens/safety/HazardReportScreen.js
2. On mount: get GPS via Expo Location, show "Getting your location..."
3. Hazard type selector (6 options in a scrollable list):
   Unmanned Crossing | Broken Platform | Poor Lighting |
   Flooding | Track Damage | Other
4. Description field: optional, multiline, max 200 chars
5. Photo button: Expo ImagePicker → upload to hazard-photos bucket
6. Location display: shows "Lat: 28.64°, Lng: 77.21°" (non-editable)
7. Submit: call postHazardReport(payload)
8. On success: reference ID shown, "Thank you for keeping passengers safe"

Acceptance test: GPS fills automatically. Hazard report creates event in DB.
Marker appears on safety map.

---

### Slice 4.13 — SafetyMapScreen (Public)
Steps:
1. Create apps/mobile/src/screens/safety/SafetyMapScreen.js
2. Does NOT use useRailSaathi() — intentionally public screen
3. Install react-native-maps if not done: npx expo install react-native-maps
4. On mount: call getPublicMap() (no auth)
5. MapView centred on India (lat: 20.59, lng: 78.96, zoom out to see all)
6. For each event in the data:
   - SOS: red marker with ! icon
   - COMPARTMENT_VIOLATION: orange marker with W icon
   - HAZARD_REPORT: yellow marker with ⚠ icon
7. Tap a marker: show bottom sheet:
   - Event type label
   - Alert subtype
   - Train number (if present)
   - Time (relative: "3 hours ago")
   - Status badge (ACTIVE / RESOLVED)
8. Filter row at top: All | SOS | Compartment | Hazard (toggle buttons)
9. Legend at bottom: color-coded type explanation

Acceptance test: Map loads without auth. Seeded markers appear.
Tapping a marker shows correct details.

---

### Slice 4.14 — TrustedContactsScreen
Steps:
1. Create apps/mobile/src/screens/safety/TrustedContactsScreen.js
2. Use useRailSaathi() to read currentUser.emergency_contacts (array of strings)
3. Show up to 3 contact entries. Each entry: phone number input + name input
4. "Add Contact" button (visible if < 3 contacts)
5. Delete button on each existing contact
6. Save button: call PATCH /api/users/me with updated emergency_contacts array
   (This is Member 1's endpoint — import apiClient and call directly)
7. After save: call refreshUser() from context to update the cached user object
8. Validation: phone numbers must be 10 digits (Indian mobile numbers)

Acceptance test: Add a contact, save, log out and back in — contact persists
(because it is stored on the user object in DB via Member 1's endpoint).

---

### Slice 4.15 — Seed Safety Data
Steps:
1. Create scripts/seed-safety.js
2. Insert synthetic safety events:
   - 30 SOS events across 15 stations, last 3 months
     Mix of ACTIVE (5), ACKNOWLEDGED (10), RESOLVED (15)
   - 20 COMPARTMENT_VIOLATION events, various trains
   - 50 HAZARD_REPORT events (emphasise UNMANNED_CROSSING)
   - Ensure all events have realistic lat/lng using station coordinates
     from the station_coordinates table (Member 3 seeds this)
   - All events have masked_initials set
3. Run: node scripts/seed-safety.js
4. Verify: safety map shows 50+ markers across India

Acceptance test: GET /api/safety/public/map returns 80+ events.
Safety map shows meaningful coverage.

---

## Day 5 — Integration

### Slice 4.16 — Hand Off to Member 1
Steps:
1. Push all code to GitHub
2. Replace all mock context with useRailSaathi() in all screens
   EXCEPT SafetyMapScreen (no context hook intentionally)
3. Replace all hardcoded localhost URLs with API_BASE_URL
4. Remove all debug console.logs that print personal data
5. Tell Member 1:
   - Line for index.js: app.use('/api/safety', require('./routes/safety'))
   - Import SOSButton from '../safety/components/SOSButton' for HomeScreen
   - Add RPFDashboardPage route in dashboard/src/App.jsx routing
   - 004_safety.sql is applied in Supabase
   - Realtime is enabled and REPLICA IDENTITY FULL is set
6. Test SOS flow end-to-end on the integrated app:
   - Press SOS on mobile → check RPF dashboard updates < 3 seconds
   - Check SMS arrives on verified number

---

## Day 6 — Demo Prep

### Slice 4.17 — Demo Rehearsal (Critical)
Rehearse this exactly 10 times before demo day. Seriously — 10 times.

Setup for demo:
- Phone 1: logged in as demo user with active journey (Train 12951, B4, 32)
- Laptop: RPFDashboardPage open in browser, full screen
- Phone 2 (or team member's phone): registered as emergency contact for demo user

Demo sequence (60 seconds total):

[0s] Show Safety tab home screen with large SOS button
[5s] Say: "This passenger is being harassed. She presses SOS."
[7s] Press SOS button → confirmation dialog appears
[9s] Tap "Send Alert"
[10s] SOSActiveScreen: pulsing red circle, countdown starts
[13s] LAPTOP: RPF dashboard — new card appears with beep sound
      Judge reads aloud: "Train 12951, Coach B4, Berth 32, R.K., 22:15:03"
[20s] Phone 2: SMS arrives — read aloud: "EMERGENCY: R.K. needs help..."
[35s] Show SOSActiveScreen still counting down (recording evidence)
[50s] Say: "In the background: recording uploading as evidence"
[55s] Show dashboard: Acknowledge button → click it → card changes status

Total: 60 seconds. This demo wins the room.

Backup plan if Twilio SMS fails:
- Show the server log on the laptop: [SMS] Sent to +919...
- Say: "SMS confirmation is in the server logs — Twilio trial limits
  verified numbers, in production this reaches any contact."
- Do not apologise. Move on. The RPF dashboard is the real moment.

---

## Context Checkpoint File (update after every slice)

After each slice, update PROGRESS.md:

```
## Completed Slices
- [ ] 4.1 — Environment setup + Twilio account
- [ ] 4.2 — DB migration (004_safety.sql) + Realtime enabled
- [ ] 4.3 — safety-service.js + twilioService.js
- [ ] 4.4 — POST /api/safety/sos (< 500ms confirmed)
- [ ] 4.5 — RPFDashboardPage.jsx (Realtime working)
- [ ] 4.6 — All remaining API endpoints
- [ ] 4.7 — safetyService.js (mobile)
- [ ] 4.8 — SOSButton component (standalone)
- [ ] 4.9 — SafetyHomeScreen
- [ ] 4.10 — SOSActiveScreen (countdown + audio)
- [ ] 4.11 — CompartmentAlertScreen
- [ ] 4.12 — HazardReportScreen
- [ ] 4.13 — SafetyMapScreen (no auth)
- [ ] 4.14 — TrustedContactsScreen
- [ ] 4.15 — Seed safety data (100 events)
- [ ] 4.16 — Integration handoff
- [ ] 4.17 — Demo rehearsed 10 times

## My Files to Hand Off
- supabase/migrations/004_safety.sql
- services/api/src/routes/safety.js
- services/api/src/services/safety-service.js
- services/api/src/services/twilioService.js
- apps/mobile/src/screens/safety/ (all files)
- apps/dashboard/src/pages/RPFDashboardPage.jsx
- scripts/seed-safety.js
```
