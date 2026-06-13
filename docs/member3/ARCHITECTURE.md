# Architecture & Design Document
# Member 3 — Grievance & Complaint System
# FAR AWAY 2026 — RailSaathi Platform

---

## 1. Technology Stack

Member 3 does NOT set up any infrastructure. Member 1 owns the repo,
Supabase project, Render deployment, and Expo app. You only add files
inside the existing structure.

| Layer              | Technology                        | Owned By        |
|--------------------|-----------------------------------|-----------------|
| Mobile Screens     | React Native (Expo)               | You             |
| Backend Routes     | Node.js + Express                 | You (new file)  |
| Database Tables    | Supabase (PostgreSQL)             | You (migration) |
| File Storage       | Supabase Storage                  | You (new bucket)|
| Push Notifications | Expo Push Notifications           | You             |
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
│               └── complaints/           ← YOU OWN THIS ENTIRE FOLDER
│                   ├── ComplaintsHomeScreen.js
│                   ├── NewComplaintScreen.js
│                   ├── ComplaintDetailScreen.js
│                   ├── ReopenScreen.js
│                   ├── PublicHeatMapScreen.js
│                   ├── components/
│                   │   ├── ComplaintTypeSelector.js
│                   │   ├── ComplaintCard.js
│                   │   ├── StatusTimeline.js
│                   │   ├── StationMarker.js
│                   │   └── PhotoUploader.js
│                   ├── services/
│                   │   └── complaintService.js
│                   └── hooks/
│                       └── useComplaints.js
│
├── services/
│   └── api/
│       └── src/
│           └── routes/
│               └── complaints.js         ← YOU CREATE THIS FILE
│
└── supabase/
    └── migrations/
        └── 003_complaints.sql            ← YOU CREATE THIS FILE
```

---

## 3. Database Schema — Member 3 Tables

Run 003_complaints.sql in Supabase SQL editor AFTER Member 1 has run
001_core_schema.sql. All tables reference users.id from Member 1.

### Table: complaints
The core table. One row per complaint filed.

```sql
CREATE TABLE complaints (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Reference number shown to user
  reference_number    VARCHAR(20) UNIQUE NOT NULL,
  -- Format: RS-YYYYMMDD-XXXXX (e.g. RS-20260614-84729)

  -- Complaint type
  complaint_type      VARCHAR(20) NOT NULL,
  -- CLEANLINESS | AC_HEATING | STAFF | FOOD | SAFETY |
  -- OVERCROWDING | AMENITY | OTHER

  -- Description
  description         TEXT NOT NULL,
  photo_url           TEXT,

  -- Journey context (pre-filled from active journey or manually entered)
  train_number        VARCHAR(10),
  train_name          VARCHAR(100),
  coach               VARCHAR(10),
  berth               VARCHAR(10),
  station_code        VARCHAR(10) NOT NULL,
  station_name        VARCHAR(100),
  travel_date         DATE,

  -- Geographic coords for heat map (derived from station)
  station_lat         NUMERIC(10, 7),
  station_lng         NUMERIC(10, 7),

  -- Status
  status              VARCHAR(20) DEFAULT 'SUBMITTED',
  -- SUBMITTED | ACKNOWLEDGED | IN_PROGRESS | RESOLVED | REJECTED

  -- Escalation
  is_safety_complaint BOOLEAN GENERATED ALWAYS AS (complaint_type = 'SAFETY') STORED,
  priority            VARCHAR(10) DEFAULT 'NORMAL', -- NORMAL | HIGH | CRITICAL

  -- Reopen tracking
  is_reopened         BOOLEAN DEFAULT false,
  reopen_count        INTEGER DEFAULT 0,
  reopen_deadline     TIMESTAMPTZ,
  -- Set to NOW() + 72 hours when status is set to RESOLVED

  -- Push notification
  expo_push_token     TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_complaints_user_id ON complaints(user_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_station_code ON complaints(station_code);
CREATE INDEX idx_complaints_complaint_type ON complaints(complaint_type);
CREATE INDEX idx_complaints_created_at ON complaints(created_at);
CREATE INDEX idx_complaints_train_number ON complaints(train_number);
CREATE INDEX idx_complaints_is_safety ON complaints(is_safety_complaint)
  WHERE is_safety_complaint = true;
```

### Table: complaint_timeline
One row per status change event on a complaint.
This drives the status timeline UI.

```sql
CREATE TABLE complaint_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id    UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,

  from_status     VARCHAR(20),       -- null for the first entry (SUBMITTED)
  to_status       VARCHAR(20) NOT NULL,
  note            TEXT,              -- optional resolver note
  changed_by      VARCHAR(50),       -- 'SYSTEM' | 'ADMIN' | 'USER'

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_complaint_id ON complaint_timeline(complaint_id);
CREATE INDEX idx_timeline_created_at ON complaint_timeline(created_at);
```

### Table: station_coordinates
A lookup table so complaints can be plotted on the heat map.
Pre-seed this with India's top 100 stations. Member 3 seeds this.

```sql
CREATE TABLE station_coordinates (
  station_code    VARCHAR(10) PRIMARY KEY,
  station_name    VARCHAR(100) NOT NULL,
  city            VARCHAR(100),
  state           VARCHAR(100),
  lat             NUMERIC(10, 7) NOT NULL,
  lng             NUMERIC(10, 7) NOT NULL,
  zone            VARCHAR(10)   -- NR, SR, WR, CR, ER, etc.
);
```

### Row-Level Security

```sql
-- Users can only see their own complaints
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "complaints_own_read" ON complaints
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
  );

CREATE POLICY "complaints_own_insert" ON complaints
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
  );

-- Timeline is readable by the complaint owner
ALTER TABLE complaint_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_owner_read" ON complaint_timeline
  FOR SELECT USING (
    complaint_id IN (
      SELECT id FROM complaints
      WHERE user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid())
    )
  );

-- Station coordinates are public (needed for heat map without login)
ALTER TABLE station_coordinates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stations_public_read" ON station_coordinates
  FOR SELECT USING (true);
```

---

## 4. API Contracts — Member 3 Endpoints

All endpoints live in services/api/src/routes/complaints.js
Base path: /api/complaints
All endpoints require Authorization: Bearer <jwt> EXCEPT the heat map
endpoints which are public.

Member 1 registers your router in index.js on Day 5.
For local testing, add it yourself to a local copy of index.js.

---

### POST /api/complaints
File a new complaint.

Request body:
```json
{
  "complaint_type": "AC_HEATING",
  "description": "AC not working in coach B4 since Mathura.",
  "photo_url": "https://storage.supabase.co/...",
  "train_number": "12951",
  "train_name": "Mumbai Rajdhani",
  "coach": "B4",
  "berth": "32",
  "station_code": "NDLS",
  "station_name": "New Delhi",
  "travel_date": "2026-06-14",
  "expo_push_token": "ExponentPushToken[...]"
}
```

Validations:
- complaint_type: must be one of the 8 valid types
- description: 10–500 characters
- station_code: 2–7 uppercase characters
- If photo_url provided: must be a valid URL string

Server-side logic:
1. Generate reference_number:
   ```javascript
   const date = new Date().toISOString().slice(0,10).replace(/-/g,'')
   const rand = Math.floor(10000 + Math.random() * 90000)
   const referenceNumber = `RS-${date}-${rand}`
   ```
2. Fetch station coords from station_coordinates table using station_code.
   If not found, set lat/lng to null (complaint still goes through).
3. If complaint_type === 'SAFETY': set priority = 'CRITICAL', status = 'IN_PROGRESS'
   else: set priority = 'NORMAL', status = 'SUBMITTED'
4. Insert into complaints table
5. Insert first timeline entry:
   ```json
   { "complaint_id": "...", "from_status": null, "to_status": "SUBMITTED",
     "changed_by": "USER", "note": "Complaint filed by passenger." }
   ```
   If SAFETY: insert two timeline entries (SUBMITTED + IN_PROGRESS auto-escalation)
6. Send Expo push notification to the user:
   "Your complaint RS-XXXXXX has been received. We'll keep you updated."
7. Return 201 with the created complaint + timeline

Response (201 Created):
```json
{
  "data": {
    "id": "uuid",
    "reference_number": "RS-20260614-84729",
    "complaint_type": "AC_HEATING",
    "status": "SUBMITTED",
    "priority": "NORMAL",
    "description": "AC not working in coach B4 since Mathura.",
    "train_number": "12951",
    "coach": "B4",
    "station_code": "NDLS",
    "created_at": "2026-06-14T08:23:11.000Z",
    "timeline": [
      { "to_status": "SUBMITTED", "changed_by": "USER",
        "note": "Complaint filed by passenger.", "created_at": "..." }
    ]
  },
  "message": "Complaint filed. Reference: RS-20260614-84729"
}
```

---

### GET /api/complaints
Get all complaints for the logged-in user.

Query params: ?status=SUBMITTED&type=AC_HEATING (optional filters)
Order: created_at DESC

Response (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "reference_number": "RS-20260614-84729",
      "complaint_type": "AC_HEATING",
      "status": "SUBMITTED",
      "priority": "NORMAL",
      "train_number": "12951",
      "coach": "B4",
      "station_code": "NDLS",
      "is_reopened": false,
      "created_at": "2026-06-14T08:23:11.000Z"
    }
  ],
  "message": "ok"
}
```

---

### GET /api/complaints/:id
Get one complaint with full timeline.

Response (200):
```json
{
  "data": {
    "id": "uuid",
    "reference_number": "RS-20260614-84729",
    "complaint_type": "AC_HEATING",
    "status": "RESOLVED",
    "description": "...",
    "photo_url": "...",
    "train_number": "12951",
    "coach": "B4",
    "reopen_deadline": "2026-06-17T08:23:11.000Z",
    "is_reopened": false,
    "timeline": [
      { "from_status": null, "to_status": "SUBMITTED",
        "note": "Complaint filed.", "created_at": "..." },
      { "from_status": "SUBMITTED", "to_status": "ACKNOWLEDGED",
        "note": "Received by NR zone.", "created_at": "..." },
      { "from_status": "ACKNOWLEDGED", "to_status": "RESOLVED",
        "note": "AC technician attended at Kota station.", "created_at": "..." }
    ]
  }
}
```

Response (404): { "error": "Complaint not found" }
Response (403): { "error": "Not authorized" }

---

### PATCH /api/complaints/:id/status
Update the status of a complaint. This is the ADMIN endpoint —
used by the admin dashboard to update complaint statuses.
Protected with admin-level auth check (check if the JWT user
is in the admin_users table — Member 1 creates this table).

Request body:
```json
{
  "new_status": "IN_PROGRESS",
  "note": "Assigned to NR zone maintenance team."
}
```

Validations:
- new_status must be valid transition:
  SUBMITTED → ACKNOWLEDGED → IN_PROGRESS → RESOLVED | REJECTED
  SUBMITTED → IN_PROGRESS (for safety complaints, skip acknowledged)
  RESOLVED → SUBMITTED (for reopen flow, handled separately)
- note: optional, max 500 chars

Server-side logic:
1. Fetch complaint, verify it exists
2. Validate status transition is legal
3. If new_status === 'RESOLVED': set reopen_deadline = NOW() + 72 hours
4. Update complaints table: status, updated_at
5. Insert new timeline entry
6. Send Expo push notification to expo_push_token stored on complaint:
   "Update on RS-XXXXXX: <new_status>"

Response (200): Updated complaint with new timeline entry

---

### POST /api/complaints/:id/reopen
Reopen a resolved complaint.

Validations:
- Complaint must be RESOLVED
- Current time must be before reopen_deadline
- User must be the owner

Server-side logic:
1. Verify all validations
2. Update complaint: status = 'SUBMITTED', is_reopened = true,
   reopen_count += 1, priority = 'HIGH'
3. Insert timeline entry: to_status = 'SUBMITTED', changed_by = 'USER',
   note = user's reopen description
4. Send push notification to admin via Expo (if admin push token stored)
5. Return updated complaint

Request body:
```json
{ "description": "The AC is still broken, nothing was done." }
```

Response (200): Updated complaint with new timeline

---

### GET /api/complaints/public/heatmap  (NO AUTH REQUIRED)
Returns aggregated complaint data for the public heat map.
Groups by station, counts by type.

Response (200):
```json
{
  "data": [
    {
      "station_code": "NDLS",
      "station_name": "New Delhi",
      "lat": 28.6419,
      "lng": 77.2194,
      "total_complaints": 47,
      "by_type": {
        "CLEANLINESS": 18,
        "AC_HEATING": 12,
        "STAFF": 8,
        "FOOD": 5,
        "SAFETY": 4
      },
      "last_30_days": [3, 2, 5, 4, 6, 3, 2, 4, 5, 3,
                       2, 1, 4, 6, 5, 3, 4, 5, 2, 3,
                       4, 5, 3, 2, 6, 4, 3, 5, 4, 2]
      -- 30 integers, one per day, newest last
    }
  ]
}
```

---

### GET /api/complaints/public/stats  (NO AUTH REQUIRED)
Overall platform stats shown on the heat map screen.

Response (200):
```json
{
  "data": {
    "total_complaints_today": 312,
    "total_complaints_this_month": 8943,
    "resolution_rate_percent": 67,
    "most_common_type": "CLEANLINESS",
    "most_complained_station": "NDLS"
  }
}
```

---

## 5. Push Notification Flow

Use Expo's push notification service. No FCM setup needed for MVP.

### Storing the push token
When the complaint is filed, the mobile app reads the device's Expo push
token and sends it in the POST /api/complaints request body.
It is stored on the complaint row itself (expo_push_token column).
This is simpler than storing it on the user — each complaint independently
tracks where to notify.

### Sending a notification from the backend
```javascript
// services/api/src/services/notificationService.js
const sendPushNotification = async (expoPushToken, title, body) => {
  if (!expoPushToken) return
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: {}
    })
  })
}
```

Call this inside the complaint filing endpoint and the status update endpoint.

### Getting the push token on mobile
```javascript
// Inside NewComplaintScreen.js — call this before submitting
import * as Notifications from 'expo-notifications'

const getExpoPushToken = async () => {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return null
  const token = await Notifications.getExpoPushTokenAsync()
  return token.data
}
```

---

## 6. Supabase Storage — Photo Upload

Bucket name: complaint-photos (create in Supabase dashboard, set to public
so the admin can view photos without auth)

Upload flow from mobile:
```javascript
// In PhotoUploader.js component
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../../services/supabaseClient'

const uploadPhoto = async (userId, complaintId) => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsEditing: true
  })
  if (!result.canceled) {
    const file = result.assets[0]
    const fileName = `${userId}/${complaintId}_${Date.now()}.jpg`
    const response = await fetch(file.uri)
    const blob = await response.blob()
    const { data } = await supabase.storage
      .from('complaint-photos')
      .upload(fileName, blob, { contentType: 'image/jpeg' })
    return supabase.storage.from('complaint-photos').getPublicUrl(fileName).data.publicUrl
  }
  return null
}
```

Important: photo upload is optional and must not block complaint submission.
If upload fails or user skips it, submit the complaint without photo_url.

---

## 7. Station Coordinates Seed Data

You must seed the station_coordinates table yourself.
Here are the top 20 stations to start — add more in your seed script.

```sql
INSERT INTO station_coordinates (station_code, station_name, city, state, lat, lng, zone)
VALUES
  ('NDLS', 'New Delhi',          'New Delhi',   'Delhi',       28.6419, 77.2194, 'NR'),
  ('MMCT', 'Mumbai Central',     'Mumbai',      'Maharashtra', 18.9688, 72.8195, 'WR'),
  ('MAS',  'Chennai Central',    'Chennai',     'Tamil Nadu',  13.0827, 80.2707, 'SR'),
  ('HWH',  'Howrah Junction',    'Howrah',      'West Bengal', 22.5839, 88.3424, 'ER'),
  ('SBC',  'Bengaluru City',     'Bengaluru',   'Karnataka',   12.9767, 77.5713, 'SWR'),
  ('ADI',  'Ahmedabad Junction', 'Ahmedabad',   'Gujarat',     23.0258, 72.6017, 'WR'),
  ('PUNE', 'Pune Junction',      'Pune',        'Maharashtra', 18.5196, 73.8553, 'CR'),
  ('LKO',  'Lucknow',           'Lucknow',     'UP',          26.8352, 80.9049, 'NR'),
  ('JP',   'Jaipur Junction',   'Jaipur',      'Rajasthan',   26.9124, 75.7873, 'NWR'),
  ('BPL',  'Bhopal Junction',   'Bhopal',      'MP',          23.2646, 77.4139, 'WCR'),
  ('PNBE', 'Patna Junction',    'Patna',        'Bihar',       25.6102, 85.1399, 'ECR'),
  ('GHY',  'Guwahati',          'Guwahati',    'Assam',       26.1842, 91.7511, 'NFR'),
  ('HYB',  'Hyderabad Deccan',  'Hyderabad',   'Telangana',   17.3924, 78.4709, 'SCR'),
  ('JAT',  'Jammu Tawi',        'Jammu',       'J&K',         32.7266, 74.8570, 'NR'),
  ('VSKP', 'Visakhapatnam',     'Vizag',       'AP',          17.6887, 83.2185, 'ECoR'),
  ('CNB',  'Kanpur Central',    'Kanpur',      'UP',          26.4498, 80.3319, 'NCR'),
  ('AGC',  'Agra Cantt',        'Agra',        'UP',          27.1592, 77.9858, 'NCR'),
  ('UDZ',  'Udaipur City',      'Udaipur',     'Rajasthan',   24.5718, 73.6791, 'NWR'),
  ('CSTM', 'Mumbai CST',        'Mumbai',      'Maharashtra', 18.9401, 72.8357, 'CR'),
  ('SC',   'Secunderabad',      'Hyderabad',   'Telangana',   17.4344, 78.5013, 'SCR');
```

---

## 8. Mobile Screen Architecture

### Navigation inside Complaints tab
```
ComplaintsTab (bottom tab)
└── ComplaintsStack (stack navigator)
    ├── ComplaintsHomeScreen       (default — My Complaints list + New + Map)
    ├── NewComplaintScreen         (the filing form)
    ├── ComplaintDetailScreen      (timeline + reopen button)
    ├── ReopenScreen               (reopen description form)
    └── PublicHeatMapScreen        (Leaflet/MapView map, no login needed)
```

### Data flow
```
RailSaathiContext (Member 1)
        │
        │ activeJourney.train_number, .coach, .berth,
        │ activeJourney.boarding_station
        ↓
NewComplaintScreen
        │
        │ POST /api/complaints (with pre-filled journey data)
        ↓
complaintService.js
        │
        │ returns complaint with reference_number
        ↓
ComplaintsHomeScreen (list refreshes)
        │
        │ GET /api/complaints
        ↓
ComplaintDetailScreen
        │
        │ GET /api/complaints/:id (with timeline)
        │ POST /api/complaints/:id/reopen (if applicable)
        ↓
ReopenScreen
```

---

## 9. Local Development Setup

### Run the backend locally
```bash
cd railsaathi/services/api
# Ensure .env has SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
node src/index.js
# Your routes: http://localhost:3000/api/complaints/...
```

### Test endpoints without the mobile app

```bash
TOKEN="eyJ..."   # get from Member 1 or mock

# 1. File a complaint
curl -X POST http://localhost:3000/api/complaints \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "complaint_type": "AC_HEATING",
    "description": "AC not working in coach B4 since Mathura.",
    "train_number": "12951",
    "coach": "B4",
    "berth": "32",
    "station_code": "NDLS",
    "station_name": "New Delhi",
    "travel_date": "2026-06-14"
  }'

# 2. Get all my complaints
curl http://localhost:3000/api/complaints \
  -H "Authorization: Bearer $TOKEN"

# 3. Get public heat map (no auth)
curl http://localhost:3000/api/complaints/public/heatmap

# 4. Update status (admin action — for testing, skip admin check)
curl -X PATCH http://localhost:3000/api/complaints/<id>/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "new_status": "ACKNOWLEDGED", "note": "Received by NR zone." }'
```

### Temporarily mock context for mobile testing
```javascript
// Top of NewComplaintScreen.js — remove before Day 5 integration
const activeJourney = {
  train_number: '12951',
  train_name: 'Mumbai Rajdhani',
  coach: 'B4',
  berth: '32',
  boarding_station: 'NDLS'
}
const currentUser = { id: 'test-uuid' }
// Replace with:
// const { activeJourney, currentUser } = useRailSaathi()
```

---

## 10. Post-Plan Architectural Refinements

### Station vs. Train Separation Flow
To solve the grievance ambiguity, filing flows were partitioned:
- **Regarding Station**: Bypasses journey details. Demands `station_code` (resolves geographical coordinates via `station_coordinates` matching), accepts an optional `Platform / Location` input, which gets prepended to the description string as `[Platform <number>] <description>` on database insert.
- **Regarding Train**: Requires 10-digit PNR and 5-digit Train Number. When a PNR is entered, it triggers an inline request to `/api/journeys/pnr` (auth protected), which maps train name, coach, and travel date. For train-targeted grievances, the database `station_code` defaults to `'UNKNOWN'` to prevent false geographic mapping on station heatmaps.

### Schematic Polyline Corridor Mapping
Admin dashboard mapping (`ComplaintMap.jsx`) was refactored:
- **Corridor Traversal**: Queries `/api/complaints/public/train-routes` to retrieve route metrics.
- **Ocean Safety Bounding**: Migrated from Catmull-Rom splines to Quadratic Bezier curves. A strict 2.5% lateral coordinate offset restricts corridor lines to land and prevents marine route overshoots.
- **Schematic Mode**: Disabled OpenRailwayMap tracking tiles. The dashboard uses clean schematic corridor lines on OSM tiles with active highlight selection (weight dynamically increases from `2px` to `7px` for selected routes and dims unselected routes to `1px` with `0.03` opacity).
