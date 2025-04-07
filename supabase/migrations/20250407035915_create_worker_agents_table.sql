-- Create worker_agents table
CREATE TABLE public.worker_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID REFERENCES public.manager_agents(id) ON DELETE CASCADE,
    specs JSONB NOT NULL DEFAULT '{}', -- Stores worker configuration/specs
    elizaos_session_id UUID, -- Link to ElizaOS session if applicable
    status VARCHAR(20) CHECK (status IN ('idle', 'working', 'failed', 'initializing')) DEFAULT 'initializing',
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.worker_agents IS 'Stores information about individual worker agents managed by manager agents.';
COMMENT ON COLUMN public.worker_agents.manager_id IS 'The manager agent responsible for this worker.';
COMMENT ON COLUMN public.worker_agents.specs IS 'JSON defining the specifications and capabilities of this worker.';
COMMENT ON COLUMN public.worker_agents.elizaos_session_id IS 'Identifier for the associated session in ElizaOS, if any.';
COMMENT ON COLUMN public.worker_agents.status IS 'Current status of the worker agent.';
COMMENT ON COLUMN public.worker_agents.last_heartbeat IS 'Timestamp of the last heartbeat received from the worker.';
COMMENT ON COLUMN public.worker_agents.created_at IS 'Timestamp when the worker agent was created.';
COMMENT ON COLUMN public.worker_agents.updated_at IS 'Timestamp when the worker agent record was last updated.';

-- Add indexes
CREATE INDEX idx_worker_agents_manager_id ON public.worker_agents(manager_id);
CREATE INDEX idx_worker_agents_status ON public.worker_agents(status);

-- Enable Row Level Security
ALTER TABLE public.worker_agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Allow users to view workers belonging to managers in their farms
CREATE POLICY select_worker_agents_for_farm_members ON public.worker_agents
    FOR SELECT
    USING (
        manager_id IN (
            SELECT id FROM public.manager_agents
            WHERE farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid())
        )
    );

-- Policy: Allow managers to manage workers they own
CREATE POLICY manage_worker_agents_for_managers ON public.worker_agents
    FOR ALL
    USING (
        manager_id IN (
            SELECT id FROM public.manager_agents
            WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()) -- Or check if user IS the manager
        )
        -- Add check if the user/role is the manager agent itself, potentially via agent_id mapping
    )
    WITH CHECK (
        manager_id IN (
            SELECT id FROM public.manager_agents
            WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
        )
    );

-- Setup automatic timestamp updates
CREATE TRIGGER handle_worker_agents_updated_at
BEFORE UPDATE ON public.worker_agents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
