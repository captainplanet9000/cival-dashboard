-- Enable Row Level Security for the new table
ALTER TABLE public.trade_executions ENABLE ROW LEVEL SECURITY;

-- Grant basic usage permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_executions TO authenticated;
GRANT ALL ON public.trade_executions TO service_role;

-- RLS Policies for trade_executions

-- Policy: Allow users to view trades belonging to farms they are members of.
-- Assumes a function like is_farm_member(farm_id uuid) returns true if auth.uid() is a member of the farm.
-- You might need to create or adapt this function based on your `farm_members` table.
CREATE POLICY "Allow users to view own farm trades" ON public.trade_executions
FOR SELECT
USING (
    -- Check if the is_farm_member function exists and use it, otherwise fall back to direct check
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_proc
            WHERE proname = 'is_farm_member'
              AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        )
        THEN public.is_farm_member(farm_id)
        ELSE EXISTS (
            SELECT 1
            FROM public.farm_members fm -- Adjust table name if different
            WHERE fm.farm_id = trade_executions.farm_id
              AND fm.user_id = auth.uid()
        )
    END
);

-- Policy: Allow agents (identified by their auth.uid() or service_role) to insert their own trades.
-- Adjust the check `agent_id = auth.uid()` if agents use a different identification mechanism.
CREATE POLICY "Allow agents to insert their trades" ON public.trade_executions
FOR INSERT
WITH CHECK (
    auth.role() = 'service_role' OR
    agent_id = auth.uid() -- Assuming agent's user ID matches the agent_id column
);

-- Policy: Restrict direct updates by non-service roles (e.g., only allow status updates via functions if needed).
-- This is a restrictive policy; adjust if agents or users need specific update rights.
CREATE POLICY "Restrict updates on trades" ON public.trade_executions
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Policy: Restrict direct deletion by non-service roles.
CREATE POLICY "Restrict deletion of trades" ON public.trade_executions
FOR DELETE
USING (auth.role() = 'service_role');

-- Example: Review/Update RLS for related tables (Add similar policies if they don't exist)
-- ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY; (If not already enabled)
-- CREATE POLICY "Allow members to view their farms" ON public.farms FOR SELECT USING (public.is_farm_member(id));

-- ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY; (If not already enabled)
-- CREATE POLICY "Allow farm members to view agents in their farm" ON public.agents FOR SELECT USING (public.is_farm_member(farm_id));

-- ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY; (If not already enabled)
-- CREATE POLICY "Allow users to view public or owned strategies" ON public.strategies FOR SELECT USING (is_public = true OR creator_id = auth.uid());

-- Note: You might need to adjust policies based on your specific roles (e.g., 'farm_admin') and helper functions.
