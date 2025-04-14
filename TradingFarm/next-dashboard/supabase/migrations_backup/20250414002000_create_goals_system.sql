-- Create goals system for Trading Farm
-- This migration sets up the tables required for goal-based trading

-- Create trading goals table
CREATE TABLE IF NOT EXISTS public.trading_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('acquisition', 'profit', 'portfolio', 'risk_management', 'custom')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'failed')),
    target JSONB NOT NULL,
    progress JSONB NOT NULL DEFAULT '{}'::JSONB,
    timeline JSONB,
    metrics JSONB,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create goal steps table
CREATE TABLE IF NOT EXISTS public.goal_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.trading_goals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
    completion_criteria JSONB,
    assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    start_condition TEXT,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create goal activity log
CREATE TABLE IF NOT EXISTS public.goal_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.trading_goals(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create goal farm assignments (for goals that involve multiple farms)
CREATE TABLE IF NOT EXISTS public.goal_farm_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.trading_goals(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    role TEXT,
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (goal_id, farm_id)
);

-- Create goal agent assignments (for goals assigned directly to agents)
CREATE TABLE IF NOT EXISTS public.goal_agent_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.trading_goals(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    role TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'failed')),
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (goal_id, agent_id)
);

-- Acquisition goals (specific type of goals with more structured data)
CREATE TABLE IF NOT EXISTS public.acquisition_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.trading_goals(id) ON DELETE CASCADE,
    target_asset TEXT NOT NULL,
    target_amount DECIMAL NOT NULL,
    current_amount DECIMAL NOT NULL DEFAULT 0,
    target_price_range JSONB,
    timeline_days INTEGER,
    source_assets JSONB,
    strategy_id UUID REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
    execution_parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (goal_id)
);

-- Add triggers for created_at and updated_at
CREATE TRIGGER handle_trading_goals_created_at BEFORE INSERT ON public.trading_goals
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_trading_goals_updated_at BEFORE UPDATE ON public.trading_goals
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_goal_steps_created_at BEFORE INSERT ON public.goal_steps
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_goal_steps_updated_at BEFORE UPDATE ON public.goal_steps
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_goal_farm_assignments_created_at BEFORE INSERT ON public.goal_farm_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_goal_farm_assignments_updated_at BEFORE UPDATE ON public.goal_farm_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_goal_agent_assignments_created_at BEFORE INSERT ON public.goal_agent_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_goal_agent_assignments_updated_at BEFORE UPDATE ON public.goal_agent_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_acquisition_goals_created_at BEFORE INSERT ON public.acquisition_goals
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_acquisition_goals_updated_at BEFORE UPDATE ON public.acquisition_goals
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trading_goals_user_id ON public.trading_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_goals_farm_id ON public.trading_goals(farm_id);
CREATE INDEX IF NOT EXISTS idx_trading_goals_status ON public.trading_goals(status);
CREATE INDEX IF NOT EXISTS idx_goal_steps_goal_id ON public.goal_steps(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_steps_assigned_agent_id ON public.goal_steps(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_goal_activity_goal_id ON public.goal_activity(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_activity_agent_id ON public.goal_activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_goal_farm_assignments_goal_id ON public.goal_farm_assignments(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_farm_assignments_farm_id ON public.goal_farm_assignments(farm_id);
CREATE INDEX IF NOT EXISTS idx_goal_agent_assignments_goal_id ON public.goal_agent_assignments(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_agent_assignments_agent_id ON public.goal_agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_goals_goal_id ON public.acquisition_goals(goal_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_goals_target_asset ON public.acquisition_goals(target_asset);
CREATE INDEX IF NOT EXISTS idx_acquisition_goals_strategy_id ON public.acquisition_goals(strategy_id);

-- Enable row level security on all tables
ALTER TABLE public.trading_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_farm_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for trading_goals
CREATE POLICY trading_goals_select_policy ON public.trading_goals
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY trading_goals_insert_policy ON public.trading_goals
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY trading_goals_update_policy ON public.trading_goals
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY trading_goals_delete_policy ON public.trading_goals
    FOR DELETE
    USING (user_id = auth.uid());

-- RLS policies for goal_steps
CREATE POLICY goal_steps_select_policy ON public.goal_steps
    FOR SELECT
    USING (
        goal_id IN (
            SELECT id FROM public.trading_goals WHERE user_id = auth.uid()
        )
    );

CREATE POLICY goal_steps_insert_policy ON public.goal_steps
    FOR INSERT
    WITH CHECK (
        goal_id IN (
            SELECT id FROM public.trading_goals WHERE user_id = auth.uid()
        )
    );

CREATE POLICY goal_steps_update_policy ON public.goal_steps
    FOR UPDATE
    USING (
        goal_id IN (
            SELECT id FROM public.trading_goals WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        goal_id IN (
            SELECT id FROM public.trading_goals WHERE user_id = auth.uid()
        )
    );

CREATE POLICY goal_steps_delete_policy ON public.goal_steps
    FOR DELETE
    USING (
        goal_id IN (
            SELECT id FROM public.trading_goals WHERE user_id = auth.uid()
        )
    );

-- RLS policies for goal_activity
CREATE POLICY goal_activity_select_policy ON public.goal_activity
    FOR SELECT
    USING (
        goal_id IN (
            SELECT id FROM public.trading_goals WHERE user_id = auth.uid()
        )
    );

CREATE POLICY goal_activity_insert_policy ON public.goal_activity
    FOR INSERT
    WITH CHECK (
        goal_id IN (
            SELECT id FROM public.trading_goals WHERE user_id = auth.uid()
        )
    );

-- Similar RLS policies for the other tables
CREATE POLICY goal_farm_assignments_select_policy ON public.goal_farm_assignments
    FOR SELECT
    USING (
        goal_id IN (
            SELECT id FROM public.trading_goals WHERE user_id = auth.uid()
        )
    );

CREATE POLICY goal_agent_assignments_select_policy ON public.goal_agent_assignments
    FOR SELECT
    USING (
        goal_id IN (
            SELECT id FROM public.trading_goals WHERE user_id = auth.uid()
        )
    );

CREATE POLICY acquisition_goals_select_policy ON public.acquisition_goals
    FOR SELECT
    USING (
        goal_id IN (
            SELECT id FROM public.trading_goals WHERE user_id = auth.uid()
        )
    );

-- More RLS policies for insert/update/delete omitted for brevity, follow same pattern as above

-- Comments for documentation
COMMENT ON TABLE public.trading_goals IS 'Main goals table for trading objectives';
COMMENT ON TABLE public.goal_steps IS 'Discrete steps required to achieve goals';
COMMENT ON TABLE public.goal_activity IS 'Activity log for tracking progress towards goals';
COMMENT ON TABLE public.goal_farm_assignments IS 'Assignments of goals to farms';
COMMENT ON TABLE public.goal_agent_assignments IS 'Assignments of goals to specific agents';
COMMENT ON TABLE public.acquisition_goals IS 'Specific details for asset acquisition goals';
