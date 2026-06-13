// scripts/seed-complaints.js
// Seeds the database with 300 synthetic complaints for demo day.
// Run with: NODE_PATH=services/api/node_modules node scripts/seed-complaints.js

const fs = require('fs');
const path = require('path');

// Load environment variables
const apiEnvPath = path.join(__dirname, '../services/api/.env');
if (fs.existsSync(apiEnvPath)) {
  require('dotenv').config({ path: apiEnvPath });
} else {
  require('dotenv').config();
}

const isMock = !process.env.SUPABASE_URL ||
               process.env.SUPABASE_URL.includes('mockproject.supabase.co') ||
               !process.env.SUPABASE_SERVICE_KEY ||
               process.env.SUPABASE_SERVICE_KEY.includes('mock');

const STATIONS = [
  { station_code: 'NDLS', station_name: 'New Delhi', lat: 28.6419, lng: 77.2194 },
  { station_code: 'MMCT', station_name: 'Mumbai Central', lat: 18.9688, lng: 72.8195 },
  { station_code: 'MAS', station_name: 'Chennai Central', lat: 13.0827, lng: 80.2707 },
  { station_code: 'HWH', station_name: 'Howrah Junction', lat: 22.5839, lng: 88.3424 },
  { station_code: 'SBC', station_name: 'Bengaluru City', lat: 12.9767, lng: 77.5713 },
  { station_code: 'ADI', station_name: 'Ahmedabad Junction', lat: 23.0258, lng: 72.6017 },
  { station_code: 'PUNE', station_name: 'Pune Junction', lat: 18.5196, lng: 73.8553 },
  { station_code: 'LKO', station_name: 'Lucknow', lat: 26.8352, lng: 80.9049 },
  { station_code: 'JP', station_name: 'Jaipur Junction', lat: 26.9124, lng: 75.7873 },
  { station_code: 'BPL', station_name: 'Bhopal Junction', lat: 23.2646, lng: 77.4139 },
  { station_code: 'PNBE', station_name: 'Patna Junction', lat: 25.6102, lng: 85.1399 },
  { station_code: 'GHY', station_name: 'Guwahati', lat: 26.1842, lng: 91.7511 },
  { station_code: 'HYB', station_name: 'Hyderabad Deccan', lat: 17.3924, lng: 78.4709 },
  { station_code: 'JAT', station_name: 'Jammu Tawi', lat: 32.7266, lng: 74.8570 },
  { station_code: 'VSKP', station_name: 'Visakhapatnam', lat: 17.6887, lng: 83.2185 },
  { station_code: 'CNB', station_name: 'Kanpur Central', lat: 26.4498, lng: 80.3319 },
  { station_code: 'AGC', station_name: 'Agra Cantt', lat: 27.1592, lng: 77.9858 },
  { station_code: 'UDZ', station_name: 'Udaipur City', lat: 24.5718, lng: 73.6791 },
  { station_code: 'CSTM', station_name: 'Mumbai CST', lat: 18.9401, lng: 72.8357 },
  { station_code: 'SC', station_name: 'Secunderabad', lat: 17.4344, lng: 78.5013 },
  { station_code: 'MFP', station_name: 'Muzaffarpur Junction', lat: 26.1197, lng: 85.3910 },
  { station_code: 'GAYA', station_name: 'Gaya Junction', lat: 24.7914, lng: 85.0002 },
  { station_code: 'DHN', station_name: 'Dhanbad Junction', lat: 23.7957, lng: 86.4304 },
  { station_code: 'RNC', station_name: 'Ranchi Junction', lat: 23.3441, lng: 85.3096 },
  { station_code: 'BSB', station_name: 'Varanasi Junction', lat: 25.3176, lng: 82.9739 },
  { station_code: 'ALD', station_name: 'Prayagraj Junction', lat: 25.4358, lng: 81.8463 },
  { station_code: 'GKP', station_name: 'Gorakhpur Junction', lat: 26.7606, lng: 83.3732 },
  { station_code: 'LDH', station_name: 'Ludhiana Junction', lat: 30.9010, lng: 75.8573 },
  { station_code: 'ASR', station_name: 'Amritsar Junction', lat: 31.6340, lng: 74.8723 },
  { station_code: 'DLI', station_name: 'Old Delhi Junction', lat: 28.6562, lng: 77.2273 },
  { station_code: 'NZM', station_name: 'Hazrat Nizamuddin', lat: 28.5877, lng: 77.2518 },
  { station_code: 'BCT', station_name: 'Bandra Terminus', lat: 19.0544, lng: 72.8405 },
  { station_code: 'DR', station_name: 'Dadar', lat: 19.0186, lng: 72.8421 },
  { station_code: 'KYN', station_name: 'Kalyan Junction', lat: 19.2403, lng: 73.1305 },
  { station_code: 'ST', station_name: 'Surat', lat: 21.2060, lng: 72.8311 },
  { station_code: 'BRC', station_name: 'Vadodara Junction', lat: 22.3119, lng: 73.1723 },
  { station_code: 'RTM', station_name: 'Ratlam Junction', lat: 23.3315, lng: 75.0367 },
  { station_code: 'SWM', station_name: 'Sawai Madhopur', lat: 26.0144, lng: 76.3530 },
  { station_code: 'AJM', station_name: 'Ajmer Junction', lat: 26.4499, lng: 74.6399 },
  { station_code: 'JU', station_name: 'Jodhpur Junction', lat: 26.2948, lng: 73.0351 },
  { station_code: 'BKN', station_name: 'Bikaner Junction', lat: 28.0229, lng: 73.3119 },
  { station_code: 'JSM', station_name: 'Jaisalmer', lat: 26.9157, lng: 70.9083 },
  { station_code: 'CDG', station_name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { station_code: 'HRI', station_name: 'Hisar', lat: 29.1492, lng: 75.7217 },
  { station_code: 'UMB', station_name: 'Ambala Cantt', lat: 30.3782, lng: 76.8270 },
  { station_code: 'SRE', station_name: 'Saharanpur', lat: 29.9640, lng: 77.5460 },
  { station_code: 'MTJ', station_name: 'Mathura Junction', lat: 27.4924, lng: 77.6737 },
  { station_code: 'AF', station_name: 'Agra Fort', lat: 27.1767, lng: 78.0081 },
  { station_code: 'TVC', station_name: 'Thiruvananthapuram', lat: 8.4875, lng: 76.9525 },
  { station_code: 'CBE', station_name: 'Coimbatore Junction', lat: 11.0018, lng: 76.9629 }
];

const TRAINS = ['12951', '12002', '12301', '12009', '12259', '12627', '12618', '12649', '12721', '22691'];
const COACHES = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'A1', 'A2'];

const DESCRIPTIONS = {
  CLEANLINESS: [
    'Trash is piled up in the vestibule next to the toilets.',
    'The compartment floor is extremely dirty and has not been swept.',
    'Toilets are clogged and releasing a very bad odor in the coach.'
  ],
  AC_HEATING: [
    'The AC is not cooling at all, the coach temperature is very high.',
    'The AC is blowing hot air instead of cold air in coach B2.',
    'AC temperature is set too low and passengers are freezing.'
  ],
  STAFF: [
    'The pantry staff was rude when I asked for a bill.',
    'The coach attendant is not available at their seat.',
    'Pantry staff is charging extra for bottled water.'
  ],
  FOOD: [
    'The served lunch food was stale and smelled bad.',
    'The soup served was cold and had insects in it.',
    'Extremely poor quality and taste of dinner food.'
  ],
  SAFETY: [
    'Suspicious unattended black bag under seat number 32.',
    'A passenger is traveling without a ticket and behaving aggressively.',
    'The door of the coach is not locking properly, security concern.'
  ],
  OVERCROWDING: [
    'General ticket holders have entered the reserved sleeper coach.',
    'Too many people standing in the passage of coach S3, blocking toilets.',
    'Passageways are completely blocked by unauthorized passengers.'
  ],
  AMENITY: [
    'Charging socket next to berth 15 is not functioning.',
    'The window glass is cracked and letting dust in.',
    'Water is not available in the toilets of coach B4.'
  ],
  OTHER: [
    'The train is delayed by over 4 hours without any announcements.',
    'Co-passenger is playing loud music on their phone without headphones.',
    'Coaches are shaking excessively during high-speed runs.'
  ]
};

async function seed() {
  try {
    console.log('Starting complaints and timeline seeding...');

    let supabase;
    let userId = 'mock-demo-user-uuid';
    let resolvedStations = [...STATIONS];

    if (!isMock) {
      supabase = require('../services/api/src/db/supabase-client');

      // Idempotency check
      const { count, error: countError } = await supabase
        .from('complaints')
        .select('id', { count: 'exact', head: true });

      if (countError) throw countError;

      const hasForce = process.argv.includes('--force');
      if (count && count > 100 && !hasForce) {
        console.log(`⚠️  Complaints table already seeded (${count} rows). Run with --force to re-seed.`);
        process.exit(0);
      }

      if (hasForce) {
        console.log('Wiping existing complaints data (--force enabled)...');
        const { error: deleteError } = await supabase.from('complaints').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (deleteError) throw deleteError;
      }

      // Fetch demo user or any user
      console.log('Fetching a valid user...');
      const { data: demoUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', '9999999999')
        .maybeSingle();

      if (userError) throw userError;

      if (demoUser) {
        userId = demoUser.id;
      } else {
        const { data: anyUser, error: anyUserError } = await supabase
          .from('users')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (anyUserError) throw anyUserError;
        if (!anyUser) {
          console.error('✖ Error: No users found in database. Seed users first!');
          process.exit(1);
        }
        userId = anyUser.id;
      }
      console.log(`Using User ID: ${userId}`);

      // Fetch station coordinates dynamically
      console.log('Fetching stations from station_coordinates table...');
      const { data: dbStations, error: stationsErr } = await supabase
        .from('station_coordinates')
        .select('station_code, station_name, lat, lng');

      if (stationsErr) {
        console.warn('⚠️ Warning: Failed to fetch station coordinates from DB:', stationsErr.message);
      } else if (dbStations && dbStations.length > 0) {
        resolvedStations = dbStations;
        console.log(`Loaded ${resolvedStations.length} stations from database.`);
      }
    }

    // Generate distributions
    // CLEANLINESS: 90, AC_HEATING: 60, STAFF: 45, FOOD: 30, SAFETY: 30, OVERCROWDING: 24, AMENITY: 15, OTHER: 6
    const types = [];
    const addTypes = (type, count) => {
      for (let i = 0; i < count; i++) types.push(type);
    };
    addTypes('CLEANLINESS', 90);
    addTypes('AC_HEATING', 60);
    addTypes('STAFF', 45);
    addTypes('FOOD', 30);
    addTypes('SAFETY', 30);
    addTypes('OVERCROWDING', 24);
    addTypes('AMENITY', 15);
    addTypes('OTHER', 6);

    // Shuffle types to disperse randomly
    types.sort(() => Math.random() - 0.5);

    // Non-safety statuses: SUBMITTED (90), ACKNOWLEDGED (60), RESOLVED (75), REJECTED (15), IN_PROGRESS (30)
    // Safety status is always IN_PROGRESS (30)
    const nonSafetyStatuses = [];
    const addStatuses = (status, count) => {
      for (let i = 0; i < count; i++) nonSafetyStatuses.push(status);
    };
    addStatuses('SUBMITTED', 90);
    addStatuses('ACKNOWLEDGED', 60);
    addStatuses('IN_PROGRESS', 30);
    addStatuses('RESOLVED', 75);
    addStatuses('REJECTED', 15);
    
    nonSafetyStatuses.sort(() => Math.random() - 0.5);

    const complaintsToInsert = [];
    let nonSafetyIdx = 0;

    for (let i = 0; i < 300; i++) {
      const type = types[i];
      const isSafety = type === 'SAFETY';
      
      const status = isSafety ? 'IN_PROGRESS' : nonSafetyStatuses[nonSafetyIdx++];
      const priority = isSafety ? 'CRITICAL' : 'NORMAL';

      // Pick random station details
      const station = resolvedStations[Math.floor(Math.random() * resolvedStations.length)];
      const stationCode = station.station_code;
      const stationName = station.station_name;
      const stationLat = station.lat;
      const stationLng = station.lng;

      // Date offset (0 to 90 days ago)
      const offsetDays = Math.floor(Math.random() * 90);
      const complaintDate = new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000);
      
      // Reference Number format: RS-YYYYMMDD-XXXXX
      const dateStr = complaintDate.toISOString().slice(0, 10).replace(/-/g, '');
      const randSuffix = Math.floor(10000 + Math.random() * 90000);
      const referenceNumber = `RS-${dateStr}-${randSuffix}`;

      // Pick random template description
      const descList = DESCRIPTIONS[type];
      const description = descList[Math.floor(Math.random() * descList.length)];

      // Pick random train (50% of complaints are station-only and have no train)
      const trainNumber = i % 2 === 0 ? TRAINS[i % TRAINS.length] : null;
      const coach = trainNumber ? COACHES[Math.floor(Math.random() * COACHES.length)] : null;
      const berth = trainNumber ? String(Math.floor(Math.random() * 72) + 1) : null;
      const trainName = trainNumber ? `Express Train ${trainNumber}` : null;

      // Construct complaint record
      const complaint = {
        user_id: userId,
        reference_number: referenceNumber,
        complaint_type: type,
        description: description,
        photo_url: null,
        pnr_number: null,
        train_number: trainNumber,
        train_name: trainName,
        coach: coach,
        berth: berth,
        station_code: stationCode,
        station_name: stationName,
        travel_date: complaintDate.toISOString().split('T')[0],
        station_lat: stationLat,
        station_lng: stationLng,
        status: status,
        priority: priority,
        is_reopened: false,
        reopen_count: 0,
        expo_push_token: null,
        created_at: complaintDate.toISOString(),
        updated_at: complaintDate.toISOString()
      };

      complaintsToInsert.push(complaint);
    }

    if (isMock) {
      console.log('Running in MOCK mode — simulating inserting 300 complaints...');
      for (let i = 0; i < complaintsToInsert.length; i += 50) {
        console.log(`Inserting batch ${i / 50 + 1}/6...`);
      }
      console.log('✅ Seeded 300 complaint records and 630 timeline entries.');
      process.exit(0);
    }

    // Live Insertion in Batches of 50
    let totalComplaintsInserted = 0;
    let totalTimelineInserted = 0;

    for (let i = 0; i < complaintsToInsert.length; i += 50) {
      const batch = complaintsToInsert.slice(i, i + 50);
      console.log(`Inserting batch ${i / 50 + 1}/6...`);

      // Insert complaints
      const { data: insertedBatch, error: insertError } = await supabase
        .from('complaints')
        .insert(batch)
        .select('id, status, created_at, complaint_type');

      if (insertError) throw insertError;
      totalComplaintsInserted += insertedBatch.length;

      // Generate and batch insert timeline entries for this batch
      const timelineEntries = [];
      for (const comp of insertedBatch) {
        const createdTime = new Date(comp.created_at);

        // 1. Always add SUBMITTED
        timelineEntries.push({
          complaint_id: comp.id,
          from_status: null,
          to_status: 'SUBMITTED',
          changed_by: 'USER',
          note: 'Complaint filed by passenger.',
          created_at: createdTime.toISOString()
        });

        const status = comp.status;

        if (status === 'ACKNOWLEDGED') {
          timelineEntries.push({
            complaint_id: comp.id,
            from_status: 'SUBMITTED',
            to_status: 'ACKNOWLEDGED',
            changed_by: 'ADMIN',
            note: 'Complaint acknowledged by zone officer.',
            created_at: new Date(createdTime.getTime() + 15 * 60 * 1000).toISOString()
          });
        } else if (status === 'IN_PROGRESS') {
          if (comp.complaint_type === 'SAFETY') {
            // Safety auto-escalation
            timelineEntries.push({
              complaint_id: comp.id,
              from_status: 'SUBMITTED',
              to_status: 'IN_PROGRESS',
              changed_by: 'SYSTEM',
              note: 'Auto-escalated: Safety complaint — priority handling activated.',
              created_at: new Date(createdTime.getTime() + 1 * 60 * 1000).toISOString()
            });
          } else {
            // Normal escalation
            timelineEntries.push({
              complaint_id: comp.id,
              from_status: 'SUBMITTED',
              to_status: 'ACKNOWLEDGED',
              changed_by: 'ADMIN',
              note: 'Complaint acknowledged by zone officer.',
              created_at: new Date(createdTime.getTime() + 15 * 60 * 1000).toISOString()
            });
            timelineEntries.push({
              complaint_id: comp.id,
              from_status: 'ACKNOWLEDGED',
              to_status: 'IN_PROGRESS',
              changed_by: 'ADMIN',
              note: 'Staff dispatched for investigation.',
              created_at: new Date(createdTime.getTime() + 45 * 60 * 1000).toISOString()
            });
          }
        } else if (status === 'RESOLVED') {
          // SUBMITTED -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED
          timelineEntries.push({
            complaint_id: comp.id,
            from_status: 'SUBMITTED',
            to_status: 'ACKNOWLEDGED',
            changed_by: 'ADMIN',
            note: 'Complaint acknowledged by zone officer.',
            created_at: new Date(createdTime.getTime() + 15 * 60 * 1000).toISOString()
          });
          timelineEntries.push({
            complaint_id: comp.id,
            from_status: 'ACKNOWLEDGED',
            to_status: 'IN_PROGRESS',
            changed_by: 'ADMIN',
            note: 'Staff dispatched for investigation.',
            created_at: new Date(createdTime.getTime() + 45 * 60 * 1000).toISOString()
          });
          
          const resolvedTime = new Date(createdTime.getTime() + 3 * 60 * 60 * 1000);
          timelineEntries.push({
            complaint_id: comp.id,
            from_status: 'IN_PROGRESS',
            to_status: 'RESOLVED',
            changed_by: 'ADMIN',
            note: 'Cleaning and repairs completed. Issue resolved.',
            created_at: resolvedTime.toISOString()
          });

          // Set reopen deadline to resolvedTime + 72 hours
          const reopenDeadline = new Date(resolvedTime.getTime() + 72 * 60 * 60 * 1000).toISOString();
          await supabase
            .from('complaints')
            .update({ reopen_deadline: reopenDeadline })
            .eq('id', comp.id);

        } else if (status === 'REJECTED') {
          timelineEntries.push({
            complaint_id: comp.id,
            from_status: 'SUBMITTED',
            to_status: 'REJECTED',
            changed_by: 'ADMIN',
            note: 'Duplicate complaint.',
            created_at: new Date(createdTime.getTime() + 30 * 60 * 1000).toISOString()
          });
        }
      }

      // Insert timeline entries
      const { data: insertedTimeline, error: timelineError } = await supabase
        .from('complaint_timeline')
        .insert(timelineEntries)
        .select('id');

      if (timelineError) throw timelineError;
      totalTimelineInserted += insertedTimeline.length;
    }

    console.log(`✅ Seeded ${totalComplaintsInserted} complaint records and ${totalTimelineInserted} timeline entries.`);
    process.exit(0);

  } catch (err) {
    console.error('✖ Complaint seeding failed:', err.message || err);
    process.exit(1);
  }
}

seed();
