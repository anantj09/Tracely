// services/api/scripts/seed-tatkal.js
// Seeding script for Tatkal Requests and Surrender Listings.
// Decoupled, runs standalone or within integration test suite.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
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

  // 1. Ensure test users exist with deterministic details
  const testUsers = [
    {
      phone: '9999999999',
      name: 'Arjun Sharma',
      supabase_auth_uid: 'afa5b750-76ce-49b4-9152-268206e80f0c',
      is_verified: true,
      preferred_class: '3A',
      emergency_contacts: ['9000000001', '9000000002']
    },
    {
      phone: '9888888888',
      name: 'Priya Sharma',
      supabase_auth_uid: '03cc44c2-43cd-4d80-89ba-b4fbd1f57a9a',
      is_verified: true,
      preferred_class: 'SL',
      emergency_contacts: ['9000000003', '9000000004']
    },
    {
      phone: '9777777777',
      name: 'Raj Kumar',
      supabase_auth_uid: '7b233a1e-862d-45df-bb78-b12a8069e20a',
      is_verified: true,
      preferred_class: '2A',
      emergency_contacts: ['9000000005']
    }
  ];

  console.log('Upserting test users...');
  const { data: upsertedUsers, error: userUpsertError } = await supabase
    .from('users')
    .upsert(testUsers, { onConflict: 'phone' })
    .select('id, phone, name');

  if (userUpsertError) {
    console.error('Error upserting test users:', userUpsertError);
    throw userUpsertError;
  }

  const phoneToId = {};
  upsertedUsers.forEach((u) => {
    phoneToId[u.phone] = u.id;
  });

  const userAId = phoneToId['9999999999'];
  const userBId = phoneToId['9888888888'];
  const userCId = phoneToId['9777777777'];

  // Clean old requests, surrenders, and locks first to keep tests clean
  console.log('Cleaning old Tatkal requests, locks, and surrender listings...');
  await supabase.from('tatkal_journey_locks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tatkal_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tatkal_surrenders').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Define 10 Tatkal requests distributed across PENDING, FIRED, CONFIRMED, and CANCELLED
  // Ensures multiple entries record high priority weights (>7.0)
  const tatkalRequests = [
    {
      user_id: userAId,
      from_station: 'NDLS',
      to_station: 'MMCT',
      travel_date: dateOffset(3),
      train_number: '12952',
      class: '3A',
      passengers: [{ name: 'Arjun Sharma', age: 28, gender: 'M', berth_preference: 'LB' }],
      is_urgent: true,
      urgency_reason: 'medical',
      urgency_document_url: 'https://supabase.co/storage/v1/object/public/tatkal-documents/med.jpg',
      urgency_score: 10.0,
      scheduled_fire_time: new Date(new Date(dateOffset(2)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'CONFIRMED',
      simulated_pnr: 'DEMO748293',
      booking_date: dateOffset(0),
      departure_datetime: new Date(dateOffset(3) + 'T08:00:00Z').toISOString(),
      arrival_datetime: new Date(dateOffset(3) + 'T22:00:00Z').toISOString()
    },
    {
      user_id: userBId,
      from_station: 'NDLS',
      to_station: 'HWH',
      travel_date: dateOffset(4),
      train_number: '12301',
      class: 'SL',
      passengers: [{ name: 'Priya Sharma', age: 25, gender: 'F', berth_preference: 'UB' }],
      is_urgent: true,
      urgency_reason: 'bereavement',
      urgency_document_url: 'https://supabase.co/storage/v1/object/public/tatkal-documents/funeral.jpg',
      urgency_score: 9.5,
      scheduled_fire_time: new Date(new Date(dateOffset(3)).setUTCHours(5, 30, 0, 0)).toISOString(),
      status: 'PENDING',
      booking_date: dateOffset(0),
      departure_datetime: new Date(dateOffset(4) + 'T08:00:00Z').toISOString(),
      arrival_datetime: new Date(dateOffset(4) + 'T22:00:00Z').toISOString()
    },
    {
      user_id: userCId,
      from_station: 'SBC',
      to_station: 'NDLS',
      travel_date: dateOffset(5),
      train_number: '12627',
      class: '2A',
      passengers: [{ name: 'Raj Kumar', age: 27, gender: 'M', berth_preference: 'LB' }],
      is_urgent: true,
      urgency_reason: 'official',
      urgency_document_url: 'https://supabase.co/storage/v1/object/public/tatkal-documents/exam.jpg',
      urgency_score: 8.5,
      scheduled_fire_time: new Date(new Date(dateOffset(4)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'FIRED',
      booking_date: dateOffset(0),
      departure_datetime: new Date(dateOffset(5) + 'T08:00:00Z').toISOString(),
      arrival_datetime: new Date(dateOffset(5) + 'T22:00:00Z').toISOString()
    },
    {
      user_id: userAId,
      from_station: 'NDLS',
      to_station: 'BPL',
      travel_date: dateOffset(-2),
      train_number: '12002',
      class: '3A',
      passengers: [{ name: 'Arjun Sharma', age: 28, gender: 'M', berth_preference: 'LB' }],
      is_urgent: false,
      urgency_score: 5.5,
      scheduled_fire_time: new Date(new Date(dateOffset(-3)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'CANCELLED',
      booking_date: dateOffset(-3),
      departure_datetime: new Date(dateOffset(-2) + 'T08:00:00Z').toISOString(),
      arrival_datetime: new Date(dateOffset(-2) + 'T22:00:00Z').toISOString()
    },
    {
      user_id: userBId,
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
      departure_datetime: new Date(dateOffset(-1) + 'T08:00:00Z').toISOString(),
      arrival_datetime: new Date(dateOffset(-1) + 'T22:00:00Z').toISOString()
    },
    {
      user_id: userCId,
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
      departure_datetime: new Date(dateOffset(-5) + 'T08:00:00Z').toISOString(),
      arrival_datetime: new Date(dateOffset(-5) + 'T22:00:00Z').toISOString()
    },
    {
      user_id: userAId,
      from_station: 'ADI',
      to_station: 'MMCT',
      travel_date: dateOffset(6),
      train_number: '12627', // Changed train number from 12952 to 12627 to avoid index conflict
      class: '3A',
      passengers: [{ name: 'Arjun Sharma', age: 28, gender: 'M', berth_preference: 'LB' }],
      is_urgent: false,
      urgency_score: 5.5,
      scheduled_fire_time: new Date(new Date(dateOffset(5)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'PENDING',
      booking_date: dateOffset(0),
      departure_datetime: new Date(dateOffset(6) + 'T08:00:00Z').toISOString(),
      arrival_datetime: new Date(dateOffset(6) + 'T22:00:00Z').toISOString()
    },
    {
      user_id: userBId,
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
      departure_datetime: new Date(dateOffset(7) + 'T08:00:00Z').toISOString(),
      arrival_datetime: new Date(dateOffset(7) + 'T22:00:00Z').toISOString()
    },
    {
      user_id: userCId,
      from_station: 'HWH',
      to_station: 'BBS',
      travel_date: dateOffset(10),
      train_number: '12839',
      class: '2A',
      passengers: [{ name: 'Raj Kumar', age: 27, gender: 'M', berth_preference: 'LB' }],
      is_urgent: false,
      urgency_score: 5.5,
      scheduled_fire_time: new Date(new Date(dateOffset(9)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'FIRED',
      booking_date: dateOffset(0),
      departure_datetime: new Date(dateOffset(10) + 'T08:00:00Z').toISOString(),
      arrival_datetime: new Date(dateOffset(10) + 'T22:00:00Z').toISOString()
    },
    {
      user_id: userAId,
      from_station: 'NDLS',
      to_station: 'MMCT',
      travel_date: dateOffset(-8),
      train_number: '12953',
      class: '3A',
      passengers: [{ name: 'Arjun Sharma', age: 28, gender: 'M', berth_preference: 'LB' }],
      is_urgent: true,
      urgency_reason: 'medical',
      urgency_document_url: 'https://supabase.co/storage/v1/object/public/tatkal-documents/med_expired.jpg',
      urgency_score: 9.5,
      scheduled_fire_time: new Date(new Date(dateOffset(-9)).setUTCHours(4, 30, 0, 0)).toISOString(),
      status: 'CANCELLED',
      booking_date: dateOffset(-9),
      departure_datetime: new Date(dateOffset(-8) + 'T08:00:00Z').toISOString(),
      arrival_datetime: new Date(dateOffset(-8) + 'T22:00:00Z').toISOString()
    }
  ];

  // 3. Define 5 Surrender Tickets listed across distinct stations and class configurations
  const surrenderTickets = [
    {
      owner_user_id: userCId,
      pnr: '9876543210',
      from_station: 'MMCT',
      to_station: 'NDLS',
      travel_date: dateOffset(7),
      train_number: '12951',
      class: '2A',
      status: 'LISTED'
    },
    {
      owner_user_id: userBId,
      pnr: '1234567890',
      from_station: 'NDLS',
      to_station: 'MMCT',
      travel_date: dateOffset(3),
      train_number: '12952',
      class: 'SL',
      status: 'LISTED'
    },
    {
      owner_user_id: userAId,
      pnr: '0987654321',
      from_station: 'SBC',
      to_station: 'NDLS',
      travel_date: dateOffset(5),
      train_number: '12627',
      class: '3A',
      status: 'LISTED'
    },
    {
      owner_user_id: userCId,
      pnr: '5566778899',
      from_station: 'NDLS',
      to_station: 'SDAH',
      travel_date: dateOffset(6),
      train_number: '12260',
      class: '1A',
      status: 'LISTED'
    },
    {
      owner_user_id: userBId,
      pnr: '1122334455',
      from_station: 'NDLS',
      to_station: 'HWH',
      travel_date: dateOffset(8),
      train_number: '12301',
      class: 'GEN',
      status: 'LISTED'
    }
  ];

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

  // Create an initial journey lock for journey overlap testing (User A, Arjun Sharma)
  console.log('Inserting journey lock for overlap testing...');
  const lock = {
    user_id: userAId,
    passenger_name: 'Arjun Sharma',
    pnr: 'LOCK123456',
    lock_start: new Date(dateOffset(3) + 'T00:00:00Z').toISOString(),
    lock_end: new Date(dateOffset(3) + 'T23:59:59Z').toISOString()
  };
  const { error: lockError } = await supabase.from('tatkal_journey_locks').insert(lock);
  if (lockError) throw lockError;
  console.log('  ✓ Active journey lock seeded for User A.');

  console.log('🎉 Seed complete!');
}

seedTatkal().catch((err) => {
  console.error('❌ Tatkal Seeding failed:', err);
  process.exit(1);
});
