# PROGRESS.md — Context Tracker
# Member 3 — Grievance & Complaint System
# Update this file after every completed slice.
# If you switch Antigravity sessions, paste this file's content at the start.

---

## Module Summary
I am building the Grievance and Complaint module of RailSaathi. This includes:
- Backend: Express routes in services/api/src/routes/complaints.js
- Service layer: complaint-service.js (business logic) + notificationService.js
- Mobile screens: apps/mobile/src/screens/complaints/
- DB migration: supabase/migrations/003_complaints.sql
- Station seed: scripts/seed-stations.js (50 stations)
- Complaint seed: scripts/seed-complaints.js (300 records)

## Stack
- Backend: Node.js + Express (Member 1's server, I add one route file)
- Database: Supabase (Member 1's project, I add 003_complaints.sql migration)
- Push Notifications: Expo Push Notifications service (no FCM needed)
- Photo Storage: Supabase Storage bucket (complaint-photos)
- Mobile: React Native (Expo) — I add screens inside the complaints/ folder

## Dependencies on Member 1
- verifyToken middleware (at services/api/src/middleware/auth.js)
- supabaseClient (at services/api/src/db/supabaseClient.js)
- apiClient (at apps/mobile/src/services/apiClient.js)
- RailSaathiContext — exposes activeJourney.train_number, .coach, .berth,
  .boarding_station, .travel_date AND currentUser.id
- admin_users table (Member 1 creates this — I query it for admin check in PATCH status)

## Completed Slices
- [x] 3.1 — Environment setup
- [x] 3.2 — DB migration (003_complaints.sql) + station seed
- [x] 3.3 — complaint-service.js + notificationService.js
- [x] 3.4 — POST /api/complaints
- [x] 3.5 — GET /api/complaints + GET /api/complaints/:id
- [x] 3.6 — PATCH /api/complaints/:id/status (admin)
- [x] 3.7 — POST /api/complaints/:id/reopen
- [x] 3.8 — GET /public/heatmap + GET /public/stats
- [x] 3.9 — complaintService.js (mobile API layer)
- [x] 3.10 — ComplaintsHomeScreen
- [x] 3.11 — NewComplaintScreen
- [x] 3.12 — ComplaintDetailScreen + StatusTimeline component
- [x] 3.13 — ReopenScreen
- [x] 3.14 — PublicHeatMapScreen (no auth)
- [x] 3.15 — Seed 300 complaint records
- [x] 3.16 — Integration handoff to Member 1
- [x] 3.17 — Demo rehearsed

## Key Decisions Made
- **Split Grievance Targets (Station vs. Train Journey)**: Redesigned the filing flow on both the React Passenger Web Portal and Expo Mobile Client to target either a "Regarding Station" complaint or a "Regarding Train Journey" complaint. Enforced PNR/Train Number for journeys, and Station Code for station complaints.
- **Pre-fill with PNR Lookup**: Connected the mobile and web clients to `POST /api/journeys/pnr` to automatically retrieve train name, coach, and date when a 10-digit PNR is verified.
- **Ocean Safety via Quadratic Bezier Curves**: Replaced Catmull-Rom splines with bounded Quadratic Bezier curves using an alternating 2.5% offset. This ensures that train corridor polylines do not loop over the ocean and remain strictly within mainland India.
- **Schematic Corridor Mapping**: Removed the OpenRailwayMap background tracks and styled route polylines to act as high-level visual corridors, adjusting thickness dynamically when a train is hovered or selected.

## Live Endpoints
- POST /api/complaints → Files a new grievance (supports Station platform or Train PNR)
- GET /api/complaints → Lists authenticated passenger's grievance records
- GET /api/complaints/public/heatmap → Publicly aggregates complaints by station
- GET /api/complaints/public/train-routes → Publicly aggregates complaints by train route for map rendering
- PATCH /api/complaints/:id/status → Updates status (admin)
- POST /api/complaints/:id/reopen → Reopens a resolved complaint (within 72h window)

## What Member 1 Needs From Me (Integration Checklist)
- Line to add in index.js:
  app.use('/api/complaints', require('./routes/complaints'))
- Confirm 003_complaints.sql applied in Supabase
- Confirm station_coordinates has 50+ rows
- Confirm complaint-photos storage bucket exists and is public
- Confirm 300 complaint seed records are in DB
- Confirm all screens use useRailSaathi() not mock data
  (except PublicHeatMapScreen — this screen intentionally has no context)
- Confirm heat map works without Authorization header

## Blockers / Questions
- Need: SUPABASE_URL and SUPABASE_SERVICE_KEY from Member 1
- Need: JWT_SECRET from Member 1 to test protected endpoints locally
- Need: Confirmation that admin_users table exists before testing PATCH status

---

## Log of Prompts

### Prompt 1 — Completed
- **What was built:** Initial progress.md tracker and 003_complaints.sql DB migration
- **Files created:** progress.md, supabase/migrations/003_complaints.sql
- **Notes:** Remember to manually create complaint-photos Supabase Storage bucket with public access after running migration in Supabase SQL Editor

### Prompt 2 — Completed
- **What was built:** Station coordinates seed script with 50 Indian railway stations
- **Files created:** scripts/seed-stations.js
- **Notes:** Run with NODE_PATH=services/api/node_modules node scripts/seed-stations.js after DB migration is applied

### Prompt 3 — Completed
- **What was built:** Backend service layer — complaint-service.js (state machine, business rules) + notificationService.js (Expo push)
- **Files created:** services/api/src/services/complaint-service.js, services/api/src/services/notificationService.js
- **Notes:** sendPushNotification never throws; push failures are logged not rethrown. VALID_TRANSITIONS encodes all 7 allowed state changes.

### Prompt 4 — Completed
- **What was built:** POST /api/complaints — core complaint filing endpoint
- **Files created:** services/api/src/routes/complaints.js (stub with POST implemented, other routes as stubs)
- **Notes:** Safety complaints auto-escalate to IN_PROGRESS with 2 timeline entries. Push notifications fire-and-forget. Route registration order preserves /public/heatmap priority.

### Prompt 5 — Completed
- **What was built:** GET list, GET detail (with timeline), PATCH status (admin), POST reopen endpoints
- **Files modified:** services/api/src/routes/complaints.js
- **Notes:** Admin check queries admin_users table by user_id. Reopen requires min 20 char description. RESOLVED status sets reopen_deadline to NOW()+72h.

### Prompt 6 — Completed
- **What was built:** GET /public/heatmap (RPC primary, JS fallback) + GET /public/stats (parallel queries)
- **Files modified:** services/api/src/routes/complaints.js
- **Notes:** SQL for RPC function is in a comment block in the route file — must be manually run in Supabase SQL Editor. Both endpoints are unauthenticated and cache for 5 minutes.

### Prompt 7 — Completed
- **What was built:** Complaint seed script with 300 records, realistic distribution, timeline entries
- **Files created:** scripts/seed-complaints.js
- **Notes:** Run after station seed. SAFETY complaints hardcoded to IN_PROGRESS. Idempotency guard prevents double-seeding. Use --force to wipe and re-seed.

### Prompt 8 — Completed
- **What was built:** Mobile API service layer (complaintService.js) + useComplaints hook
- **Files created:** apps/mobile/src/screens/complaints/services/complaintService.js, apps/mobile/src/screens/complaints/hooks/useComplaints.js
- **Notes:** Public endpoints use raw fetch (no JWT). All 7 service functions implemented.

### Prompt 9 — Completed
- **What was built:** 4 shared complaint UI components
- **Files created:** ComplaintCard.js, ComplaintTypeSelector.js, StatusTimeline.js, PhotoUploader.js
- **Notes:** PhotoUploader uses temp UUID for upload path; cleanup on remove. StatusTimeline has oldest/newest toggle.

### Prompt 10 — Completed
- **What was built:** ComplaintsHomeScreen — list view with filters, pull-to-refresh, empty/error states
- **Files created:** apps/mobile/src/screens/complaints/ComplaintsHomeScreen.js
- **Notes:** Navigation targets (NewComplaint, ComplaintDetail, PublicHeatMap) wired up in Prompt 16.

### Prompt 11 — Completed
- **What was built:** NewComplaintScreen — dual-mode form, safety warning, push token, photo upload integration
- **Files created:** apps/mobile/src/screens/complaints/NewComplaintScreen.js
- **Notes:** Mode A auto-fills from activeJourney. SAFETY type shows warning banner. Push token failure is graceful.

### Prompt 12 — Completed
- **What was built:** ComplaintDetailScreen (full detail, timeline, reopen button) + StationMarker component
- **Files created:** ComplaintDetailScreen.js, components/StationMarker.js
- **Notes:** Clipboard uses expo-clipboard. Photo modal uses React Native Modal. Reopen button only appears for RESOLVED complaints within deadline.

### Prompt 13 — Completed
- **What was built:** ReopenScreen — policy explanation, 20-char minimum field, specific error handling
- **Files created:** apps/mobile/src/screens/complaints/ReopenScreen.js
- **Notes:** Error messages are passed through directly from API (specific reasons). Success navigates back to ComplaintDetail which will refetch.

### Prompt 14 — Completed
- **What was built:** PublicHeatMapScreen — unauthenticated map with station circles, stats bar, bottom sheet
- **Files created:** apps/mobile/src/screens/complaints/PublicHeatMapScreen.js
- **Notes:** Does NOT use useRailSaathi(). Google Maps API key must be set in apps/mobile/.env and app.json config. Circle radius scaled to complaint count.

### Prompt 15 — Completed
- **What was built:** Web dashboard — GrievancePortalPage (form + sidebar) + LiveHeatmapPage (Leaflet map)
- **Files created:** GrievancePortalPage.jsx, LiveHeatmapPage.jsx, GrievanceForm.jsx, RecentGrievancesSidebar.jsx, IndiaComplaintMap.jsx
- **Notes:** Web form doesn't have activeJourney auto-fill. LiveHeatmap uses Leaflet (react-leaflet). Recent grievances sidebar conditionally shows based on auth token in localStorage.

### Prompt 16 — Completed
- **What was built:** Full complaints navigation stack wired into AppNavigator; all screens integrated
- **Files modified:** apps/mobile/src/navigation/AppNavigator.js, apps/mobile/src/constants/index.js
- **Notes:** Replaced placeholder ComplaintsScreen with ComplaintsStack containing all 5 screens. PublicHeatMapScreen intentionally has no useRailSaathi().

### Prompt 17 — Completed ✅
- **What was built:** Final hardening pass, orphaned photo warning, demo verification, handoff checklist
- **Files modified:** Various (review pass)
- **Notes:** All 17 prompts complete. Module ready for Member 1 integration and demo.

### Prompt 18 — Completed
- **What was built:** Replaced Firebase Phone Auth + custom JWT with native Supabase Auth across the entire platform
- **Files rewritten:** auth.js middleware, auth.js route, LoginScreen.js, OTPVerifyScreen.js
- **Files created:** supabaseClient.js (mobile), 004_supabase_auth_migration.sql, apps/mobile/.env.example
- **Files modified:** user-db.js (added getUserBySupabaseUid), .env.example (removed Firebase vars)
- **Files deleted:** firebase-auth.js middleware
- **Member 3 impact:** ZERO — all complaint routes unchanged. req.user.user_id interface identical.

### Prompt M1-4 — Completed
- **What was built:** StationNavigator with safe dynamic import fallback
- **Files created:** apps/mobile/src/navigation/StationNavigator.js
- **Files modified:** apps/mobile/src/constants/index.js (added STATION_HOME, STATION_DETAIL, STATION_MAP), apps/mobile/src/navigation/AppNavigator.js (wired StationNavigator)
- **Notes:** Uses try/catch require so app doesn't crash before Member 5 adds their screens.
- **Completion:** M1: 4 / 8 prompts (50%)

