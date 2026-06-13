const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Coding_files/Competitions/FarAway2026/RailSaathi/services/api/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  const { data, error } = await supabase.from('amenities').select('*');
  console.log('Error:', error);
  console.log('Data:', data);
}

run();
