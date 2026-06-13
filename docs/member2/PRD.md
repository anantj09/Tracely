# Product Requirements Document (PRD)
# Member 2 — Tatkal Verified Booking Ecosystem
# FAR AWAY 2026 — RailSaathi Platform

---

## 1. Purpose & Ownership

Member 2 owns the Tatkal module end-to-end: the backend routes, the database
tables, and the mobile screens that live under the Tatkal tab. You work
independently from Members 3, 4, and 5. You depend on Member 1 only for two
things: the shared apiClient.js utility and the RailSaathiContext which gives
you the current user's profile. Both are available by end of Day 2.

Your module solves the ₹1,500 crore black market problem. Tout bots beat
genuine passengers to Tatkal tickets because bots are pre-authenticated and
faster. Your system makes legitimate passengers faster than bots by
pre-filling and pre-scheduling their booking at exactly 10:00:00 AM. You also
add a biometric-verified identity lock, an urgency declaration queue, and a
zero-profit ticket surrender market.

---

## 2. What You Are Building

### 2.1 Tatkal Pre-Fill and Lightning Execution Engine
Users fill in all journey and passenger details up to 24 hours before Tatkal
opens. At exactly 10:00:00 AM (AC) or 11:00:00 AM (non-AC), your backend
fires the pre-filled booking request. For the MVP, this is a simulation —
the request is logged and a confirmation is shown. The demo shows the countdown
hitting zero, the fire event triggering, and a confirmation screen appearing.
You pitch the live IRCTC integration as the production path.

### 2.2 Biometric Identity Lock
Each verified user can only make one Tatkal booking per window (no hoarding).
The account holder must be in the passenger list (no proxy booking for touts).
This is enforced at the database level with a unique constraint and at the
API level with a validation check.

### 2.3 Urgency Declaration Flow
Users declare a critical travel reason (medical, bereavement, official duty)
and optionally upload a document. The system calculates an urgency score.
The backend uses this score to prioritize requests within a dedicated urgency
sub-quota of the Tatkal window.

### 2.4 Ticket Surrender and Reallocation Market
If a confirmed Tatkal passenger needs to cancel, they list their ticket for
surrender. Another verified user can request it. The system matches them and
coordinates the refund-and-rebook flow. No money changes hands privately.

### 2.5 Tatkal Status Dashboard (Admin view)
Feeds data into Member 1's admin dashboard: live Tatkal request queue,
urgency requests pending, surrender listings, and anti-tout flags.

---

## 3. What You Are NOT Building
- Actual IRCTC API integration (simulate the booking fire)
- Payment processing of any kind
- The OTP login or user profile (Member 1 owns that)
- Push notifications infra (you can trigger them if Member 1 sets up FCM, but
  do not build the notification infrastructure yourself)
- Any screen outside the Tatkal tab

---

## 4. Target Users
- Any Indian rail passenger planning urgent travel
- Particularly: travellers with genuine emergencies who currently lose
  to tout bots in the 90-second Tatkal window

---

## 5. Core MVP Features

### Feature 1 — Tatkal Pre-Fill Form
Fields pre-populated from RailSaathiContext (currentUser):
- Passenger name (from profile)
- Age, gender (user fills once, saved to their profile)
- From station, To station, Date, Class, Train preference
- Payment method intent (UPI ID stored as preference, not charged in MVP)

Fields the user fills fresh each time:
- Travel urgency toggle: Yes / No
- If Yes: urgency category + optional document upload

### Feature 2 — Countdown Timer and Scheduled Fire
- Screen shows a live countdown to 10:00:00 AM
- At T-0: backend scheduled job fires the booking simulation
- Confirmation screen shows: Request Fired, timestamp, simulated PNR
- Status polling: screen polls GET /api/tatkal/:id every 5 seconds
  after firing to show updated status

### Feature 3 — Urgency Score Calculation
Score 1–10 computed by backend based on:
- Declared reason (medical = 9, bereavement = 8, official = 7, personal = 5)
- Document uploaded (yes = +1)
- Account age (verified > 6 months = +0.5)
- Past booking history (first-time user flag = neutral, past tout flag = -5)

### Feature 4 — Anti-Hoarding Lock
Database constraint: one active Tatkal request per user per day.
API validation: if user already has a Tatkal request for today, reject with
error "You already have an active Tatkal request for today."
Account holder mandate: the booking request must include the account holder's
name in the passenger list. API validates this before accepting the request.

### Feature 5 — Surrender Market
- Confirmed booking holders can list for surrender: POST /api/tatkal/surrender
- Other users can view surrender listings and request one: GET /api/tatkal/surrenders
- System matches requester to surrendered ticket
- Both parties see the match status
- In production: this triggers IRCTC refund API. In MVP: logged and shown in UI.

---

## 6. User Flows

### Flow 1 — Normal Tatkal Pre-Fill
Tatkal tab → Pre-fill form (details pre-loaded from profile) →
Confirm passenger list → Set urgency (optional) → Submit pre-fill →
Countdown screen → At 10am: firing animation → Confirmation screen

### Flow 2 — Urgency Declaration
Pre-fill form → Toggle urgency ON → Select reason (Medical / Bereavement / Official) →
Optional: upload document → Urgency score shown → Submit

### Flow 3 — Surrender Listing
My Bookings screen → Select a confirmed Tatkal booking → Tap Surrender →
Confirm → Listing appears in Surrender Market →
Another user requests it → Match notification

### Flow 4 — Requesting a Surrendered Ticket
Surrender Market → See available tickets (route, class, date) →
Request → Confirmation pending → Match confirmed

---

## 7. Success Criteria for Demo Day
- Pre-fill form loads with user details already populated (from context)
- Countdown timer is accurate and fires at correct time (or a demo button
  triggers a simulated fire for the presentation)
- Confirmation screen appears after fire with realistic PNR and timestamp
- Urgency flow: upload a document, see urgency score calculated
- Admin dashboard shows the Tatkal queue with urgency scores
- Anti-hoarding: attempting two requests for the same day shows error
- Surrender market shows at least 3 listings (seeded) and request flow works
