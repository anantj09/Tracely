# RailSaathi

RailSaathi is India's unified railway passenger platform, designed to provide passengers with a seamless, comprehensive travel experience. This repository contains the mobile application (React Native Expo), the government admin web dashboard (React + Vite), and the unified API backend (Node.js + Express).

## Deployment Links (Placeholders)
- **Production API (Render)**: [https://railsaathi-api.onrender.com](https://railsaathi-api.onrender.com)
- **Admin Dashboard (Vercel)**: [https://railsaathi-admin.vercel.app](https://railsaathi-admin.vercel.app)

## Repository Structure

The project is structured as a monorepo:
```text
railsaathi/
├── apps/
│   ├── mobile/              # React Native (Expo) - Mobile App
│   └── dashboard/           # React + Vite - Government Web Dashboard
├── services/
│   └── api/                 # Node.js + Express - Backend API Service
├── supabase/
│   └── migrations/          # Supabase SQL Migrations
├── scripts/                 # Utility and Seeding Scripts
└── docs/                    # Architecture and Design System documentation
```

## Getting Started

This section explains how to set up and run each part of the monorepo locally.

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher recommended)

### Setup & Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/railsaathi.git
   cd RailSaathi
   ```

2. **Unified API Backend Setup:**
   ```bash
   cd services/api
   npm install
   cp .env.example .env
   ```
   Configure `.env` with the following variables:
   ```env
   PORT=3000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   RENDER_EXTERNAL_URL=https://railsaathi-z057.onrender.com
   NTES_API_KEY=                    (optional)
   ```
   Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will run at `http://localhost:3000/api`. You can test it by requesting the health check:
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Admin Dashboard Setup:**
   ```bash
   cd apps/dashboard
   npm install
   npm run dev
   ```
   The dashboard website will run locally at `http://localhost:5173`.

4. **Mobile App Setup:**
   ```bash
   cd apps/mobile
   npm install
   npx expo start --tunnel
   ```
   Scan the generated QR code using the Expo Go app on a real phone to load the mobile interface.

---

## Seeding Demo Data

We provide seeding scripts to populate Supabase with synthetic data for realistic charts, maps, and active states during development/demos.

1. **General Data Seeding:**
   This script inserts users, journeys, complaints, safety incidents, tatkal requests, and travel intents.
   ```bash
   # From the root directory:
   NODE_PATH=services/api/node_modules node scripts/seed.js
   ```

2. **Demo User Seeding:**
   This script inserts the specific demo user (Arjun Sharma) along with an active trip, complaints history, and travel forecasts.
   ```bash
   # From the root directory:
   NODE_PATH=services/api/node_modules node scripts/seed-demo-user.js
   ```

---

## Documentation

For full details on development workflows, constraints, and UI designs, refer to the documentation in `docs/`:
- [AGENTS.md](file:///Users/sayantanmandal/Desktop/RailSaathi/docs/AGENTS.md) — Coding Rules
- [ARCHITECTURE.md](file:///Users/sayantanmandal/Desktop/RailSaathi/docs/ARCHITECTURE.md) — Repo Structure and API Contracts
- [PRD.md](file:///Users/sayantanmandal/Desktop/RailSaathi/docs/PRD.md) — Product Requirements Document
- [DESIGN.md](file:///Users/sayantanmandal/Desktop/RailSaathi/docs/DESIGN.md) — Color Palette, Typography & Visual Specifications
- [plan.md](file:///Users/sayantanmandal/Desktop/RailSaathi/docs/plan.md) — Phased Implementation Plan
- [PROGRESS.md](file:///Users/sayantanmandal/Desktop/RailSaathi/docs/PROGRESS.md) — Context Tracking & Milestone Progress

---

## Demo Day Setup

Render.com free tier services spin down after 15 minutes of inactivity. To prevent API cold starts during the demo:
1. Go to [https://cron-job.org](https://cron-job.org)
2. Create a free account.
3. Add a new cron job:
   - **URL**: `https://railsaathi-api.onrender.com/api/health`
   - **Interval**: Every 10 minutes
   - **Method**: GET
   - **Status**: Enabled

---

## Demo Credentials

Use these credentials to log in and demo the application:
- **Demo Phone**: `9999999999`
- **Demo OTP** (if using mock auth): `123456`
- **Admin Dashboard URL**: [https://railsaathi-admin.vercel.app](https://railsaathi-admin.vercel.app)
- **API URL**: [https://railsaathi-api.onrender.com](https://railsaathi-api.onrender.com)

---

## Team Structure & Ownership

RailSaathi is built by a team of 5 members with the following ownership split:
- **Member 1 (Spine / Platform Admin)**: Owns the repository shell, global authentication flow (Firebase + local custom JWT), user profiles, PNR journey aggregations, unified React Native shell, admin dashboard overview, real-time safety/SOS table and map views, station details table, and travel demand charts.
- **Member 2 (Tatkal Assist)**: Owns the automated passenger details autofill, countdown alerts, and speed-booking optimizations.
- **Member 3 (Complaints)**: Owns the multi-category complaint logging, image uploading, and passenger-facing grievance history screens.
- **Member 4 (Safety & SOS)**: Owns the zero-latency SOS panic button, live location sharing, and security status dashboard.
- **Member 5 (Station Guide)**: Owns the station status checks, platform layout views, and real-time station amenity details.
