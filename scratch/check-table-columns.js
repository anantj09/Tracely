const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Coding_files/Competitions/FarAway2026/RailSaathi/services/api/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const tables = ['travel_intents', 'amenities', 'amenity_votes', 'vendors', 'vendor_reviews', 'hawker_reports', 'station_checkins'];
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.log(`Table ${t}: query error: ${error.message} (${error.code})`);
      } else {
        const columns = data.length > 0 ? Object.keys(data[0]) : 'no rows';
        console.log(`Table ${t}: columns = ${JSON.stringify(columns)}`);
      }
    } catch (e) {
      console.log(`Table ${t} failed:`, e.message);
    }
  }
}

run();
