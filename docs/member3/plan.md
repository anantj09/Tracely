# Implementation Plan (plan.md)
# Member 3 — Grievance & Complaint System
# FAR AWAY 2026 — RailSaathi Platform

---

## Overview
6 days. You work independently from Members 2, 4, 5. You need from Member 1:
the running Supabase project (URL + service key), the repo clone, and the
JWT middleware path. Get these by end of Day 1. After that, you are unblocked.
All slices are atomic — complete and test each before moving to the next.

---

## Day 1 — Backend Foundation

### Slice 3.1 — Environment Setup
Steps:
1. Clone the GitHub repo from Member 1
2. Navigate to services/api/
3. Get .env values from Member 1: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
4. Copy to your local .env (never commit this)
5. npm install, confirm server starts: node src/index.js
6. Confirm GET /api/health returns 200

Acceptance test: Server runs. Health check passes.

---

### Slice 3.2 — Database Migration + Station Seed
Steps:
1. Open Supabase project SQL editor (get URL from Member 1)
2. Paste and run supabase/migrations/003_complaints.sql
   (complaints table, complaint_timeline table, station_coordinates table,
   all indexes, all RLS policies as defined in ARCHITECTURE.md)
3. Confirm all 3 tables exist in Supabase Table Editor
4. Create Supabase Storage bucket:
   Dashboard → Storage → New bucket → Name: complaint-photos → Public: ON
5. Create scripts/seed-stations.js:
   - Insert the 20 station rows from ARCHITECTURE.md Section 7
   - Add 30 more stations from this list (common Indian junctions):
     MFP (Muzaffarpur), GAYA, DHN (Dhanbad), RNC (Ranchi), BSB (Varanasi),
     ALD (Prayagraj), GKP (Gorakhpur), LDH (Ludhiana), ASR (Amritsar),
     DLI (Old Delhi), NZM (Hazrat Nizamuddin), BCT (Mumbai BCT),
     DR (Dadar), KYN (Kalyan), ST (Surat), BRC (Vadodara),
     RTM (Ratlam), SWM (Sawai Madhopur), AJM (Ajmer), JU (Jodhpur),
     BKN (Bikaner), JSM (Jaisalmer), UHL (Amb Andaura), CDG (Chandigarh),
     HRI (Hisar), KKDE (Kurukshetra), UMB (Ambala), SRE (Saharanpur),
     MUT (Mathura), AF (Agra Fort)
6. Run: node scripts/seed-stations.js
7. Confirm 50 rows in station_coordinates table

Acceptance test: All 3 tables exist. 50+ rows in station_coordinates.
Storage bucket complaint-photos exists and is public.

---

### Slice 3.3 — Service Layer
Steps:
1. Create services/api/src/services/complaint-service.js
   Add these pure/utility functions (no DB calls — take inputs, return values):
   ```javascript
   generateReferenceNumber()
   // Returns: "RS-20260614-84729"
   // Uses server time. Generates random 5-digit suffix.

   validateStatusTransition(fromStatus, toStatus)
   // Returns: { valid: true } or { valid: false, message: "..." }
   // Encodes the 7 valid transitions listed in AGENTS.md

   calculatePriorityAndStatus(complaintType)
   // Returns: { status, priority }
   // SAFETY: { status: 'IN_PROGRESS', priority: 'CRITICAL' }
   // Others: { status: 'SUBMITTED', priority: 'NORMAL' }

   isReopenAllowed(complaint)
   // Returns: { allowed: true } or { allowed: false, reason: "..." }
   // Checks: status === RESOLVED, NOW() < reopen_deadline
   ```

2. Create services/api/src/services/notificationService.js
   ```javascript
   sendPushNotification(expoPushToken, title, body)
   // Calls https://exp.host/--/api/v2/push/send
   // Wrapped in try/catch — never throws
   // Logs: [PUSH] token=<first10chars>... status=sent|failed
   ```

Acceptance test: Call generateReferenceNumber() 100 times — confirm format
is correct each time. Call validateStatusTransition with all 7 valid paths
and 5 invalid paths — confirm correct return values.

---

### Slice 3.4 — Core Filing Endpoint
Steps:
1. Create services/api/src/routes/complaints.js
2. Install express-validator if not already present: npm install express-validator
3. Implement POST /api/complaints (protected with verifyToken):
   Step A — Validate request body:
   - complaint_type: must be in ['CLEANLINESS','AC_HEATING','STAFF','FOOD',
     'SAFETY','OVERCROWDING','AMENITY','OTHER']
   - description: 10–500 chars
   - station_code: 2–7 chars, non-empty
   - travel_date: optional, if provided must be valid date
   Step B — Get user_id from req.user.user_id
   Step C — Call generateReferenceNumber(), check uniqueness in DB:
   ```javascript
   let refNum, exists
   do {
     refNum = generateReferenceNumber()
     const { data } = await supabase.from('complaints')
       .select('id').eq('reference_number', refNum).single()
     exists = !!data
   } while (exists)
   ```
   Step D — Fetch station coordinates:
   ```javascript
   const { data: station } = await supabase
     .from('station_coordinates')
     .select('lat, lng, station_name')
     .eq('station_code', req.body.station_code)
     .single()
   ```
   Step E — Calculate status and priority using complaint-service.js
   Step F — Insert into complaints table
   Step G — Insert timeline entries:
   - Always insert SUBMITTED entry
   - If SAFETY: also insert IN_PROGRESS entry with auto-escalation note
   Step H — Call sendPushNotification (in try/catch, non-blocking)
   Step I — Return 201 with complaint + timeline

Acceptance test:
- POST with AC_HEATING → status=SUBMITTED, priority=NORMAL, 1 timeline entry
- POST with SAFETY → status=IN_PROGRESS, priority=CRITICAL, 2 timeline entries
- POST with description under 10 chars → 400
- POST with invalid complaint_type → 400
- Two POSTs in a row: reference numbers are different

---

## Day 2 — Read Endpoints + Admin Status Update

### Slice 3.5 — List and Detail Endpoints
Steps:
1. Implement GET /api/complaints (protected):
   - Query complaints WHERE user_id = req.user.user_id
   - Optional filters via query params: ?status=SUBMITTED&type=AC_HEATING
   - Order by created_at DESC
   - Do NOT return the full timeline here — list view only
   - Return array of complaint objects (without timeline)

2. Implement GET /api/complaints/:id (protected):
   - Fetch complaint by id
   - If not found: 404
   - If user_id does not match: 403
   - Fetch all timeline entries for this complaint_id, order by created_at ASC
   - Return complaint + timeline array

Acceptance test:
- GET returns only the logged-in user's complaints (not others')
- GET /:id returns timeline entries in correct order
- GET /:id with wrong user returns 403

---

### Slice 3.6 — Admin Status Update Endpoint
Steps:
1. Implement PATCH /api/complaints/:id/status (admin protected):
   For the MVP, admin check is simple:
   ```javascript
   // Check if user is in admin_users table (Member 1 creates this)
   const { data: admin } = await supabase
     .from('admin_users')
     .select('id')
     .eq('id', req.user.user_id)
     .single()
   if (!admin) return res.status(403).json({ error: 'Admin access required' })
   ```
   If admin_users table is not ready yet: skip the admin check for now,
   add a TODO comment, and test with any valid JWT. Re-add check on Day 5.

2. Validate transition using validateStatusTransition() from complaint-service.js
3. If new_status === 'RESOLVED': set reopen_deadline = NOW() + 72 hours
4. Update complaint (status, updated_at)
5. Insert timeline entry with note
6. Call sendPushNotification to expo_push_token stored on complaint
7. Return updated complaint with new timeline entry

Acceptance test:
- PATCH SUBMITTED → ACKNOWLEDGED → status changes, timeline grows
- PATCH RESOLVED → IN_PROGRESS → 400 invalid transition
- Changing to RESOLVED sets reopen_deadline to ~72h from now
- Push log appears in server console

---

### Slice 3.7 — Reopen Endpoint
Steps:
1. Implement POST /api/complaints/:id/reopen (protected):
   - Fetch complaint, verify ownership
   - Call isReopenAllowed(complaint):
     If not allowed: return 400 with the specific reason
   - Update: status = 'SUBMITTED', is_reopened = true,
     reopen_count += 1, priority = 'HIGH', updated_at = NOW()
   - Insert timeline entry: to_status = 'SUBMITTED', changed_by = 'USER',
     note = req.body.description
   - Return updated complaint with new timeline entry

Acceptance test:
- Reopen within 72h → 200, status back to SUBMITTED, is_reopened = true
- Reopen after deadline (set deadline to past in DB) → 400 with reason
- Reopen non-RESOLVED complaint → 400 with reason

---

## Day 2–3 — Public Heat Map Endpoints

### Slice 3.8 — Heat Map Data Endpoint
Steps:
1. Implement GET /api/complaints/public/heatmap (NO verifyToken):
   Important: register this route BEFORE the /:id route in complaints.js
   so that '/public/heatmap' is not matched as an :id parameter:
   ```javascript
   router.get('/public/heatmap', heatmapHandler)   // register first
   router.get('/public/stats', statsHandler)         // register second
   router.get('/:id', verifyToken, detailHandler)    // register after
   ```

2. SQL query for heat map data:
   ```javascript
   const { data } = await supabase.rpc('get_heatmap_data')
   // Create a Supabase RPC function (SQL function) for this:
   ```
   Create in Supabase SQL editor:
   ```sql
   CREATE OR REPLACE FUNCTION get_heatmap_data()
   RETURNS JSON AS $$
   SELECT json_agg(row_to_json(t)) FROM (
     SELECT
       c.station_code,
       sc.station_name,
       sc.lat,
       sc.lng,
       COUNT(*) as total_complaints,
       json_object_agg(c.complaint_type, type_count) as by_type
     FROM complaints c
     JOIN station_coordinates sc ON c.station_code = sc.station_code
     JOIN (
       SELECT station_code, complaint_type, COUNT(*) as type_count
       FROM complaints GROUP BY station_code, complaint_type
     ) ct ON ct.station_code = c.station_code AND ct.complaint_type = c.complaint_type
     GROUP BY c.station_code, sc.station_name, sc.lat, sc.lng
   ) t
   $$ LANGUAGE sql SECURITY DEFINER;
   ```

   Note: if the RPC is complex, simplify: do the aggregation in JavaScript
   after fetching all complaints with station_code, lat, lng.
   For the MVP, performance is less important than correctness.

3. Add cache header: res.set('Cache-Control', 'public, max-age=300')
4. Return the aggregated array

2. Implement GET /api/complaints/public/stats (NO verifyToken):
   ```javascript
   // Four separate Supabase queries:
   const today = new Date().toISOString().slice(0, 10)
   const complaintsToday = await supabase.from('complaints')
     .select('id', { count: 'exact' })
     .gte('created_at', today)
   // etc.
   ```

Acceptance test:
- GET /api/complaints/public/heatmap WITHOUT auth header → 200 with station data
- GET /api/complaints/public/stats WITHOUT auth header → 200 with counts
- Response includes at least the seeded stations

---

## Day 3 — Mobile Screens (Core)

### Slice 3.9 — complaintService.js (Mobile API Layer)
Steps:
1. Create apps/mobile/src/screens/complaints/services/complaintService.js
2. Implement all API calls using apiClient from Member 1:
   ```javascript
   import apiClient from '../../../../services/apiClient'

   export const fileComplaint = (data) => apiClient.post('/complaints', data)
   export const getMyComplaints = (filters) => apiClient.get('/complaints', { params: filters })
   export const getComplaint = (id) => apiClient.get(`/complaints/${id}`)
   export const updateStatus = (id, data) => apiClient.patch(`/complaints/${id}/status`, data)
   export const reopenComplaint = (id, data) => apiClient.post(`/complaints/${id}/reopen`, data)

   // Heat map — no auth header needed
   export const getHeatmapData = () =>
     fetch(`${API_BASE_URL}/complaints/public/heatmap`).then(r => r.json())
   export const getPublicStats = () =>
     fetch(`${API_BASE_URL}/complaints/public/stats`).then(r => r.json())
   ```

Acceptance test: Each function calls the correct endpoint. Errors propagate correctly.

---

### Slice 3.10 — ComplaintsHomeScreen
Steps:
1. Create apps/mobile/src/screens/complaints/ComplaintsHomeScreen.js
2. On mount: call getMyComplaints()
3. Sections:
   - Top: "New Complaint" button (primary) + "Public Map" button (secondary)
   - Below: FlatList of ComplaintCard components (one per complaint)
4. ComplaintCard shows: reference number, complaint type icon, status badge
   (colour-coded), train number, time ago
5. Tap a card → navigate to ComplaintDetailScreen
6. Pull-to-refresh: re-fetch complaints list
7. Empty state: "No complaints yet. Tap above to report an issue."

Acceptance test: List loads correctly. New complaint button navigates correctly.
Pull-to-refresh works.

---

### Slice 3.11 — NewComplaintScreen
Steps:
1. Create apps/mobile/src/screens/complaints/NewComplaintScreen.js
2. Use useRailSaathi() to get activeJourney (use mock during development)
3. Two modes:
   Mode A — Has activeJourney:
   - Show journey card (read-only): train, coach, berth, station (non-editable)
   - User only fills: complaint type, description, optional photo
   Mode B — No activeJourney:
   - Show manual fields: Train Number, Station Code, Coach, Date (all editable)
   - Plus: complaint type, description, optional photo
4. ComplaintTypeSelector component:
   - 8 buttons in a 2x4 grid
   - Each has icon + label
   - Selected type highlighted
   - Only one selectable at a time
5. Description field: multiline TextInput, 10–500 char limit shown as counter
6. PhotoUploader component: tap to pick image, shows thumbnail after pick,
   uploads to Supabase Storage, stores returned URL in state
7. Submit button:
   - Get Expo push token (call Notifications.getExpoPushTokenAsync)
   - Assemble payload from form state + activeJourney + push token
   - Call fileComplaint(payload)
   - On success: navigate to ComplaintDetailScreen with the new complaint
   - On error: show error message, do not navigate

Acceptance test:
- With activeJourney: train/coach/berth pre-filled, non-editable
- Without activeJourney: all fields editable
- Submit with description < 10 chars: show validation error, do not submit
- Submit with SAFETY type: show warning "This will be auto-escalated to priority handling"
- Successful submit: confirmation screen shows reference number

---

## Day 4 — Mobile Screens (Detail + Map)

### Slice 3.12 — ComplaintDetailScreen
Steps:
1. Create apps/mobile/src/screens/complaints/ComplaintDetailScreen.js
2. Receives complaint id via navigation params
3. On mount: call getComplaint(id) to get full detail with timeline
4. Shows:
   - Reference number (large, copyable — long press to copy)
   - Status badge (colour-coded)
   - Complaint type + description
   - Photo (if exists, tappable to full-screen)
   - Train/station info
5. StatusTimeline component:
   - Vertical timeline, oldest entry at top
   - Each entry: status chip, timestamp (relative: "2 hours ago"), note text
   - Current status entry highlighted
6. Reopen button: show only if status === 'RESOLVED' AND reopen_deadline > NOW()
   Show remaining hours: "Reopen available for X more hours"
7. Reopen button tap → navigate to ReopenScreen

Acceptance test:
- Timeline shows entries in correct order
- Reopen button visible only for RESOLVED within deadline
- Photo opens in full screen on tap

---

### Slice 3.13 — ReopenScreen
Steps:
1. Create apps/mobile/src/screens/complaints/ReopenScreen.js
2. Receives complaint object via navigation params
3. Simple screen: description of the reopen policy, one TextInput for
   "What is still wrong?" (min 20 chars), Submit button
4. Submit: call reopenComplaint(id, { description })
5. On success: navigate back to ComplaintDetailScreen, show success toast
6. On error: show error message with specific reason from API

Acceptance test: Submit reopens complaint. API returns updated complaint.
Invalid reopens (after deadline) show the specific error from the server.

---

### Slice 3.14 — PublicHeatMapScreen
Steps:
1. Create apps/mobile/src/screens/complaints/PublicHeatMapScreen.js
2. This screen does NOT use useRailSaathi() — it is public
3. Install: npx expo install react-native-maps
4. On mount: call getHeatmapData() and getPublicStats()
5. Show stats bar at top: "312 complaints today | 67% resolved | Top: Cleanliness"
6. MapView showing India (initial region: lat 20.5937, lng 78.9629, zoom out)
7. For each station in heat map data: show a Circle marker
   - Radius proportional to total_complaints
   - Color: red if >30 complaints, orange if 10–30, green if <10
8. Tap a marker: show bottom sheet with:
   - Station name
   - Total complaints
   - Breakdown by type as a mini bar chart (or just text list)
9. No login required — accessible from ComplaintsHomeScreen without auth

Acceptance test:
- Map loads without auth
- Markers appear on seeded stations
- Tapping a marker shows the breakdown
- Stats bar shows real numbers from the API

---

### Slice 3.15 — Seed Complaint Data
Steps:
1. Create scripts/seed-complaints.js (or add to main seed script)
2. Insert 300 synthetic complaints spread across:
   - 30 of the 50 seeded stations
   - All 8 complaint types (roughly proportional: CLEANLINESS 30%, AC_HEATING 20%,
     STAFF 15%, FOOD 10%, SAFETY 10%, OVERCROWDING 8%, AMENITY 5%, OTHER 2%)
   - Dates spread over the last 3 months
   - Statuses: 30% SUBMITTED, 20% ACKNOWLEDGED, 20% IN_PROGRESS,
     25% RESOLVED, 5% REJECTED
3. For RESOLVED complaints, insert 2–4 timeline entries
4. For IN_PROGRESS complaints, insert 2 timeline entries
5. Run: node scripts/seed-complaints.js
6. Verify heat map endpoint returns data for at least 20 stations

Acceptance test: GET /api/complaints/public/heatmap returns 20+ stations with data.
Admin dashboard complaint map shows visible markers.

---

## Day 5 — Integration

### Slice 3.16 — Hand Off to Member 1
Steps:
1. Push all code to GitHub main branch
2. Replace all mock context with real useRailSaathi() calls in all screens
   EXCEPT PublicHeatMapScreen (intentionally no context)
3. Replace all hardcoded localhost URLs with API_BASE_URL from constants
4. Remove all debug console.log statements that print user data or complaint details
5. Tell Member 1 the exact line to add in index.js:
   app.use('/api/complaints', require('./routes/complaints'))
6. Confirm Member 1 applies 003_complaints.sql in Supabase (or confirm it is already applied)
7. Run through integration test: file complaint from app → appears in admin dashboard heat map

---

## Day 6 — Demo Prep

### Slice 3.17 — Demo Script (90 seconds)
Practice this exact sequence:

1. Open Complaints tab → ComplaintsHomeScreen
   (shows seeded previous complaints for demo user)
2. Tap "New Complaint"
3. NewComplaintScreen: train/coach/berth already filled (Mumbai Rajdhani, B4, 32)
4. Tap "AC / Heating Issue" — button highlights
5. Type: "AC not working in coach B4 since Mathura, very hot"
6. Skip photo, tap Submit
7. → ConfirmationScreen: "RS-20260614-84729 — Complaint received"
8. Go back to list — new complaint appears at top as SUBMITTED
9. Judge opens admin dashboard:
   PATCH complaint to IN_PROGRESS from the dashboard
10. Phone receives push notification within 5 seconds:
    "Update on RS-20260614-84729: IN_PROGRESS"
11. Tap notification → ComplaintDetailScreen shows 2 timeline entries
12. Switch to Public Map screen — India map with markers, tap New Delhi → 47 complaints shown

Total: 90 seconds. The push notification arriving on the phone is the moment
that lands with judges — make sure it is reliable.

---

## Context Checkpoint File (update after every slice)

After each slice, update PROGRESS.md:

```
## Completed Slices
- [x] 3.1 — Environment setup
- [x] 3.2 — DB migration + station seed (003_complaints.sql)
- [x] 3.3 — complaint-service.js + notificationService.js
- [x] 3.4 — POST /api/complaints (filing endpoint)
- [x] 3.5 — GET list + GET :id
- [x] 3.6 — PATCH /:id/status (admin)
- [x] 3.7 — POST /:id/reopen
- [x] 3.8 — GET /public/heatmap + /public/stats
- [x] 3.9 — complaintService.js (mobile)
- [x] 3.10 — ComplaintsHomeScreen
- [x] 3.11 — NewComplaintScreen
- [x] 3.12 — ComplaintDetailScreen + StatusTimeline
- [x] 3.13 — ReopenScreen
- [x] 3.14 — PublicHeatMapScreen
- [x] 3.15 — Seed complaint data (300 records)
- [x] 3.16 — Integration handoff
- [x] 3.17 — Demo rehearsed

## My Files to Hand Off
- supabase/migrations/003_complaints.sql
- services/api/src/routes/complaints.js
- services/api/src/services/complaint-service.js
- services/api/src/services/notificationService.js
- apps/mobile/src/screens/complaints/ (all screens, split wizard implemented in `NewComplaintScreen.js`)
- apps/dashboard/src/components/complaints/GrievanceForm.jsx (web portal split wizard implementation)
- apps/dashboard/src/pages/ComplaintMapPage.jsx & ComplaintMap.jsx (train mode heatmap/corridor implementations)
- scripts/seed-stations.js
- scripts/seed-complaints.js
```

---

## Post-Plan Modifications & Refinements

1. **Station vs. Train Journey Separation**:
   - Spun up a multi-step split form flow on both the React Web Portal (`GrievanceForm.jsx`) and Expo Mobile Screen (`NewComplaintScreen.js`).
   - Standardized the database and backend handlers to accept `station_code: 'UNKNOWN'` for train complaints, enabling segment-based tracking.
   - Enforced 10-digit PNR validation with a live verification check querying `POST /api/journeys/pnr`.

2. **Leaflet Train Corridor Mapping**:
   - Replaced linear station-to-station polylines with Quadratic Bezier curves bounded strictly inland to prevent mapping lines from crossing the Arabian Sea/Bay of Bengal.
   - Implemented a schematic design by removing high-detail OpenRailwayMap tile overlays, using standard Leaflet styles for cleaner corridor visualizations.
   - Handled dynamic weights and dimming logic (inactive corridors shrink to 1px with 0.03 opacity, active selection expands to 7px).
