# 🚆 Tracely — India's Unified Railway Companion

> A full-stack monorepo platform serving **8+ billion annual Indian Railway passengers** with a unified mobile app and government admin dashboard.

[![Dashboard](https://img.shields.io/badge/Dashboard-Live-blue?style=for-the-badge)](https://tracely-admin.vercel.app/)
[![API](https://img.shields.io/badge/API-Live-green?style=for-the-badge)](https://tracely-api.onrender.com/api/health)
[![Mobile](https://img.shields.io/badge/Mobile-Live-orange?style=for-the-badge)](https://tracely--fotbb0iv1f.expo.app)

---

## 🌐 Live Deployment Links

| Platform | URL | Status |
|----------|-----|--------|
| 🖥️ **Admin Dashboard** | [https://tracely-admin.vercel.app/](https://tracely-admin.vercel.app/) | ✅ Live on Vercel |
| ⚙️ **Backend API** | [https://tracely-api.onrender.com/api/health](https://tracely-api.onrender.com/api/health) | ✅ Live on Render |
| 📱 **Mobile App (Web/PWA)** | [https://tracely--fotbb0iv1f.expo.app](https://tracely--fotbb0iv1f.expo.app) | ✅ Live on Expo Hosting |
<!-- | 🤖 **Mobile App (Android APK)** | [Download APK](https://expo.dev/accounts/anants-team/projects/tracely/builds/70b56a6f-6a4e-4ebd-a349-17c6b88f281c) | ✅ Distributed via Expo | -->

---

## 📐 Repository Structure

The project is structured as a **monorepo** with clear separation of concerns:

```text
tracely/
├── apps/
│   ├── mobile/              # React Native (Expo SDK 56) — Passenger Mobile App
│   │   ├── src/screens/     # 6 feature modules (auth, home, tatkal, complaints, safety, station)
│   │   ├── src/context/     # TracelyContext.js — global state management
│   │   └── src/services/    # API client, Supabase client, feature services
│   └── dashboard/           # React 19 + Vite 8 — Government Admin Dashboard
│       ├── src/pages/       # 10 dashboard pages (Overview, Maps, Safety, Demand, etc.)
│       └── src/components/  # Reusable UI components (Sidebar, KPICard, Maps)
├── services/
│   └── api/                 # Node.js 18 + Express — Backend REST API
│       ├── src/routes/      # 13 route files, 40+ endpoints
│       ├── src/middleware/   # JWT auth, error handling, timeout
│       ├── src/services/    # Business logic (demand, safety, twilio)
│       └── src/jobs/        # Scheduled jobs (tatkal fire job)
├── supabase/
│   └── migrations/          # 14 SQL migration files — schema, RLS, triggers
├── scripts/                 # 6 seed scripts for demo data
│   ├── seed.js              # Core users, journeys, admin accounts
│   ├── seed-tatkal.js       # Tatkal requests + surrenders
│   ├── seed-complaints.js   # 300 complaints across 30 stations
│   ├── seed-safety.js       # 100 safety events across 20 stations
│   ├── seed-stations.js     # 50 station coordinates
│   └── seed-amenities.js    # 42 amenities, 17 vendors, 200 intents
├── docs/                    # Architecture docs, member progress, design specs
├── install-all.js           # One-command dependency installer for all workspaces
└── package.json             # Root workspace configuration
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │  📱 Mobile App   │    │  🖥️ Admin Dashboard     │   │
│  │  React Native    │    │  React 19 + Vite 8       │   │
│  │  Expo SDK 56     │    │  Leaflet + Recharts      │   │
│  └────────┬─────────┘    └───────────┬──────────────┘   │
│           └──────────┬───────────────┘                  │
│                      ▼                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │              API GATEWAY (Express)               │   │
│  │  Helmet · CORS · JWT Auth · 8s Timeout · Morgan  │   │
│  │  13 route files · 40+ endpoints                  │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         ▼                               │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────┐     │
│  │ Supabase   │  │ Supabase    │  │ Twilio SMS    │     │
│  │ PostgreSQL │  │ Storage     │  │ (SOS Alerts)  │     │
│  │ + RLS      │  │ (Photos,    │  └───────────────┘     │
│  │ + Realtime │  │  Audio)     │                        │
│  └────────────┘  └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ Five Feature Pillars

### 🎫 1. Tatkal Verified Booking Ecosystem
- Pre-fill wizard with Account Holder Mandate enforcement
- Zero-drift countdown timer to booking windows (8/10/11 AM IST)
- Surrender marketplace for ticket re-listing
- Overlap lock preventing double-booking (DB constraint)
- Background fire job for automated booking execution

### 📝 2. Smart Grievance Management
- 8-category complaint filing (2×4 icon grid)
- Photo evidence upload to Supabase Storage
- Active journey auto-population for train/coach details
- Visual status timeline (Filed → Acknowledged → In Progress → Resolved)
- 72-hour reopen window with 20-char minimum justification
- Safety auto-escalation for security-type complaints
- **Dashboard:** Leaflet geo-heatmap with 300+ plotted complaints

### 🚨 3. Zero-Latency Safety & SOS
- Single-tap SOS panic button (< 500ms server response)
- 60-second ambient audio recording with Supabase upload
- Compartment alert for suspicious persons
- Hazard reporting with geo-tagged photos
- Leaflet safety hotspot map (🚨 SOS · 👤 Compartment · ⚠️ Hazard)
- Trusted contacts with Twilio SMS notification
- **Dashboard:** RPF live command center with event resolution workflow

### 🏪 4. Station Intelligence & Demand Forecasting
- Travel intent crowdsourcing for demand prediction
- Traffic-light crowding score (Haversine distance formula)
- SVG station schematic maps (NDLS, CSTM, ADI, SBC)
- 42+ amenity directory with real-time status
- Vendor verification with star ratings and reviews
- Geo-fenced check-in (500m Haversine radius)
- **Dashboard:** Recharts demand forecast visualizations

### 📊 5. Government Admin Dashboard
- 4 real-time KPI cards (Supabase Realtime)
- Leaflet complaint map (train-mode + station-mode views)
- Live complaint density heatmap
- Safety event table with status badges
- RPF command dashboard with priority queue
- Demand forecast charts (route-wise trends)
- Station management + Tatkal monitoring

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Mobile** | React Native | 0.85.3 |
| | Expo SDK | 56 |
| | React Navigation | 7 |
| | Leaflet (via WebView) | 1.9.4 |
| **Dashboard** | React | 19.2.6 |
| | Vite | 8.0.12 |
| | React-Leaflet | 5.0.0 |
| | Recharts | 3.8.1 |
| **Backend** | Node.js | 18 |
| | Express | 5 |
| **Database** | Supabase (PostgreSQL) | 15 |
| **Auth** | Supabase Auth (Phone OTP) | — |
| **Storage** | Supabase Storage | — |
| **Realtime** | Supabase Realtime | — |
| **SMS** | Twilio | — |
| **Hosting** | Vercel (Dashboard) + Render (API) + EAS (Mobile) | — |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **npm** v9 or higher
- **Expo CLI** (`npm install -g expo-cli`)

### One-Command Install

```bash
# Clone the repository
git clone https://github.com/your-username/tracely.git
cd tracely

# Install ALL dependencies (root + dashboard + mobile + api)
npm run install-all
```

This runs `install-all.js` which automatically traverses and installs dependencies in all 4 workspaces.

### Start Services

```bash
# 1. Backend API (http://localhost:3000)
cd services/api
cp .env.example .env   # Configure Supabase credentials
npm run dev

# 2. Admin Dashboard (http://localhost:5173)
cd apps/dashboard
npm run dev

# 3. Mobile App (Expo Go)
cd apps/mobile
npx expo start --tunnel
# Scan QR code with Expo Go app
```

### Environment Variables

#### Backend (`services/api/.env`)
```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
RENDER_EXTERNAL_URL=https://tracely-api.onrender.com
```

#### Dashboard (`apps/dashboard/.env`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:3000/api
```

#### Mobile (`apps/mobile/.env`)
```env
EXPO_PUBLIC_API_BASE_URL=http://your-ip:3000/api
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🌱 Seeding Demo Data

```bash
# From the root directory — set NODE_PATH to share API dependencies
NODE_PATH=services/api/node_modules node scripts/seed.js           # Core users, journeys, admins
NODE_PATH=services/api/node_modules node scripts/seed-tatkal.js    # 10 tatkal requests + 5 surrenders
NODE_PATH=services/api/node_modules node scripts/seed-stations.js  # 50 station coordinates
NODE_PATH=services/api/node_modules node scripts/seed-complaints.js # 300 complaints
NODE_PATH=services/api/node_modules node scripts/seed-safety.js    # 100 safety events
NODE_PATH=services/api/node_modules node scripts/seed-amenities.js # 42 amenities, 17 vendors, 200 intents
```

---

## 🔐 Security

- **Supabase Auth** — Phone OTP authentication (no passwords)
- **JWT (HS256)** — Stateless tokens with 1-hour expiry + auto-refresh
- **Row-Level Security** — PostgreSQL RLS on every table
- **Helmet.js** — Security headers (CSP, HSTS, X-Frame-Options)
- **Privacy by Design** — Public APIs strip all PII; `maskedInitials()` anonymizes reporters
- **8s Request Timeout** — Prevents long-running query abuse

---

## 🗄️ Database Schema

14 migration files defining 15+ tables across 5 feature modules:

| Migration | Tables | Owner |
|-----------|--------|-------|
| `001_core_schema.sql` | users, journeys, admin_users | M1 |
| `002_tatkal.sql` | tatkal_requests, tatkal_surrenders | M2 |
| `0022_overlap_lock.sql` | tatkal_journey_locks | M2 |
| `003_complaints.sql` | complaints, complaint_timeline, station_coordinates | M3 |
| `004_safety.sql` | safety_events (+ Realtime) | M4 |
| `005_amenities.sql` | amenities, vendors, vendor_reviews, travel_intents, station_checkins | M5 |

---

## 📦 Deployment Guide

### Dashboard → Vercel
1. Push to GitHub
2. Import repo in Vercel → Root Directory: `apps/dashboard`
3. Framework: **Vite** · Build: `npm run build` · Output: `dist`
4. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`

### API → Render
1. Create Web Service → Root Directory: `services/api`
2. Build: `npm install` · Start: `npm start`
3. Add env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`
4. Set `RENDER_EXTERNAL_URL` for keep-alive self-ping

### Mobile → EAS Build
```bash
cd apps/mobile
eas build --platform android --profile preview
# Downloads APK for distribution
```

---

## 🎯 Demo Credentials

| Field | Value |
|-------|-------|
| Demo Phone | `9999999999` |
| Demo OTP | `123456` |
| Admin Dashboard | [https://tracely-admin.vercel.app/](https://tracely-admin.vercel.app/) |
| API Health | [https://tracely-api.onrender.com/api/health](https://tracely-api.onrender.com/api/health) |

---

## 👥 Team Structure

| Member | Domain | Ownership |
|--------|--------|-----------|
| **Member 1** | Spine & Platform Admin | Auth, profiles, journeys, admin dashboard, PNR, React Native shell |
| **Member 2** | Tatkal Assist | Pre-fill, countdown, surrender marketplace, booking automation |
| **Member 3** | Smart Complaints | Multi-category filing, photo upload, geo-heatmap, timeline |
| **Member 4** | Safety & SOS | Panic button, audio recording, RPF dashboard, Leaflet safety map |
| **Member 5** | Station Intelligence | Amenities, vendors, demand forecasting, schematics, check-in |

---

## 📄 License

Built for **FarAway 2026 — National Railway Innovation Challenge**

*"8 billion journeys. One companion. Tracely."*
