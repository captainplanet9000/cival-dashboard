-- Create agent_assignments table
CREATE TABLE public.agent_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Added a primary key
    agent_id UUID NOT NULL, -- Needs reference to an agents table (e.g., worker_agents or a general agents table)
    goal_id UUID REFERENCES public.autonomous_goals(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- Consider adding FOREIGN KEY constraint for agent_id once the agents table exists
    -- FOREIGN KEY (agent_id) REFERENCES public.worker_agents(id) ON DELETE CASCADE
);

-- Add comments
COMMENT ON TABLE public.agent_assignments IS 'Assigns agents (workers) to specific autonomous goals.';
COMMENT ON COLUMN public.agent_assignments.agent_id IS 'The ID of the assigned agent.';
COMMENT ON COLUMN public.agent_assignments.goal_id IS 'The goal the agent is assigned to.';
COMMENT ON COLUMN public.agent_assignments.priority IS 'Priority of this assignment (higher value means higher priority).';
COMMENT ON COLUMN public.agent_assignments.last_heartbeat IS 'Timestamp of the last heartbeat received from the agent for this assignment.';
COMMENT ON COLUMN public.agent_assignments.created_at IS 'Timestamp when the assignment was created.';
COMMENT ON COLUMN public.agent_assignments.updated_at IS 'Timestamp when the assignment was last updated.';

-- Enable Row Level Security
ALTER TABLE public.agent_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Allow users/managers to see assignments within their farms
CREATE POLICY select_agent_assignments_for_farm ON public.agent_assignments
    FOR SELECT
    USING (
        goal_id IN (SELECT id FROM public.autonomous_goals WHERE farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid()))
        -- Or based on manager assignment/ownership
    );

-- Policy: Allow managers/system to manage assignments within their scope
CREATE POLICY manage_agent_assignments_for_farm ON public.agent_assignments
    FOR ALL
    USING (
        -- Example: Allow if the user owns the farm associated with the goal
        goal_id IN (SELECT ag.id FROM public.autonomous_goals ag JOIN public.farms f ON ag.farm_id = f.id WHERE f.owner_id = auth.uid())
        -- Add more specific logic for managers/system roles
    )
    WITH CHECK (
        goal_id IN (SELECT ag.id FROM public.autonomous_goals ag JOIN public.farms f ON ag.farm_id = f.id WHERE f.owner_id = auth.uid())
    );

-- Setup automatic timestamp updates
CREATE TRIGGER handle_agent_assignments_updated_at
BEFORE UPDATE ON public.agent_assignments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
