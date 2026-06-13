# AGENTS.md — AI Coding Rules
# Member 2 — Tatkal Verified Booking Ecosystem
# FAR AWAY 2026 — RailSaathi Platform

---

## Identity
You are building the Tatkal module of RailSaathi. Your job is to make
legitimate passengers faster than tout bots by pre-scheduling their booking
request, enforcing biometric identity locks, and providing a legal ticket
surrender market. You work independently. You hand off one route file and
one migrations file on Day 5. Everything else is yours.

---

## Non-Negotiable Rules

### Code Structure
- Keep every file under 300 lines. Split if larger.
- tatkalService.js is your ONLY file for API calls from the mobile side.
  No raw fetch() calls inside screen files. All API calls go through the service.
- Route handler (tatkal.js) only validates input and calls service functions.
  Business logic (urgency score, fire time calculation) goes in a separate
  tatkal-service.js inside services/api/src/services/.
- The scheduled fire job lives in services/api/src/jobs/tatkalFireJob.js.
  It is its own file, not embedded in the route.

### Naming Conventions
- Files: kebab-case
- React components: PascalCase
- Variables/functions: camelCase
- DB columns: snake_case
- Constants: SCREAMING_SNAKE_CASE

### API Rules
- Every response shape: { "data": ..., "message": "..." } for success
- Every error shape: { "error": "Human message", "code": "ERROR_CODE" }
- Use correct HTTP status codes. 400 for bad input, 403 for wrong user,
  404 for not found, 409 for conflict (duplicate request), 500 for server error.
- Never expose internal database errors to the response body.
  Catch the raw error, log it server-side, return a clean message.

### Anti-Hoarding Logic
This is your most important business rule. Enforce it at TWO levels:
1. Database level: the unique index on (user_id, booking_date)
   catches concurrent duplicate requests that slip past the API check.
2. API level: before inserting, query to see if an active request
   already exists for this user today. Return 409 with a clear message.
Never rely on only one of these — always both.

### Account Holder Mandate
Before inserting any tatkal_request, confirm that the account holder's
name (from the users table) appears in the passengers JSON array.
Comparison should be case-insensitive and trimmed.
If not present, return 400: "Account holder must be included in the passenger list."

### Urgency Score
calculateUrgencyScore() must live in tatkal-service.js, not in the route.
It must be a pure function — no database calls, no side effects.
Input: (reason, hasDocument, accountAgeMonths). Output: number 1–10.
Write a comment above it explaining the scoring logic.

### Scheduled Job
- The fire job must be idempotent: if it runs twice on the same request,
  the second run must detect status is already FIRED or CONFIRMED and skip.
- Never fire a request that is not in PENDING status.
- Log every fire attempt with console.log (not console.error) in this format:
  [TATKAL_FIRE] request_id=<uuid> status=FIRING at=<timestamp>
  [TATKAL_FIRE] request_id=<uuid> status=CONFIRMED pnr=<pnr> at=<timestamp>

### Mobile Rules (React Native)
- Every API call in tatkalService.js wraps in try/catch.
- Every screen that calls an API has three states: loading, success, error.
  Never show a blank screen. Never let the user be stuck.
- The CountdownScreen timer must update every second using setInterval
  cleaned up in a useEffect return function (prevent memory leaks).
- The PreFillFormScreen is a multi-step form. Use local component state
  to track the current step (step 1: journey, step 2: passengers, step 3: urgency).
  Do not use a separate screen for each step — keep it in one screen with
  step indicators at the top.
- Do not use any animation library other than React Native's built-in
  Animated API. Keep it fast and simple.

### Testing Rules
- Test the anti-hoarding constraint: submit two prefill requests for the
  same day from the same user. The second must fail with 409.
- Test the account holder mandate: submit a request without the user's
  name in passengers. Must fail with 400.
- Test the fire job: set a scheduled_fire_time to 30 seconds in the future,
  wait, confirm the status changes to CONFIRMED and a fake PNR appears.
- Test the surrender market: list a surrender, request it from a different
  user (use two test accounts), confirm status changes to MATCHED.

### Git Rules
- Only commit files inside your designated paths (see ARCHITECTURE.md Section 2).
- Never modify Member 1's files: index.js, auth.js, users.js, journeys.js,
  RailSaathiContext.js, apiClient.js, or any migration except 002_tatkal.sql.
- Commit message format: feat(tatkal): description
  Example: feat(tatkal): add urgency score calculation
- Commit after every working slice. Do not save a 6-hour commit at the end.

---

## What to Build First (Priority Order)
1. 002_tatkal.sql — run in Supabase, confirm tables exist
2. POST /api/tatkal/prefill — the core endpoint with validation
3. GET /api/tatkal/my-requests
4. GET /api/tatkal/:id
5. POST /api/tatkal/fire/:id (demo endpoint)
6. tatkalFireJob.js (scheduled job)
7. TatkalHomeScreen and PreFillFormScreen (mobile)
8. CountdownScreen and ConfirmationScreen (mobile)
9. UrgencyFormScreen with document upload
10. SurrenderMarketScreen and POST /api/tatkal/surrender

---

## What NOT to Do
- Do not call the real IRCTC API. It requires government-level credentials.
  All booking execution is simulated. Be honest about this in comments.
- Do not build a payment flow. No UPI, no card processing.
- Do not store credit card or UPI details in the database.
- Do not use third-party scheduling libraries (cron, node-cron) unless
  necessary — a simple setInterval in the fire job is sufficient for the MVP.
- Do not build a biometric scanner — the biometric mandate is a pitch-level
  feature you describe in the demo, not code in 6 days.
- Do not modify or read Member 1's auth middleware logic. Import it, use it,
  do not rewrite it.
- Do not create a separate Express server. Your routes plug into Member 1's server.

---

## Integration Checklist (Day 5)
When Member 1 asks you to hand off:
- [ ] 002_tatkal.sql is committed and applied in Supabase
- [ ] services/api/src/routes/tatkal.js is committed and tested
- [ ] services/api/src/jobs/tatkalFireJob.js is committed
- [ ] All tatkal/ screens in apps/mobile/src/screens/tatkal/ are committed
- [ ] Mock context replaced with useRailSaathi() hook
- [ ] All hardcoded localhost URLs replaced with API_BASE_URL constant
- [ ] No .env values hardcoded in any file
- [ ] Told Member 1 the exact line to add in index.js:
      app.use('/api/tatkal', require('./routes/tatkal'))
