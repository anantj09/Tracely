const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'services/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (usersError) {
      console.error('Failed to get users:', usersError);
      return;
    }

    console.log('All Users in DB:');
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
