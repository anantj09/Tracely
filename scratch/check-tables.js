const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'services/api/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const tables = [
  'users',
  'journeys',
  'admin_users',
  'tatkal_requests',
  'tatkal_surrenders',
  'complaints',
  'safety_events',
  'travel_intents',
  'amenities',
  'vendors',
  'station_coordinates'
];

async function run() {
  console.log('Using Supabase URL:', process.env.SUPABASE_URL);
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`Table '${table}': ERROR - ${error.message}`);
    } else {
      console.log(`Table '${table}': ${count} rows`);
    }
  }
}

run();
