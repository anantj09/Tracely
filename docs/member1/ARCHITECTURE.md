# Architecture & Design Document
# Member 1 — Spine, Identity Layer & Admin Dashboard
# FAR AWAY 2026 — RailSaathi Platform

---

## 1. Technology Stack

| Layer              | Technology                        | Reason                              |
|--------------------|-----------------------------------|-------------------------------------|
| Mobile App         | React Native (Expo managed)       | JS team, cross-platform, fast demo  |
| Web Dashboard      | React + Vite                      | Fast build, deploys free on Vercel  |
| Backend API        | Node.js + Express                 | JS everywhere, team knows it        |
| Database           | Supabase (PostgreSQL)             | Free tier, real-time, auth built-in |
| OTP Auth           | Firebase Authentication           | Free, handles OTP SMS globally      |
| Deployment (API)   | Render.com (free web service)     | Free tier, auto-deploy from GitHub  |
| Deployment (Web)   | Vercel                            | Free tier, instant previews         |
| File Storage       | Supabase Storage                  | Free 1GB, same project              |
| Env Management     | .env files + Render env vars      | Standard practice                   |

---

## 2. Repository Structure

This is a monorepo. ONE GitHub repository for the entire team.
Member 1 sets this up on Day 1 and all members clone it.

```
railsaathi/
├── apps/
│   ├── mobile/                  ← React Native (Expo) — Member 1 owns shell
│   │   ├── src/
│   │   │   ├── navigation/      ← Tab navigator, stack navigator
│   │   │   ├── context/         ← RailSaathiContext (shared user+journey)
│   │   │   ├── screens/
│   │   │   │   ├── auth/        ← Member 1: Login, OTP, ProfileSetup
│   │   │   │   ├── home/        ← Member 1: HomeScreen, JourneyCard
│   │   │   │   ├── tatkal/      ← Member 2 drops files here
│   │   │   │   ├── complaints/  ← Member 3 drops files here
│   │   │   │   ├── safety/      ← Member 4 drops files here
│   │   │   │   └── station/     ← Member 5 drops files here
│   │   │   ├── services/        ← API call functions (apiClient.js)
│   │   │   ├── hooks/           ← useRailSaathi(), usePNR()
│   │   │   └── constants/       ← API_BASE_URL, colors, etc.
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── dashboard/               ← React + Vite web app — Member 1 owns all
│       ├── src/
│       │   ├── pages/           ← Overview, Complaints, Safety, Demand, Station
│       │   ├── components/      ← Map, Chart, KPICard, Table
│       │   └── services/        ← supabaseClient.js
│       └── package.json
│
├── services/
│   └── api/                     ← Express backend — Member 1 owns core
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.js      ← Member 1
│       │   │   ├── users.js     ← Member 1
│       │   │   ├── journeys.js  ← Member 1
│       │   │   ├── tatkal.js    ← Member 2 adds this file
│       │   │   ├── complaints.js← Member 3 adds this file
│       │   │   ├── safety.js    ← Member 4 adds this file
│       │   │   └── amenities.js ← Member 5 adds this file
│       │   ├── middleware/
│       │   │   ├── auth.js      ← JWT verification middleware (Member 1)
│       │   │   └── errorHandler.js
│       │   ├── db/
│       │   │   └── supabaseClient.js ← Single shared DB client (Member 1)
│       │   └── index.js         ← Express app entry point (Member 1)
│       └── package.json
│
├── supabase/
│   └── migrations/              ← All SQL migration files
│       ├── 001_core_schema.sql  ← Member 1: users, journeys tables
│       ├── 002_tatkal.sql       ← Member 2 adds this
│       ├── 003_complaints.sql   ← Member 3 adds this
│       ├── 004_safety.sql       ← Member 4 adds this
│       └── 005_amenities.sql    ← Member 5 adds this
│
├── docs/                        ← All member plan documents live here
└── README.md
```

---

## 3. Database Schema — Member 1 Tables

Member 1 creates these tables. They are the foundation. All other tables
reference users.id as a foreign key.

### Table: users
```sql
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone               VARCHAR(15) UNIQUE NOT NULL,
  name                VARCHAR(100),
  firebase_uid        VARCHAR(128) UNIQUE,
  emergency_contacts  TEXT[] DEFAULT '{}',
  preferred_class     VARCHAR(5) DEFAULT 'SL',
  frequent_routes     TEXT[] DEFAULT '{}',
  is_verified         BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
```

### Table: journeys
```sql
CREATE TABLE journeys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pnr                 VARCHAR(10) NOT NULL,
  train_number        VARCHAR(10),
  train_name          VARCHAR(100),
  boarding_station    VARCHAR(10),
  destination_station VARCHAR(10),
  travel_date         DATE,
  coach               VARCHAR(10),
  berth               VARCHAR(10),
  class               VARCHAR(5),
  status              VARCHAR(20), -- CONFIRMED, RAC, WL
  raw_api_response    JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journeys_user_id ON journeys(user_id);
CREATE INDEX idx_journeys_pnr ON journeys(pnr);
CREATE INDEX idx_journeys_travel_date ON journeys(travel_date);
```

### Table: admin_users (for dashboard login)
```sql
CREATE TABLE admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  role        VARCHAR(20) DEFAULT 'viewer', -- viewer | zone_officer | superadmin
  zone        VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. API Contracts — Member 1 Endpoints

Base URL: https://railsaathi-api.onrender.com/api

All protected endpoints require header: Authorization: Bearer <jwt_token>

### POST /api/auth/verify-otp
Request:
```json
{ "phone": "9876543210", "firebase_id_token": "eyJ..." }
```
Response:
```json
{
  "token": "eyJ...",
  "user": { "id": "uuid", "phone": "9876543210", "name": null, "is_new": true }
}
```

### POST /api/auth/complete-profile
Request:
```json
{ "name": "Raj Kumar", "emergency_contacts": ["9000000001", "9000000002"] }
```
Response:
```json
{ "user": { "id": "uuid", "name": "Raj Kumar", ... } }
```

### GET /api/users/me
Response:
```json
{
  "id": "uuid",
  "phone": "9876543210",
  "name": "Raj Kumar",
  "emergency_contacts": ["9000000001"],
  "preferred_class": "SL",
  "active_journey": { ...journey object... }
}
```

### POST /api/journeys/pnr
Request:
```json
{ "pnr": "1234567890" }
```
Response:
```json
{
  "pnr": "1234567890",
  "train_number": "12951",
  "train_name": "Mumbai Rajdhani",
  "boarding_station": "NDLS",
  "destination_station": "MMCT",
  "travel_date": "2026-06-15",
  "coach": "B4",
  "berth": "32",
  "class": "3A",
  "status": "CONFIRMED"
}
```

### GET /api/journeys
Response: Array of journey objects for the logged-in user

---

## 5. Shared Context — The Integration Contract

This is the MOST IMPORTANT section for integration. Every member's screen
reads from this context. Member 1 builds this. Members 2–5 use it.

File: apps/mobile/src/context/RailSaathiContext.js

```javascript
// What this context exposes — the contract all members code against
const RailSaathiContext = {
  // Current logged-in user (null if not logged in)
  currentUser: {
    id: "uuid",
    phone: "9876543210",
    name: "Raj Kumar",
    emergency_contacts: ["9000000001"],
    preferred_class: "SL"
  },

  // The user's most recent/upcoming journey (null if none)
  activeJourney: {
    pnr: "1234567890",
    train_number: "12951",
    train_name: "Mumbai Rajdhani",
    boarding_station: "NDLS",
    destination_station: "MMCT",
    travel_date: "2026-06-15",
    coach: "B4",
    berth: "32",
    class: "3A",
    status: "CONFIRMED"
  },

  // Functions
  refreshUser: async () => {},     // re-fetches user from API
  refreshJourney: async () => {},  // re-fetches journey from API
  logout: async () => {}           // clears token, resets state
}

// How any member uses it:
import { useRailSaathi } from '../../context/RailSaathiContext'
const { currentUser, activeJourney } = useRailSaathi()
```

---

## 6. API Client — Shared Utility

File: apps/mobile/src/services/apiClient.js

```javascript
// All members import this. Do not create separate fetch utilities.
import { API_BASE_URL } from '../constants'
import AsyncStorage from '@react-native-async-storage/async-storage'

const apiClient = {
  get: async (path) => { /* attaches JWT, handles errors */ },
  post: async (path, body) => { /* attaches JWT, handles errors */ },
  patch: async (path, body) => { /* attaches JWT, handles errors */ },
  delete: async (path) => { /* attaches JWT, handles errors */ }
}
```

---

## 7. Environment Variables

### Backend (services/api/.env)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
FIREBASE_PROJECT_ID=railsaathi
JWT_SECRET=your_secret_here
PORT=3000
NTES_API_KEY=optional
```

### Mobile (apps/mobile/.env)
```
EXPO_PUBLIC_API_BASE_URL=https://railsaathi-api.onrender.com/api
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=railsaathi
```

### Dashboard (apps/dashboard/.env)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 8. Deployment Architecture

```
GitHub (main branch)
      │
      ├──► Render.com
      │    └── services/api/  ← Express API
      │        URL: https://railsaathi-api.onrender.com
      │
      ├──► Vercel (Project 1)
      │    └── apps/dashboard/ ← Admin Web Dashboard
      │        URL: https://railsaathi-admin.vercel.app
      │
      ├──► Vercel (Project 2) OR Expo Go
      │    └── apps/mobile/   ← React Native (Expo web build or QR code)
      │
      └──► Supabase
           └── PostgreSQL database + Auth + Storage
               URL: https://xxx.supabase.co
```

Free tier limits that matter:
- Render: 512MB RAM, spins down after 15min inactivity (ping it before demo)
- Supabase: 500MB DB, 1GB storage, 50k monthly auth users
- Vercel: unlimited deployments, 100GB bandwidth
- Firebase Auth: 10k SMS OTPs/month free

---

## 9. Supabase Row-Level Security Policy (Member 1 sets this up)

```sql
-- Users can only read/write their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (firebase_uid = auth.uid());

-- Journeys same
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journeys_own_data" ON journeys
  FOR ALL USING (user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()));
```

All other tables (complaints, safety, amenities) follow the same pattern —
each member adds their own RLS policy in their migration file.
