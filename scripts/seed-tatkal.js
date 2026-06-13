// scripts/seed-tatkal.js
// Seed script for Tatkal Requests and Surrender Listings.
// Decoupled module, runs standalone.
//
// Run:
//   NODE_PATH=services/api/node_modules node scripts/seed-tatkal.js
//   (Windows PowerShell: $env:NODE_PATH="services/api/node_modules"; node scripts/seed-tatkal.js)

require('dotenv').config({ path: 'services/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function seedTatkal() {
  console.log('🌱 Seeding Tatkal requests and surrender listings...');

  // 1. Fetch user IDs by phone
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, phone')
    .in('phone', ['9999999999', '9888888888', '9777777777']);

  if (userError) throw userError;
  if (!users || users.length === 0) {
    throw new Error('No users found in database. Please run scripts/seed.js first.');
  }

  const phoneToId = {};
  users.forEach((u) => {
    phoneToId[u.phone] = u.id;
  });

  const demoPassengerId = phoneToId['9999999999'];
  const priyaSharmaId = phoneToId['9888888888'];
  const rajKumarId = phoneToId['9777777777'];

  if (!demoPassengerId || !priyaSharmaId || !rajKumarId) {
    throw new Error('Required seed users are missing. Run seed.js first.');
  }

  // 2. Define Tatkal requests (10 requests)
  const tatkalRequests = [
    {
      user_id: demoPassengerId,
      from_station: 'NDLS',
      to_station: 'MMCT',
      travel_date: dateOffset(3),
      train_number: '12953',
      class: '3A',
      passengers: [{ name: 'Demo Passenger', age: 28, gender: 'M', berth_preference: 'LB' }],
      is_urgent: true,
      urgency_reason: 'medical',
      urgency_document_url: 'https://sjjzzahcqmxksruzfpfo.supabase.co/storage/v1/object/public/tatkal-documents/medical_cert.jpg',
      urgency_score: 10.0,
      scheduled_fire_time: new Date(new Date(dateOffset(2)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'CONFIRMED',
      simulated_pnr: 'DEMO748293',
      booking_date: dateOffset(0),
    },
    {
      user_id: priyaSharmaId,
      from_station: 'NDLS',
      to_station: 'HWH',
      travel_date: dateOffset(4),
      train_number: '12301',
      class: 'SL',
      passengers: [{ name: 'Priya Sharma', age: 25, gender: 'F', berth_preference: 'UB' }],
      is_urgent: true,
      urgency_reason: 'bereavement',
      urgency_document_url: 'https://sjjzzahcqmxksruzfpfo.supabase.co/storage/v1/object/public/tatkal-documents/funeral_notice.jpg',
      urgency_score: 9.5,
      scheduled_fire_time: new Date(new Date(dateOffset(3)).setUTCHours(5, 30, 0, 0)).toISOString(),
      status: 'PENDING',
      booking_date: dateOffset(0),
    },
    {
      user_id: rajKumarId,
      from_station: 'SBC',
      to_station: 'NDLS',
      travel_date: dateOffset(5),
      train_number: '12627',
      class: '2A',
      passengers: [{ name: 'Raj Kumar', age: 27, gender: 'M', berth_preference: 'LB' }],
      is_urgent: true,
      urgency_reason: 'official',
      urgency_document_url: 'https://sjjzzahcqmxksruzfpfo.supabase.co/storage/v1/object/public/tatkal-documents/exam_letter.jpg',
      urgency_score: 8.5,
      scheduled_fire_time: new Date(new Date(dateOffset(4)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'PENDING',
      booking_date: dateOffset(0),
    },
    {
      user_id: demoPassengerId,
      from_station: 'NDLS',
      to_station: 'BPL',
      travel_date: dateOffset(-2),
      train_number: '12002',
      class: '3A',
      passengers: [{ name: 'Demo Passenger', age: 28, gender: 'M', berth_preference: 'LB' }],
      is_urgent: false,
      urgency_score: 5.5,
      scheduled_fire_time: new Date(new Date(dateOffset(-3)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'CANCELLED',
      booking_date: dateOffset(-3),
    },
    {
      user_id: priyaSharmaId,
      from_station: 'NDLS',
      to_station: 'LKO',
      travel_date: dateOffset(-1),
      train_number: '12420',
      class: 'SL',
      passengers: [{ name: 'Priya Sharma', age: 25, gender: 'F', berth_preference: 'SU' }],
      is_urgent: false,
      urgency_score: 5.0,
      scheduled_fire_time: new Date(new Date(dateOffset(-2)).setUTCHours(5, 30, 0, 0)).toISOString(),
      status: 'CONFIRMED',
      simulated_pnr: 'DEMO192837',
      booking_date: dateOffset(-2),
    },
    {
      user_id: rajKumarId,
      from_station: 'SBC',
      to_station: 'MAS',
      travel_date: dateOffset(-5),
      train_number: '12658',
      class: '2A',
      passengers: [{ name: 'Raj Kumar', age: 27, gender: 'M', berth_preference: 'LB' }],
      is_urgent: false,
      urgency_score: 5.5,
      scheduled_fire_time: new Date(new Date(dateOffset(-6)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'CANCELLED',
      booking_date: dateOffset(-6),
    },
    {
      user_id: demoPassengerId,
      from_station: 'ADI',
      to_station: 'MMCT',
      travel_date: dateOffset(6),
      train_number: '12952',
      class: '3A',
      passengers: [{ name: 'Demo Passenger', age: 28, gender: 'M', berth_preference: 'LB' }],
      is_urgent: false,
      urgency_score: 5.5,
      scheduled_fire_time: new Date(new Date(dateOffset(5)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'PENDING',
      booking_date: dateOffset(0),
    },
    {
      user_id: priyaSharmaId,
      from_station: 'MAS',
      to_station: 'HYB',
      travel_date: dateOffset(7),
      train_number: '12760',
      class: 'SL',
      passengers: [{ name: 'Priya Sharma', age: 25, gender: 'F', berth_preference: 'UB' }],
      is_urgent: false,
      urgency_score: 5.0,
      scheduled_fire_time: new Date(new Date(dateOffset(6)).setUTCHours(5, 30, 0, 0)).toISOString(),
      status: 'PENDING',
      booking_date: dateOffset(0),
    },
    {
      user_id: rajKumarId,
      from_station: 'HWH',
      to_station: 'BBS',
      travel_date: dateOffset(10),
      train_number: '12839',
      class: '2A',
      passengers: [{ name: 'Raj Kumar', age: 27, gender: 'M', berth_preference: 'LB' }],
      is_urgent: false,
      urgency_score: 5.5,
      scheduled_fire_time: new Date(new Date(dateOffset(9)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'PENDING',
      booking_date: dateOffset(0),
    },
    {
      user_id: demoPassengerId,
      from_station: 'NDLS',
      to_station: 'MMCT',
      travel_date: dateOffset(-8),
      train_number: '12953',
      class: '3A',
      passengers: [{ name: 'Demo Passenger', age: 28, gender: 'M', berth_preference: 'LB' }],
      is_urgent: true,
      urgency_reason: 'medical',
      urgency_document_url: 'https://sjjzzahcqmxksruzfpfo.supabase.co/storage/v1/object/public/tatkal-documents/medical_cert_expired.jpg',
      urgency_score: 9.5,
      scheduled_fire_time: new Date(new Date(dateOffset(-9)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'FAILED',
      booking_date: dateOffset(-9),
    },
  ];

  // 3. Define Surrender Tickets (5 listed tickets)
  const surrenderTickets = [
    {
      owner_user_id: rajKumarId,
      pnr: '9876543210',
      from_station: 'MMCT',
      to_station: 'NDLS',
      travel_date: dateOffset(7),
      train_number: '12951',
      class: '2A',
      status: 'LISTED',
    },
    {
      owner_user_id: priyaSharmaId,
      pnr: '1234567890',
      from_station: 'NDLS',
      to_station: 'MMCT',
      travel_date: dateOffset(3),
      train_number: '12952',
      class: 'SL',
      status: 'LISTED',
    },
    {
      owner_user_id: demoPassengerId,
      pnr: '0987654321',
      from_station: 'SBC',
      to_station: 'NDLS',
      travel_date: dateOffset(5),
      train_number: '12627',
      class: '3A',
      status: 'LISTED',
    },
    {
      owner_user_id: rajKumarId,
      pnr: '5566778899',
      from_station: 'NDLS',
      to_station: 'SDAH',
      travel_date: dateOffset(6),
      train_number: '12260',
      class: '2A',
      status: 'LISTED',
    },
    {
      owner_user_id: priyaSharmaId,
      pnr: '1122334455',
      from_station: 'NDLS',
      to_station: 'HWH',
      travel_date: dateOffset(8),
      train_number: '12301',
      class: 'SL',
      status: 'LISTED',
    },
  ];

  // Clean old requests & surrenders
  console.log('Cleaning old Tatkal requests and surrender listings...');
  await supabase.from('tatkal_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tatkal_surrenders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Insert requests
  console.log('Inserting tatkal_requests...');
  const { error: reqError } = await supabase.from('tatkal_requests').insert(tatkalRequests);
  if (reqError) throw reqError;
  console.log(`  ✓ ${tatkalRequests.length} Tatkal requests seeded.`);

  // Insert surrenders
  console.log('Inserting tatkal_surrenders...');
  const { error: surrError } = await supabase.from('tatkal_surrenders').insert(surrenderTickets);
  if (surrError) throw surrError;
  console.log(`  ✓ ${surrenderTickets.length} surrender listings seeded.`);

  console.log('🎉 Seed complete!');
}

seedTatkal().catch((err) => {
  console.error('❌ Tatkal Seeding failed:', err);
  process.exit(1);
});
