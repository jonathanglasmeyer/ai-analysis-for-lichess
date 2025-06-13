// server/src/config.ts
export const IP_HASHING_SALT = process.env.IP_HASHING_SALT;
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
export const MAX_ANONYMOUS_ANALYSES = 5; // Maximum number of free analyses per anonymous user
export const MAX_AUTHENTICATED_ANALYSES = 200; // Maximum number of free analyses per authenticated user

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Using console.warn instead of throwing an error allows the app to start
  // even without full DB functionality, which can be useful for other tasks.
  console.warn('Supabase URL or Anon Key is not set. Database functionality will be affected.');
}

if (!IP_HASHING_SALT) {
    console.warn('IP_HASHING_SALT is not set. This is required for hashing IPs and is not secure for production if left empty.');
}
