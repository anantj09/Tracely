require('dotenv').config({ path: '../services/api/.env' }); // Adjust if needed
const supabase = require('../services/api/src/db/supabase-client');

const FORCE_RESEED = process.env.FORCE_RESEED === 'true';

const SEED_USERS = Array.from({ length: 15 }, (_, i) => 
  `00000000-0000-0000-0000-${(i + 1).toString().padStart(12, '0')}`
);

// Helpers
const randomX = () => Math.floor(Math.random() * 800) + 100;
const randomY = () => Math.floor(Math.random() * 400) + 100;
const randomRating = () => parseFloat((Math.random() * (4.8 - 3.2) + 3.2).toFixed(1));
const getRandomUser = () => SEED_USERS[Math.floor(Math.random() * SEED_USERS.length)];

function getNextDay(dayOfWeek) {
  const date = new Date();
  const currentDay = date.getDay();
  let distance = dayOfWeek - currentDay;
  if (distance <= 0) {
    distance += 7;
  }
  date.setDate(date.getDate() + distance);
  return date.toISOString().split('T')[0];
}

async function seedAmenities() {
  console.log('Seeding Amenities...');
  
  const amenities = [
    // NDLS
    { station_code: 'NDLS', amenity_type: 'TOILET', label: 'Platform 1 Toilet', platform_number: '1', schematic_x: 150, schematic_y: 90, current_status: 'BROKEN' },
    { station_code: 'NDLS', amenity_type: 'TOILET', label: 'Platform 8 Toilet', platform_number: '8', schematic_x: 150, schematic_y: 510, current_status: 'WORKING' },
    { station_code: 'NDLS', amenity_type: 'WATER', label: 'Water Cooler P1', platform_number: '1', schematic_x: 300, schematic_y: 90, current_status: 'WORKING' },
    { station_code: 'NDLS', amenity_type: 'WATER', label: 'Water Cooler P2', platform_number: '2', schematic_x: 300, schematic_y: 150, current_status: 'WORKING' },
    { station_code: 'NDLS', amenity_type: 'FOOD_STALL', label: 'Snacks Corner P3', platform_number: '3', schematic_x: 500, schematic_y: 210, current_status: 'WORKING' },
    { station_code: 'NDLS', amenity_type: 'MEDICAL', label: 'First Aid P4', platform_number: '4', schematic_x: 700, schematic_y: 270, current_status: 'WORKING' },
    { station_code: 'NDLS', amenity_type: 'WAITING_ROOM', label: 'AC Waiting Room P1', platform_number: '1', schematic_x: 800, schematic_y: 90, current_status: 'WORKING' },
    { station_code: 'NDLS', amenity_type: 'AUTO_STAND', label: 'Pre-paid Auto Ajmeri', platform_number: null, schematic_x: 150, schematic_y: 550, current_status: 'WORKING' },
    { station_code: 'NDLS', amenity_type: 'CLOAK_ROOM', label: 'Cloak Room', platform_number: '1', schematic_x: 50, schematic_y: 90, current_status: 'WORKING' },
    { station_code: 'NDLS', amenity_type: 'ATM', label: 'SBI ATM', platform_number: null, schematic_x: 450, schematic_y: 450, current_status: 'WORKING' },
    { station_code: 'NDLS', amenity_type: 'TOILET', label: 'Concourse Toilet', platform_number: null, schematic_x: 800, schematic_y: 450, current_status: 'WORKING' },
    { station_code: 'NDLS', amenity_type: 'WATER', label: 'Concourse Water', platform_number: null, schematic_x: 750, schematic_y: 450, current_status: 'WORKING' },
    
    // CSTM
    { station_code: 'CSTM', amenity_type: 'TOILET', label: 'Platform 1 Toilet', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'CSTM', amenity_type: 'WATER', label: 'Water Cooler P1', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'CSTM', amenity_type: 'FOOD_STALL', label: 'Vada Pav Stall', platform_number: '2', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'CSTM', amenity_type: 'MEDICAL', label: 'Medical Room', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'CSTM', amenity_type: 'WAITING_ROOM', label: 'Upper Class Waiting', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'CSTM', amenity_type: 'TOILET', label: 'Main Concourse Toilet', platform_number: null, schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'CSTM', amenity_type: 'ATM', label: 'HDFC ATM', platform_number: null, schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'CSTM', amenity_type: 'AUTO_STAND', label: 'Taxi Stand', platform_number: null, schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'CSTM', amenity_type: 'CLOAK_ROOM', label: 'Cloak Room', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'CSTM', amenity_type: 'FOOD_STALL', label: 'Tea Stall', platform_number: '5', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },

    // ADI
    { station_code: 'ADI', amenity_type: 'TOILET', label: 'Platform 1 Toilet', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'CONFIRMED_BROKEN' },
    { station_code: 'ADI', amenity_type: 'WATER', label: 'Water Cooler P1', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'ADI', amenity_type: 'FOOD_STALL', label: 'Dhokla Stand', platform_number: '2', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'ADI', amenity_type: 'MEDICAL', label: 'First Aid P1', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'ADI', amenity_type: 'WAITING_ROOM', label: 'Waiting Room', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'ADI', amenity_type: 'TOILET', label: 'Platform 4 Toilet', platform_number: '4', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'ADI', amenity_type: 'ATM', label: 'ICICI ATM', platform_number: null, schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'ADI', amenity_type: 'AUTO_STAND', label: 'Auto Stand West', platform_number: null, schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'ADI', amenity_type: 'CLOAK_ROOM', label: 'Cloak Room', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'ADI', amenity_type: 'FOOD_STALL', label: 'Tea Stall', platform_number: '5', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },

    // SBC
    { station_code: 'SBC', amenity_type: 'TOILET', label: 'Platform 1 Toilet', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'SBC', amenity_type: 'WATER', label: 'Water Cooler P1', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'SBC', amenity_type: 'FOOD_STALL', label: 'Idli Dosa Stall', platform_number: '2', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'SBC', amenity_type: 'MEDICAL', label: 'First Aid', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'SBC', amenity_type: 'WAITING_ROOM', label: 'Waiting Room', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'SBC', amenity_type: 'TOILET', label: 'Platform 5 Toilet', platform_number: '5', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'SBC', amenity_type: 'ATM', label: 'Axis ATM', platform_number: null, schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'SBC', amenity_type: 'AUTO_STAND', label: 'Prepaid Auto', platform_number: null, schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'SBC', amenity_type: 'CLOAK_ROOM', label: 'Cloak Room', platform_number: '1', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
    { station_code: 'SBC', amenity_type: 'FOOD_STALL', label: 'Coffee Point', platform_number: '3', schematic_x: randomX(), schematic_y: randomY(), current_status: 'WORKING' },
  ];

  const { error } = await supabase.from('amenities').insert(amenities);
  if (error) throw error;
  console.log(`✅ Seeded ${amenities.length} amenities.`);
}

async function seedVendors() {
  console.log('Seeding Vendors...');
  
  const vendors = [
    // NDLS
    { station_code: 'NDLS', name: 'Sharma Sweets & Snacks', category: 'FOOD', licence_number: 'LIC-ND-001', platform_number: '1', stall_number: 'S1', operating_hours: '24x7', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 45, is_active: true },
    { station_code: 'NDLS', name: 'Rajdhani Meals', category: 'FOOD', licence_number: 'LIC-ND-002', platform_number: '3', stall_number: 'S12', operating_hours: '06:00-23:00', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 120, is_active: true },
    { station_code: 'NDLS', name: 'Aggarwal Refreshments', category: 'FOOD', licence_number: 'LIC-ND-003', platform_number: '5', stall_number: 'S8', operating_hours: '24x7', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 80, is_active: true },
    { station_code: 'NDLS', name: 'Delhi Tea House', category: 'BEVERAGE', licence_number: 'LIC-ND-004', platform_number: '2', stall_number: 'T1', operating_hours: '24x7', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 210, is_active: true },
    { station_code: 'NDLS', name: 'Book Stall & Mag', category: 'RETAIL', licence_number: 'LIC-ND-005', platform_number: '1', stall_number: 'B4', operating_hours: '08:00-22:00', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 12, is_active: true },

    // CSTM
    { station_code: 'CSTM', name: 'Aahar Fast Food', category: 'FOOD', licence_number: 'LIC-CS-001', platform_number: '1', stall_number: 'S1', operating_hours: '24x7', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 34, is_active: true },
    { station_code: 'CSTM', name: 'Shiv Vada Pav', category: 'FOOD', licence_number: 'LIC-CS-002', platform_number: '2', stall_number: 'S2', operating_hours: '05:00-23:00', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 500, is_active: true },
    { station_code: 'CSTM', name: 'Bombay Chai', category: 'BEVERAGE', licence_number: 'LIC-CS-003', platform_number: '4', stall_number: 'T2', operating_hours: '24x7', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 88, is_active: true },
    { station_code: 'CSTM', name: 'News & Books', category: 'RETAIL', licence_number: 'LIC-CS-004', platform_number: '1', stall_number: 'B1', operating_hours: '08:00-22:00', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 15, is_active: true },

    // ADI
    { station_code: 'ADI', name: 'Gujarat Snacks', category: 'FOOD', licence_number: 'LIC-AD-001', platform_number: '1', stall_number: 'S5', operating_hours: '24x7', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 67, is_active: true },
    { station_code: 'ADI', name: 'Karnavati Chai', category: 'BEVERAGE', licence_number: 'LIC-AD-002', platform_number: '3', stall_number: 'T5', operating_hours: '06:00-23:00', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 110, is_active: true },
    { station_code: 'ADI', name: 'Saurashtra Farsan', category: 'FOOD', licence_number: 'LIC-AD-003', platform_number: '5', stall_number: 'S8', operating_hours: '06:00-22:00', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 90, is_active: true },
    { station_code: 'ADI', name: 'Book Stall', category: 'RETAIL', licence_number: 'LIC-AD-004', platform_number: '1', stall_number: 'B2', operating_hours: '08:00-22:00', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 20, is_active: true },

    // SBC
    { station_code: 'SBC', name: 'Namma Oota', category: 'FOOD', licence_number: 'LIC-SB-001', platform_number: '1', stall_number: 'S1', operating_hours: '24x7', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 150, is_active: true },
    { station_code: 'SBC', name: 'Filter Coffee Point', category: 'BEVERAGE', licence_number: 'LIC-SB-002', platform_number: '2', stall_number: 'T1', operating_hours: '05:00-23:00', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 300, is_active: true },
    { station_code: 'SBC', name: 'Malgudi Snacks', category: 'FOOD', licence_number: 'LIC-SB-003', platform_number: '4', stall_number: 'S4', operating_hours: '06:00-22:00', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 115, is_active: true },
    { station_code: 'SBC', name: 'Daily News', category: 'RETAIL', licence_number: 'LIC-SB-004', platform_number: '1', stall_number: 'B1', operating_hours: '08:00-22:00', schematic_x: randomX(), schematic_y: randomY(), average_rating: randomRating(), review_count: 10, is_active: true },
  ];

  const { error } = await supabase.from('vendors').insert(vendors);
  if (error) throw error;
  console.log(`✅ Seeded ${vendors.length} vendors.`);
}

async function seedIntents() {
  console.log('Seeding Travel Intents...');
  
  const intents = [];
  
  const monday = getNextDay(1);
  const wednesday = getNextDay(3);
  const friday = getNextDay(5);

  // NDLS->MMCT Monday (25)
  for (let i=0; i<25; i++) {
    intents.push({ user_id: SEED_USERS[i % 15], from_station: 'NDLS', to_station: 'MMCT', travel_date: monday, class: 'GEN', crowding_score: 9.5, crowding_label: 'VERY HIGH', is_surge_route: true });
  }

  // NDLS->MMCT Wednesday (8)
  for (let i=0; i<8; i++) {
    intents.push({ user_id: SEED_USERS[i % 15], from_station: 'NDLS', to_station: 'MMCT', travel_date: wednesday, class: 'GEN', crowding_score: 5.5, crowding_label: 'MODERATE', is_surge_route: false });
  }

  // ADI->MMCT Friday (20)
  for (let i=0; i<20; i++) {
    intents.push({ user_id: SEED_USERS[i % 15], from_station: 'ADI', to_station: 'MMCT', travel_date: friday, class: 'GEN', crowding_score: 8.5, crowding_label: 'HIGH', is_surge_route: true });
  }

  // NDLS->LKO (15)
  for (let i=0; i<15; i++) {
    const d = new Date(); d.setDate(d.getDate() + (i%5));
    intents.push({ user_id: SEED_USERS[i % 15], from_station: 'NDLS', to_station: 'LKO', travel_date: d.toISOString().split('T')[0], class: 'GEN', crowding_score: 6.0, crowding_label: 'MODERATE', is_surge_route: false });
  }

  // PNBE->NDLS (12)
  for (let i=0; i<12; i++) {
    const d = new Date(); d.setDate(d.getDate() + (i%3));
    intents.push({ user_id: SEED_USERS[i % 15], from_station: 'PNBE', to_station: 'NDLS', travel_date: d.toISOString().split('T')[0], class: 'GEN', crowding_score: 7.0, crowding_label: 'MODERATE', is_surge_route: false });
  }

  // SBC->MAS (10)
  for (let i=0; i<10; i++) {
    intents.push({ user_id: SEED_USERS[i % 15], from_station: 'SBC', to_station: 'MAS', travel_date: monday, class: 'GEN', crowding_score: 6.5, crowding_label: 'MODERATE', is_surge_route: false });
  }

  // HWH->PNBE (10)
  for (let i=0; i<10; i++) {
    intents.push({ user_id: SEED_USERS[i % 15], from_station: 'HWH', to_station: 'PNBE', travel_date: friday, class: 'GEN', crowding_score: 6.5, crowding_label: 'MODERATE', is_surge_route: false });
  }

  // Remaining (100) spread across random routes to hit 200 total
  const routes = [
    { from: 'CSTM', to: 'BSL' },
    { from: 'MAS', to: 'BZA' },
    { from: 'NDLS', to: 'PNBE' },
    { from: 'PUNE', to: 'MMCT' }
  ];
  for (let i=0; i<100; i++) {
    const r = routes[i % routes.length];
    const d = new Date(); d.setDate(d.getDate() + (i%7));
    intents.push({ user_id: SEED_USERS[i % 15], from_station: r.from, to_station: r.to, travel_date: d.toISOString().split('T')[0], class: 'GEN', crowding_score: 5.0, crowding_label: 'MODERATE', is_surge_route: false });
  }

  // Clean table first
  await supabase.from('travel_intents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await supabase.from('travel_intents').insert(intents);
  if (error) throw error;
  console.log(`✅ Seeded ${intents.length} travel intents.`);
}

async function seedCheckins() {
  console.log('Seeding Station Check-ins...');
  
  const checkins = [];
  const expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  // NDLS (15)
  for (let i=0; i<15; i++) {
    checkins.push({
      user_id: SEED_USERS[i],
      station_code: 'NDLS',
      lat: 28.642,
      lng: 77.220,
      expires_at
    });
  }

  // CSTM (3)
  for (let i=0; i<3; i++) {
    checkins.push({
      user_id: SEED_USERS[i],
      station_code: 'CSTM',
      lat: 18.940,
      lng: 72.835,
      expires_at
    });
  }

  // Clean table first
  await supabase.from('station_checkins').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await supabase.from('station_checkins').insert(checkins);
  if (error) throw error;
  console.log(`✅ Seeded ${checkins.length} check-ins.`);
}

async function seedUsers() {
  console.log('Seeding Dummy Users...');
  const users = SEED_USERS.map((id, i) => ({
    id,
    phone: `90000000${(i + 1).toString().padStart(2, '0')}`,
    name: `Seed User ${i + 1}`,
    is_verified: true,
    preferred_class: 'SL',
    emergency_contacts: []
  }));

  const { error } = await supabase.from('users').upsert(users, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✅ Seeded ${users.length} dummy users.`);
}

async function run() {
  try {
    // 1. Seed referenced users first to satisfy foreign key constraints
    await seedUsers();

    const { count } = await supabase.from('amenities').select('*', { count: 'exact', head: true });
    
    if (count > 0 && !FORCE_RESEED) {
      console.log('Data already exists and FORCE_RESEED is not true. Skipping amenity & vendor seed.');
    } else {
      if (FORCE_RESEED) {
        console.log('Force reseed enabled. Please note upsert might not overwrite all if IDs exist, but we proceed.');
      }
      await seedAmenities();
      await seedVendors();
    }
    
    await seedIntents();
    await seedCheckins();

    console.log('Seed complete. Summary: Setup successful for 4 stations and over 200 travel intents.');
  } catch (error) {
    console.error('Seed script failed:', error);
  }
}

run();
