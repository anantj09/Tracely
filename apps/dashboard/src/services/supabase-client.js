import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from environment variables.'
  );
}

const supabase = createClient(supabaseUrl || 'https://mockproject.supabase.co', supabaseAnonKey || 'mock-key');
supabase.supabaseUrl = supabaseUrl || 'https://mockproject.supabase.co';
supabase.supabaseAnonKey = supabaseAnonKey || 'mock-key';

export default supabase;
