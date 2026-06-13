# Architecture & Design Document
# Member 4 — Real-Time Safety & Incident System
# FAR AWAY 2026 — RailSaathi Platform

---

## 1. Technology Stack

Member 4 does NOT set up any infrastructure. Member 1 owns the repo,
Supabase project, Render deployment, and Expo app. You add files inside
the existing structure only.

| Layer               | Technology                         | Owned By        |
|---------------------|------------------------------------|-----------------|
| Mobile Screens      | React Native (Expo)                | You             |
| Backend Routes      | Node.js + Express                  | You (new file)  |
| Database Tables     | Supabase (PostgreSQL)              | You (migration) |
| Real-Time Alerts    | Supabase Realtime (built-in)       | You             |
| SMS Alerts          | Twilio REST API (free trial)       | You             |
| Audio Recording     | Expo Audio + Supabase Storage      | You             |
| RPF Dashboard Page  | React (inside apps/dashboard/)     | You (new page)  |
| Auth / Context      | Firebase + JWT + RailSaathiContext | Member 1        |
| Deployment          | Render + Vercel + Supabase         | Member 1        |

---

## 2. Where Your Files Live in the Monorepo

You touch ONLY these locations. Do not modify anything outside these paths.

```
railsaathi/
├── apps/
│   ├── mobile/
│   │   └── src/
│   │       └── screens/
│   │           └── safety/                  ← YOU OWN THIS ENTIRE FOLDER
│   │               ├── SafetyHomeScreen.js
│   │               ├── SOSActiveScreen.js
│   │               ├── CompartmentAlertScreen.js
│   │               ├── HazardReportScreen.js
│   │               ├── SafetyMapScreen.js
│   │               ├── TrustedContactsScreen.js
│   │               ├── components/
│   │               │   ├── SOSButton.js         ← exported for Member 1 to use
│   │               │   ├── AlertTypeCard.js
│   │               │   ├── HazardMarker.js
│   │               │   └── ContactCard.js
│   │               ├── services/
│   │               │   └── safetyService.js
│   │               └── hooks/
│   │                   └── useSafety.js
│   │
│   └── dashboard/
│       └── src/
│           └── pages/
│               └── RPFDashboardPage.jsx       ← YOU CREATE THIS FILE ONLY
│                   (Member 1 adds the route for it in dashboard routing)
│
├── services/
│   └── api/
│       └── src/
│           ├── routes/
│           │   └── safety.js                  ← YOU CREATE THIS FILE
│           └── services/
│               └── twilioService.js           ← YOU CREATE THIS FILE
│
└── supabase/
    └── migrations/
        └── 004_safety.sql                     ← YOU CREATE THIS FILE
```

---

## 3. Database Schema — Member 4 Tables

Run 004_safety.sql in Supabase SQL editor AFTER Member 1 has applied
001_core_schema.sql. All tables reference users.id from Member 1.

### Table: safety_events
The central table for all safety incidents — SOS, compartment alerts,
and hazard reports all live here as different event types.

```sql
CREATE TABLE safety_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event classification
  event_type        VARCHAR(30) NOT NULL,
  -- SOS | COMPARTMENT_VIOLATION | HAZARD_REPORT

  -- Journey context (from active journey at time of alert)
  train_number      VARCHAR(10),
  coach             VARCHAR(10),
  berth             VARCHAR(10),
  station_code      VARCHAR(10),

  -- Location
  lat               NUMERIC(10, 7),
  lng               NUMERIC(10, 7),

  -- Event-specific details
  alert_subtype     VARCHAR(30),
  -- For SOS: PERSONAL_SAFETY | MEDICAL | THEFT | OTHER
  -- For COMPARTMENT: MALE_OCCUPANT | HARASSMENT | THREATENING_BEHAVIOUR
  -- For HAZARD: UNMANNED_CROSSING | BROKEN_PLATFORM | POOR_LIGHTING
  --             FLOODING | TRACK_DAMAGE | OTHER

  description       TEXT,
  photo_url         TEXT,
  audio_url         TEXT,           -- populated after 60s recording uploads

  -- Status
  status            VARCHAR(20) DEFAULT 'ACTIVE',
  -- ACTIVE | ACKNOWLEDGED | RESOLVED | FALSE_ALARM

  -- Priority
  priority          VARCHAR(10) DEFAULT 'HIGH',
  -- SOS = CRITICAL, COMPARTMENT = HIGH, HAZARD = MEDIUM

  -- Masked display fields for RPF dashboard (never show raw user data publicly)
  masked_initials   VARCHAR(5),     -- e.g. "R.K." derived from user name
  rpf_note          TEXT,           -- note added by RPF when resolving

  -- SMS tracking
  sms_sent          BOOLEAN DEFAULT false,
  sms_contacts_count INTEGER DEFAULT 0,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX idx_safety_user_id ON safety_events(user_id);
CREATE INDEX idx_safety_event_type ON safety_events(event_type);
CREATE INDEX idx_safety_status ON safety_events(status);
CREATE INDEX idx_safety_created_at ON safety_events(created_at);
CREATE INDEX idx_safety_train ON safety_events(train_number);
CREATE INDEX idx_safety_location ON safety_events(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Partial index for active high-priority events (RPF dashboard query)
CREATE INDEX idx_safety_active_critical ON safety_events(created_at DESC)
  WHERE status = 'ACTIVE' AND priority IN ('CRITICAL', 'HIGH');
```

### Row-Level Security

```sql
ALTER TABLE safety_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events
CREATE POLICY "safety_own_insert" ON safety_events
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
  );

-- Users can read their own events
CREATE POLICY "safety_own_read" ON safety_events
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
  );

-- Public read for safety map (anonymised — only lat, lng, event_type,
-- alert_subtype, status, created_at — NOT user_id or personal details)
-- This is handled at the API level, not RLS level, by selecting only
-- safe columns in the public map endpoint.
```

### Enable Supabase Realtime on safety_events
Run this after creating the table:
```sql
ALTER TABLE safety_events REPLICA IDENTITY FULL;
```
Then in Supabase Dashboard → Database → Replication → enable
safety_events table for realtime. This is required for the RPF dashboard
live feed to work.

---

## 4. API Contracts — Member 4 Endpoints

All endpoints live in services/api/src/routes/safety.js
Base path: /api/safety
All endpoints require Authorization: Bearer <jwt> EXCEPT the public map.

Member 1 registers your router in index.js on Day 5.
For local testing, add it temporarily to a local copy of index.js.

---

### POST /api/safety/sos
Fire an SOS alert. This is the most critical endpoint in the module.
It must be fast — target under 500ms to write to DB and return.
SMS sending happens asynchronously (do not await it before responding).

Request body:
```json
{
  "lat": 28.6419,
  "lng": 77.2194,
  "alert_subtype": "PERSONAL_SAFETY",
  "train_number": "12951",
  "coach": "B4",
  "berth": "32",
  "station_code": "NDLS"
}
```

Server-side logic:
1. Get user from DB using req.user.user_id
2. Derive masked_initials from user.name:
   ```javascript
   const deriveMaskedInitials = (name) => {
     if (!name) return 'U.U.'
     const parts = name.trim().split(' ')
     return parts.map(p => p[0].toUpperCase() + '.').join('')
   }
   ```
3. Insert into safety_events:
   event_type: 'SOS', priority: 'CRITICAL', status: 'ACTIVE'
4. Return 201 IMMEDIATELY with the created event — do not wait for SMS
5. After returning (use setImmediate or Promise without await):
   - Fetch user.emergency_contacts from users table
   - For each contact: call twilioService.sendSMS(contact, message)
   - Update safety_event: sms_sent = true, sms_contacts_count = count

Response (201 Created) — returned immediately:
```json
{
  "data": {
    "id": "uuid",
    "event_type": "SOS",
    "status": "ACTIVE",
    "priority": "CRITICAL",
    "train_number": "12951",
    "coach": "B4",
    "berth": "32",
    "lat": 28.6419,
    "lng": 77.2194,
    "created_at": "2026-06-14T22:15:03.000Z"
  },
  "message": "SOS alert sent. Help is on the way."
}
```

---

### PATCH /api/safety/sos/:id/audio
Called after the 60-second recording completes and the mobile app
has uploaded the audio file to Supabase Storage.
Updates the safety_event with the audio_url.

Request body:
```json
{ "audio_url": "https://storage.supabase.co/sos-audio/uuid/event_id.m4a" }
```

Validations:
- audio_url must start with "https://"
- Event must belong to the requesting user
- Event type must be SOS

Response (200): Updated event with audio_url populated.

---

### POST /api/safety/compartment-alert
File a women's compartment violation alert.

Request body:
```json
{
  "train_number": "12951",
  "coach": "S5",
  "alert_subtype": "MALE_OCCUPANT",
  "lat": 28.6419,
  "lng": 77.2194,
  "station_code": "NDLS"
}
```

Server-side logic:
1. Insert into safety_events:
   event_type: 'COMPARTMENT_VIOLATION', priority: 'HIGH', status: 'ACTIVE'
2. Return 201 immediately
3. No SMS for compartment alerts (RPF dashboard only)

Response (201): Created event object.

---

### POST /api/safety/hazard-report
Report an infrastructure hazard.

Request body:
```json
{
  "alert_subtype": "UNMANNED_CROSSING",
  "lat": 26.8500,
  "lng": 80.9200,
  "description": "No warning lights or barriers at this crossing.",
  "photo_url": "https://storage.supabase.co/...",
  "station_code": "LKO"
}
```

Validations:
- alert_subtype: must be in valid hazard types list
- lat, lng: required, valid coordinates
- description: optional, max 200 chars

Server-side logic:
1. Insert into safety_events:
   event_type: 'HAZARD_REPORT', priority: 'MEDIUM', status: 'ACTIVE'
2. Return 201

Response (201): Created event object.

---

### GET /api/safety/my-events
Get all safety events for the logged-in user. All types.
Order: created_at DESC.

Response (200): Array of safety event objects.

---

### PATCH /api/safety/events/:id/resolve
Resolve or acknowledge an event. Admin action.

Request body:
```json
{
  "status": "ACKNOWLEDGED",
  "rpf_note": "RPF officer dispatched to Coach B4."
}
```

Validations:
- status must be: ACKNOWLEDGED | RESOLVED | FALSE_ALARM
- Event must exist

Server-side logic:
1. Update: status, rpf_note, updated_at
2. If RESOLVED: set resolved_at = NOW()
3. Return updated event

Response (200): Updated event.

---

### GET /api/safety/public/map  (NO AUTH REQUIRED)
Returns safety events for the public map. ANONYMISED — no user_id,
no name, no phone. Only safe fields.

Query params: ?type=SOS&status=ACTIVE (optional filters)

Response (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "event_type": "SOS",
      "alert_subtype": "PERSONAL_SAFETY",
      "lat": 28.6419,
      "lng": 77.2194,
      "status": "RESOLVED",
      "train_number": "12951",
      "created_at": "2026-06-14T22:15:03.000Z"
    }
  ]
}
```

NEVER return: user_id, masked_initials, audio_url, sms details, or
any field that could identify the reporting user.

---

### GET /api/safety/rpf/live  (NO AUTH for MVP — add admin check on Day 5)
Returns the 50 most recent ACTIVE safety events for the RPF dashboard.
Ordered by created_at DESC.

Response (200): Array of safety event objects including masked_initials.
(This endpoint IS allowed to return masked_initials — it is RPF-facing,
not publicly accessible. In production, it would require RPF officer auth.)

---

## 5. Twilio SMS Integration

### Setup
1. Create Twilio account at twilio.com (free trial)
2. Free trial gives: 1 Twilio phone number, $15 credit
3. In trial mode: you can ONLY send SMS to verified phone numbers.
   Before demo day, verify at least 3 phone numbers in Twilio console:
   your own, one team member's, and one judge's (if possible).
4. Get from Twilio console:
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_FROM_NUMBER (your Twilio phone number)
5. Add all three to Render environment variables and local .env

### twilioService.js
```javascript
// services/api/src/services/twilioService.js
const twilio = require('twilio')

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const sendSOS = async (toPhone, userName, trainNumber, coach, berth, lat, lng) => {
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`
  const message =
    `EMERGENCY ALERT via RailSaathi:\n` +
    `${userName} needs help on:\n` +
    `Train: ${trainNumber}\n` +
    `Coach: ${coach}, Berth: ${berth}\n` +
    `Location: ${mapsLink}\n` +
    `Please call them or contact RPF at 182.`

  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: `+91${toPhone}`
    })
    console.log(`[SMS] Sent to +91${toPhone} for event ${trainNumber}`)
    return { success: true }
  } catch (error) {
    console.error(`[SMS] Failed to send to +91${toPhone}:`, error.message)
    return { success: false, error: error.message }
  }
}

module.exports = { sendSOS }
```

Install Twilio SDK:
```bash
cd services/api
npm install twilio
```

---

## 6. Supabase Realtime — RPF Dashboard Live Feed

The RPF dashboard page uses Supabase's JavaScript client to subscribe
to real-time inserts on the safety_events table.

```javascript
// In RPFDashboardPage.jsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

useEffect(() => {
  // Load initial events
  fetchActiveEvents()

  // Subscribe to new inserts
  const channel = supabase
    .channel('safety-alerts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'safety_events'
      },
      (payload) => {
        // New alert arrived — add to top of list, play sound
        setEvents(prev => [payload.new, ...prev])
        playAlertSound()
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [])
```

Alert sound (Web Audio API — no library needed):
```javascript
const playAlertSound = () => {
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  oscillator.frequency.value = 800
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.5)
}
```

---

## 7. Supabase Storage — Audio and Hazard Photos

### Bucket: sos-audio
- Private (only server-side access with service key)
- File naming: {user_id}/{event_id}_{timestamp}.m4a

### Bucket: hazard-photos
- Public (viewable by RPF dashboard)
- File naming: {user_id}/{event_id}_{timestamp}.jpg

### Audio Recording on Mobile (Expo Audio)
```javascript
import { Audio } from 'expo-av'

const startRecording = async () => {
  await Audio.requestPermissionsAsync()
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  )
  return recording
}

const stopAndUpload = async (recording, userId, eventId) => {
  await recording.stopAndUnloadAsync()
  const uri = recording.getURI()
  const fileName = `${userId}/${eventId}_${Date.now()}.m4a`
  const response = await fetch(uri)
  const blob = await response.blob()
  await supabase.storage.from('sos-audio').upload(fileName, blob)
  return supabase.storage.from('sos-audio').getPublicUrl(fileName).data.publicUrl
}
```

---

## 8. SOSButton Component — Exported for Member 1

This is a component you build that Member 1 places on the HomeScreen.
It must work standalone — it does not require being inside the Safety tab.

```javascript
// apps/mobile/src/screens/safety/components/SOSButton.js
// Export this component. Member 1 imports it into HomeScreen.js.
// It uses useRailSaathi() internally to get currentUser and activeJourney.
// It uses Expo Location to get GPS at the moment of press.
// It manages its own SOS active state independently.

export default function SOSButton() {
  const { currentUser, activeJourney } = useRailSaathi()
  const [isActive, setIsActive] = useState(false)
  // ... press handler, confirmation dialog, three actions
}
```

---

## 9. Mobile Screen Architecture

### Navigation inside Safety tab
```
SafetyTab (bottom tab)
└── SafetyStack (stack navigator)
    ├── SafetyHomeScreen           (default — SOS button + 3 action tiles)
    ├── SOSActiveScreen            (shown during 60-second recording)
    ├── CompartmentAlertScreen     (fast alert form)
    ├── HazardReportScreen         (hazard filing form)
    ├── SafetyMapScreen            (public map, no login)
    └── TrustedContactsScreen      (view/edit contacts)
```

### Data flow
```
RailSaathiContext (Member 1)
        │
        │ currentUser.emergency_contacts
        │ activeJourney.train_number, .coach, .berth
        ↓
SafetyHomeScreen / SOSButton
        │
        │ POST /api/safety/sos (non-blocking return)
        │ Twilio SMS fires async server-side
        │ Audio recording starts client-side
        ↓
safetyService.js
        │
        │ Returns event with id
        ↓
SOSActiveScreen (60-second countdown)
        │
        │ After 60s: audio upload complete
        │ PATCH /api/safety/sos/:id/audio (with audio_url)
        ↓
SafetyHomeScreen (SOS resolved)
```

---

## 10. Local Development Setup

```bash
# Backend
cd railsaathi/services/api
# .env needs: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET,
#             TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
node src/index.js
```

### Test SOS endpoint
```bash
TOKEN="eyJ..."

curl -X POST http://localhost:3000/api/safety/sos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 28.6419,
    "lng": 77.2194,
    "alert_subtype": "PERSONAL_SAFETY",
    "train_number": "12951",
    "coach": "B4",
    "berth": "32",
    "station_code": "NDLS"
  }'
# Expected: 201 in under 500ms
# Then check Supabase: safety_events has a new ACTIVE CRITICAL SOS row
# Check server logs: [SMS] Sent to +91XXXXXXXXXX...
```

### Test Realtime (RPF Dashboard)
Open RPFDashboardPage.jsx in the browser → submit the SOS curl above →
the new alert card must appear within 3 seconds without a page refresh.
If it does not appear: check that safety_events has REPLICA IDENTITY FULL
and Realtime is enabled in Supabase Dashboard.

### Temporarily mock context for mobile testing
```javascript
// Top of SafetyHomeScreen.js during development — remove before Day 5
const currentUser = {
  id: 'test-uuid',
  name: 'Raj Kumar',
  emergency_contacts: ['9000000001', '9000000002']
}
const activeJourney = {
  train_number: '12951',
  coach: 'B4',
  berth: '32',
  boarding_station: 'NDLS'
}
// Replace Day 5 with:
// const { currentUser, activeJourney } = useRailSaathi()
```
