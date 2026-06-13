#!/usr/bin/env bash
# services/api/scripts/test-tatkal.sh
# Fully automated bash verification suite for Tatkal booking ecosystem.

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0;0m' # No Color

BASE_URL="http://localhost:3000/api/tatkal"

echo -e "${YELLOW}=== Running Tatkal Verification Suite ===${NC}\n"

# 0. Automatically seed the database to ensure fresh state
echo "Seeding Tatkal database to reset test state..."
node services/api/scripts/seed-tatkal.js
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Database seeding failed. Make sure database is reachable.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Database seeded successfully.${NC}\n"

# 1. Generate TOKEN_A (Arjun Sharma) and TOKEN_B (Priya Sharma)
echo "Generating authentication tokens for User A and User B..."

TOKEN_A=$(NODE_PATH=services/api/node_modules node -e "
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const secret = process.env.SUPABASE_JWT_SECRET || 'dummy';
console.log(jwt.sign({ sub: 'afa5b750-76ce-49b4-9152-268206e80f0c', user_id: 'afa5b750-76ce-49b4-9152-268206e80f0c', phone: '9999999999' }, secret));
")

TOKEN_B=$(NODE_PATH=services/api/node_modules node -e "
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const secret = process.env.SUPABASE_JWT_SECRET || 'dummy';
console.log(jwt.sign({ sub: '03cc44c2-43cd-4d80-89ba-b4fbd1f57a9a', user_id: '03cc44c2-43cd-4d80-89ba-b4fbd1f57a9a', phone: '9888888888' }, secret));
")

if [ -z "$TOKEN_A" ] || [ -z "$TOKEN_B" ]; then
  echo -e "${RED}❌ Failed to generate tokens. Make sure Node.js is installed.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Tokens generated successfully.${NC}\n"

# Clean up responses
rm -f res1.json res2.json res3.json res4a.json res4b.json list.json code_a.txt code_b.txt

# --- TEST CASE 1: Anti-Hoarding Rule ---
echo -e "${YELLOW}[TEST CASE 1] Anti-Hoarding Rule (Duplicate Check)${NC}"

# Define a future travel date (today + 4 days)
TRAVEL_DATE=$(node -e "
const d = new Date();
d.setDate(d.getDate() + 4);
console.log(d.toISOString().split('T')[0]);
")

# Using train_number 12345 (which has no seeded bookings today)
PAYLOAD1=$(cat <<EOF
{
  "from_station": "NDLS",
  "to_station": "MMCT",
  "travel_date": "$TRAVEL_DATE",
  "train_number": "12345",
  "class": "3A",
  "passengers": [
    { "name": "Arjun Sharma", "age": 28, "gender": "M", "berth_preference": "LB" }
  ],
  "is_urgent": false
}
EOF
)

# First Request
status1=$(curl -s -o res1.json -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "$PAYLOAD1" \
  "$BASE_URL/prefill")

echo "First Booking Request Status: $status1"

# Second Duplicate Request (Same Train, Same Date, Same User)
status2=$(curl -s -o res2.json -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "$PAYLOAD1" \
  "$BASE_URL/prefill")

echo "Second Duplicate Request Status: $status2"

if [ "$status1" -eq 201 ] && [ "$status2" -eq 409 ]; then
  # Verify exception structure contains DUPLICATE_REQUEST
  if grep -q "DUPLICATE_REQUEST" res2.json; then
    echo -e "${GREEN}✅ TEST CASE 1 PASSED: Duplicate booking rejected with 409 Conflict (DUPLICATE_REQUEST).${NC}\n"
  else
    echo -e "${RED}❌ TEST CASE 1 FAILED: Code is not DUPLICATE_REQUEST.${NC}"
    cat res2.json
    exit 1
  fi
else
  echo -e "${RED}❌ TEST CASE 1 FAILED: Expected 201 then 409, got $status1 and $status2.${NC}"
  cat res2.json
  exit 1
fi


# --- TEST CASE 2: Account Holder Check ---
echo -e "${YELLOW}[TEST CASE 2] Account Holder Check (Mandate Violation)${NC}"

# Payload omitting Arjun Sharma (Account Holder)
PAYLOAD2=$(cat <<EOF
{
  "from_station": "NDLS",
  "to_station": "MMCT",
  "travel_date": "$TRAVEL_DATE",
  "train_number": "12953",
  "class": "3A",
  "passengers": [
    { "name": "Priya Sharma", "age": 25, "gender": "F", "berth_preference": "UB" }
  ],
  "is_urgent": false
}
EOF
)

status_check2=$(curl -s -o res3.json -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "$PAYLOAD2" \
  "$BASE_URL/prefill")

echo "Omitting Account Holder Status: $status_check2"

if [ "$status_check2" -eq 400 ] && grep -q "ACCOUNT_HOLDER_MANDATE_FAILED" res3.json; then
  echo -e "${GREEN}✅ TEST CASE 2 PASSED: Missing account holder signature rejected with 400 Bad Request (ACCOUNT_HOLDER_MANDATE_FAILED).${NC}\n"
else
  echo -e "${RED}❌ TEST CASE 2 FAILED: Expected 400 Bad Request with ACCOUNT_HOLDER_MANDATE_FAILED, got $status_check2.${NC}"
  cat res3.json
  exit 1
fi


# --- TEST CASE 3: Journey Overlap Conflict ---
echo -e "${YELLOW}[TEST CASE 3] Journey Overlap Lock Rejection${NC}"

# Seed seeded a lock for Arjun Sharma on dateOffset(3)
LOCK_DATE=$(node -e "
const d = new Date();
d.setDate(d.getDate() + 3);
console.log(d.toISOString().split('T')[0]);
")

# Prefill on lock dateOffset(3)
PAYLOAD3=$(cat <<EOF
{
  "from_station": "NDLS",
  "to_station": "MMCT",
  "travel_date": "$LOCK_DATE",
  "train_number": "12953",
  "class": "3A",
  "passengers": [
    { "name": "Arjun Sharma", "age": 28, "gender": "M", "berth_preference": "LB" }
  ],
  "is_urgent": false
}
EOF
)

status_check3=$(curl -s -o res3.json -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "$PAYLOAD3" \
  "$BASE_URL/prefill")

echo "Overlapping Lock Prefill Status: $status_check3"

if [ "$status_check3" -eq 409 ] && grep -q "JOURNEY_OVERLAP_LOCK" res3.json; then
  echo -e "${GREEN}✅ TEST CASE 3 PASSED: Booking on locked date successfully rejected with 409 (JOURNEY_OVERLAP_LOCK).${NC}\n"
else
  echo -e "${RED}❌ TEST CASE 3 FAILED: Expected 409 Conflict with JOURNEY_OVERLAP_LOCK, got $status_check3.${NC}"
  cat res3.json
  exit 1
fi


# --- TEST CASE 4: Market Allocation Validation ---
echo -e "${YELLOW}[TEST CASE 4] Market Allocation (Concurrent Match Request)${NC}"

# Fetch listed surrender tickets
curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE_URL/surrenders" > list.json

# Parse the first LISTED ticket ID
TICKET_ID=$(node -e "
const fs = require('fs');
const raw = fs.readFileSync('list.json');
const parsed = JSON.parse(raw);
if (parsed.data && parsed.data.length > 0) {
  // Find a ticket not owned by User A or User B so they can claim it (owned by User C/Raj Kumar)
  const ticket = parsed.data.find(t => t.owner_user_id !== 'afa5b750-76ce-49b4-9152-268206e80f0c' && t.owner_user_id !== '03cc44c2-43cd-4d80-89ba-b4fbd1f57a9a');
  console.log(ticket ? ticket.id : '');
} else {
  console.log('');
}
")

if [ -z "$TICKET_ID" ]; then
  echo -e "${RED}❌ TEST CASE 4 FAILED: No listed surrender tickets found to test match allocation.${NC}"
  exit 1
fi

echo "Found eligible listed surrender ticket ID: $TICKET_ID"
echo "Firing concurrent match requests from User A and User B..."

# Execute matching requests concurrently
curl -s -o res4a.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN_A" \
  "$BASE_URL/surrenders/$TICKET_ID/request" > code_a.txt & pid1=$!

curl -s -o res4b.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN_B" \
  "$BASE_URL/surrenders/$TICKET_ID/request" > code_b.txt & pid2=$!

# Wait for both background jobs to finish
wait $pid1
wait $pid2

# Read output status codes
status_a=$(cat code_a.txt)
status_b=$(cat code_b.txt)

echo "User A Match Request Status code: $status_a"
echo "User B Match Request Status code: $status_b"

# Assert that exactly one response is 200 (MATCHED) and the other is 400 (TICKET_NOT_AVAILABLE)
if { [ "$status_a" -eq 200 ] && [ "$status_b" -eq 400 ]; } || { [ "$status_b" -eq 200 ] && [ "$status_a" -eq 400 ]; }; then
  echo -e "${GREEN}✅ TEST CASE 4 PASSED: Marketplace concurrency correctly resolved. Exactly one user matched the ticket, and the other was rejected.${NC}\n"
else
  echo -e "${RED}❌ TEST CASE 4 FAILED: Concurrency mismatch. Expected exactly one 200 and one 400.${NC}"
  exit 1
fi

# Cleanup
rm -f res1.json res2.json res3.json res4a.json res4b.json list.json code_a.txt code_b.txt

echo -e "${GREEN}🎉 ALL TEST CASES PASSED SUCCESSFULLY! 🎉${NC}"
exit 0
