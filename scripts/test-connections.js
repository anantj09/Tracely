const path = require('path');
// Load environment variables from the api env file
require('dotenv').config({ path: path.join(__dirname, '../services/api/.env') });

const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

async function testSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  console.log(`Supabase URL: ${url}`);
  if (!url || url.includes('mockproject.supabase.co')) {
    console.log('⚠️ Supabase is configured with a mock URL. Skipping live connection test.');
    return;
  }

  try {
    const supabase = createClient(url, key);
    // Simple query to verify connection
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
      throw error;
    }
    console.log('✔ Supabase Connection: SUCCESS. Successfully reached database.');
  } catch (err) {
    console.error('✖ Supabase Connection: FAILED. Error details:', err.message || err);
  }
}

async function testFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  console.log(`Firebase Project ID: ${projectId}`);
  if (!projectId || projectId === 'railsaathi-mock' || !privateKey) {
    console.log('⚠️ Firebase is configured with mock credentials or private key is missing. Skipping live credentials test.');
    return;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
    console.log('✔ Firebase Admin SDK Initialization: SUCCESS.');
    
    // Test auth service call
    try {
      await admin.auth().listUsers(1);
      console.log('✔ Firebase Auth Connection: SUCCESS.');
    } catch (err) {
      console.warn('⚠️ Firebase API Warning (SDK initialized successfully, but query failed):', err.message);
    }
  } catch (err) {
    console.error('✖ Firebase Initialization: FAILED. Error details:', err.message || err);
  }
}

async function run() {
  console.log('=== CONNECTION TESTER ===');
  await testSupabase();
  console.log('-------------------------');
  await testFirebase();
  console.log('=========================');
}

run();
