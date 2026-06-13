// ─────────────────────────────────────────────────────────────────────────────
// scripts/seed.js
// Master seed script — Member 1
// Seeds: admin_users, users, journeys, travel_intents
//
// Other tables (complaints, safety_events, station_amenities, tatkal_requests)
// are seeded by their respective member scripts.
//
// Run:
//   NODE_PATH=services/api/node_modules node scripts/seed.js
//   (Windows PowerShell: $env:NODE_PATH="services/api/node_modules"; node scripts/seed.js)
//
// Flags:
//   --force   Re-seeds travel_intents from scratch even if already populated
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config({ path: 'services/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── DATA DEFINITIONS ────────────────────────────────────────────────────────

const ADMIN_USERS = [
  { email: 'superadmin@tracely.gov.in', role: 'superadmin', zone: null },
  { email: 'zone.nr@tracely.gov.in',   role: 'zone_officer', zone: 'NR' },
  { email: 'zone.sr@tracely.gov.in',   role: 'zone_officer', zone: 'SR' },
  { email: 'zone.wr@tracely.gov.in',   role: 'zone_officer', zone: 'WR' },
  { email: 'viewer@tracely.gov.in',    role: 'viewer', zone: null },
];

// Demo users (created WITHOUT supabase_auth_uid for seed purposes —
// for auth testing, use the Supabase dashboard)
const DEMO_USERS = [
  { phone: '9999999999', name: 'Demo Passenger', is_verified: true, preferred_class: '3A' },
  { phone: '9888888888', name: 'Priya Sharma',   is_verified: true, preferred_class: 'SL' },
  { phone: '9777777777', name: 'Raj Kumar',      is_verified: true, preferred_class: '2A' },
];

const DEMO_JOURNEYS = [
  {
    phone: '9999999999',
    pnr: '1234567890',
    train_number: '12951', train_name: 'Mumbai Rajdhani',
    boarding_station: 'NDLS', destination_station: 'MMCT',
    travel_date: dateOffset(3), coach: 'B4', berth: '32', class: '3A', status: 'CONFIRMED',
  },
  {
    phone: '9999999999',
    pnr: '0987654321',
    train_number: '12627', train_name: 'Karnataka Express',
    boarding_station: 'SBC', destination_station: 'NDLS',
    travel_date: dateOffset(15), coach: 'S5', berth: '45', class: 'SL', status: 'CONFIRMED',
  },
  {
    phone: '9888888888',
    pnr: '1122334455',
    train_number: '12301', train_name: 'Howrah Rajdhani',
    boarding_station: 'NDLS', destination_station: 'HWH',
    travel_date: dateOffset(7), coach: 'A1', berth: '15', class: '2A', status: 'RAC',
  },
  {
    phone: '9777777777',
    pnr: '5566778899',
    train_number: '12259', train_name: 'Sealdah Duronto',
    boarding_station: 'NDLS', destination_station: 'SDAH',
    travel_date: dateOffset(2), coach: 'E1', berth: '8', class: '2A', status: 'CONFIRMED',
  },
  {
    phone: '9777777777',
    pnr: '9988776655',
    train_number: '12002', train_name: 'Bhopal Shatabdi',
    boarding_station: 'NDLS', destination_station: 'BPL',
    travel_date: dateOffset(10), coach: 'CC', berth: '24', class: 'CC', status: 'CONFIRMED',
  },
  {
    phone: '9888888888',
    pnr: '4433221100',
    train_number: '12618', train_name: 'Mangala Lakshadweep',
    boarding_station: 'NDLS', destination_station: 'ERS',
    travel_date: dateOffset(5), coach: 'S3', berth: '55', class: 'SL', status: 'WL',
  },
];

const ROUTES = [
  { from: 'NDLS', to: 'MMCT' },
  { from: 'NDLS', to: 'HWH' },
  { from: 'SBC',  to: 'MAS' },
  { from: 'MAS',  to: 'HYB' },
  { from: 'AMD',  to: 'MMCT' },
  { from: 'NDLS', to: 'LKO' },
  { from: 'HWH',  to: 'BBS' },
  { from: 'SBC',  to: 'HYB' },
];
const CLASSES = ['SL', '3A', '2A', '1A', 'GEN'];

// ─── SEED FUNCTIONS ──────────────────────────────────────────────────────────

async function seedAdminUsers() {
  console.log('Seeding admin_users...');
  const { error } = await supabase
    .from('admin_users')
    .upsert(ADMIN_USERS, { onConflict: 'email' });
  if (error) throw error;
  console.log(`  ✓ ${ADMIN_USERS.length} admin users seeded`);
}

async function seedUsers() {
  console.log('Seeding users...');
  const { error } = await supabase
    .from('users')
    .upsert(DEMO_USERS.map(u => ({ ...u, updated_at: new Date().toISOString() })),
      { onConflict: 'phone' });
  if (error) throw error;
  console.log(`  ✓ ${DEMO_USERS.length} demo users seeded`);
}

async function seedJourneys() {
  console.log('Seeding journeys...');
  // Fetch user IDs by phone
  const { data: users, error: ue } = await supabase
    .from('users').select('id, phone').in('phone', DEMO_USERS.map(u => u.phone));
  if (ue) throw ue;

  const phoneToId = {};
  users.forEach(u => { phoneToId[u.phone] = u.id; });

  const journeyRows = DEMO_JOURNEYS.map(j => {
    const { phone, ...rest } = j;
    return { ...rest, user_id: phoneToId[phone], raw_api_response: { mock: true } };
  }).filter(j => j.user_id); // Skip if user wasn't created

  const { error } = await supabase
    .from('journeys')
    .upsert(journeyRows, { onConflict: 'user_id,pnr' });
  if (error) throw error;
  console.log(`  ✓ ${journeyRows.length} demo journeys seeded`);
}

async function seedTravelIntents() {
  console.log('Seeding travel_intents (200 records)...');

  // Check if table exists
  const { error: checkError } = await supabase.from('travel_intents').select('id').limit(1);
  if (checkError) {
    console.warn('  ⚠️  travel_intents table not found. Run 005_travel_intents.sql first.');
    return;
  }

  // Check idempotency
  const { count } = await supabase
    .from('travel_intents').select('id', { count: 'exact', head: true });
  if (count > 50 && !process.argv.includes('--force')) {
    console.log('  ⚠️  travel_intents already seeded. Use --force to re-seed.');
    return;
  }

  if (process.argv.includes('--force')) {
    await supabase.from('travel_intents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const rows = [];
  for (let i = 0; i < 200; i++) {
    const route = ROUTES[i % ROUTES.length];
    const cls = CLASSES[i % CLASSES.length];
    const isSurge = (i % 3 === 0);
    const travelDate = dateOffset(i % 7);
    rows.push({
      from_station: route.from,
      to_station: route.to,
      class: cls,
      travel_date: travelDate,
      is_surge: isSurge,
      is_surge_route: isSurge,
    });
  }

  // Insert in batches of 50
  for (let b = 0; b < rows.length; b += 50) {
    const batch = rows.slice(b, b + 50);
    const { error } = await supabase.from('travel_intents').insert(batch);
    if (error) throw error;
    console.log(`  Inserted batch ${Math.floor(b / 50) + 1}/${Math.ceil(rows.length / 50)}`);
  }
  console.log(`  ✓ 200 travel intent records seeded`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 Tracely Seed Script (Member 1)\n');
  try {
    await seedAdminUsers();
    await seedUsers();
    await seedJourneys();
    await seedTravelIntents();
    console.log('\n✅ All Member 1 seed data inserted successfully.\n');
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  }
}

main();
