-- Create agent_capabilities table
CREATE TABLE public.agent_capabilities (
    -- Assuming this references a general 'agents' table or specific agent type tables like 'worker_agents'
    agent_id UUID PRIMARY KEY,
    skills JSONB NOT NULL,
    current_load INTEGER DEFAULT 0,
    max_capacity INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- Add FOREIGN KEY constraint once the referenced agent table exists
    -- Example: FOREIGN KEY (agent_id) REFERENCES public.worker_agents(id) ON DELETE CASCADE
);

-- Add comments
COMMENT ON TABLE public.agent_capabilities IS 'Stores the capabilities, load, and capacity of agents.';
COMMENT ON COLUMN public.agent_capabilities.agent_id IS 'The ID of the agent this capability record refers to.';
COMMENT ON COLUMN public.agent_capabilities.skills IS 'JSON defining the skills and specializations of the agent.';
COMMENT ON COLUMN public.agent_capabilities.current_load IS 'Current workload or number of tasks assigned to the agent.';
COMMENT ON COLUMN public.agent_capabilities.max_capacity IS 'Maximum workload capacity of the agent.';
COMMENT ON COLUMN public.agent_capabilities.created_at IS 'Timestamp when the capability record was created.';
COMMENT ON COLUMN public.agent_capabilities.updated_at IS 'Timestamp when the capability record was last updated.';

-- Enable Row Level Security
ALTER TABLE public.agent_capabilities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Allow relevant users/managers to view capabilities
CREATE POLICY select_agent_capabilities_for_farm ON public.agent_capabilities
    FOR SELECT
    USING (
        -- Example: Allow if the user is associated with the farm the agent belongs to
        -- This requires joining through the agent table to get the farm_id
        agent_id IN (
            SELECT wa.id FROM public.worker_agents wa
            JOIN public.manager_agents ma ON wa.manager_id = ma.id
            WHERE ma.farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid())
            UNION
            SELECT ma.id FROM public.manager_agents ma
            WHERE ma.farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid())
            -- Adjust based on your actual agent structure and relationships
        )
    );

-- Policy: Allow system/managers to manage capabilities
CREATE POLICY manage_agent_capabilities_for_system ON public.agent_capabilities
    FOR ALL
    USING (
        -- Allow system roles or relevant managers to modify
        -- Example: Allow farm owners
        agent_id IN (
            SELECT wa.id FROM public.worker_agents wa
            JOIN public.manager_agents ma ON wa.manager_id = ma.id
            JOIN public.farms f ON ma.farm_id = f.id
            WHERE f.owner_id = auth.uid()
            UNION
            SELECT ma.id FROM public.manager_agents ma
            JOIN public.farms f ON ma.farm_id = f.id
            WHERE f.owner_id = auth.uid()
        )
    )
    WITH CHECK (
       agent_id IN (
            SELECT wa.id FROM public.worker_agents wa
            JOIN public.manager_agents ma ON wa.manager_id = ma.id
            JOIN public.farms f ON ma.farm_id = f.id
            WHERE f.owner_id = auth.uid()
            UNION
            SELECT ma.id FROM public.manager_agents ma
            JOIN public.farms f ON ma.farm_id = f.id
            WHERE f.owner_id = auth.uid()
        )
    );

-- Setup automatic timestamp updates
CREATE TRIGGER handle_agent_capabilities_updated_at
BEFORE UPDATE ON public.agent_capabilities
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
