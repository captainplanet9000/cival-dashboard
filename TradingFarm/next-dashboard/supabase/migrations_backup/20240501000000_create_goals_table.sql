-- Create goals table for tracking trading and performance objectives
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_value DECIMAL(20, 6), -- Can represent currency amounts or percentages with precision
  current_value DECIMAL(20, 6) DEFAULT 0,
  progress_percentage DECIMAL(5, 2) DEFAULT 0, -- Stored as 0-100 value
  start_date TIMESTAMP WITH TIME ZONE,
  target_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed, missed
  goal_type VARCHAR(50) NOT NULL, -- profit, roi, trade_count, win_rate, custom
  metric_calculation VARCHAR(50), -- formula identifier for how to calculate progress
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  parent_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  archived BOOLEAN DEFAULT false NOT NULL,
  
  -- Check constraints
  CONSTRAINT valid_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'missed')),
  CONSTRAINT valid_goal_type CHECK (goal_type IN ('profit', 'roi', 'trade_count', 'win_rate', 'custom')),
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT valid_value CHECK (target_value IS NULL OR target_value >= 0),
  CONSTRAINT farm_or_agent_required CHECK (farm_id IS NOT NULL OR agent_id IS NOT NULL OR parent_goal_id IS NOT NULL)
);

-- Add indexes for efficient querying
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_farm_id ON public.goals(farm_id) WHERE farm_id IS NOT NULL;
CREATE INDEX idx_goals_agent_id ON public.goals(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_goals_target_date ON public.goals(target_date);
CREATE INDEX idx_goals_parent_goal_id ON public.goals(parent_goal_id) WHERE parent_goal_id IS NOT NULL;
CREATE INDEX idx_goals_goal_type ON public.goals(goal_type);

-- Add goal_history table for tracking progress over time
CREATE TABLE IF NOT EXISTS public.goal_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value DECIMAL(20, 6) NOT NULL,
  progress_percentage DECIMAL(5, 2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_goal_history_goal_id ON public.goal_history(goal_id);
CREATE INDEX idx_goal_history_recorded_at ON public.goal_history(recorded_at);

-- Add triggers for handling updated_at
CREATE TRIGGER handle_updated_at_goals
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add RLS policies
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_history ENABLE ROW LEVEL SECURITY;

-- Create policies for goals table
CREATE POLICY "Users can view their own goals" 
  ON public.goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" 
  ON public.goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
  ON public.goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
  ON public.goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for goal_history table
CREATE POLICY "Users can view their own goal history" 
  ON public.goal_history
  FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

CREATE POLICY "Users can insert history for their own goals" 
  ON public.goal_history
  FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE id = goal_id));

-- Create trigger function for recording goal history on update
CREATE OR REPLACE FUNCTION public.record_goal_history()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.current_value IS DISTINCT FROM OLD.current_value OR NEW.progress_percentage IS DISTINCT FROM OLD.progress_percentage) THEN
    INSERT INTO public.goal_history (goal_id, value, progress_percentage)
    VALUES (NEW.id, NEW.current_value, NEW.progress_percentage);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to record history when goal is updated
CREATE TRIGGER record_goal_history_on_update
  AFTER UPDATE OF current_value, progress_percentage ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.record_goal_history();

-- Add trigger to record initial history entry when goal is created
CREATE TRIGGER record_goal_history_on_insert
  AFTER INSERT ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.record_goal_history(); 