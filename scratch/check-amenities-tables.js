const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Coding_files/Competitions/FarAway2026/RailSaathi/services/api/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  try {
    const tables = ['travel_intents', 'amenities', 'amenity_votes', 'vendors', 'vendor_reviews', 'hawker_reports', 'station_checkins'];
    for (const t of tables) {
      const { data, error } = await supabase.from(t).select('count', { count: 'exact', head: true });
      if (error) {
        console.log(`Table "${t}": does NOT exist or failed: ${error.message} (${error.code})`);
      } else {
        console.log(`Table "${t}": EXISTS, row count = ${data || 0}`);
      }
    }
  } catch (e) {
    console.error('Error during check:', e);
  }
}

check();
