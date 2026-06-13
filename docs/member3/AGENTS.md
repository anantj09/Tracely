# AGENTS.md — AI Coding Rules
# Member 3 — Grievance & Complaint System
# FAR AWAY 2026 — RailSaathi Platform

---

## Identity
You are building the Grievance module of RailSaathi. Your job is to make
filing a complaint take under 20 seconds, give every complaint a trackable
reference number, push notifications on every status change, and expose a
public heat map that holds Railways accountable through data transparency.
You work independently. You hand off one route file and one migration file
on Day 5. Everything else is yours.

---

## Non-Negotiable Rules

### Code Structure
- Keep every file under 300 lines. Split if larger.
- complaintService.js is your ONLY file for API calls from the mobile side.
  No raw fetch() calls inside screen files. All API calls go through the service.
- Route handler (complaints.js) only validates input and calls service functions.
  Business logic (reference number generation, status transitions, push sending)
  goes in services/api/src/services/complaint-service.js.
- notificationService.js is a separate file. Never inline the Expo push fetch
  call inside a route handler.
- The station_coordinates seed is a separate file: scripts/seed-stations.js.
  Never hardcode coordinates in route logic.

### Naming Conventions
- Files: kebab-case
- React components: PascalCase
- Variables/functions: camelCase
- DB columns: snake_case
- Constants: SCREAMING_SNAKE_CASE
- Reference numbers: RS-YYYYMMDD-XXXXX format always, no exceptions

### API Rules
- Every response: { "data": ..., "message": "..." } for success
- Every error: { "error": "Human message", "code": "ERROR_CODE" }
- Correct HTTP status codes always.
- The public heat map endpoints (GET /api/complaints/public/heatmap and
  GET /api/complaints/public/stats) do NOT require auth.
  Do not apply verifyToken middleware to these routes.
  Any other endpoint requires verifyToken.
- Never expose another user's complaint data. Always filter by user_id
  from the JWT — never trust user_id from the request body.

### Status Transition Rules
This is your most critical business rule. Enforce a strict state machine:
VALID transitions:
  SUBMITTED     → ACKNOWLEDGED  (admin action)
  SUBMITTED     → IN_PROGRESS   (admin or auto for SAFETY)
  ACKNOWLEDGED  → IN_PROGRESS   (admin action)
  IN_PROGRESS   → RESOLVED      (admin action — triggers reopen_deadline)
  IN_PROGRESS   → REJECTED      (admin action)
  RESOLVED      → SUBMITTED     (user reopen — only within reopen_deadline)
  SUBMITTED     → REJECTED      (admin action — spam/duplicate)

INVALID transitions must return 400:
{ "error": "Invalid status transition: RESOLVED → IN_PROGRESS", "code": "INVALID_TRANSITION" }

Never update status without also inserting a timeline entry.
These two DB operations must happen in a Supabase transaction or back-to-back
with error handling. If the timeline insert fails, roll back the status change.

### Reference Number Generation
Generate in this exact format: RS-YYYYMMDD-XXXXX
Use server time, not client time. Never trust the client's date.
Check for uniqueness: after generating, do a SELECT to confirm it does not
already exist in complaints. If collision (extremely rare), regenerate.
Do not use sequential IDs — random is intentional to prevent enumeration.

### Safety Complaint Auto-Escalation
If complaint_type === 'SAFETY':
1. Status must start as IN_PROGRESS (not SUBMITTED)
2. Priority must be CRITICAL (not NORMAL)
3. Two timeline entries must be inserted in a single batch:
   Entry 1: SUBMITTED (the initial filing)
   Entry 2: IN_PROGRESS with note "Auto-escalated: Safety complaint"
4. Log to console: [SAFETY_ESCALATION] complaint_id=<uuid> at=<timestamp>
Never allow a SAFETY complaint to start as SUBMITTED. This is checked
at the service level, not the validation level.

### Reopen Rules
Check ALL of these before allowing a reopen:
1. Complaint status must be RESOLVED
2. Current timestamp must be < reopen_deadline
3. JWT user must be the complaint owner
If any check fails, return the specific reason:
- "Complaint is not in RESOLVED status"
- "Reopen window has expired (72 hours)"
- "Not authorized to reopen this complaint"

### Push Notifications
- NEVER crash the request if push notification fails.
  Wrap every notification send in try/catch.
  If it fails, log the error and continue — the complaint must still be saved.
- Log every push attempt: [PUSH] token=<first 10 chars>... status=sent|failed
- The push token comes from the complaint row, not the user row.
  Different complaints can have different tokens (user may switch devices).

### Photo Upload
- Photo upload is optional. Never block complaint submission on it.
- If photo_url is provided, validate it is a string starting with "https://".
- Do not validate the photo exists at the URL — that would add latency.
- Store the URL as-is. Never re-upload or process images server-side.

### Heat Map Endpoint Performance
The public heat map endpoint is unauthenticated and can be called
by many users simultaneously. Optimize it:
- Use a single SQL query with GROUP BY station_code
- Do not do N+1 queries (one query per station)
- Add a response cache header: Cache-Control: public, max-age=300
  (map data can be 5 minutes stale — it is aggregate, not real-time)
- The 30-day sparkline is computed in SQL:
  GROUP BY station_code, date_trunc('day', created_at)

### Mobile Rules
- Every screen has three states: loading, data, error. No exceptions.
- The NewComplaintScreen must work even if activeJourney is null.
  If null: show manual entry fields. If not null: show pre-filled read-only fields.
- The PhotoUploader component must show: idle, uploading (with progress),
  uploaded (thumbnail), and error states.
- StatusTimeline renders timeline entries newest-first or oldest-first
  with a toggle. Default: oldest-first (so the story reads top to bottom).
- PublicHeatMapScreen does NOT require the user to be logged in.
  It must render without calling useRailSaathi(). Do not use the hook here.
  Read data from GET /api/complaints/public/heatmap directly (no auth header).

### Testing Rules
- Test all valid status transitions: all 7 valid paths must return 200.
- Test all invalid status transitions: at least 3 invalid paths must return 400.
- Test safety auto-escalation: file a SAFETY complaint, check that status
  is IN_PROGRESS and two timeline entries exist.
- Test reopen within deadline: RESOLVED complaint, reopen within 72h → success.
- Test reopen after deadline: manually set reopen_deadline to 1 hour ago in DB,
  attempt reopen → 400.
- Test that heat map returns without auth header (no token) → 200.
- Test push notification: check server logs for [PUSH] entry after filing.

### Git Rules
- Only commit files inside your designated paths.
- Never modify Member 1's files.
- Commit message format: feat(complaints): description
  Example: feat(complaints): add safety auto-escalation logic
- Commit after every working slice.

---

## What to Build First (Priority Order)
1. 003_complaints.sql — run in Supabase, confirm tables exist
2. Seed station_coordinates (top 20 stations minimum)
3. POST /api/complaints — the core filing endpoint
4. GET /api/complaints (list) and GET /api/complaints/:id (detail)
5. notificationService.js
6. GET /api/complaints/public/heatmap (unauthed)
7. PATCH /api/complaints/:id/status (admin)
8. POST /api/complaints/:id/reopen
9. ComplaintsHomeScreen (mobile)
10. NewComplaintScreen with pre-fill logic (mobile)
11. ComplaintDetailScreen with StatusTimeline (mobile)
12. ReopenScreen (mobile)
13. PublicHeatMapScreen (mobile)
14. Seed complaint data for the heat map

---

## What NOT to Do
- Do not integrate with RailMadad's API. You build your own complaint store.
  Pitch RailMadad sync as the production path.
- Do not build a full admin panel for resolving complaints — that belongs in
  Member 1's admin dashboard. You expose the PATCH status endpoint;
  Member 1 builds the UI that calls it.
- Do not use FCM directly. Use Expo's push service only — it is simpler
  and needs no extra credentials for the MVP.
- Do not store complaint photos on the Express server filesystem.
  All files go to Supabase Storage only.
- Do not build a rating or feedback system — that is out of scope.
- Do not modify or read Member 1's auth middleware. Import and use it.
- Do not create a separate Express server. Plug into Member 1's server.

---

## Integration Checklist (Day 5)
When Member 1 asks you to hand off:
- [ ] 003_complaints.sql is committed and applied in Supabase
- [ ] station_coordinates table is seeded with 20+ stations
- [ ] services/api/src/routes/complaints.js committed and tested
- [ ] services/api/src/services/complaint-service.js committed
- [ ] services/api/src/services/notificationService.js committed
- [ ] All complaints/ screens in apps/mobile/src/screens/complaints/ committed
- [ ] Mock context replaced with useRailSaathi() hook in all screens
  EXCEPT PublicHeatMapScreen (which intentionally does not use the hook)
- [ ] All hardcoded localhost URLs replaced with API_BASE_URL constant
- [ ] No .env values hardcoded anywhere
- [ ] Heat map is working without auth header
- [ ] Seed data is committed and applied (20+ complaints across 10+ stations)
- [ ] Told Member 1 the exact line:
      app.use('/api/complaints', require('./routes/complaints'))
