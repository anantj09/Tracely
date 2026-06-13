const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'services/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    // 1. Get a user
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (usersError) {
      console.error('Failed to get user:', usersError);
      return;
    }

    if (users.length === 0) {
      console.log('No users found in database to link complaint');
      return;
    }

    const userId = users[0].id;
    console.log('Linking test complaint to user ID:', userId);

    // 2. Insert complaint
    const testComplaint = {
      user_id: userId,
      reference_number: 'RS-T-' + Math.floor(Math.random() * 100000000), // 13 chars total
      complaint_type: 'CLEANLINESS',
      description: 'Test complaint description (minimum 10 chars)',
      station_code: 'NDLS',
      status: 'SUBMITTED',
      priority: 'NORMAL'
    };

    const { data, error } = await supabase
      .from('complaints')
      .insert(testComplaint)
      .select();

    if (error) {
      console.error('Insert failed:', error);
    } else {
      console.log('Insert succeeded! Row:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
