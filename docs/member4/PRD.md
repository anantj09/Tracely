# Product Requirements Document (PRD)
# Member 4 — Real-Time Safety & Incident System
# FAR AWAY 2026 — RailSaathi Platform

---

## 1. Purpose & Ownership

Member 4 owns the entire safety layer of RailSaathi. This means: the backend
routes, the database tables, the mobile screens under the Safety tab, and the
real-time alert pipeline that fires when a passenger presses SOS.

You work independently from Members 2, 3, and 5. You depend on Member 1
only for three things: the shared apiClient.js utility, the verifyToken
middleware, and the RailSaathiContext which gives you the current user's
profile, emergency contacts, and active journey. Both are available by
end of Day 2.

Your module solves two problems that kill and terrorise real people every year.
First: women and vulnerable passengers have no fast, context-aware way to
signal danger on a moving train. Second: 11,000+ unmanned level crossings
kill hundreds of people annually with zero digital warning infrastructure.
You build the system that closes both gaps — a one-tap SOS that sends a
context-rich alert to the right authority with exact train, coach, and berth
data, and a crowd-sourced hazard map that surfaces dangerous crossings and
infrastructure failures in real time.

The most important demo moment in the entire hackathon is yours. When a
judge watches you press SOS on a phone and sees the alert arrive on the
RPF dashboard screen within 3 seconds — with train number, coach, and berth
already filled in — that is the moment the room understands why this platform
exists.

---

## 2. What You Are Building

### 2.1 One-Tap SOS with Three Simultaneous Actions
A persistent SOS button always visible on the home screen and inside the
Safety tab. When pressed, three things happen simultaneously:

Action 1 — POST alert to your backend with full journey context (train,
coach, berth, GPS coordinates, user identity). This populates the RPF
alert dashboard in real time.

Action 2 — SMS sent to up to 3 pre-registered emergency contacts with
the user's GPS coordinates and train details via Twilio free tier.

Action 3 — 60-second audio recording begins and uploads to Supabase
Storage as evidence.

### 2.2 Simulated RPF Alert Dashboard
A simple web screen that shows incoming SOS alerts in real time.
When an alert fires, it appears on this screen within 3 seconds with:
user name (masked to initials for privacy), train number, coach, berth,
alert type, GPS location link, and a timestamp.
This is your demo prop — one phone, one laptop showing the dashboard.

### 2.3 Women's Compartment Alert
Women passengers can flag an illegal male occupant in the ladies'
compartment. The alert posts to the RPF dashboard with a
COMPARTMENT_VIOLATION label. No audio recording — just a fast flag.

### 2.4 Crowd-Sourced Hazard Reporting
Any user can report a safety hazard at their current GPS location:
unmanned crossing, broken platform, poor lighting, flood-prone area.
Stored and displayed on a public safety incident map.

### 2.5 Safety Incident Map (Public)
A map showing all reported hazards and anonymised SOS/compartment
incidents. No login required. Color-coded by severity and type.

### 2.6 Trusted Contacts Setup
Inside the Safety tab, users register up to 3 trusted contacts
(name + phone number). These receive SMS when SOS is triggered.
Saved via PATCH /api/users/me (Member 1's endpoint).

---

## 3. What You Are NOT Building
- The general complaint system (Member 3)
- The Tatkal module (Member 2)
- The station amenity system (Member 5)
- A real biometric scanner (pitch-level feature only)
- A full two-way RPF communication channel
- Payment flows of any kind
- The OTP login or user profile (Member 1)
- The main admin dashboard UI (Member 1 owns that)

---

## 4. Target Users

### Citizen-Facing
- Women passengers on overnight or long-distance trains
- Any passenger facing physical danger or harassment on board
- Any person near a railway infrastructure hazard
- General public viewing the safety map (no login required)

### Authority-Facing
- RPF (Railway Protection Force) officers at stations
- Station Masters needing real-time incident awareness
- Zone safety officers tracking incident patterns

---

## 5. Core MVP Features

### Feature 1 — SOS Button
Always visible. On the Safety tab home screen and exported as a
component for Member 1 to place on the main home screen.
On press: confirmation dialog → three simultaneous actions.
After confirm: button shows "SOS ACTIVE" with 60-second countdown.

### Feature 2 — SOS Alert Pipeline (Three Actions)
Action 1: POST /api/safety/sos → writes to safety_events table →
Supabase real-time fires → RPF dashboard updates within 3 seconds.
Action 2: Twilio SMS to each emergency contact from currentUser.
Action 3: 60-second audio via Expo Audio → upload to sos-audio bucket.

### Feature 3 — Women's Compartment Alert
Fast path: pre-filled train/coach from activeJourney → select issue
type → one tap → RPF dashboard COMPARTMENT_VIOLATION card.

### Feature 4 — Hazard Report
GPS auto-fill → hazard type → optional description + photo →
Submit → hazard marker on safety map.

### Feature 5 — RPF Alert Dashboard (Web)
Supabase real-time subscription → live alert cards → sound on new alert
→ resolve button. Lives as a route in apps/dashboard/ or standalone page.

### Feature 6 — Safety Incident Map (Public, No Login)
MapView with SOS (red), compartment (orange), hazard (yellow) markers.
Tap marker: anonymised details. Accessible without auth.

---

## 6. User Flows

### Flow 1 — SOS
Any screen → SOS button → Confirm dialog → Three actions fire →
"SOS Active" countdown → RPF dashboard alert in 3 seconds

### Flow 2 — Compartment Alert
Safety tab → Compartment Alert → Pre-filled train/coach →
Select issue → Send → RPF dashboard card

### Flow 3 — Hazard Report
Safety tab → Report Hazard → GPS auto-fill → Type + description →
Submit → Marker on map

### Flow 4 — Safety Map
Safety tab → Safety Map → Public map, no login → Tap marker: details

### Flow 5 — Trusted Contacts
Safety tab → Trusted Contacts → Add/edit up to 3 contacts →
PATCH /api/users/me saves them

---

## 7. Success Criteria for Demo Day
- SOS → RPF dashboard alert within 3 seconds (rehearse 10 times)
- Alert shows correct train, coach, berth from activeJourney
- SMS arrives on pre-registered test number within 30 seconds
- Audio recording starts immediately after SOS confirm
- Compartment alert end-to-end in under 10 seconds
- Hazard report filed and appears on map
- Safety map loads without login with seeded markers
- RPF resolve button works
- Admin dashboard overview shows safety incident count
