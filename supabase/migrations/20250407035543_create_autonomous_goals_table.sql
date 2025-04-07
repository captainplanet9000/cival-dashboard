-- Create autonomous_goals table
CREATE TABLE public.autonomous_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    target_asset TEXT NOT NULL, -- Assuming asset type is text, adjust if needed
    target_amount DECIMAL NOT NULL,
    -- The GENERATED ALWAYS AS column referencing vault_balances needs vault_balances table to exist first.
    -- Add this later or ensure vault_balances is created before this migration.
    -- current_amount DECIMAL GENERATED ALWAYS AS (
    --     SELECT COALESCE(SUM(amount), 0)
    --     FROM public.vault_balances
    --     WHERE asset = target_asset AND vault_id IN (SELECT id FROM public.vaults WHERE farm_id = autonomous_goals.farm_id) -- Assuming vault has farm_id
    -- ) STORED,
    status VARCHAR(20) CHECK (status IN ('active','paused','completed')) DEFAULT 'active',
    completion_rules JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments to the table and columns
COMMENT ON TABLE public.autonomous_goals IS 'Stores goals for autonomous farm management.';
COMMENT ON COLUMN public.autonomous_goals.farm_id IS 'The farm this goal belongs to.';
COMMENT ON COLUMN public.autonomous_goals.target_asset IS 'The target asset for the goal (e.g., USDC, ETH).';
COMMENT ON COLUMN public.autonomous_goals.target_amount IS 'The target amount of the asset to accumulate.';
-- COMMENT ON COLUMN public.autonomous_goals.current_amount IS 'Automatically calculated current amount based on vault balances.';
COMMENT ON COLUMN public.autonomous_goals.status IS 'Current status of the goal.';
COMMENT ON COLUMN public.autonomous_goals.completion_rules IS 'JSON rules defining goal completion criteria.';
COMMENT ON COLUMN public.autonomous_goals.created_at IS 'Timestamp when the goal was created.';
COMMENT ON COLUMN public.autonomous_goals.updated_at IS 'Timestamp when the goal was last updated.';


-- Enable Row Level Security
ALTER TABLE public.autonomous_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Allow users to see goals for farms they are members of (assuming a farm_members table)
CREATE POLICY select_autonomous_goals_for_farm_members ON public.autonomous_goals
    FOR SELECT
    USING (
        farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid())
        -- Or adjust based on your actual authorization mechanism, e.g., checking user roles
    );

-- Policy: Allow farm owners/admins to manage goals for their farms
CREATE POLICY manage_autonomous_goals_for_farm_owners ON public.autonomous_goals
    FOR ALL -- Allows INSERT, UPDATE, DELETE
    USING (
       auth.uid() IN (SELECT owner_id FROM public.farms WHERE id = farm_id) -- Adjust if ownership/admin logic differs
    )
    WITH CHECK (
       auth.uid() IN (SELECT owner_id FROM public.farms WHERE id = farm_id) -- Adjust if ownership/admin logic differs
    );

-- Setup automatic timestamp updates for created_at and updated_at
-- Ensure the handle_created_at and handle_updated_at functions exist from previous migrations or create them.
-- Assuming they exist in the 'public' schema.

-- Trigger for created_at (no trigger needed if using DEFAULT NOW())
-- Trigger for updated_at
CREATE TRIGGER handle_autonomous_goals_updated_at
BEFORE UPDATE ON public.autonomous_goals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
