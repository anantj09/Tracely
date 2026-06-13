// scripts/seed-safety.js
// Seeds the database with 100 safety events (SOS, Compartment, Hazard) for demo day.
// Run with: NODE_PATH=services/api/node_modules node scripts/seed-safety.js
// Windows PowerShell: $env:NODE_PATH="services/api/node_modules"; node scripts/seed-safety.js

const fs = require('fs');
const path = require('path');

// 1. Load env from services/api/.env
const apiEnvPath = path.join(__dirname, '../services/api/.env');
if (fs.existsSync(apiEnvPath)) {
  require('dotenv').config({ path: apiEnvPath });
} else {
  require('dotenv').config();
}

// 2. Create supabase client (service role)
const supabase = require('../services/api/src/db/supabase-client');

const STATIONS = [
  { code: 'NDLS', lat: 28.6419, lng: 77.2194 },
  { code: 'MMCT', lat: 18.9688, lng: 72.8195 },
  { code: 'HWH',  lat: 22.5839, lng: 88.3424 },
  { code: 'MAS',  lat: 13.0827, lng: 80.2707 },
  { code: 'SBC',  lat: 12.9767, lng: 77.5713 },
  { code: 'ADI',  lat: 23.0258, lng: 72.6017 },
  { code: 'LKO',  lat: 26.8352, lng: 80.9049 },
  { code: 'JP',   lat: 26.9124, lng: 75.7873 },
  { code: 'BPL',  lat: 23.2646, lng: 77.4139 },
  { code: 'PNBE', lat: 25.6102, lng: 85.1399 },
  { code: 'SC',   lat: 17.4344, lng: 78.5013 },
  { code: 'VSKP', lat: 17.6887, lng: 83.2185 },
  { code: 'CNB',  lat: 26.4498, lng: 80.3319 },
  { code: 'CSTM', lat: 18.9401, lng: 72.8357 },
  { code: 'GHY',  lat: 26.1842, lng: 91.7511 },
  { code: 'BSB',  lat: 25.3176, lng: 82.9739 },
  { code: 'GKP',  lat: 26.7606, lng: 83.3732 },
  { code: 'ASR',  lat: 31.6340, lng: 74.8723 },
  { code: 'NZM',  lat: 28.5877, lng: 77.2518 },
  { code: 'CBE',  lat: 11.0018, lng: 76.9629 },
];

const TRAINS = ['12951', '12301', '12627', '12002', '12259', '12618', '12649', '12721', '12722', '12691'];
const COACHES = ['B1','B2','B3','B4','S1','S2','S3','S4','S5','A1','A2','GEN'];

const SOS_DESCRIPTIONS = {
  PERSONAL_SAFETY: 'Aggressive passenger causing panic near my berth.',
  MEDICAL: 'Passenger feeling severe chest pain and breathlessness.',
  THEFT: 'Luggage stolen from under the lower berth while sleeping.',
  OTHER: 'Emergency safety concern, please dispatch assistance immediately.'
};

const COMPARTMENT_DESCRIPTIONS = {
  MALE_OCCUPANT: 'Male passenger entered the women-only compartment and refuses to leave.',
  HARASSMENT: 'Unruly behavior and harassment by co-passengers in the coach.',
  THREATENING_BEHAVIOUR: 'Aggressive argument and threatening behavior escalating quickly.'
};

const HAZARD_DESCRIPTIONS = {
  UNMANNED_CROSSING: 'Unmanned crossing gate open, high risk of accidents.',
  BROKEN_PLATFORM: 'Broken concrete structure on platform posing trip hazard.',
  POOR_LIGHTING: 'Very dark area near the end of the platform, security hazard.',
  FLOODING: 'Water logging on tracks causing signaling issues and delays.',
  TRACK_DAMAGE: 'Small crack observed on the secondary tracks near signal post.',
  OTHER: 'General track side infrastructure defect observed.'
};

function deriveMaskedInitials(name) {
  if (!name) return 'U.U.';
  const parts = name.trim().split(' ');
  return parts.map(p => p[0].toUpperCase() + '.').join('');
}

function getRandomDate() {
  const now = new Date();
  const diff = Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000); // last 90 days
  return new Date(now.getTime() - diff);
}

async function runSeeding() {
  try {
    console.log('Starting safety events database seeding...');

    // 3. Fetch demo users
    console.log('Fetching demo users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, phone')
      .in('phone', ['9999999999', '9888888888', '9777777777']);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      console.error('✖ Error: No demo users found in database. Seed users first!');
      process.exit(1);
    }
    console.log(`Successfully fetched ${users.length} demo users.`);

    // 4. Idempotency check: if safety_events count > 50, log warning and exit unless --force
    const { count, error: countError } = await supabase
      .from('safety_events')
      .select('id', { count: 'exact', head: true });

    if (countError) throw countError;

    const hasForce = process.argv.includes('--force');
    if (count && count > 50 && !hasForce) {
      console.log(`⚠️  Safety events table already seeded (${count} rows). Run with --force to re-seed.`);
      process.exit(0);
    }

    // 5. If --force: delete all existing safety events with masked_initials set
    if (hasForce) {
      console.log('Wiping existing safety events with masked_initials set...');
      const { error: deleteError } = await supabase
        .from('safety_events')
        .delete()
        .not('masked_initials', 'is', null);
      if (deleteError) throw deleteError;
      console.log('Existing safety events wiped.');
    }

    // 6. Generate event rows (100 total)
    console.log('Generating 100 safety events...');
    const eventsTemplates = [];

    // SOS: 30 events → 5 ACTIVE, 10 ACKNOWLEDGED, 15 RESOLVED
    for (let i = 0; i < 30; i++) {
      let status = 'ACTIVE';
      if (i >= 5 && i < 15) status = 'ACKNOWLEDGED';
      else if (i >= 15) status = 'RESOLVED';
      eventsTemplates.push({ type: 'SOS', status, priority: 'CRITICAL' });
    }

    // COMPARTMENT_VIOLATION: 20 events → 3 ACTIVE, 7 ACKNOWLEDGED, 10 RESOLVED
    for (let i = 0; i < 20; i++) {
      let status = 'ACTIVE';
      if (i >= 3 && i < 10) status = 'ACKNOWLEDGED';
      else if (i >= 10) status = 'RESOLVED';
      eventsTemplates.push({ type: 'COMPARTMENT_VIOLATION', status, priority: 'HIGH' });
    }

    // HAZARD_REPORT: 50 events → 10 ACTIVE, 15 ACKNOWLEDGED, 25 RESOLVED
    for (let i = 0; i < 50; i++) {
      let status = 'ACTIVE';
      if (i >= 10 && i < 25) status = 'ACKNOWLEDGED';
      else if (i >= 25) status = 'RESOLVED';
      eventsTemplates.push({ type: 'HAZARD_REPORT', status, priority: 'MEDIUM' });
    }

    // Assemble full event objects
    const eventsToInsert = eventsTemplates.map((template, index) => {
      const user = users[index % users.length];
      const station = STATIONS[index % STATIONS.length];
      const trainNumber = TRAINS[index % TRAINS.length];
      const coach = COACHES[index % COACHES.length];
      const berth = String(Math.floor(Math.random() * 72) + 1);

      let subtype = '';
      let description = '';
      let lat = station.lat;
      let lng = station.lng;

      if (template.type === 'SOS') {
        const subtypes = ['PERSONAL_SAFETY', 'MEDICAL', 'THEFT', 'OTHER'];
        subtype = subtypes[index % subtypes.length];
        description = SOS_DESCRIPTIONS[subtype];
      } else if (template.type === 'COMPARTMENT_VIOLATION') {
        const subtypes = ['MALE_OCCUPANT', 'HARASSMENT', 'THREATENING_BEHAVIOUR'];
        subtype = subtypes[index % subtypes.length];
        description = COMPARTMENT_DESCRIPTIONS[subtype];
      } else if (template.type === 'HAZARD_REPORT') {
        const subtypes = ['UNMANNED_CROSSING', 'BROKEN_PLATFORM', 'POOR_LIGHTING', 'FLOODING', 'TRACK_DAMAGE', 'OTHER'];
        subtype = subtypes[index % subtypes.length];
        description = HAZARD_DESCRIPTIONS[subtype];
        // Fuzz coordinates ±0.05 degrees
        lat += (Math.random() - 0.5) * 0.1;
        lng += (Math.random() - 0.5) * 0.1;
      }

      const createdAt = getRandomDate();
      let resolvedAt = null;
      let updatedAt = createdAt;

      if (template.status === 'RESOLVED') {
        const resolvedHours = 1 + Math.floor(Math.random() * 6);
        resolvedAt = new Date(createdAt.getTime() + resolvedHours * 60 * 60 * 1000);
        updatedAt = resolvedAt;
      }

      const smsSent = (template.type === 'SOS' && template.status === 'RESOLVED');
      const smsContactsCount = smsSent ? 2 : 0;

      return {
        user_id: user.id,
        event_type: template.type,
        train_number: template.type !== 'HAZARD_REPORT' ? trainNumber : null,
        coach: template.type !== 'HAZARD_REPORT' ? coach : null,
        berth: template.type !== 'HAZARD_REPORT' ? berth : null,
        station_code: station.code,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        alert_subtype: subtype,
        description: description,
        status: template.status,
        priority: template.priority,
        masked_initials: deriveMaskedInitials(user.name),
        sms_sent: smsSent,
        sms_contacts_count: smsContactsCount,
        created_at: createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
        resolved_at: resolvedAt ? resolvedAt.toISOString() : null
      };
    });

    // 7. Insert in batches of 25
    let totalInserted = 0;
    const batchSize = 25;
    for (let i = 0; i < eventsToInsert.length; i += batchSize) {
      const batch = eventsToInsert.slice(i, i + batchSize);
      const batchNumber = i / batchSize + 1;
      const batchCount = Math.ceil(eventsToInsert.length / batchSize);
      
      const typeSample = batch[0].event_type;

      // 8. Log progress per batch
      console.log(`Inserting batch ${batchNumber}/${batchCount} (${typeSample})...`);

      const { data, error: insertError } = await supabase
        .from('safety_events')
        .insert(batch)
        .select('id');

      if (insertError) throw insertError;
      totalInserted += data.length;
    }

    // 9. Final counts per type logged
    console.log(`\n✅ Seeding complete! Inserted ${totalInserted} safety events.`);
    console.log(`- SOS: 30 events (5 ACTIVE, 10 ACKNOWLEDGED, 15 RESOLVED)`);
    console.log(`- COMPARTMENT_VIOLATION: 20 events (3 ACTIVE, 7 ACKNOWLEDGED, 10 RESOLVED)`);
    console.log(`- HAZARD_REPORT: 50 events (10 ACTIVE, 15 ACKNOWLEDGED, 25 RESOLVED)`);
    process.exit(0);

  } catch (error) {
    console.error('✖ Safety seeding failed:', error.message || error);
    process.exit(1);
  }
}

runSeeding();
