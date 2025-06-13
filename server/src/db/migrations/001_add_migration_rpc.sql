-- server/src/db/migrations/001_add_migration_rpc.sql
-- This script creates the RPC function required to migrate usage data
-- from an anonymous IP-based record to an authenticated user record.

-- To apply this migration, copy the contents of this file and run it
-- in the Supabase SQL Editor for your project.

CREATE OR REPLACE FUNCTION migrate_usage_from_ip_to_user(p_user_id TEXT, p_ip_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_ip_usage_record public.user_usage;
    v_user_usage_record public.user_usage;
    v_anonymous_limit INT := 10; -- Corresponds to MAX_ANONYMOUS_ANALYSES
BEGIN
    -- 1. Find the usage record for the anonymous IP hash.
    SELECT * INTO v_ip_usage_record
    FROM public.user_usage
    WHERE user_key = p_ip_hash AND is_anonymous = TRUE;

    -- If no record is found for the IP, there's nothing to migrate.
    IF NOT FOUND THEN
        RAISE NOTICE 'No anonymous usage record found for IP hash %', p_ip_hash;
        RETURN FALSE;
    END IF;

    -- 2. Check if the authenticated user already has a usage record.
    SELECT * INTO v_user_usage_record
    FROM public.user_usage
    WHERE user_key = p_user_id;

    -- If the user already has a record, do not overwrite it.
    -- This handles cases where a user logs in from multiple devices/browsers.
    IF FOUND THEN
        RAISE NOTICE 'User % already has a usage record. No migration needed.', p_user_id;
        RETURN FALSE;
    END IF;

    -- 3. If we are here, the IP record exists and the user record does not. Time to migrate.
    RAISE NOTICE 'Migrating usage from IP hash % to user %', p_ip_hash, p_user_id;

    INSERT INTO public.user_usage (user_key, is_anonymous, analysis_count, first_analysis_timestamp, last_analysis_timestamp)
    VALUES (p_user_id, FALSE, v_ip_usage_record.analysis_count, v_ip_usage_record.first_analysis_timestamp, NOW());

    -- 4. Delete the original anonymous IP record as its usage has been migrated.
    DELETE FROM public.user_usage
    WHERE user_key = p_ip_hash AND is_anonymous = TRUE;

    RAISE NOTICE 'Migration successful for user %.', p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
