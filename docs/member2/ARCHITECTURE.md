# Architecture & Design Document
# Member 2 — Tatkal Verified Booking Ecosystem
# FAR AWAY 2026 — RailSaathi Platform

---

## 1. Technology Stack

Member 2 does NOT set up any infrastructure. Member 1 owns the repo,
Supabase project, Render deployment, and Expo app. You only add files
inside the existing structure.

| Layer              | Technology                        | Owned By        |
|--------------------|-----------------------------------|-----------------|
| Mobile Screens     | React Native (Expo)               | You             |
| Backend Routes     | Node.js + Express                 | You (new file)  |
| Database Tables    | Supabase (PostgreSQL)             | You (migration) |
| File Storage       | Supabase Storage                  | You (new bucket)|
| Auth / Context     | Firebase + JWT + RailSaathiContext| Member 1        |
| Deployment         | Render + Vercel + Supabase        | Member 1        |

---

## 2. Where Your Files Live in the Monorepo

You touch ONLY these locations. Do not modify anything outside these paths.

```
railsaathi/
├── apps/
│   └── mobile/
│       └── src/
│           └── screens/
│               └── tatkal/               ← YOU OWN THIS ENTIRE FOLDER
│                   ├── TatkalHomeScreen.js
│                   ├── PreFillFormScreen.js
│                   ├── CountdownScreen.js
│                   ├── ConfirmationScreen.js
│                   ├── UrgencyFormScreen.js
│                   ├── SurrenderMarketScreen.js
│                   ├── MyBookingsScreen.js
│                   ├── components/
│                   │   ├── CountdownTimer.js
│                   │   ├── UrgencyScoreCard.js
│                   │   ├── SurrenderListItem.js
│                   │   └── BookingStatusCard.js
│                   ├── services/
│                   │   └── tatkalService.js   ← all API calls for this module
│                   └── hooks/
│                       └── useTatkal.js
│
├── services/
│   └── api/
│       └── src/
│           └── routes/
│               └── tatkal.js              ← YOU CREATE THIS FILE
│
└── supabase/
    └── migrations/
        └── 002_tatkal.sql                 ← YOU CREATE THIS FILE
```

---

## 3. Database Schema — Member 2 Tables

Run 002_tatkal.sql in Supabase SQL editor AFTER Member 1 has run 001_core_schema.sql.
All tables reference users.id which Member 1 created.

### Table: tatkal_requests
Stores every pre-fill request a user submits before 10 AM.

```sql
CREATE TABLE tatkal_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Journey details
  from_station        VARCHAR(10) NOT NULL,
  to_station          VARCHAR(10) NOT NULL,
  travel_date         DATE NOT NULL,
  train_number        VARCHAR(10),
  class               VARCHAR(5) NOT NULL,  -- SL, 3A, 2A, 1A, GEN

  -- Passenger details (JSON array — supports up to 6 passengers)
  passengers          JSONB NOT NULL,
  -- Shape: [{ name, age, gender, berth_preference }]
  -- MUST include the account holder as one passenger

  -- Urgency
  is_urgent           BOOLEAN DEFAULT false,
  urgency_reason      VARCHAR(20),  -- medical | bereavement | official | personal
  urgency_document_url TEXT,
  urgency_score       NUMERIC(3,1) DEFAULT 0,

  -- Execution
  scheduled_fire_time TIMESTAMPTZ NOT NULL,  -- 10:00 AM or 11:00 AM on travel_date - 1
  status              VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING | FIRED | CONFIRMED | FAILED | CANCELLED

  -- Result (from IRCTC or simulation)
  simulated_pnr       VARCHAR(10),
  result_payload      JSONB,

  -- Anti-hoarding
  booking_date        DATE NOT NULL,  -- the date this request was created
  -- unique constraint below prevents 2 requests on same day

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Anti-hoarding constraint: one request per user per booking date per class
CREATE UNIQUE INDEX idx_tatkal_one_per_day
  ON tatkal_requests(user_id, booking_date)
  WHERE status NOT IN ('CANCELLED', 'FAILED');

CREATE INDEX idx_tatkal_user_id ON tatkal_requests(user_id);
CREATE INDEX idx_tatkal_status ON tatkal_requests(status);
CREATE INDEX idx_tatkal_fire_time ON tatkal_requests(scheduled_fire_time);
CREATE INDEX idx_tatkal_travel_date ON tatkal_requests(travel_date);
```

### Table: tatkal_surrenders
Stores surrender listings and their match status.

```sql
CREATE TABLE tatkal_surrenders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Ticket details
  pnr                 VARCHAR(10) NOT NULL,
  from_station        VARCHAR(10) NOT NULL,
  to_station          VARCHAR(10) NOT NULL,
  travel_date         DATE NOT NULL,
  train_number        VARCHAR(10),
  class               VARCHAR(5),

  -- Status
  status              VARCHAR(20) DEFAULT 'LISTED',
  -- LISTED | MATCHED | COMPLETED | WITHDRAWN

  listed_at           TIMESTAMPTZ DEFAULT NOW(),
  matched_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_surrenders_status ON tatkal_surrenders(status);
CREATE INDEX idx_surrenders_owner ON tatkal_surrenders(owner_user_id);
CREATE INDEX idx_surrenders_travel_date ON tatkal_surrenders(travel_date);
```

### Row-Level Security
```sql
ALTER TABLE tatkal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tatkal_requests_owner" ON tatkal_requests
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
  );

-- Surrenders are publicly readable (for the market) but only owner can write
ALTER TABLE tatkal_surrenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "surrenders_read_all" ON tatkal_surrenders
  FOR SELECT USING (true);
CREATE POLICY "surrenders_owner_write" ON tatkal_surrenders
  FOR INSERT WITH CHECK (
    owner_user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
  );
```

---

## 4. API Contracts — Member 2 Endpoints

All endpoints live in services/api/src/routes/tatkal.js
All are protected — require Authorization: Bearer <jwt> header.
Base path: /api/tatkal

Member 1 registers your router in index.js on Day 5.
Until then, for local testing, add it yourself in a local copy of index.js.

---

### POST /api/tatkal/prefill
Create a new pre-fill request.

Request body:
```json
{
  "from_station": "NDLS",
  "to_station": "MMCT",
  "travel_date": "2026-06-15",
  "train_number": "12951",
  "class": "3A",
  "passengers": [
    { "name": "Raj Kumar", "age": 28, "gender": "M", "berth_preference": "LB" }
  ],
  "is_urgent": true,
  "urgency_reason": "medical",
  "urgency_document_url": "https://storage.supabase.co/..."
}
```

Validations:
- from_station, to_station: 2–7 uppercase characters
- travel_date: must be today or future date
- class: must be one of SL, 3A, 2A, 1A, GEN
- passengers: array length 1–6
- Account holder name must appear in passengers array
  (compare against users.name in DB)
- User must not have an active request for same booking_date
  (check unique index — catch the constraint error and return friendly message)

Urgency score calculation (do this in the route handler):
```javascript
function calculateUrgencyScore(reason, hasDocument, accountAgeMonths) {
  const baseScore = { medical: 9, bereavement: 8, official: 7, personal: 5 }
  let score = baseScore[reason] || 5
  if (hasDocument) score += 1
  if (accountAgeMonths > 6) score += 0.5
  return Math.min(score, 10)
}
```

Scheduled fire time:
```javascript
// AC classes (1A, 2A, 3A): fire at 10:00:00 AM on (travel_date - 1)
// Non-AC (SL, GEN): fire at 11:00:00 AM on (travel_date - 1)
const isAC = ['1A', '2A', '3A'].includes(class)
const fireHour = isAC ? 10 : 11
const fireDate = new Date(travel_date)
fireDate.setDate(fireDate.getDate() - 1)
fireDate.setHours(fireHour, 0, 0, 0)
```

Response (201 Created):
```json
{
  "data": {
    "id": "uuid",
    "status": "PENDING",
    "scheduled_fire_time": "2026-06-14T10:00:00.000Z",
    "urgency_score": 9.5,
    "from_station": "NDLS",
    "to_station": "MMCT",
    "travel_date": "2026-06-15",
    "class": "3A"
  },
  "message": "Pre-fill saved. Will fire at 10:00 AM tomorrow."
}
```

---

### GET /api/tatkal/my-requests
Get all Tatkal requests for the logged-in user.

Response (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "PENDING",
      "scheduled_fire_time": "2026-06-14T10:00:00.000Z",
      "urgency_score": 9.5,
      "from_station": "NDLS",
      "to_station": "MMCT",
      "travel_date": "2026-06-15",
      "class": "3A",
      "simulated_pnr": null
    }
  ],
  "message": "ok"
}
```

---

### GET /api/tatkal/:id
Get one request by ID (must belong to logged-in user).

Response (200): Single request object as above.
Response (404): { "error": "Request not found" }
Response (403): { "error": "Not authorized" }

---

### POST /api/tatkal/fire/:id  (DEMO ENDPOINT)
Manually trigger the fire simulation (for demo day — so you do not wait for 10 AM).
Only works if the request is in PENDING status.

What this endpoint does:
1. Updates status to FIRED
2. Waits 2 seconds (simulate network latency)
3. Generates a fake PNR: "DEMO" + 6 random digits
4. Updates status to CONFIRMED and stores the fake PNR
5. Returns the confirmed request

Response (200):
```json
{
  "data": {
    "id": "uuid",
    "status": "CONFIRMED",
    "simulated_pnr": "DEMO847291",
    "fired_at": "2026-06-14T10:00:00.123Z"
  },
  "message": "Booking request fired and confirmed."
}
```

---

### POST /api/tatkal/cancel/:id
Cancel a PENDING request.

Response (200): { "data": { "status": "CANCELLED" }, "message": "Request cancelled." }

---

### POST /api/tatkal/surrender
List a confirmed booking for surrender.

Request body:
```json
{
  "pnr": "1234567890",
  "from_station": "NDLS",
  "to_station": "MMCT",
  "travel_date": "2026-06-15",
  "train_number": "12951",
  "class": "3A"
}
```

Response (201): Surrender listing object.

---

### GET /api/tatkal/surrenders
Get all LISTED surrenders (publicly readable).
Optional query params: ?from=NDLS&to=MMCT&date=2026-06-15&class=3A

Response (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "pnr": "1234567890",
      "from_station": "NDLS",
      "to_station": "MMCT",
      "travel_date": "2026-06-15",
      "class": "3A",
      "status": "LISTED"
    }
  ]
}
```

---

### POST /api/tatkal/surrenders/:id/request
A logged-in user requests a listed surrender ticket.

What it does:
1. Check surrender is in LISTED status
2. Check requester is not the owner
3. Update surrender: status = MATCHED, requester_user_id = user.id, matched_at = NOW()
4. Return matched surrender

Response (200): Updated surrender object.

---

## 5. Scheduled Job — The Fire Engine

This is the heart of the feature. Create a simple in-process scheduler in
services/api/src/jobs/tatkalFireJob.js

```javascript
// Runs every 30 seconds
// Finds all PENDING tatkal_requests where scheduled_fire_time <= NOW()
// Fires each one (simulation for MVP)
// Updates status to FIRED, then to CONFIRMED with a fake PNR

const firePendingRequests = async () => {
  const now = new Date().toISOString()
  const { data: pending } = await supabase
    .from('tatkal_requests')
    .select('*')
    .eq('status', 'PENDING')
    .lte('scheduled_fire_time', now)

  for (const request of pending) {
    await supabase.from('tatkal_requests')
      .update({ status: 'FIRED', updated_at: new Date() })
      .eq('id', request.id)

    // Simulate 2-second IRCTC call
    await new Promise(r => setTimeout(r, 2000))

    const fakePNR = 'DEMO' + Math.floor(100000 + Math.random() * 900000)
    await supabase.from('tatkal_requests')
      .update({
        status: 'CONFIRMED',
        simulated_pnr: fakePNR,
        updated_at: new Date()
      })
      .eq('id', request.id)
  }
}

// Start the job
setInterval(firePendingRequests, 30000)
```

Import and start this job in tatkal.js route file using:
```javascript
require('../jobs/tatkalFireJob')
```

Or better: Member 1 starts it in index.js after you tell them the file path.

---

## 6. Supabase Storage — Document Upload

Bucket name: tatkal-documents (create in Supabase dashboard, set to private)

Upload flow from the mobile app:
```javascript
// In UrgencyFormScreen.js — use Expo ImagePicker + Supabase Storage client
import * as DocumentPicker from 'expo-document-picker'
import { supabase } from '../../../services/supabaseClient'

const uploadDocument = async () => {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' })
  if (result.type === 'success') {
    const fileName = `${userId}/${Date.now()}_urgency.pdf`
    const { data, error } = await supabase.storage
      .from('tatkal-documents')
      .upload(fileName, result.file)
    // Store the returned URL in state, send with prefill POST
  }
}
```

---

## 7. Mobile Screen Architecture

### Navigation inside Tatkal tab
```
TatkalTab (bottom tab)
└── TatkalStack (stack navigator)
    ├── TatkalHomeScreen         (default — shows active request or entry point)
    ├── PreFillFormScreen        (multi-step form)
    ├── UrgencyFormScreen        (optional — opens from PreFillForm)
    ├── CountdownScreen          (after prefill submitted — shows live timer)
    ├── ConfirmationScreen       (after fire — shows simulated PNR)
    ├── MyBookingsScreen         (list of past requests)
    └── SurrenderMarketScreen    (list + request flow)
```

### Data flow in the Tatkal tab
```
RailSaathiContext (Member 1)
        │
        │ currentUser.name, currentUser.phone,
        │ currentUser.preferred_class
        ↓
PreFillFormScreen
        │
        │ POST /api/tatkal/prefill
        ↓
tatkalService.js (API layer)
        │
        │ returns request object with scheduled_fire_time
        ↓
CountdownScreen
        │
        │ polls GET /api/tatkal/:id every 5 seconds
        │ watches status: PENDING → FIRED → CONFIRMED
        ↓
ConfirmationScreen
```

---

## 8. Local Development Setup

Since you are not responsible for infrastructure, here is how you run
your module locally while waiting for Member 1 to finish:

### Run the backend locally
```bash
cd railsaathi/services/api
npm install
# create .env with Supabase and JWT credentials (get from Member 1)
node src/index.js
# Your routes will be at http://localhost:3000/api/tatkal/...
```

### Test your endpoints without the mobile app
Use this curl sequence to test the full flow:

```bash
# 1. Get a JWT token (from Member 1's auth endpoint or mock one)
TOKEN="eyJ..."

# 2. Create a prefill request
curl -X POST http://localhost:3000/api/tatkal/prefill \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_station": "NDLS",
    "to_station": "MMCT",
    "travel_date": "2026-06-20",
    "train_number": "12951",
    "class": "3A",
    "passengers": [{"name":"Raj Kumar","age":28,"gender":"M","berth_preference":"LB"}],
    "is_urgent": true,
    "urgency_reason": "medical"
  }'

# 3. Fire it manually (demo mode)
curl -X POST http://localhost:3000/api/tatkal/fire/<request_id> \
  -H "Authorization: Bearer $TOKEN"
```

### Run the mobile screens locally
```bash
cd railsaathi/apps/mobile
npm install
npx expo start
# Scan QR with Expo Go on your phone
```

While Member 1 is not done, mock the context in your screens:
```javascript
// Temporary mock at top of TatkalHomeScreen.js — remove before integration
const currentUser = { id: 'test-uuid', name: 'Raj Kumar', preferred_class: '3A' }
const activeJourney = { train_number: '12951', from_station: 'NDLS', to_station: 'MMCT' }
```
Replace with `const { currentUser, activeJourney } = useRailSaathi()` on Day 5.
