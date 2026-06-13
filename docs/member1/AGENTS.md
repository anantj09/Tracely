# AGENTS.md — AI Coding Rules
# Member 1 — Spine, Identity Layer & Admin Dashboard
# FAR AWAY 2026 — RailSaathi Platform

---

## Identity
You are building the foundation of RailSaathi — India's unified railway
passenger platform. Your module is the Spine: authentication, user profiles,
journey data, and the admin dashboard. You are coding in a 6-day hackathon.
Ship working code over perfect code. But follow these rules without exception.

---

## Non-Negotiable Rules

### Code Structure
- Keep every file under 300 lines. If a file exceeds 300 lines, split it.
- One file = one responsibility. No God files.
- All database queries go in a dedicated db/ or services/ layer, never in route handlers.
- Route handlers only: validate input, call service, return response. No business logic.
- Use async/await everywhere. No .then().catch() chains.
- Always handle errors with try/catch. Never let unhandled promise rejections crash the server.

### Naming Conventions
- Files: kebab-case (user-service.js, auth-routes.js)
- Variables and functions: camelCase (getUserById, activeJourney)
- Database tables: snake_case (users, travel_intents)
- React components: PascalCase (HomeScreen, JourneyCard)
- Constants: SCREAMING_SNAKE_CASE (API_BASE_URL, JWT_SECRET)

### API Design
- All routes prefixed with /api/
- All responses are JSON with this shape:
  Success: { "data": ..., "message": "ok" }
  Error:   { "error": "Human readable message", "code": "ERROR_CODE" }
- HTTP status codes must be correct: 200 OK, 201 Created, 400 Bad Request,
  401 Unauthorized, 404 Not Found, 500 Internal Server Error
- Never return a 200 with an error inside the body.

### Security
- Never hardcode secrets. All secrets come from process.env.
- Never log sensitive fields: phone numbers, tokens, PNRs.
- All protected routes must use the verifyToken middleware.
- Validate all incoming request bodies. Reject unknown fields.
- Sanitize all inputs before database insertion.

### Database
- Use parameterized queries only. Never string-concatenate SQL.
- Every table must have: id (UUID), created_at, updated_at.
- Every foreign key must have ON DELETE CASCADE unless there is a strong reason.
- Add indexes for every column used in a WHERE clause.

### React Native / Frontend
- Use functional components only. No class components.
- All side effects in useEffect with proper dependency arrays.
- No inline styles. Use StyleSheet.create() for React Native.
- Loading states: every API call shows an ActivityIndicator while pending.
- Error states: every API call shows an error message if it fails.
- Never leave a screen that can get stuck in an infinite loading state.

### React Native Navigation
- Use React Navigation v6.
- All screen names are defined as constants in constants/screens.js.
- Never hardcode screen name strings in navigate() calls.

### Context
- The RailSaathiContext is the single source of truth for currentUser and activeJourney.
- Never store user data in component-level state if it belongs in context.
- Other members' screens must use useRailSaathi() hook, not duplicate user fetching.

### Testing During Development
- After every new API endpoint: test it with curl or a REST client before moving on.
- After every new screen: test it on Expo Go on a real phone, not just simulator.
- Seed the database before the demo. Never demo on an empty database.

### Git
- Commit after every working feature. Message format: feat(scope): description
  Example: feat(auth): add OTP verification endpoint
- Never commit .env files.
- Never commit node_modules.
- The .gitignore must include: .env, node_modules/, .expo/, dist/, build/

---

## What to Build First (Priority Order)
1. Supabase project creation and schema migration (001_core_schema.sql)
2. Express server skeleton with health check endpoint (GET /api/health → 200 OK)
3. Firebase Auth integration and verifyToken middleware
4. POST /api/auth/verify-otp endpoint
5. GET /api/users/me endpoint
6. RailSaathiContext and useRailSaathi hook in the mobile app
7. Tab navigator shell with 5 placeholder screens
8. PNR lookup endpoint and HomeScreen journey card
9. Admin dashboard skeleton with Supabase connection
10. Admin dashboard pages with seeded data

---

## What NOT to Do
- Do not build payment flows.
- Do not build IRCTC account creation — only read PNR status from public APIs.
- Do not build push notifications (that is Member 3's job for complaints).
- Do not style the admin dashboard with heavy animation libraries — keep it fast.
- Do not use Redux. Context API is sufficient.
- Do not use TypeScript (unless the whole team agrees on Day 1).
- Do not over-engineer. An MVP that works beats elegant code that is half-built.

---

## Module Boundary — What You Own vs What Others Own

YOU OWN — do not wait for others:
- /api/auth/* routes
- /api/users/* routes
- /api/journeys/* routes
- apps/mobile/src/context/
- apps/mobile/src/navigation/
- apps/mobile/src/screens/auth/
- apps/mobile/src/screens/home/
- apps/mobile/src/services/apiClient.js
- apps/dashboard/ (entire folder)
- supabase/migrations/001_core_schema.sql

OTHERS OWN — do not touch without asking:
- apps/mobile/src/screens/tatkal/ (Member 2)
- apps/mobile/src/screens/complaints/ (Member 3)
- apps/mobile/src/screens/safety/ (Member 4)
- apps/mobile/src/screens/station/ (Member 5)
- services/api/src/routes/tatkal.js (Member 2)
- services/api/src/routes/complaints.js (Member 3)
- services/api/src/routes/safety.js (Member 4)
- services/api/src/routes/amenities.js (Member 5)

YOU MUST HAVE READY BY END OF DAY 2 (others are blocked on this):
- Working OTP login (Members 2–5 need to test their screens with a real user)
- RailSaathiContext with currentUser and activeJourney exposed
- Tab navigator with placeholder screens (Members 2–5 replace placeholders)
- apiClient.js with get/post/patch/delete methods
- Supabase DB live with 001_core_schema.sql applied
- Render deployment live (even if just a health check endpoint)
