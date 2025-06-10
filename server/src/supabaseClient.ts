// server/src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase URL or Anon Key is not defined in environment variables. Cannot initialize Supabase client.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Defines the structure of a row in the 'user_usage' table.
 */
export interface UserUsageRow {
  user_key: string;
  is_anonymous: boolean;
  analysis_count: number;
  first_analysis_timestamp: string;
  last_analysis_timestamp: string;
}

/**
 * Fetches the usage record for a given user key.
 * @param userKey The unique key for the user (e.g., hashed IP).
 * @returns The user usage row, or null if not found or on error.
 */
export async function getUsage(userKey: string): Promise<UserUsageRow | null> {
  const { data, error } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_key', userKey)
    .single();

  // 'PGRST116' is the code for "No rows found", which is not an error in this case.
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user usage:', error);
    return null;
  }

  return data;
}

/**
 * Atomically increments the analysis count for a user or inserts a new record.
 * This relies on a PostgreSQL function (RPC) in Supabase.
 * @param userKey The unique key for the user.
 * @param isAnonymous Whether the user is anonymous.
 * @returns An object with the updated row data or an error.
 */
export async function incrementOrInsertUsage(
  userKey: string,
  isAnonymous: boolean
): Promise<{ data: UserUsageRow | null; error: any }> {
  const { data, error } = await supabase.rpc('increment_or_insert_user_usage', {
    p_user_key: userKey,
    p_is_anonymous: isAnonymous,
  }).single();

  if (error) {
    console.error('Error incrementing or inserting user usage:', error);
  }

  // The RPC is expected to return the updated row, so we return it directly.
  return { data, error };
}

/**
 * Alternative implementation that directly works with the table instead of using RPC.
 * This is a workaround for the SQL function issue.
 */
export async function directUpdateUsage(
  userKey: string,
  isAnonymous: boolean
): Promise<{ data: UserUsageRow | null; error: any }> {
  // Get the current timestamp
  const now = new Date().toISOString();
  
  // First try to get existing record
  const { data: existingData } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_key', userKey)
    .single();
    
  if (existingData) {
    // Update existing record
    const { data, error } = await supabase
      .from('user_usage')
      .update({
        analysis_count: (existingData.analysis_count || 0) + 1,
        last_analysis_timestamp: now
      })
      .eq('user_key', userKey)
      .select()
      .single();
      
    return { data, error };
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('user_usage')
      .insert({
        user_key: userKey,
        is_anonymous: isAnonymous,
        analysis_count: 1,
        first_analysis_timestamp: now,
        last_analysis_timestamp: now
      })
      .select()
      .single();
      
    return { data, error };
  }
}

