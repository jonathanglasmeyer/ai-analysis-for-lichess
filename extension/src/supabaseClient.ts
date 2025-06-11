import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // It's recommended to store the JWT in Extension storage, 
      // rather than localStorage for security reasons.
      // We will handle this manually when auth state changes.
      persistSession: false, 
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
  });
} else {
  console.error('Supabase URL or Anon Key is missing. Supabase client could not be initialized.');
}

export { supabase };
