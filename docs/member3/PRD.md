# Product Requirements Document (PRD)
# Member 3 — Grievance & Complaint System
# FAR AWAY 2026 — RailSaathi Platform

---

## 1. Purpose & Ownership

Member 3 owns the entire grievance and complaint layer of RailSaathi.
This means: the backend routes, the database tables, the mobile screens
under the Complaints tab, and the push notification triggers that fire
when a complaint status changes.

You work independently from Members 2, 4, and 5. You depend on Member 1
only for three things: the shared apiClient.js utility, the verifyToken
middleware, and the RailSaathiContext which gives you the current user's
profile and active journey. Both are available by end of Day 2.

Your module solves the grievance black hole — the situation where 10,000+
complaints per day are filed on RailMadad, 70% get marked "resolved"
without any real action, and passengers have no way to track, reopen,
or verify resolution. You build the system that makes complaints contextual
(pre-filled from the active journey), trackable (live status with push
notifications), and publicly accountable (a heat map that any citizen can
see and any Railway official cannot hide from).

---

## 2. What You Are Building

### 2.1 One-Tap Contextual Complaint Filing
Because your module reads from RailSaathiContext, your complaint form
already knows the user's train number, coach, berth, and travel date.
The user does not type any of these. They only select the complaint
type, describe the issue in one sentence, and optionally attach a photo.
The entire flow takes under 20 seconds.

### 2.2 Complaint Status Tracker
Every complaint gets a reference number and a status screen. Status
flows: SUBMITTED → ACKNOWLEDGED → IN_PROGRESS → RESOLVED or REJECTED.
Push notifications fire on every status change. Users can view the
full history of a complaint including timestamps of each status change.

### 2.3 Complaint Reopen Flow
If a complaint is marked RESOLVED but the issue persists, the user can
reopen it within 72 hours. A reopened complaint gets escalated priority
in the admin queue. After 72 hours, the complaint is locked.

### 2.4 Public Complaint Heat Map
Every complaint filed — anonymised, no names — is plotted on a map of
India by station and by route segment. Any citizen can see it. It shows:
complaint density by station, complaint type breakdown (AC, cleanliness,
staff, food, safety), and a trend line over the last 30 days. This is
accountability through radical transparency.

### 2.5 Admin Complaint Dashboard Feed
Feeds real-time data into Member 1's admin dashboard: complaints by
zone, by complaint type, by resolution rate, and a live incoming feed
of the last 50 complaints. Station masters see only their station.
Zone officers see their zone. Super admins see everything.

---

## 3. What You Are NOT Building
- The SOS / safety alert system (Member 4)
- Any actual integration with RailMadad's backend
  (you build your own complaint store; pitch RailMadad API sync as the production path)
- The Tatkal or station amenity screens
- Payment flows of any kind
- The OTP login or user profile (Member 1)
- The push notification infrastructure (you trigger it via a service,
  but Member 1 sets up FCM credentials — coordinate on Day 2)

---

## 4. Target Users

### Citizen-Facing
- Any train passenger with an active journey who wants to report an issue
- Also: any citizen who wants to view the public complaint heat map
  (no login required for the map view)

### Government-Facing (Admin Dashboard via Member 1)
- Station Masters: see complaints filed at their station
- Zone Officers: see complaints across their zone
- RPF: see safety-adjacent complaints (staff behaviour, harassment)
- Ministry analysts: see nationwide patterns and resolution rates

---

## 5. Core MVP Features

### Feature 1 — Complaint Categories
Eight complaint types, each with a pre-defined icon and colour:

| Code         | Label              | Colour  |
|--------------|--------------------|---------|
| CLEANLINESS  | Dirty Coach/Station| Orange  |
| AC_HEATING   | AC / Heating Issue | Blue    |
| STAFF        | Staff Behaviour    | Red     |
| FOOD         | Food Quality       | Yellow  |
| SAFETY       | Safety Concern     | Dark Red|
| OVERCROWDING | Overcrowding       | Purple  |
| AMENITY      | Broken Amenity     | Grey    |
| OTHER        | Other              | Teal    |

Note: SAFETY complaints get auto-escalated (status goes directly to
IN_PROGRESS, not ACKNOWLEDGED, and an alert fires to the admin dashboard
in real time).

### Feature 2 — Contextual Pre-Fill
From RailSaathiContext.activeJourney, your form reads:
- train_number, train_name
- coach, berth
- boarding_station, destination_station
- travel_date

The user sees these pre-filled and non-editable in the form.
If there is no active journey, the passenger filing flow on both the web portal and mobile app splits into two modes:
- **Regarding Station**: Requires only the `Station Code`. Provides an optional `Platform / Location` text input.
- **Regarding Train**: Requires a `PNR Number` (10 digits) and `Train Number` (5 digits). When the user verifies their PNR, it queries `/api/journeys/pnr` to fetch confirmed travel details (train number, name, coach, date) to auto-fill the form fields. Provides optional `Coach` and `Travel Date` inputs.

### Feature 3 — Photo Attachment
Optional. One photo per complaint. Stored in Supabase Storage bucket
complaints-photos. If upload fails, complaint is still submitted without
the photo — never block the submission on upload failure.

### Feature 4 — Reference Number
Every complaint gets a human-readable reference: RS-<YYYYMMDD>-<5 digit random>.
Example: RS-20260614-84729
This is shown on the confirmation screen and used for all future status lookups.

### Feature 5 — Status Timeline
Each complaint has a timeline array — every status change is recorded
with: new status, timestamp, and an optional note from the resolver.
The user sees this as a vertical timeline on the complaint detail screen.

### Feature 6 — Push Notifications on Status Change
When a complaint's status is updated (by admin or by the system),
a push notification is sent to the complainant:
"Your complaint RS-20260614-84729 has been updated: IN_PROGRESS"
Use Expo Push Notifications (works without FCM setup, uses Expo's service).
Store the Expo push token on the user's complaint record at filing time.

### Feature 7 — Reopen Flow
Within 72 hours of a complaint being marked RESOLVED:
- User sees "Reopen" button on the complaint detail screen
- Tapping opens a text field: "What is still wrong?"
- Submitting changes status back to SUBMITTED with is_reopened = true
  and increments reopen_count
- Reopened complaints get a visual badge in the admin queue

### Feature 8 — Public Heat Map (No Login Required)
A screen in the app (and a page on the admin dashboard) that shows
all complaints anonymised on a map. No login needed to view this.
Station markers sized by complaint count. Tap a station: see the
breakdown by complaint type and a 30-day sparkline of complaint volume.

---

## 6. User Flows

### Flow 1 — File a Complaint (With Active Journey)
Complaints tab → Tap "New Complaint" →
Form loads: train/coach/berth pre-filled →
Select complaint type (one tap) →
Write one-line description →
Optional: attach photo →
Tap Submit →
Confirmation screen: reference number RS-XXXXXXX-XXXXX →
Push notification sent to user: "Complaint received"

### Flow 2 — File a Complaint (No Active Journey)
Complaints tab → Tap "New Complaint" →
Manual entry: train number, station, date, coach →
Rest of flow same as Flow 1

### Flow 3 — Track a Complaint
Complaints tab → My Complaints list →
Tap a complaint →
Detail screen: timeline of status changes →
If RESOLVED and within 72h: "Reopen" button visible

### Flow 4 — Reopen a Complaint
Complaint detail → Tap "Reopen" →
Text field: describe the ongoing issue →
Submit → Status changes to SUBMITTED, is_reopened = true →
Push notification: "Your complaint has been reopened and escalated"

### Flow 5 — View Public Heat Map
Complaints tab → Tap "Public Map" →
Map of India with station markers →
No login required →
Tap a station: see complaint breakdown

---

## 7. Success Criteria for Demo Day
- Complaint filing completes in under 20 seconds on a real phone
- Train/coach/berth pre-filled correctly from the active journey
- Reference number appears on confirmation screen
- My Complaints list shows all complaints with current status
- Status timeline shows each change with timestamp
- Demo: admin marks a complaint IN_PROGRESS → push notification appears
  on the phone within 5 seconds
- Public heat map loads with at least 20 station markers (seeded data)
- Tapping a station shows the complaint breakdown
- Admin dashboard shows live complaint feed and heat map
- SAFETY complaint: auto-escalated status visible in admin queue
