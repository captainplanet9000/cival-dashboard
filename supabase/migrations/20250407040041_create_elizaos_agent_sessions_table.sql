-- Create elizaos_agent_sessions table
CREATE TABLE public.elizaos_agent_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL, -- Could reference worker_agents or manager_agents
    manager_id UUID REFERENCES public.manager_agents(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ,
    memory_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- Consider adding FOREIGN KEY for agent_id if a common agents table exists
);

-- Add comments
COMMENT ON TABLE public.elizaos_agent_sessions IS 'Tracks active sessions between agents and the ElizaOS system.';
COMMENT ON COLUMN public.elizaos_agent_sessions.agent_id IS 'Foreign key referencing the specific agent this session belongs to.';
COMMENT ON COLUMN public.elizaos_agent_sessions.manager_id IS 'The manager overseeing the agent during this session.';
COMMENT ON COLUMN public.elizaos_agent_sessions.started_at IS 'Timestamp when the session began.';
COMMENT ON COLUMN public.elizaos_agent_sessions.last_active IS 'Timestamp of the last known activity in this session.';
COMMENT ON COLUMN public.elizaos_agent_sessions.memory_snapshot IS 'Snapshot of the agent''s relevant memory at a point in time or end of session.';
COMMENT ON COLUMN public.elizaos_agent_sessions.created_at IS 'Timestamp when the session record was created.';
COMMENT ON COLUMN public.elizaos_agent_sessions.updated_at IS 'Timestamp when the session record was last updated.';

-- Add indexes
CREATE INDEX idx_elizaos_agent_sessions_agent_id ON public.elizaos_agent_sessions(agent_id);
CREATE INDEX idx_elizaos_agent_sessions_manager_id ON public.elizaos_agent_sessions(manager_id);

-- Enable Row Level Security
ALTER TABLE public.elizaos_agent_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy from design: ElizaOS access policy
-- Assumes a session variable 'app.current_farm_id' is set, which might not be standard.
-- Adjust policy based on actual auth context (e.g., user roles, direct manager checks).
CREATE POLICY elizaos_access_policy ON public.elizaos_agent_sessions
    FOR ALL -- Or specify SELECT, INSERT, UPDATE, DELETE as needed
    USING (
        manager_id IN (
            SELECT id FROM public.manager_agents
            -- Original condition: WHERE farm_id = current_setting('app.current_farm_id')::UUID
            -- Alternative: Check if the current user manages this farm
            WHERE farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid() AND role = 'manager') -- Example, adjust role/logic
            -- Or allow system roles:
            -- OR auth.role() = 'service_role'
        )
    )
    WITH CHECK (
         manager_id IN (
            SELECT id FROM public.manager_agents
            WHERE farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid() AND role = 'manager')
        )
    );

-- Setup automatic timestamp updates
CREATE TRIGGER handle_elizaos_agent_sessions_updated_at
BEFORE UPDATE ON public.elizaos_agent_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
