require('dotenv').config({ path: '../services/api/.env' });
console.log('CWD:', process.cwd());
console.log('process.env.SUPABASE_URL:', process.env.SUPABASE_URL);

const supabase = require('../services/api/src/db/supabase-client');
console.log('supabase-client URL:', supabase.supabaseUrl);

async function run() {
  try {
    const { data, error } = await supabase.from('amenities').select('*', { count: 'exact', head: true });
    if (error) {
      console.log('Query failed:', error);
    } else {
      console.log('Query succeeded! Data count:', data);
    }
  } catch (err) {
    console.error('Crash error:', err);
  }
}

run();
