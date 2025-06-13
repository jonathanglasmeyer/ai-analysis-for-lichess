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
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found is a valid case, means new user, usage is 0.
      return null;
    } else {
      // Any other error is a real database error.
      console.error('Error fetching user usage:', error);
      throw new Error(`Supabase DB error fetching usage: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  return data; // data is UserUsageRow if found, or null if (somehow) error was null but data also null.
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

/**
 * Deletes a user usage record by their user_key (hashed IP).
 * This is primarily intended for test cleanup.
 * @param userKey The unique key for the user (e.g., hashed IP).
 * @returns True if deletion was successful or user not found, false on error.
 */
/**
 * Calls the Supabase RPC to migrate usage data from an anonymous IP hash to a user ID.
 * @param userId The authenticated user's ID.
 * @param ipHash The hashed IP of the anonymous session.
 * @returns True if the migration was successful, false otherwise.
 */
export async function migrateUsage(userId: string, ipHash: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('migrate_usage_from_ip_to_user', {
    p_user_id: userId,
    p_ip_hash: ipHash,
  });

  if (error) {
    console.error('Error calling migrate_usage_from_ip_to_user RPC:', error);
    return false;
  }

  console.log(`[SupabaseClient] RPC migrate_usage_from_ip_to_user returned: ${data}`);
  return data; // The RPC returns a boolean.
}

/**
 * Ensures a user usage record exists for the given key.
 * If it doesn't exist, it creates one with analysis_count = 0.
 * @param userKey The unique key for the user.
 * @param isAnonymous Whether the user is anonymous.
 * @returns The existing or newly created user usage row, or null on error during creation.
 */
export async function ensureUserUsageRecordExists(userKey: string, isAnonymous: boolean): Promise<UserUsageRow | null> {
  let usageRecord = await getUsage(userKey);

  if (!usageRecord) {
    const now = new Date().toISOString();
    console.log(`[SupabaseClient] No usage record found for ${userKey}. Creating new one.`);
    const { data: newRecord, error: insertError } = await supabase
      .from('user_usage')
      .insert({
        user_key: userKey,
        is_anonymous: isAnonymous,
        analysis_count: 0, // Initialize with 0 analyses
        first_analysis_timestamp: now,
        last_analysis_timestamp: now,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[SupabaseClient] Error creating initial user usage record:', insertError);
      // Depending on desired error handling, you might throw or return null.
      // For now, returning null to indicate failure to ensure record.
      return null;
    }
    usageRecord = newRecord;
    console.log(`[SupabaseClient] Successfully created new usage record for ${userKey} with 0 analyses.`);
  }
  return usageRecord;
}

export async function clearUserUsageByHashedIp(userKey: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_usage')
    .delete()
    .eq('user_key', userKey);

  if (error) {
    // 'PGRST116' (No rows found) is not an error for a delete operation in this context.
    if (error.code === 'PGRST116') {
      console.log(`[SupabaseClient] No user found with key ${userKey} to delete.`);
      return true; 
    }
    console.error('Error deleting user usage by hashed IP:', error);
    return false;
  }
  console.log(`[SupabaseClient] Successfully deleted user with key ${userKey}.`);
  return true;
}

