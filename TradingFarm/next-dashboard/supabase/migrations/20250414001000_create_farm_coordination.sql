-- Create farm coordination system
-- This migration creates the farm_coordination table and related functions

-- Create farm coordination table
CREATE TABLE IF NOT EXISTS public.farm_coordination (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    coordination_type TEXT NOT NULL CHECK (coordination_type IN ('sequential', 'parallel', 'hierarchical', 'custom')),
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'paused', 'completed', 'failed')),
    config JSONB NOT NULL DEFAULT '{}'::JSONB,
    agent_roles JSONB,
    execution_plan JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create farm coordination runs table
CREATE TABLE IF NOT EXISTS public.farm_coordination_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordination_id UUID NOT NULL REFERENCES public.farm_coordination(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'stopped')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    results JSONB,
    metrics JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create coordination agent assignments table
CREATE TABLE IF NOT EXISTS public.coordination_agent_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordination_id UUID NOT NULL REFERENCES public.farm_coordination(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    execution_order INTEGER,
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'paused', 'completed', 'failed')),
    config JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (coordination_id, agent_id)
);

-- Create coordination messages table
CREATE TABLE IF NOT EXISTS public.coordination_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordination_run_id UUID NOT NULL REFERENCES public.farm_coordination_runs(id) ON DELETE CASCADE,
    from_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    to_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    message_type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add timestamps triggers
CREATE TRIGGER handle_farm_coordination_created_at BEFORE INSERT ON public.farm_coordination
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_farm_coordination_updated_at BEFORE UPDATE ON public.farm_coordination
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_farm_coordination_runs_created_at BEFORE INSERT ON public.farm_coordination_runs
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_farm_coordination_runs_updated_at BEFORE UPDATE ON public.farm_coordination_runs
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_coordination_agent_assignments_created_at BEFORE INSERT ON public.coordination_agent_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_coordination_agent_assignments_updated_at BEFORE UPDATE ON public.coordination_agent_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_farm_coordination_farm_id ON public.farm_coordination(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_coordination_runs_coordination_id ON public.farm_coordination_runs(coordination_id);
CREATE INDEX IF NOT EXISTS idx_farm_coordination_runs_farm_id ON public.farm_coordination_runs(farm_id);
CREATE INDEX IF NOT EXISTS idx_coordination_agent_assignments_coordination_id ON public.coordination_agent_assignments(coordination_id);
CREATE INDEX IF NOT EXISTS idx_coordination_agent_assignments_agent_id ON public.coordination_agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_coordination_messages_coordination_run_id ON public.coordination_messages(coordination_run_id);
CREATE INDEX IF NOT EXISTS idx_coordination_messages_from_agent_id ON public.coordination_messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_coordination_messages_to_agent_id ON public.coordination_messages(to_agent_id);

-- Enable row level security on all tables
ALTER TABLE public.farm_coordination ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_coordination_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordination_agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordination_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for farm_coordination table
CREATE POLICY farm_coordination_select_policy ON public.farm_coordination
    FOR SELECT
    USING (
        farm_id IN (
            SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
    );

CREATE POLICY farm_coordination_insert_policy ON public.farm_coordination
    FOR INSERT
    WITH CHECK (
        farm_id IN (
            SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
    );

CREATE POLICY farm_coordination_update_policy ON public.farm_coordination
    FOR UPDATE
    USING (
        farm_id IN (
            SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        farm_id IN (
            SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
    );

CREATE POLICY farm_coordination_delete_policy ON public.farm_coordination
    FOR DELETE
    USING (
        farm_id IN (
            SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for farm_coordination_runs table
CREATE POLICY farm_coordination_runs_select_policy ON public.farm_coordination_runs
    FOR SELECT
    USING (
        farm_id IN (
            SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
    );

CREATE POLICY farm_coordination_runs_insert_policy ON public.farm_coordination_runs
    FOR INSERT
    WITH CHECK (
        farm_id IN (
            SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
    );

CREATE POLICY farm_coordination_runs_update_policy ON public.farm_coordination_runs
    FOR UPDATE
    USING (
        farm_id IN (
            SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        farm_id IN (
            SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for coordination_agent_assignments table
CREATE POLICY coordination_agent_assignments_select_policy ON public.coordination_agent_assignments
    FOR SELECT
    USING (
        coordination_id IN (
            SELECT id FROM public.farm_coordination WHERE farm_id IN (
                SELECT id FROM public.farms WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY coordination_agent_assignments_insert_policy ON public.coordination_agent_assignments
    FOR INSERT
    WITH CHECK (
        coordination_id IN (
            SELECT id FROM public.farm_coordination WHERE farm_id IN (
                SELECT id FROM public.farms WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY coordination_agent_assignments_update_policy ON public.coordination_agent_assignments
    FOR UPDATE
    USING (
        coordination_id IN (
            SELECT id FROM public.farm_coordination WHERE farm_id IN (
                SELECT id FROM public.farms WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        coordination_id IN (
            SELECT id FROM public.farm_coordination WHERE farm_id IN (
                SELECT id FROM public.farms WHERE user_id = auth.uid()
            )
        )
    );

-- Create RLS policies for coordination_messages table
CREATE POLICY coordination_messages_select_policy ON public.coordination_messages
    FOR SELECT
    USING (
        coordination_run_id IN (
            SELECT id FROM public.farm_coordination_runs WHERE farm_id IN (
                SELECT id FROM public.farms WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY coordination_messages_insert_policy ON public.coordination_messages
    FOR INSERT
    WITH CHECK (
        coordination_run_id IN (
            SELECT id FROM public.farm_coordination_runs WHERE farm_id IN (
                SELECT id FROM public.farms WHERE user_id = auth.uid()
            )
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.farm_coordination IS 'Coordinates multiple agents working together in a farm';
COMMENT ON TABLE public.farm_coordination_runs IS 'Execution records of farm coordination plans';
COMMENT ON TABLE public.coordination_agent_assignments IS 'Assignments of agents to specific roles in a coordination plan';
COMMENT ON TABLE public.coordination_messages IS 'Messages exchanged between agents during coordination runs';
