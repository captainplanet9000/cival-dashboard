-- Create goal-based trading system
-- Migration to setup trading goals and acquisition goals

-- Function to handle created_at timestamps automatically
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to handle updated_at timestamps automatically
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Main Trading Goals Table
CREATE TABLE IF NOT EXISTS public.trading_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('acquisition', 'profit', 'portfolio', 'risk_management', 'custom')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'failed')),
  target JSONB NOT NULL DEFAULT '{}'::JSONB,
  progress JSONB NOT NULL DEFAULT '{}'::JSONB,
  timeline JSONB,
  metrics JSONB,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Acquisition Goals Table (specific details for acquisition type goals)
CREATE TABLE IF NOT EXISTS public.acquisition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.trading_goals(id) ON DELETE CASCADE,
  target_asset TEXT NOT NULL,
  target_amount NUMERIC(24, 8) NOT NULL,
  current_amount NUMERIC(24, 8) NOT NULL DEFAULT 0,
  target_price_range JSONB,
  timeline_days INTEGER,
  source_assets TEXT[],
  strategy_id UUID,
  execution_parameters JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goal Steps Table (for breaking down goals into executable steps)
CREATE TABLE IF NOT EXISTS public.goal_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.trading_goals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  completion_criteria JSONB,
  assigned_agent_id UUID,
  start_condition TEXT,
  results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goal Activity Log
CREATE TABLE IF NOT EXISTS public.goal_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.trading_goals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  agent_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goal-Farm Assignments
CREATE TABLE IF NOT EXISTS public.goal_farm_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.trading_goals(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'secondary', 'monitoring')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (goal_id, farm_id)
);

-- Goal-Agent Assignments
CREATE TABLE IF NOT EXISTS public.goal_agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.trading_goals(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  step_id UUID REFERENCES public.goal_steps(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'executor' CHECK (role IN ('executor', 'monitor', 'advisor')),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'active', 'completed', 'failed')),
  results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers for timestamp handling
CREATE TRIGGER handle_trading_goals_created_at
BEFORE INSERT ON public.trading_goals
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_trading_goals_updated_at
BEFORE UPDATE ON public.trading_goals
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_acquisition_goals_created_at
BEFORE INSERT ON public.acquisition_goals
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_acquisition_goals_updated_at
BEFORE UPDATE ON public.acquisition_goals
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_goal_steps_created_at
BEFORE INSERT ON public.goal_steps
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_goal_steps_updated_at
BEFORE UPDATE ON public.goal_steps
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_goal_farm_assignments_created_at
BEFORE INSERT ON public.goal_farm_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_goal_farm_assignments_updated_at
BEFORE UPDATE ON public.goal_farm_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_goal_agent_assignments_created_at
BEFORE INSERT ON public.goal_agent_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_goal_agent_assignments_updated_at
BEFORE UPDATE ON public.goal_agent_assignments
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- RLS Policies
ALTER TABLE public.trading_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_farm_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_agent_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for trading_goals
CREATE POLICY "Users can view their own goals"
  ON public.trading_goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON public.trading_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.trading_goals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.trading_goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy for acquisition_goals
CREATE POLICY "Users can view acquisition goals for their goals"
  ON public.acquisition_goals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_goals
      WHERE trading_goals.id = acquisition_goals.goal_id
      AND trading_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create acquisition goals for their goals"
  ON public.acquisition_goals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trading_goals
      WHERE trading_goals.id = acquisition_goals.goal_id
      AND trading_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update acquisition goals for their goals"
  ON public.acquisition_goals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_goals
      WHERE trading_goals.id = acquisition_goals.goal_id
      AND trading_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete acquisition goals for their goals"
  ON public.acquisition_goals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_goals
      WHERE trading_goals.id = acquisition_goals.goal_id
      AND trading_goals.user_id = auth.uid()
    )
  );

-- Similar policies for goal_steps
CREATE POLICY "Users can view steps for their goals"
  ON public.goal_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_goals
      WHERE trading_goals.id = goal_steps.goal_id
      AND trading_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create steps for their goals"
  ON public.goal_steps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trading_goals
      WHERE trading_goals.id = goal_steps.goal_id
      AND trading_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps for their goals"
  ON public.goal_steps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_goals
      WHERE trading_goals.id = goal_steps.goal_id
      AND trading_goals.user_id = auth.uid()
    )
  );

-- Similar policies for goal_activity
CREATE POLICY "Users can view activity for their goals"
  ON public.goal_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_goals
      WHERE trading_goals.id = goal_activity.goal_id
      AND trading_goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activity for their goals"
  ON public.goal_activity
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trading_goals
      WHERE trading_goals.id = goal_activity.goal_id
      AND trading_goals.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_trading_goals_user_id ON public.trading_goals(user_id);
CREATE INDEX idx_trading_goals_status ON public.trading_goals(status);
CREATE INDEX idx_trading_goals_farm_id ON public.trading_goals(farm_id);
CREATE INDEX idx_acquisition_goals_goal_id ON public.acquisition_goals(goal_id);
CREATE INDEX idx_goal_steps_goal_id ON public.goal_steps(goal_id);
CREATE INDEX idx_goal_steps_agent_id ON public.goal_steps(assigned_agent_id);
CREATE INDEX idx_goal_activity_goal_id ON public.goal_activity(goal_id);
CREATE INDEX idx_goal_farm_assignments_goal_id ON public.goal_farm_assignments(goal_id);
CREATE INDEX idx_goal_farm_assignments_farm_id ON public.goal_farm_assignments(farm_id);
CREATE INDEX idx_goal_agent_assignments_goal_id ON public.goal_agent_assignments(goal_id);
CREATE INDEX idx_goal_agent_assignments_agent_id ON public.goal_agent_assignments(agent_id);
