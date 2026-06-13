# AGENTS.md — AI Coding Rules
# Member 4 — Real-Time Safety & Incident System
# FAR AWAY 2026 — RailSaathi Platform

---

## Identity
You are building the Safety module of RailSaathi. Your job is to make a
one-tap SOS button send a context-rich alert to RPF within 3 seconds, fire
SMS to emergency contacts, begin an audio recording, and show everything
live on a dashboard. This is the most demo-critical module. Every rule
below exists to ensure it works reliably under pressure.

---

## Non-Negotiable Rules

### Code Structure
- Keep every file under 300 lines. Split if larger.
- safetyService.js is your ONLY file for API calls from the mobile side.
  No raw fetch() calls inside screen components.
- Route handler (safety.js) only validates and delegates to service functions.
  Business logic (masked initials, SMS dispatch, priority assignment) lives
  in services/api/src/services/safety-service.js.
- twilioService.js is a standalone file. Never inline Twilio calls in routes.
- SOSButton.js is a standalone exported component. It must work when imported
  into any screen — it manages its own state and context access internally.

### Naming Conventions
- Files: kebab-case
- React components: PascalCase
- Variables/functions: camelCase
- DB columns: snake_case
- Constants: SCREAMING_SNAKE_CASE

### API Rules
- Every response: { "data": ..., "message": "..." } success shape
- Every error: { "error": "Human message", "code": "ERROR_CODE" }
- Correct HTTP status codes always.
- The public map endpoint does NOT require auth. No verifyToken on it.
- The RPF live endpoint does NOT require auth for the MVP.
  Add a TODO comment noting it needs admin auth in production.
- Never expose user_id, user name, phone number, or audio_url in the
  public map endpoint. Select only the safe columns explicitly.

### SOS Endpoint Speed — THIS IS CRITICAL
The POST /api/safety/sos endpoint must respond in under 500ms.
This means: DO NOT await the SMS send before returning the response.
Pattern to follow:
```javascript
router.post('/sos', verifyToken, async (req, res) => {
  // 1. Insert to DB
  const event = await insertSOSEvent(...)
  // 2. Return IMMEDIATELY
  res.status(201).json({ data: event, message: "SOS alert sent." })
  // 3. SMS fires AFTER response is sent (non-blocking)
  setImmediate(async () => {
    await sendSOSSMS(userId, event)
  })
})
```
If you await the SMS send before returning, the SOS takes 3–8 seconds
to respond. The demo will feel broken. This is unacceptable.

### Privacy Rules for Public Map
The GET /api/safety/public/map endpoint must NEVER return:
- user_id
- masked_initials
- audio_url
- sms_sent, sms_contacts_count
- rpf_note (internal RPF communication)
Only return: id, event_type, alert_subtype, lat, lng, status,
train_number, station_code, created_at.
Use an explicit SELECT with column names, never SELECT *.

### Supabase Realtime — Must Be Configured
The RPF dashboard ONLY works if Supabase Realtime is enabled on the
safety_events table. This is a database-level setting, not code.
Steps in Supabase Dashboard:
1. Database → Replication → safety_events → enable
2. Run SQL: ALTER TABLE safety_events REPLICA IDENTITY FULL;
If you skip this, the dashboard shows nothing live and your demo fails.
Test realtime before moving to mobile screens.

### Twilio Limitations — Know Them Before Demo Day
Twilio free trial can only send SMS to verified phone numbers.
The SMS will fail silently to unverified numbers.
Action required before Day 4:
1. Verify at least 3 phone numbers in Twilio console
   (your phone, one teammate's phone, one judge's if possible)
2. Store those numbers as emergency_contacts on your demo user in Supabase
3. Test the SMS send from your local machine, not just in code review
If SMS fails on demo day: the audio recording + RPF dashboard still work,
and the demo is still strong. SMS is a bonus, not the centrepiece.

### Audio Recording Rules
- Request microphone permission BEFORE the SOS flow starts, not during.
  Add permission request to the app startup flow or TrustedContactsScreen
  (first time user visits Safety tab).
- The recording must start IMMEDIATELY after SOS confirm, not after the
  API response returns. Use Promise.all to fire both simultaneously:
  ```javascript
  await Promise.all([
    safetyService.postSOS(payload),
    startRecording()
  ])
  ```
- The recording is 60 seconds. Use setInterval countdown on SOSActiveScreen.
- After recording stops: upload the file, then PATCH the event with audio_url.
- If upload fails: log the error, do not crash. The SOS is still filed.
- Never record audio without the user's explicit confirmation dialog.

### SOSButton Component Rules
- The SOS button must be visually distinct from every other element.
  Use red background, white text, minimum 60x60dp tap target.
- It must show a confirmation dialog ALWAYS. Never fire SOS on a single tap.
  This prevents accidental triggers.
- The button must be disabled (greyed out, no tap) for 5 seconds after
  cancelling an SOS, to prevent rapid accidental re-fires.
- Export it as a default export. Member 1 imports it like:
  import SOSButton from '../safety/components/SOSButton'

### SafetyMapScreen Rules
- This screen does NOT use useRailSaathi(). It is public.
  Do not use the context hook in this screen.
- Use react-native-maps (Expo managed) for the map.
- Do not attempt to show the user's GPS location on the public map
  (that would reveal their identity).
- The map must render even if the API returns an empty array.
  Show an empty map, not an error screen.

### Testing Rules
- Test SOS response time: use curl with time command, must be < 500ms
- Test Realtime: fire SOS via curl, confirm RPF dashboard updates < 3 seconds
- Test SMS: fire a real SOS with a verified Twilio number → SMS arrives
- Test audio: press SOS on device → 60-second countdown → recording uploads
  → PATCH /api/safety/sos/:id/audio is called with the audio_url
- Test public map: GET /api/safety/public/map WITHOUT auth header → 200
  and response contains NO user_id, no masked_initials
- Test compartment alert: full flow end-to-end < 10 seconds
- Test hazard report: file hazard → appears on safety map

### Git Rules
- Only commit files inside your designated paths.
- Never modify Member 1's files.
- Commit message format: feat(safety): description
  Example: feat(safety): add SOS endpoint with async SMS dispatch
- Commit after every working slice.
- Do NOT commit your Twilio credentials. They go in .env and Render env vars only.

---

## What to Build First (Priority Order)
1. 004_safety.sql — run in Supabase, enable Realtime, confirm table exists
2. POST /api/safety/sos — the most critical endpoint, build and test first
3. RPFDashboardPage.jsx — test Realtime immediately after SOS endpoint works
4. twilioService.js — add SMS, test with a real verified number
5. PATCH /api/safety/sos/:id/audio
6. POST /api/safety/compartment-alert
7. POST /api/safety/hazard-report
8. GET /api/safety/public/map
9. GET /api/safety/rpf/live
10. PATCH /api/safety/events/:id/resolve
11. SOSButton component (mobile)
12. SafetyHomeScreen (mobile)
13. SOSActiveScreen (mobile — countdown + audio)
14. CompartmentAlertScreen (mobile)
15. HazardReportScreen (mobile)
16. SafetyMapScreen (mobile)
17. TrustedContactsScreen (mobile)
18. Seed safety data

---

## What NOT to Do
- Do not await SMS send before returning SOS response. Non-negotiable.
- Do not build biometric scanner. It is a pitch feature only.
- Do not build a two-way chat with RPF. The RPF dashboard is read + resolve only.
- Do not build a subscription or recurring alert system.
- Do not use any third-party map library except react-native-maps and
  react-leaflet / mapbox. Keep it simple.
- Do not store raw user name or phone number in safety_events.
  Use masked_initials only.
- Do not create a separate Express server. Plug into Member 1's server.
- Do not expose Twilio credentials in any committed file.

---

## Integration Checklist (Day 5)
When Member 1 asks you to hand off:
- [ ] 004_safety.sql applied in Supabase
- [ ] safety_events Realtime enabled in Supabase dashboard
- [ ] ALTER TABLE safety_events REPLICA IDENTITY FULL run
- [ ] services/api/src/routes/safety.js committed and tested
- [ ] services/api/src/services/safety-service.js committed
- [ ] services/api/src/services/twilioService.js committed
- [ ] apps/mobile/src/screens/safety/ all files committed
- [ ] apps/dashboard/src/pages/RPFDashboardPage.jsx committed
- [ ] SOSButton.js exported as default and tested standalone
- [ ] Mock context replaced with useRailSaathi() in all screens
  EXCEPT SafetyMapScreen (intentionally no context hook)
- [ ] All hardcoded localhost URLs replaced with API_BASE_URL
- [ ] Twilio credentials in Render env vars (not in code)
- [ ] 3+ phone numbers verified in Twilio console for demo
- [ ] No .env values hardcoded anywhere
- [ ] Told Member 1:
  app.use('/api/safety', require('./routes/safety'))
  And: import SOSButton from '../safety/components/SOSButton' for HomeScreen
- [ ] Told Member 1 to add RPFDashboardPage route in dashboard router
