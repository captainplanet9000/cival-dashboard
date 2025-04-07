-- Create manager_agents table
CREATE TABLE public.manager_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    max_workers INTEGER NOT NULL DEFAULT 10, -- Default max workers
    -- current_workers is generated and needs worker_agents table to exist first.
    -- Add this via ALTER TABLE in a later migration after worker_agents is created.
    -- current_workers INTEGER GENERATED ALWAYS AS (
    --     SELECT COUNT(*) FROM public.worker_agents WHERE manager_id = manager_agents.id
    -- ) STORED,
    resource_budget JSONB NOT NULL DEFAULT '{}', -- Default to empty JSON
    elizaos_endpoint VARCHAR(255), -- Store the endpoint for ElizaOS interaction
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.manager_agents IS 'Stores information about manager agents responsible for orchestrating workers.';
COMMENT ON COLUMN public.manager_agents.farm_id IS 'The farm this manager agent belongs to.';
COMMENT ON COLUMN public.manager_agents.max_workers IS 'Maximum number of worker agents this manager can spawn.';
-- COMMENT ON COLUMN public.manager_agents.current_workers IS 'Automatically calculated count of active worker agents under this manager.';
COMMENT ON COLUMN public.manager_agents.resource_budget IS 'JSON defining the resource budget allocated to this manager.';
COMMENT ON COLUMN public.manager_agents.elizaos_endpoint IS 'Specific ElizaOS endpoint this manager interacts with, if applicable.';
COMMENT ON COLUMN public.manager_agents.created_at IS 'Timestamp when the manager agent record was created.';
COMMENT ON COLUMN public.manager_agents.updated_at IS 'Timestamp when the manager agent record was last updated.';

-- Add indexes
CREATE INDEX idx_manager_agents_farm_id ON public.manager_agents(farm_id);

-- Enable Row Level Security
ALTER TABLE public.manager_agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Allow users to view managers for farms they are members of
CREATE POLICY select_manager_agents_for_farm_members ON public.manager_agents
    FOR SELECT
    USING (
        farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid())
    );

-- Policy: Allow farm owners/admins to manage manager agents for their farms
CREATE POLICY manage_manager_agents_for_farm_owners ON public.manager_agents
    FOR ALL
    USING (
        farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
    );

-- Setup automatic timestamp updates
CREATE TRIGGER handle_manager_agents_updated_at
BEFORE UPDATE ON public.manager_agents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
