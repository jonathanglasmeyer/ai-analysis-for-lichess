-- This migration adds a `credits` column to the `user_usage` table.
-- `analysis_count` will continue to track the total number of analyses for analytics.
-- `credits` will be used to manage the remaining usage limit for a user.

ALTER TABLE public.user_usage
ADD COLUMN credits INTEGER NOT NULL DEFAULT 10;

-- Note: After running this migration, you might want to backfill the `credits`
-- for existing users based on their `analysis_count` if needed.
-- For this project, we assume we start fresh or that existing users get the default.
