import { createClient } from '@supabase/supabase-js';
import AsyncStorage from './asyncStorage';

// These are PUBLIC keys — safe to include in mobile app (they're anon/public keys)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    'Warning: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY missing from environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,        // persist session in AsyncStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,    // not a web app
  },
});

// Sync Supabase auth state changes to AsyncStorage
// so apiClient.js always sends a fresh token
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED' && session?.access_token) {
    try {
      await AsyncStorage.setItem('token', session.access_token);
      console.log('[SUPABASE_AUTH] Token refreshed and stored.');
    } catch (e) {
      console.warn('[SUPABASE_AUTH] Failed to store refreshed token:', e.message);
    }
  }
  if (event === 'SIGNED_OUT') {
    try {
      await AsyncStorage.removeItem('token');
    } catch (e) {
      console.warn('[SUPABASE_AUTH] Failed to remove token:', e.message);
    }
  }
});

export default supabase;
