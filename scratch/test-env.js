require('dotenv').config({ path: 'c:/Coding_files/Competitions/FarAway2026/RailSaathi/services/api/.env' });
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY has value:', !!process.env.SUPABASE_SERVICE_KEY);
const supabase = require('../services/api/src/db/supabase-client');
console.log('supabase-client URL:', supabase.supabaseUrl);
