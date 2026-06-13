# Implementation Plan (plan.md)
# Member 1 — Spine, Identity Layer & Admin Dashboard
# FAR AWAY 2026 — RailSaathi Platform

---

## Overview
6 days. You are the foundation. Others cannot start integration until your
Day 2 deliverables are live. Every slice below is atomic and testable before
you move to the next one.

---

## Day 1 — Infrastructure & Backend Auth

### Slice 1.1 — Repository & Project Setup
Steps:
1. Create GitHub repo: railsaathi (monorepo)
2. Create folder structure exactly as defined in ARCHITECTURE.md
3. Initialize package.json in services/api/ (npm init -y)
4. Install dependencies:
   express, cors, dotenv, @supabase/supabase-js, firebase-admin, jsonwebtoken,
   uuid, express-validator, helmet, morgan
5. Create services/api/src/index.js with basic Express server
6. Add GET /api/health route returning { status: "ok", timestamp: Date.now() }
7. Deploy to Render: connect GitHub repo, set root to services/api/, start command: node src/index.js
8. Verify: https://railsaathi-api.onrender.com/api/health returns 200

Acceptance test: curl https://railsaathi-api.onrender.com/api/health → { status: "ok" }

### Slice 1.2 — Supabase Setup
Steps:
1. Create Supabase project: railsaathi
2. Open SQL editor, run supabase/migrations/001_core_schema.sql
   (users table, journeys table, admin_users table as defined in ARCHITECTURE.md)
3. Copy SUPABASE_URL and SUPABASE_SERVICE_KEY into Render environment variables
4. Create db/supabaseClient.js in services/api/src/
5. Test: write a small script that inserts and reads a test row from users table
6. Delete the test row. Confirm connection works.

Acceptance test: A test script successfully inserts and reads from the users table.

### Slice 1.3 — Firebase Auth Setup
Steps:
1. Create Firebase project: railsaathi
2. Enable Phone Authentication in Firebase Console
3. Download service account JSON, store as firebase-service-account.json
   (DO NOT commit this file — add to .gitignore)
4. Add FIREBASE_PROJECT_ID to Render env vars
5. Create middleware/auth.js that:
   - Reads Authorization header
   - Verifies Firebase ID token using firebase-admin
   - Attaches user's firebase_uid to req.user
   - Returns 401 if token is missing or invalid

Acceptance test: A protected route returns 401 without token, proceeds with valid token.

### Slice 1.4 — OTP Verification Endpoint
Steps:
1. Create routes/auth.js
2. POST /api/auth/verify-otp
   - Input: { phone, firebase_id_token }
   - Verify the Firebase ID token
   - Check if user exists in users table by firebase_uid
   - If not: create new user record with phone and firebase_uid
   - Generate JWT (jsonwebtoken, 7-day expiry, payload: { user_id, phone })
   - Return: { token, user: { id, phone, name, is_new: true/false } }
3. Register route in index.js: app.use('/api/auth', authRouter)

Acceptance test: POST with valid Firebase token returns JWT and user object.

### Slice 1.5 — Profile Completion Endpoint
Steps:
1. POST /api/auth/complete-profile (protected by verifyToken middleware)
   - Input: { name, emergency_contacts: [] }
   - Validate: name is non-empty string, emergency_contacts is array of strings max 3
   - Update users table: set name, emergency_contacts, is_verified=true
   - Return updated user object

Acceptance test: POST with valid body updates the user in Supabase and returns updated object.

---

## Day 2 — User API, PNR & Mobile Shell

### Slice 2.1 — User Profile API
Steps:
1. Create routes/users.js
2. GET /api/users/me (protected)
   - Fetch user from users table by user_id from JWT
   - Fetch most recent upcoming journey from journeys table
   - Return combined user + active_journey object
3. PATCH /api/users/me (protected)
   - Allow updating: name, emergency_contacts, preferred_class
   - Return updated user

Acceptance test: GET /api/users/me returns correct user and journey data.

### Slice 2.2 — PNR Lookup Endpoint
Steps:
1. Create routes/journeys.js
2. POST /api/journeys/pnr (protected)
   - Input: { pnr: "1234567890" }
   - Validate PNR is 10 digits
   - Call public PNR API:
     Use https://indianrailapi.com/api/v2/PNRCheck/apikey/{key}/PNRNumber/{pnr}/
     OR if no API key: mock with a realistic hardcoded response for demo
   - Parse response: extract train_number, train_name, boarding_station,
     destination_station, travel_date, coach, berth, class, status
   - Upsert into journeys table (update if PNR already exists)
   - Return journey object
3. GET /api/journeys (protected) — return all journeys for user, sorted by travel_date desc

Acceptance test: POST with valid PNR returns populated journey object with train name and coach.

### Slice 2.3 — React Native Shell
Steps:
1. Create Expo app in apps/mobile/ (npx create-expo-app mobile)
2. Install: @react-navigation/native, @react-navigation/bottom-tabs,
   @react-navigation/stack, react-native-async-storage, axios
3. Create apps/mobile/src/constants/index.js:
   - API_BASE_URL, screen name constants, color palette
4. Create apps/mobile/src/services/apiClient.js:
   - get, post, patch, delete methods
   - Auto-attaches JWT from AsyncStorage
   - Handles 401 by logging out user
5. Create apps/mobile/src/context/RailSaathiContext.js:
   - Exposes currentUser, activeJourney, refreshUser, refreshJourney, logout
   - On mount: check AsyncStorage for token, if exists call GET /api/users/me
6. Create apps/mobile/src/navigation/AppNavigator.js:
   - Auth stack: Login, OTPVerify, ProfileSetup screens
   - Main tab navigator: Home, Tatkal, Complaints, Safety, Station
   - Placeholder screens for Tatkal, Complaints, Safety, Station
7. Create Login screen, OTPVerify screen, ProfileSetup screen
8. Create HomeScreen with JourneyCard component and AddPNR button

Acceptance test: Full login flow works on Expo Go. Home screen shows journey card after PNR entry.

### Slice 2.4 — Notify Other Members
1. Push all code to GitHub main branch
2. Send team message with:
   - Live API URL: https://railsaathi-api.onrender.com
   - Supabase dashboard URL and readonly credentials for reading schema
   - Instructions to clone repo and run the mobile app
   - The context contract (from ARCHITECTURE.md Section 5)
   - Confirmation that auth, users/me, and PNR endpoints are live

---

## Day 3 — Admin Dashboard Foundation

### Slice 3.1 — Dashboard Setup
Steps:
1. Create apps/dashboard/ with Vite + React (npm create vite@latest dashboard -- --template react)
2. Install: @supabase/supabase-js, recharts, leaflet, react-leaflet, react-router-dom
3. Create Supabase client in src/services/supabaseClient.js (anon key, read-only access)
4. Create React Router routes: /overview, /complaints, /safety, /demand, /station
5. Create sidebar navigation component

Acceptance test: npm run dev shows sidebar and navigable routes.

### Slice 3.2 — Overview Page
Steps:
1. Create src/pages/OverviewPage.jsx
2. Four KPI cards that query Supabase directly:
   - Total complaints today: SELECT COUNT(*) FROM complaints WHERE created_at > today
   - Active SOS alerts: SELECT COUNT(*) FROM safety_events WHERE type='SOS' AND resolved=false
   - Demand surge routes: SELECT COUNT(*) FROM travel_intents WHERE is_surge=true
   - Tatkal urgency requests: SELECT COUNT(*) FROM tatkal_requests WHERE urgency_score > 7
3. Each card shows: icon, number, label, colour-coded by severity
4. Real-time subscription using Supabase's .on('*') listener so counts update live

Acceptance test: Page loads in under 2 seconds. Numbers update when data changes in Supabase.

### Slice 3.3 — Seed Script
Steps:
1. Create scripts/seed.js at repository root
2. Insert synthetic data:
   - 500 complaint records across 20 stations, 3 months of history
   - 50 safety events across 10 routes
   - 200 travel intents across 8 major routes
   - 10 Tatkal urgency requests
   - 5 admin users
3. Run seed script: node scripts/seed.js
4. Verify data appears in Supabase dashboard

Acceptance test: Every dashboard chart shows realistic data, not empty states.

---

## Day 4 — Admin Dashboard Maps & Charts

### Slice 4.1 — Complaint Map
Steps:
1. Create src/pages/ComplaintMapPage.jsx
2. Leaflet map centred on India (lat: 20.5937, lng: 78.9629, zoom: 5)
3. Query complaints table, group by station
4. Plot circle markers sized by complaint count, coloured by type
5. Clicking a marker shows: station name, top complaint type, count this week
6. Filter bar: by complaint type, by date range

### Slice 4.2 — Safety Incidents Page
Steps:
1. Create src/pages/SafetyPage.jsx
2. Table of recent SOS events with columns: time, train, coach, berth, type, status
3. Map overlay of incident locations
4. Unresolved incidents highlighted in red
5. Resolve button (PATCH safety_events SET resolved=true)

### Slice 4.3 — Demand Forecast Page & Station Page
Steps:
1. Create src/pages/DemandPage.jsx
2. Bar chart (Recharts): x-axis = routes, y-axis = intent count, grouped by day of week
3. Create src/pages/StationPage.jsx
4. Table: station, amenity type, status (working/broken), last reported, reported by

---

## Day 5 — Integration & Merge

### Slice 5.1 — Receive Other Members' Code
1. Pull latest from GitHub (Members 2–5 should have pushed their routes and screens)
2. Register their routes in services/api/src/index.js:
   ```javascript
   app.use('/api/tatkal', require('./routes/tatkal'))
   app.use('/api/complaints', require('./routes/complaints'))
   app.use('/api/safety', require('./routes/safety'))
   app.use('/api/amenities', require('./routes/amenities'))
   ```
3. Apply their Supabase migrations (002 through 005)
4. Replace placeholder screens in navigation with their actual screen components
5. Test each feature end-to-end

### Slice 5.2 — End-to-End Test
Full demo run-through:
1. Fresh login on real phone
2. Enter PNR → journey card appears
3. Open Tatkal tab → Member 2's screen loads and reads user profile
4. File a complaint → Member 3's screen loads, train/coach pre-filled
5. Press SOS → Member 4's screen fires alert to admin dashboard
6. Open Station tab → Member 5's screen shows station map
7. Admin dashboard shows all events in real time

Fix anything broken. Cut features that are broken, do not show them.

---

## Day 6 — Polish & Demo Prep

### Slice 6.1 — Performance
1. Ping the Render service every 10 minutes using cron-job.org (free)
   so it does not spin down before the demo
2. Add loading skeletons on HomeScreen so it does not show blank states
3. Make sure all error states show friendly messages, not raw error objects

### Slice 6.2 — Demo Data
1. Create a dedicated demo user: phone 9999999999
2. Give them a realistic PNR, upcoming journey, 3 complaint history items
3. Pre-seed one active SOS alert on the admin dashboard
4. Pre-seed one Tatkal urgency request with document upload

### Slice 6.3 — Final Deployment
1. Push all code to GitHub
2. Verify Render auto-deployed latest API
3. Verify Vercel auto-deployed latest dashboard
4. Share the two URLs with team: API URL + Dashboard URL

---

## Context Checkpoint File (update this after every slice)

After completing each slice, update PROGRESS.md in your folder:
```
## Completed
- [x] Slice 1.1 — Repo + Render deployment
- [x] Slice 1.2 — Supabase schema

## Live URLs
- API: https://railsaathi-api.onrender.com
- Dashboard: https://railsaathi-admin.vercel.app
- Supabase: https://xxx.supabase.co

## Shared Contracts Ready
- [x] RailSaathiContext (currentUser, activeJourney)
- [x] apiClient.js
- [x] Auth endpoints live

## Blockers for Other Members
- None (update if you are blocked)
```
