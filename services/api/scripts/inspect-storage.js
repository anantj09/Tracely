const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { 
    auth: { persistSession: false },
    db: { schema: 'storage' }
  }
);

async function inspect() {
  console.log('Querying storage.policies table...');
  const { data, error } = await supabase
    .from('policies')
    .select('*');

  if (error) {
    console.error('Error querying policies:', error.message);
  } else {
    console.log('Storage Policies:', JSON.stringify(data, null, 2));
  }
}

inspect().catch(err => console.error(err));
