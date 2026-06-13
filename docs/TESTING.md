# RailSaathi - Tatkal Verified Booking Ecosystem Testing Guide

This guide explains how to execute manual and automated tests to verify the integrity, constraints, and business rules of the Tatkal Verified Booking Ecosystem.

---

## 🏗️ 1. Prerequisites

Before running the verification suite, make sure:
1. **API Server Running**: The backend server is running locally on port `3000` (`npm run dev` inside `services/api`).
2. **Database Configured**: Supabase migrations `001_core_schema.sql` and `002_tatkal.sql` are applied.
3. **Environment Setup**: `services/api/.env` is configured with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.

---

## 🚀 2. Automated Verification Run

To automatically test all business constraints (anti-hoarding, account holder check, journey overlap locks, and marketplace concurrency), run the verification bash script:

```bash
# Execute seeding first
node services/api/scripts/seed-tatkal.js

# Make script executable and run
chmod +x services/api/scripts/test-tatkal.sh
./services/api/scripts/test-tatkal.sh
```

---

## 🔍 3. Test Cases Break Down

The verification script validates the following 4 crucial test cases:

### Test Case 1: Anti-Hoarding Rule
* **Objective**: Asserts that a single user cannot book multiple concurrent Tatkal requests for the same booking date and train.
* **Mechanism**: Creates a prefill booking, then immediately fires a duplicate prefill booking payload for the same user, date, and train.
* **Expected Result**: The first request returns `201 Created` while the duplicate request is blocked, returning `409 Conflict` with the exception code `DUPLICATE_REQUEST`.

### Test Case 2: Account Holder Check
* **Objective**: Asserts that the account holder's name signature is mandatory in the passenger list to prevent unauthorized booking delegation/touting.
* **Mechanism**: Submits a prefill booking request where the passenger array does not include the authenticated user's name.
* **Expected Result**: Rejects the payload, returning `400 Bad Request` with the exception code `ACCOUNT_HOLDER_MANDATE_FAILED`.

### Test Case 3: Journey Overlap Conflict
* **Objective**: Prevents booking collisions where a passenger is locked onto an active, confirmed PNR journey during the target travel timeframe.
* **Mechanism**: Populates an active lock window in `tatkal_journey_locks` via the seed, then attempts to prefill a new booking for that passenger on the locked day.
* **Expected Result**: Rejects the booking, returning `409 Conflict` with the exception code `JOURNEY_OVERLAP_LOCK` and details about the lock.

### Test Case 4: Market Allocation Validation
* **Objective**: Verifies the ticket surrender reallocation marketplace and ensures concurrent match requests are handled with absolute atomic resolution.
* **Mechanism**: Selects a listed surrender ticket from the database, then executes two parallel HTTP match requests under User A and User B's tokens.
* **Expected Result**: One request matches successfully returning `200 OK` (setting status to `MATCHED`), while the second request is immediately blocked, returning `400 Bad Request` with `TICKET_NOT_AVAILABLE` or `TICKET_NOT_FOUND`.

---

> [!TIP]
> Use the demo button on the mobile UI `CountdownScreen` to test real-time simulated fire sequences (latency simulation, state change to `FIRED`, and final PNR generation).
