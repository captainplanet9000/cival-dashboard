-- Add goal-related columns to the farms table
ALTER TABLE public.farms
ADD COLUMN goal_name TEXT NULL,
ADD COLUMN goal_description TEXT NULL,
ADD COLUMN goal_target_assets TEXT[] NULL,
ADD COLUMN goal_target_amount NUMERIC NULL,
ADD COLUMN goal_current_progress JSONB NULL DEFAULT '{}'::jsonb,
ADD COLUMN goal_status TEXT NULL DEFAULT 'inactive',
ADD COLUMN goal_completion_action JSONB NULL,
ADD COLUMN goal_deadline TIMESTAMPTZ NULL;

-- Add comments to the new columns
COMMENT ON COLUMN public.farms.goal_name IS 'User-defined name for the current farm goal.';
COMMENT ON COLUMN public.farms.goal_description IS 'Detailed description of the farm goal.';
COMMENT ON COLUMN public.farms.goal_target_assets IS 'Array of asset symbols the goal aims to accumulate (e.g., [''SUI'', ''SONIC'']).';
COMMENT ON COLUMN public.farms.goal_target_amount IS 'The target amount for one of the specified assets.';
COMMENT ON COLUMN public.farms.goal_current_progress IS 'JSONB object tracking progress for each target asset, e.g., {"SUI": 5000, "SONIC": 1000}.';
COMMENT ON COLUMN public.farms.goal_status IS 'Current status of the farm goal (e.g., inactive, active, paused, completed, failed).';
COMMENT ON COLUMN public.farms.goal_completion_action IS 'JSONB object defining actions upon goal completion (e.g., { "transferToBank": true, "percentage": 100 }).';
COMMENT ON COLUMN public.farms.goal_deadline IS 'Optional deadline for achieving the goal.';

-- Add check constraint for goal status (optional but recommended)
ALTER TABLE public.farms
ADD CONSTRAINT check_goal_status CHECK (goal_status IN ('inactive', 'active', 'paused', 'completed', 'failed'));

-- Update RLS policies if needed (example: allow users to read their own farm goals)
-- This depends on your existing policies. If you have a policy like:
-- CREATE POLICY "Enable read access for user based on user_id" ON "public"."farms"
-- AS PERMISSIVE FOR SELECT
-- TO public
-- USING (auth.uid() = user_id)
-- You might not need changes if users own farms. If access is different, adjust accordingly.
-- Example: Assuming authenticated users can read all farms (adjust as needed)
-- DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."farms";
-- CREATE POLICY "Enable read access for authenticated users" ON "public"."farms"
-- AS PERMISSIVE FOR SELECT
-- TO authenticated
-- USING (true);

-- Ensure the handle_updated_at trigger still functions correctly
-- (No changes needed here typically, as it triggers on any UPDATE)
