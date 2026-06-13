// scripts/seed-demo-user.js
// Seeds the exact database records required for the live hackathon demo day.

const fs = require('fs');
const path = require('path');

// Load env variables
const apiEnv = path.join(__dirname, '../services/api/.env');
const rootEnv = path.join(__dirname, '../.env');
if (fs.existsSync(apiEnv)) {
  require('dotenv').config({ path: apiEnv });
} else if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else {
  require('dotenv').config();
}

const { createClient } = require('@supabase/supabase-js');

const isMock = !process.env.SUPABASE_URL ||
               process.env.SUPABASE_URL.includes('mockproject.supabase.co') ||
               !process.env.SUPABASE_SERVICE_KEY ||
               process.env.SUPABASE_SERVICE_KEY.includes('mock');

let supabase;
if (isMock) {
  console.log('Running in MOCK mode (mock or missing Supabase credentials)');
  supabase = {
    from: (table) => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: (data) => Promise.resolve({ data, error: null }),
      upsert: (data) => Promise.resolve({ data, error: null }),
      delete: () => ({ neq: () => Promise.resolve({ data: [], error: null }) })
    })
  };
} else {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function seedDemo() {
  try {
    console.log('Preparing demo day data...');

    // 1. Demo User
    const demoUser = {
      phone: '9999999999',
      name: 'Arjun Sharma',
      supabase_auth_uid: 'afa5b750-76ce-49b4-9152-268206e80f0c',
      firebase_uid: 'demo_firebase_uid_123',
      emergency_contacts: ['9000000001', '9000000002', '9000000003'],
      preferred_class: '3A',
      is_verified: true,
      updated_at: new Date().toISOString()
    };

    let userId;
    if (isMock) {
      userId = 'mock-demo-user-uuid';
      console.log('Seeding demo user... done (Arjun Sharma)');
    } else {
      console.log('Seeding demo user...');
      // Check if user exists
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', demoUser.phone)
        .maybeSingle();

      if (findError) throw findError;

      if (existingUser) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(demoUser)
          .eq('id', existingUser.id)
          .select('id')
          .single();
        if (updateError) throw updateError;
        userId = updatedUser.id;
      } else {
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert(demoUser)
          .select('id')
          .single();
        if (insertError) throw insertError;
        userId = insertedUser.id;
      }
      console.log(`Seeding demo user... done (User UUID: ${userId})`);
    }

    // 2. Demo Journey
    try {
      const travelDate = new Date();
      travelDate.setDate(travelDate.getDate() + 7);
      const travelDateStr = travelDate.toISOString().split('T')[0];

      const demoJourney = {
        user_id: userId,
        pnr: '4567890123',
        train_number: '12951',
        train_name: 'Mumbai Rajdhani',
        boarding_station: 'NDLS',
        destination_station: 'MMCT',
        travel_date: travelDateStr,
        coach: 'B4',
        berth: '32',
        class: '3A',
        status: 'CONFIRMED',
        raw_api_response: { demo: true },
        updated_at: new Date().toISOString()
      };

      if (isMock) {
        console.log(`Seeding demo journey for PNR 4567890123... done`);
      } else {
        console.log('Seeding demo journey...');
        const { error: journeyError } = await supabase
          .from('journeys')
          .upsert(demoJourney, { onConflict: 'user_id,pnr' });
        if (journeyError) throw journeyError;
        console.log(`Seeding demo journey... done (PNR: 4567890123, Date: ${travelDateStr})`);
      }
    } catch (err) {
      console.warn('⚠️ Seeding demo journey failed:', err.message);
    }

    // 3. Demo Complaints
    const complaintDates = [5, 2, 0];
    try {
      const mockComplaints = [
        {
          user_id: userId,
          reference_number: 'RS-20260606-11111',
          complaint_type: 'CLEANLINESS',
          station_code: 'NDLS',
          station_name: 'New Delhi',
          status: 'RESOLVED',
          train_number: '12951',
          train_name: 'Mumbai Rajdhani',
          description: 'Trash piled up in vestibule near coach B4.',
          station_lat: 28.6415,
          station_lng: 77.2193,
          priority: 'NORMAL'
        },
        {
          user_id: userId,
          reference_number: 'RS-20260609-22222',
          complaint_type: 'AC_HEATING',
          station_code: 'MMCT',
          station_name: 'Mumbai Central',
          status: 'IN_PROGRESS',
          train_number: '12951',
          train_name: 'Mumbai Rajdhani',
          description: 'AC blowing hot air in coach B4, berth 32.',
          station_lat: 18.9696,
          station_lng: 72.8193,
          priority: 'NORMAL'
        },
        {
          user_id: userId,
          reference_number: 'RS-20260611-33333',
          complaint_type: 'STAFF',
          station_code: 'NDLS',
          station_name: 'New Delhi',
          status: 'SUBMITTED',
          train_number: '12951',
          train_name: 'Mumbai Rajdhani',
          description: 'Pantry staff overcharging for tea.',
          station_lat: 28.6415,
          station_lng: 77.2193,
          priority: 'NORMAL'
        }
      ].map((c, idx) => {
        const date = new Date();
        date.setDate(date.getDate() - complaintDates[idx]);
        return { ...c, created_at: date.toISOString(), updated_at: date.toISOString() };
      });

      if (isMock) {
        console.log('Seeding demo complaints... done (3 complaints)');
      } else {
        console.log('Seeding demo complaints...');
        // Delete existing complaints with the specific reference numbers to avoid duplicates
        await supabase.from('complaints')
          .delete()
          .in('reference_number', ['RS-20260606-11111', 'RS-20260609-22222', 'RS-20260611-33333']);
        const { error: compError } = await supabase.from('complaints').insert(mockComplaints);
        if (compError) throw compError;
        console.log('Seeding demo complaints... done (3 rows)');
      }
    } catch (err) {
      console.warn('⚠️ Seeding demo complaints failed:', err.message);
    }

    // 4. Active SOS Alert
    try {
      const sosTime = new Date();
      sosTime.setMinutes(sosTime.getMinutes() - 30);
      const demoSos = {
        user_id: userId,
        type: 'SOS',
        train_number: '12952',
        coach: 'B2',
        lat: 19.0760,
        lng: 72.8777,
        description: 'Emergency assistance required in coach B2',
        resolved: false,
        created_at: sosTime.toISOString()
      };

      if (isMock) {
        console.log('Seeding active SOS alert... done');
      } else {
        console.log('Seeding active SOS alert...');
        // Insert SOS alert
        const { error: sosError } = await supabase.from('safety_events').insert(demoSos);
        if (sosError) throw sosError;
        console.log('Seeding active SOS alert... done');
      }
    } catch (err) {
      console.warn('⚠️ Seeding active SOS alert skipped (table might not exist yet):', err.message);
    }

    // 5. Tatkal Demo Request
    try {
      const tatkalDate = new Date();
      tatkalDate.setDate(tatkalDate.getDate() + 5);
      const demoTatkal = {
        user_id: userId,
        train_number: '12951',
        journey_date: tatkalDate.toISOString().split('T')[0],
        class: '3A',
        urgency_score: 9,
        status: 'Queued',
        created_at: new Date().toISOString()
      };

      if (isMock) {
        console.log('Seeding Tatkal request... done');
      } else {
        console.log('Seeding Tatkal request...');
        const { error: tatkalError } = await supabase.from('tatkal_requests').insert(demoTatkal);
        if (tatkalError) throw tatkalError;
        console.log('Seeding Tatkal request... done');
      }
    } catch (err) {
      console.warn('⚠️ Seeding Tatkal request skipped (table might not exist yet):', err.message);
    }

    // 6. Demand Surge
    try {
      const surgeIntents = [];
      for (let i = 0; i < 3; i++) {
        const intentDate = new Date();
        intentDate.setDate(intentDate.getDate() + (i % 7));
        surgeIntents.push({
          from_station: 'NDLS',
          to_station: 'MMCT',
          class: '3A',
          travel_date: intentDate.toISOString().split('T')[0],
          is_surge: true,
          is_surge_route: true,
          created_at: new Date().toISOString()
        });
      }

      if (isMock) {
        console.log('Seeding NDLS-MMCT travel intents (surge)... done');
      } else {
        console.log('Seeding NDLS-MMCT travel intents (surge)...');
        const { error: surgeError } = await supabase.from('travel_intents').insert(surgeIntents);
        if (surgeError) throw surgeError;
        console.log('Seeding NDLS-MMCT travel intents (surge)... done');
      }
    } catch (err) {
      console.warn('⚠️ Seeding travel intents failed:', err.message);
    }

    console.log('\nDemo day seeding complete successfully!');
  } catch (err) {
    console.error('Demo seeding failed:', err);
    process.exit(1);
  }
}

seedDemo();
