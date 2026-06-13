# Implementation Plan (plan.md)
# Member 2 — Tatkal Verified Booking Ecosystem
# FAR AWAY 2026 — RailSaathi Platform

---

## Overview
6 days. You work independently from Members 3, 4, 5. You depend on
Member 1 only for: the running Supabase project (need the URL + service key),
the repo structure, and the JWT middleware file. Get these from Member 1 by
end of Day 1. After that, you are unblocked.

All slices are atomic — complete and test each before moving to the next.

---

## Day 1 — Backend Foundation

### Slice 2.1 — Environment Setup
Steps:
1. Clone the GitHub repo that Member 1 creates
2. Navigate to services/api/
3. Get .env values from Member 1: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
4. Create your own .env locally (do not commit it)
5. Run npm install, confirm the server starts: node src/index.js
6. Confirm GET /api/health returns 200

Acceptance test: Server starts without errors. Health check passes.

---

### Slice 2.2 — Database Migration
Steps:
1. Open Supabase project SQL editor (get URL from Member 1)
2. Paste and run the contents of supabase/migrations/002_tatkal.sql
   (tatkal_requests table + tatkal_surrenders table + indexes + RLS policies)
3. In Supabase Table Editor, confirm both tables exist with correct columns
4. Confirm the unique index idx_tatkal_one_per_day is present
5. Create storage bucket: go to Supabase Storage → New bucket →
   Name: tatkal-documents → Private: ON

Acceptance test: Both tables visible in Supabase. Unique index visible in
the indexes section. Storage bucket exists.

---

### Slice 2.3 — Core Prefill Endpoint
Steps:
1. Create services/api/src/services/tatkal-service.js
   Add the following functions (no DB calls in this file — pure business logic):
   - calculateUrgencyScore(reason, hasDocument, accountAgeMonths)
   - calculateFireTime(travelDate, trainClass)
   - validatePassengerList(passengers, accountHolderName)
     Returns { valid: true } or { valid: false, message: "..." }
   - generateFakePNR() → "DEMO" + 6 random digits

2. Create services/api/src/routes/tatkal.js
   Install express-validator if not already in package.json:
   npm install express-validator

3. Implement POST /api/tatkal/prefill:
   Step A — Import and apply the auth middleware (from Member 1):
   ```javascript
   const { verifyToken } = require('../middleware/auth')
   router.post('/prefill', verifyToken, async (req, res) => { ... })
   ```
   Step B — Validate request body fields (use express-validator):
   - from_station: non-empty string, max 7 chars, uppercase
   - to_station: same
   - travel_date: valid future date
   - class: must be in ['SL', '3A', '2A', '1A', 'GEN']
   - passengers: array, length 1–6, each item has name, age, gender
   Step C — Fetch the user from the users table using req.user.user_id
   Step D — Call validatePassengerList — return 400 if invalid
   Step E — Check for existing active request (anti-hoarding):
   ```javascript
   const { data: existing } = await supabase
     .from('tatkal_requests')
     .select('id')
     .eq('user_id', userId)
     .eq('booking_date', today)
     .not('status', 'in', '("CANCELLED","FAILED")')
     .single()
   if (existing) return res.status(409).json({ error: "You already have an active Tatkal request for today.", code: "DUPLICATE_REQUEST" })
   ```
   Step F — Calculate urgency score and fire time
   Step G — Insert into tatkal_requests table
   Step H — Return 201 with the created request object

4. Register route temporarily for local testing:
   In your LOCAL copy of index.js, add:
   app.use('/api/tatkal', require('./routes/tatkal'))
   (Do not push this change — Member 1 does it on Day 5)

Acceptance test: POST /api/tatkal/prefill with valid body creates a record
in Supabase with correct urgency_score and scheduled_fire_time.
Submitting a second request for the same day returns 409.
Submitting without account holder in passengers returns 400.

---

### Slice 2.4 — Read Endpoints
Steps:
1. Implement GET /api/tatkal/my-requests (protected):
   - Query tatkal_requests WHERE user_id = req.user.user_id
   - Order by created_at DESC
   - Return array

2. Implement GET /api/tatkal/:id (protected):
   - Query by id
   - If not found: 404
   - If found but user_id does not match: 403
   - If found and authorized: 200 with request object

3. Implement POST /api/tatkal/cancel/:id (protected):
   - Fetch the request, verify ownership
   - If status is not PENDING: return 400 "Only pending requests can be cancelled"
   - Update status to CANCELLED
   - Return updated object

Acceptance test: GET returns correct records. GET with wrong user returns 403.
Cancel works only on PENDING requests.

---

## Day 2 — Fire Engine + Demo Endpoint

### Slice 2.5 — Demo Fire Endpoint
Steps:
1. Implement POST /api/tatkal/fire/:id (protected):
   - Fetch request, verify ownership
   - If status is not PENDING: return 400 "Request is not in PENDING status"
   - Update status to FIRED
   - await new Promise(r => setTimeout(r, 2000)) — simulate IRCTC call
   - Generate fake PNR using generateFakePNR()
   - Update status to CONFIRMED, set simulated_pnr
   - Return updated object

Acceptance test: Calling fire/:id changes status from PENDING → CONFIRMED
and returns a simulated PNR in 2 seconds.

---

### Slice 2.6 — Scheduled Fire Job
Steps:
1. Create services/api/src/jobs/tatkalFireJob.js
2. Implement firePendingRequests():
   - Query tatkal_requests WHERE status = 'PENDING' AND scheduled_fire_time <= NOW()
   - For each: check status again (idempotency guard), skip if not PENDING
   - Log: [TATKAL_FIRE] request_id=<uuid> status=FIRING at=<timestamp>
   - Update status to FIRED
   - await 2 seconds
   - Generate fake PNR
   - Update status to CONFIRMED, set simulated_pnr, updated_at
   - Log: [TATKAL_FIRE] request_id=<uuid> status=CONFIRMED pnr=<pnr>
3. setInterval(firePendingRequests, 30000) — runs every 30 seconds
4. Export a start() function that the route file imports and calls once

Acceptance test: Create a request with scheduled_fire_time = 60 seconds
from now. Watch the logs. After the fire job runs, check Supabase — the
request should be CONFIRMED with a fake PNR.

---

### Slice 2.7 — Surrender Endpoints
Steps:
1. Implement POST /api/tatkal/surrender (protected):
   - Input: pnr, from_station, to_station, travel_date, train_number, class
   - Insert into tatkal_surrenders as owner_user_id = current user
   - Return 201 with surrender object

2. Implement GET /api/tatkal/surrenders (protected, but reads all LISTED):
   - Optional query params: from, to, date, class
   - Return all LISTED surrenders with filters applied

3. Implement POST /api/tatkal/surrenders/:id/request (protected):
   - Fetch surrender by id, must be LISTED
   - If requester is owner: return 400 "Cannot request your own surrender"
   - Update: status = MATCHED, requester_user_id = current user, matched_at = NOW()
   - Return updated surrender

Acceptance test: Full flow — user A lists surrender, user B requests it,
check that status is MATCHED and requester_user_id is user B's id.

---

## Day 3 — Mobile Screens (Core)

### Slice 2.8 — tatkalService.js (Mobile API Layer)
Steps:
1. Create apps/mobile/src/screens/tatkal/services/tatkalService.js
2. Implement all API calls using apiClient from Member 1:
   ```javascript
   import apiClient from '../../../../services/apiClient'

   export const submitPrefill = (data) => apiClient.post('/tatkal/prefill', data)
   export const getMyRequests = () => apiClient.get('/tatkal/my-requests')
   export const getRequest = (id) => apiClient.get(`/tatkal/${id}`)
   export const fireRequest = (id) => apiClient.post(`/tatkal/fire/${id}`)
   export const cancelRequest = (id) => apiClient.post(`/tatkal/cancel/${id}`)
   export const getSurrenders = (filters) => apiClient.get('/tatkal/surrenders', { params: filters })
   export const listSurrender = (data) => apiClient.post('/tatkal/surrender', data)
   export const requestSurrender = (id) => apiClient.post(`/tatkal/surrenders/${id}/request`)
   ```

Acceptance test: Each function makes the correct HTTP call. Errors are thrown
and catchable by the calling screen.

---

### Slice 2.9 — TatkalHomeScreen
Steps:
1. Create apps/mobile/src/screens/tatkal/TatkalHomeScreen.js
2. On mount: call getMyRequests()
3. Three states:
   - No requests: show "Book Tatkal" button + "Surrender Market" button
   - Has PENDING request: show countdown card + cancel button
   - Has CONFIRMED request: show confirmation card with fake PNR
4. "Book Tatkal" button navigates to PreFillFormScreen
5. "Surrender Market" button navigates to SurrenderMarketScreen

Acceptance test: Screen shows correct state based on API response.

---

### Slice 2.10 — PreFillFormScreen (Multi-Step)
Steps:
1. Create apps/mobile/src/screens/tatkal/PreFillFormScreen.js
2. Local state: currentStep (1, 2, or 3), formData object
3. Step 1 — Journey Details:
   - From station (text input, uppercase)
   - To station (text input, uppercase)
   - Travel date (date picker — use @react-native-community/datetimepicker)
   - Train class (dropdown/picker: SL, 3A, 2A, 1A, GEN)
   - Pre-fill preferred_class from currentUser.preferred_class
4. Step 2 — Passenger Details:
   - First passenger pre-filled from currentUser.name
   - Add passenger button (up to 6 total)
   - Each passenger: name, age, gender, berth preference
5. Step 3 — Urgency:
   - Toggle: "Is this an urgent trip?"
   - If yes: reason picker (Medical / Bereavement / Official / Personal)
   - Upload document button (opens DocumentPicker)
   - Shows urgency score preview (calculate client-side using same formula)
6. Submit button on Step 3: calls submitPrefill(), navigates to CountdownScreen

---

## Day 4 — Mobile Screens (Countdown + Market)

### Slice 2.11 — CountdownScreen
Steps:
1. Create apps/mobile/src/screens/tatkal/CountdownScreen.js
2. Receives request object via navigation params
3. Calculates seconds remaining until scheduled_fire_time
4. setInterval every second to decrement counter — clean up on unmount
5. Displays: large countdown clock, train details, passenger count, urgency badge
6. Polls GET /api/tatkal/:id every 5 seconds
7. When status changes from PENDING to FIRED: show "Firing..." animation
8. When status changes to CONFIRMED: navigate to ConfirmationScreen automatically
9. Demo button (visible always for demo purposes): calls fireRequest(id) directly

Acceptance test: Countdown updates every second. Demo button triggers fire
and screen transitions to ConfirmationScreen with fake PNR.

---

### Slice 2.12 — ConfirmationScreen
Steps:
1. Create apps/mobile/src/screens/tatkal/ConfirmationScreen.js
2. Shows: success icon, fake PNR, route, date, class, timestamp of confirmation
3. "View My Bookings" button → navigates to MyBookingsScreen
4. "Back to Home" button → navigates to TatkalHomeScreen

---

### Slice 2.13 — SurrenderMarketScreen
Steps:
1. Create apps/mobile/src/screens/tatkal/SurrenderMarketScreen.js
2. On mount: call getSurrenders() with no filters
3. Filter bar at top: From, To, Date (all optional)
4. List of SurrenderListItem components showing: route, date, class
5. Tap item: confirm dialog "Request this ticket?" → calls requestSurrender(id)
6. On success: show "Match confirmed" message and update list

---

### Slice 2.14 — Seed Tatkal Data
Steps:
1. Add to the main seed script (or create your own scripts/seed-tatkal.js):
   - 10 tatkal_requests in various statuses (PENDING, CONFIRMED, CANCELLED)
   - 5 surrender listings in LISTED status across different routes
   - Make sure at least 3 requests have high urgency scores (>7) for admin dashboard
2. Run the seed script
3. Verify data appears in Supabase

---

## Day 5 — Integration

### Slice 2.15 — Hand Off to Member 1
Steps:
1. Push all code to GitHub
2. Replace all mock context with real useRailSaathi() calls:
   ```javascript
   // Before (mock):
   const currentUser = { name: 'Raj Kumar', preferred_class: '3A' }
   // After (real):
   const { currentUser } = useRailSaathi()
   ```
3. Replace all localhost URLs with API_BASE_URL from constants
4. Remove any console.log statements that print user data or tokens
5. Tell Member 1:
   - Add to index.js: app.use('/api/tatkal', require('./routes/tatkal'))
   - Import and start the fire job: require('./jobs/tatkalFireJob').start()
   - 002_tatkal.sql is applied in Supabase
6. Test the full flow on the integrated app

---

## Day 6 — Demo Prep

### Slice 2.16 — Demo Script
Practice this sequence (90 seconds):
1. Open Tatkal tab → TatkalHomeScreen shows (no active request)
2. Tap "Book Tatkal" → PreFillFormScreen with name pre-filled
3. Fill journey: NDLS to MMCT, tomorrow, 3A class
4. Step 2: passenger list shows your name already
5. Step 3: toggle urgency ON → select Medical → urgency score shows 9.5
6. Submit → CountdownScreen showing 23 hours 59 minutes (or demo mode)
7. Press "Demo Fire" button → "Firing..." animation for 2 seconds
8. → ConfirmationScreen: DEMO847291, Raj Kumar, NDLS→MMCT, confirmed at 10:00:03 AM
9. Switch to admin dashboard: judge can see this request in the Tatkal queue
   with urgency score 9.5 highlighted in red

---

## Context Checkpoint File (update after every slice)

After each slice, update PROGRESS.md:

```
## Completed Slices
- [ ] 2.1 — Environment setup
- [ ] 2.2 — DB migration (002_tatkal.sql applied)
- [ ] 2.3 — POST /api/tatkal/prefill
- [ ] 2.4 — GET my-requests, GET :id, POST cancel/:id
- [ ] 2.5 — POST /api/tatkal/fire/:id (demo endpoint)
- [ ] 2.6 — tatkalFireJob.js (scheduled job)
- [ ] 2.7 — Surrender endpoints (3 endpoints)
- [ ] 2.8 — tatkalService.js (mobile API layer)
- [ ] 2.9 — TatkalHomeScreen
- [ ] 2.10 — PreFillFormScreen (3-step)
- [ ] 2.11 — CountdownScreen with polling
- [ ] 2.12 — ConfirmationScreen
- [ ] 2.13 — SurrenderMarketScreen
- [ ] 2.14 — Seed data
- [ ] 2.15 — Integration handoff
- [ ] 2.16 — Demo rehearsed

## My Files to Hand Off
- supabase/migrations/002_tatkal.sql
- services/api/src/routes/tatkal.js
- services/api/src/services/tatkal-service.js
- services/api/src/jobs/tatkalFireJob.js
- apps/mobile/src/screens/tatkal/ (all files)

## Blockers
(Fill in if you are stuck on something)
```
