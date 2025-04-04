-- Create goal_templates table
CREATE TABLE IF NOT EXISTS public.goal_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  target_unit TEXT,
  category TEXT,
  icon TEXT,
  color TEXT,
  duration_days INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  ai_settings JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.goal_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for goal_templates
-- Allow users to view public templates and their own templates
CREATE POLICY "Users can view public templates or their own templates" ON public.goal_templates
  FOR SELECT USING (is_public = true OR owner_id = auth.uid());

-- Allow users to insert their own templates
CREATE POLICY "Users can insert their own templates" ON public.goal_templates
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Allow users to update their own templates
CREATE POLICY "Users can update their own templates" ON public.goal_templates
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Allow users to delete their own templates
CREATE POLICY "Users can delete their own templates" ON public.goal_templates
  FOR DELETE USING (owner_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_goal_templates_owner_id ON public.goal_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_goal_templates_is_public ON public.goal_templates(is_public);

-- Make sure the goal-agent relation table exists
CREATE TABLE IF NOT EXISTS public.goal_agent_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  is_eliza_agent BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(goal_id, agent_id, is_eliza_agent)
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.goal_agent_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.goal_agent_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for goal_agent_assignments
CREATE POLICY "Users can view their own goal agent assignments" ON public.goal_agent_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own goal agent assignments" ON public.goal_agent_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own goal agent assignments" ON public.goal_agent_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goal agent assignments" ON public.goal_agent_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

-- Create table for goal updates/progress tracking
CREATE TABLE IF NOT EXISTS public.goal_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  agent_id UUID,
  is_eliza_agent BOOLEAN DEFAULT false,
  value_change NUMERIC NOT NULL,
  cumulative_value NUMERIC NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.goal_updates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;

-- Create policies for goal_updates
CREATE POLICY "Users can view their own goal updates" ON public.goal_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own goal updates" ON public.goal_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own goal updates" ON public.goal_updates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goal updates" ON public.goal_updates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

-- Create function to update goal progress when updates are added
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the goal's progress based on the cumulative value in the update
  UPDATE public.goals
  SET 
    progress = NEW.cumulative_value,
    updated_at = NOW()
  WHERE id = NEW.goal_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update goal progress on insert
CREATE TRIGGER update_goal_progress_on_insert
  AFTER INSERT ON public.goal_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_goal_progress();

-- Create trigger to update goal progress on update
CREATE TRIGGER update_goal_progress_on_update
  AFTER UPDATE ON public.goal_updates
  FOR EACH ROW
  WHEN (OLD.cumulative_value IS DISTINCT FROM NEW.cumulative_value)
  EXECUTE FUNCTION public.update_goal_progress();

-- Create function to update farm status summary when goals change
CREATE OR REPLACE FUNCTION public.update_farm_status_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_farm_id UUID;
  v_goals_total INTEGER;
  v_goals_completed INTEGER;
  v_goals_in_progress INTEGER;
  v_goals_not_started INTEGER;
  v_goals_cancelled INTEGER;
BEGIN
  -- Get the farm_id from the goal
  SELECT farm_id INTO v_farm_id FROM public.goals WHERE id = NEW.id;
  
  IF v_farm_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count goals by status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'in_progress'),
    COUNT(*) FILTER (WHERE status IN ('not_started', 'waiting')),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO 
    v_goals_total,
    v_goals_completed,
    v_goals_in_progress,
    v_goals_not_started,
    v_goals_cancelled
  FROM public.goals
  WHERE farm_id = v_farm_id;
  
  -- Update the farm status summary
  UPDATE public.farms
  SET 
    status_summary = jsonb_build_object(
      'goals_total', v_goals_total,
      'goals_completed', v_goals_completed,
      'goals_in_progress', v_goals_in_progress,
      'goals_not_started', v_goals_not_started,
      'goals_cancelled', v_goals_cancelled,
      'updated_at', NOW()
    ),
    updated_at = NOW()
  WHERE id = v_farm_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update farm status summary when goals change
DROP TRIGGER IF EXISTS update_farm_status_on_goal_change ON public.goals;
CREATE TRIGGER update_farm_status_on_goal_change
  AFTER INSERT OR UPDATE OF status, progress, farm_id ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_farm_status_summary();
