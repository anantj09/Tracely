const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'services/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Testing with Supabase URL:', supabaseUrl);
console.log('Service Key starts with:', supabaseServiceKey ? supabaseServiceKey.substring(0, 15) : 'undefined');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('Users table query failed:', usersError);
    } else {
      console.log('Successfully queried users table. Rows count:', users.length);
    }

    const { data: complaints, error: complaintsError } = await supabase
      .from('complaints')
      .select('*')
      .limit(1);

    if (complaintsError) {
      console.error('Complaints table query failed:', complaintsError);
    } else {
      console.log('Successfully queried complaints table. Rows count:', complaints.length);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
