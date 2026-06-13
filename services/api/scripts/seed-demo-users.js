const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

async function seed() {
  console.log('🌱 Inserting mock users for demo mode...');
  const mockUsers = [
    {
      id: '65c72d32-1610-4c4b-ac4c-3aa4204d6846',
      phone: '1234567890',
      name: 'Demo Passenger',
      supabase_auth_uid: 'user-demo-auth-uid',
      firebase_uid: 'user-demo-firebase-uid',
      is_verified: true,
      preferred_class: 'SL'
    },
    {
      id: '1bfc2d7c-2090-4776-8683-470b363d77b1',
      phone: '9999999999',
      name: 'Admin RPF Officer',
      supabase_auth_uid: 'admin-demo-auth-uid',
      firebase_uid: 'admin-demo-firebase-uid',
      is_verified: true,
      preferred_class: '3A'
    },
    {
      id: 'afa5b750-76ce-49b4-9152-268206e80f0c',
      phone: '9999999998',
      name: 'Fallback Demo Passenger',
      supabase_auth_uid: 'fallback-demo-auth-uid',
      firebase_uid: 'fallback-demo-firebase-uid',
      is_verified: true,
      preferred_class: 'SL'
    }
  ];

  const { error } = await supabase
    .from('users')
    .upsert(mockUsers, { onConflict: 'id' });

  if (error) {
    console.error('Error inserting mock users:', error.message);
  } else {
    console.log('✓ Mock users inserted successfully!');
  }
}

seed().catch(err => console.error(err));
