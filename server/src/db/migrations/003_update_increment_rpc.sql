-- This migration updates the RPC function `increment_or_insert_user_usage`
-- to handle the new `credits` column alongside `analysis_count`.

CREATE OR REPLACE FUNCTION increment_or_insert_user_usage(p_user_key TEXT, p_is_anonymous BOOLEAN)
RETURNS public.user_usage AS $$
DECLARE
  v_usage_record public.user_usage;
  v_initial_credits INT := 10; -- Default credits for a new record
BEGIN
  -- Try to find an existing record
  SELECT * INTO v_usage_record
  FROM public.user_usage
  WHERE user_key = p_user_key;

  IF FOUND THEN
    -- Record exists, update it
    UPDATE public.user_usage
    SET
      analysis_count = v_usage_record.analysis_count + 1,
      -- Only decrement credits if they are greater than 0
      credits = CASE WHEN v_usage_record.credits > 0 THEN v_usage_record.credits - 1 ELSE 0 END,
      last_analysis_timestamp = NOW()
    WHERE user_key = p_user_key
    RETURNING * INTO v_usage_record;
  ELSE
    -- Record does not exist, insert a new one
    -- One analysis is performed, so credits are initial_credits - 1
    INSERT INTO public.user_usage (user_key, is_anonymous, analysis_count, credits, first_analysis_timestamp, last_analysis_timestamp)
    VALUES (p_user_key, p_is_anonymous, 1, v_initial_credits - 1, NOW(), NOW())
    RETURNING * INTO v_usage_record;
  END IF;

  RETURN v_usage_record;
END;
$$ LANGUAGE plpgsql;

-- Grant execution rights if necessary (adjust role as needed)
-- GRANT EXECUTE ON FUNCTION increment_or_insert_user_usage(TEXT, BOOLEAN) TO supabase_functions_admin; -- Or your specific user/role
