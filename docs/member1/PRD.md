# Product Requirements Document (PRD)
# Member 1 — Spine, Identity Layer & Admin Dashboard
# FAR AWAY 2026 — RailSaathi Platform

---

## 1. Purpose & Ownership

Member 1 owns the entire foundation of RailSaathi. Every other member's module
depends on the contracts this module exposes. You are not building a feature —
you are building the platform. Your job is to finish Days 1–2 so that Members
2–5 can integrate on Day 3 without waiting.

This module is also the integration owner. On Day 5, you will be the one who
receives all other modules and wires them into the final deployed application.

---

## 2. What You Are Building

### 2.1 Unified Passenger Identity (Auth + Profile)
A single source of truth for every user on the platform. Phone number + OTP
login. One profile object that every other module reads from via a shared
contract (described in the Architecture document).

### 2.2 PNR Journey Aggregator
Pulls live train data from public NTES / IRCTC PNR APIs and stores it in the
user's journey history. Other modules read from this to pre-fill their forms —
the complaint module reads train+coach, the safety module reads location+berth,
the Tatkal module reads passenger details.

### 2.3 Home Screen (App Shell)
The container screen that other modules render inside. Shows the active journey
card at the top, and feature tiles below (Tatkal, Complaint, Safety, Demand,
Station). You build the shell; other modules plug their screens into the
React Navigation stack you define.

### 2.4 Government Admin Dashboard (Web)
A separate React web app deployed on Vercel. Shows live aggregated data from
all modules: complaint heat map, safety incident map, demand forecast, Tatkal
urgency queue. Each module pushes data to shared Supabase tables; this
dashboard reads from them.

---

## 3. What You Are NOT Building
- The complaint filing screen (Member 3)
- The SOS button (Member 4)
- The Tatkal pre-fill form (Member 2)
- The demand / amenity screens (Member 5)
- Any payment processing
- Any direct IRCTC API integration requiring API keys (simulate with mock data)

---

## 4. Target Users

### Citizen-Facing
- Any Indian railway passenger with a smartphone and phone number
- Assumed: basic literacy, 4G connection, Android or iOS

### Government-Facing (Admin Dashboard)
- Railway Zone officers
- Station Masters
- RPF (Railway Protection Force) supervisors
- Ministry of Railways analysts

---

## 5. Core MVP Features

### Feature 1 — Phone OTP Authentication
- User enters 10-digit Indian mobile number
- OTP sent via Twilio / Firebase Auth (free tier)
- On first login: profile creation screen (name, emergency contacts x3)
- On subsequent logins: go directly to home screen
- Session persists using JWT stored in AsyncStorage (React Native)

### Feature 2 — User Profile Object
The profile is the spine. It contains:
```
id                  UUID (primary key)
phone               string (unique, indexed)
name                string
emergency_contacts  string[] (max 3 phone numbers)
preferred_class     enum: SL | 3A | 2A | 1A | GEN
frequent_routes     string[] (derived from journey history)
created_at          timestamp
updated_at          timestamp
```
Profile is readable and writable via a REST API. All other modules call
GET /api/users/:id to read the profile. No module writes to the profile
except Member 1's own endpoints.

### Feature 3 — PNR Lookup and Journey Store
- User can enter a PNR on the home screen
- Your backend calls the public PNR status API and parses:
  train number, train name, boarding station, destination, coach, berth,
  travel date, current status (confirmed / RAC / WL)
- Stores in journeys table linked to user
- Home screen displays the most recent/upcoming journey as a card

### Feature 4 — Navigation Shell (React Native)
- Bottom tab navigator with 5 tabs:
  Home | Tatkal | Complaints | Safety | Station
- Each tab is a placeholder screen on Day 1
  that Members 2–5 replace with their screens
- Shared context provider that exposes: currentUser, activeJourney
- Any screen can call useRailSaathi() to get user + journey context

### Feature 5 — Admin Dashboard (React Web)
Pages:
1. Overview — 4 KPI cards: total complaints today, active SOS alerts,
   demand surge warnings, Tatkal urgency requests
2. Complaint Map — Leaflet map with complaint density by station/route
3. Safety Incidents — Table + map of SOS events and compartment alerts
4. Demand Forecast — Bar chart of travel intent by route for next 7 days
5. Station Status — Table of amenity reports by station

Data for all these pages comes from Supabase tables that other members
write to. You just read and display.

---

## 6. User Flows

### Flow 1 — First Time Login
App open → Enter phone → Receive OTP → Enter OTP →
Profile setup screen (name + emergency contacts) → Home screen

### Flow 2 — Returning User
App open → Auto-login via stored JWT → Home screen with active journey card

### Flow 3 — Add PNR
Home screen → Tap "Add Journey" → Enter PNR →
Backend fetches status → Journey card appears on home screen

### Flow 4 — Admin Dashboard
Admin opens web URL → Logs in with email/password (Supabase Auth) →
Overview page → Navigates to any module's data view

---

## 7. Success Criteria for Demo Day
- Login flow works end-to-end on a real phone in under 30 seconds
- PNR lookup returns real train data for any valid PNR
- Home screen shows the active journey card with train name, coach, berth
- All 5 tabs are present and navigable (other members' screens load inside them)
- Admin dashboard shows complaint map, safety map, and demand chart
  (seeded with synthetic data if needed)
- Admin dashboard is live on a public Vercel URL
