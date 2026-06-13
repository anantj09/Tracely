require('dotenv').config({ path: '../services/api/.env' });
console.log('URL from dotenv in scripts:', process.env.SUPABASE_URL);
const supabase = require('../services/api/src/db/supabase-client');
console.log('client URL:', supabase.supabaseUrl);
console.log('client Key starts with ey:', supabase.supabaseKey?.startsWith('ey'));
