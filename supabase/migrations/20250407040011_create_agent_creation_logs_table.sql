-- Create agent_creation_logs table
CREATE TABLE public.agent_creation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID REFERENCES public.manager_agents(id) ON DELETE SET NULL, -- Keep log even if manager is deleted
    worker_id UUID REFERENCES public.worker_agents(id) ON DELETE SET NULL, -- Keep log even if worker is deleted, link worker
    specs_used JSONB, -- Log the specs used for creation
    init_status VARCHAR(20), -- Log the initial status reported after creation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- No updated_at needed for immutable logs
);

-- Add comments
COMMENT ON TABLE public.agent_creation_logs IS 'Logs the creation of worker agents by manager agents.';
COMMENT ON COLUMN public.agent_creation_logs.manager_id IS 'The manager agent that initiated the creation.';
COMMENT ON COLUMN public.agent_creation_logs.worker_id IS 'The worker agent that was created.';
COMMENT ON COLUMN public.agent_creation_logs.specs_used IS 'The specifications provided for creating the worker.';
COMMENT ON COLUMN public.agent_creation_logs.init_status IS 'The initial status of the worker upon creation.';
COMMENT ON COLUMN public.agent_creation_logs.created_at IS 'Timestamp when the creation log entry was made.';

-- Add indexes
CREATE INDEX idx_agent_creation_logs_manager_id ON public.agent_creation_logs(manager_id);
CREATE INDEX idx_agent_creation_logs_worker_id ON public.agent_creation_logs(worker_id);

-- Enable Row Level Security
ALTER TABLE public.agent_creation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Allow users to view logs for agents within their farms
CREATE POLICY select_agent_creation_logs_for_farm_members ON public.agent_creation_logs
    FOR SELECT
    USING (
        manager_id IN (
            SELECT id FROM public.manager_agents
            WHERE farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid())
        )
    );

-- Policy: Allow managers/system to insert logs upon agent creation
CREATE POLICY insert_agent_creation_logs_for_managers ON public.agent_creation_logs
    FOR INSERT
    WITH CHECK (
         manager_id IN (
            SELECT id FROM public.manager_agents
            WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()) -- Or check if user IS the manager
        )
        -- Add check if the user/role is the manager agent itself
    );

-- Logs are typically immutable.
