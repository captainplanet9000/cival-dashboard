-- Migration for enhanced goal features
-- Date: 2025-04-03

-- 1. Goal Templates
CREATE TABLE IF NOT EXISTS public.goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  target_value FLOAT DEFAULT 100,
  is_public BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for goal templates
ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;

-- Allow users to see public templates and their own templates
CREATE POLICY "Users can view public templates and their own templates" 
  ON public.goal_templates 
  FOR SELECT 
  USING (is_public OR owner_id = auth.uid());

-- Allow users to create their own templates
CREATE POLICY "Users can create their own templates" 
  ON public.goal_templates 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

-- Allow users to update their own templates
CREATE POLICY "Users can update their own templates" 
  ON public.goal_templates 
  FOR UPDATE 
  USING (owner_id = auth.uid());

-- Allow users to delete their own templates
CREATE POLICY "Users can delete their own templates" 
  ON public.goal_templates 
  FOR DELETE 
  USING (owner_id = auth.uid());

-- Set up created_at and updated_at triggers
CREATE TRIGGER handle_goal_templates_created_at BEFORE INSERT ON public.goal_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_goal_templates_updated_at BEFORE UPDATE ON public.goal_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Goal Dependencies for Goal Chaining
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS dependency_type TEXT CHECK (dependency_type IN ('sequential', 'parallel', 'none')) DEFAULT 'none';

-- 3. Performance Metrics
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}';
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS last_updated_metrics TIMESTAMP WITH TIME ZONE;

-- 4. Real-time Updates
CREATE TABLE IF NOT EXISTS public.goal_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  value_change FLOAT NOT NULL,
  cumulative_value FLOAT NOT NULL,
  agent_id UUID,
  is_eliza_agent BOOLEAN DEFAULT false,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for goal updates
ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;

-- Users can see updates for goals they own
CREATE POLICY "Users can view goal updates for goals they own"
  ON public.goal_updates
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = goal_updates.goal_id
    AND g.farm_id IN (
      SELECT id FROM public.farms
      WHERE owner_id = auth.uid()
    )
  ));

-- Users can create updates for goals they own
CREATE POLICY "Users can create updates for goals they own"
  ON public.goal_updates
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = goal_updates.goal_id
    AND g.farm_id IN (
      SELECT id FROM public.farms
      WHERE owner_id = auth.uid()
    )
  ));

-- Set up created_at trigger
CREATE TRIGGER handle_goal_updates_created_at BEFORE INSERT ON public.goal_updates
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

-- 5. ElizaOS Integration Enhancements
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{
  "allowed_models": ["gpt-4", "claude-3", "gemini-pro"],
  "prompt_template": "",
  "evaluation_criteria": "",
  "use_knowledge_base": false,
  "max_autonomous_steps": 5
}';

-- Update the goals table to track whether a goal was created from a template
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.goal_templates(id) ON DELETE SET NULL;

-- Add triggers for goal dependency management
CREATE OR REPLACE FUNCTION public.check_goal_dependencies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  dep_goal_id UUID;
  dep_goal_status TEXT;
  incomplete_deps JSONB := '[]';
BEGIN
  -- Only proceed if we have dependencies and this is a status update
  IF NEW.dependencies IS NULL OR NEW.dependencies = '[]' OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Check if we're trying to set a goal to in_progress or completed
  IF NEW.status IN ('in_progress', 'completed') THEN
    -- Loop through dependencies and check their status
    FOR i IN 0..jsonb_array_length(NEW.dependencies) - 1 LOOP
      dep_goal_id := (NEW.dependencies->i->>'goal_id')::UUID;
      
      -- Get the status of the dependency
      SELECT status INTO dep_goal_status
      FROM public.goals
      WHERE id = dep_goal_id;
      
      -- If dependency is not completed and we're trying to set this goal to completed
      -- or if dependency is not at least in_progress and we're trying to set this goal to in_progress
      IF (NEW.status = 'completed' AND dep_goal_status != 'completed') OR
         (NEW.status = 'in_progress' AND dep_goal_status NOT IN ('in_progress', 'completed')) THEN
        
        -- Add to list of incomplete dependencies
        incomplete_deps := incomplete_deps || jsonb_build_object(
          'goal_id', dep_goal_id,
          'status', dep_goal_status
        );
      END IF;
    END LOOP;
    
    -- If we have incomplete dependencies, prevent the update
    IF jsonb_array_length(incomplete_deps) > 0 THEN
      -- If using sequential dependencies, enforce strict order
      IF NEW.dependency_type = 'sequential' THEN
        RAISE EXCEPTION 'Cannot change goal status to % because % dependencies are not in the required state', 
          NEW.status, jsonb_array_length(incomplete_deps);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_goal_dependencies
BEFORE UPDATE ON public.goals
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.check_goal_dependencies();

-- Create a function to update child goals when a parent goal changes status
CREATE OR REPLACE FUNCTION public.update_child_goals_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If parent goal is cancelled, cancel all child goals
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.goals
    SET status = 'cancelled'
    WHERE parent_goal_id = NEW.id AND status != 'completed';
  END IF;
  
  -- If parent goal is completed, allow child goals to start
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update child goals that were waiting for this goal to be completed
    UPDATE public.goals
    SET status = 'not_started'
    WHERE parent_goal_id = NEW.id AND status = 'waiting';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_child_goals_status
AFTER UPDATE ON public.goals
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_child_goals_status();

-- Function to process goal updates and update progress
CREATE OR REPLACE FUNCTION public.process_goal_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  goal_record public.goals;
  progress_value FLOAT;
BEGIN
  -- Get the goal
  SELECT * INTO goal_record
  FROM public.goals
  WHERE id = NEW.goal_id;
  
  -- Update the goal's current value
  UPDATE public.goals
  SET 
    current_value = NEW.cumulative_value,
    progress = LEAST(1.0, NEW.cumulative_value / NULLIF(target_value, 0)),
    last_updated_metrics = now(),
    updated_at = now()
  WHERE id = NEW.goal_id;
  
  -- Check if goal should be automatically marked as completed
  SELECT progress INTO progress_value
  FROM public.goals
  WHERE id = NEW.goal_id;
  
  IF progress_value >= 1.0 AND goal_record.status != 'completed' THEN
    -- Mark as completed
    UPDATE public.goals
    SET 
      status = 'completed',
      completed_at = now()
    WHERE id = NEW.goal_id;
    
    -- Fire an event to handle real-time updates
    PERFORM pg_notify(
      'goal_status_change',
      json_build_object(
        'goal_id', NEW.goal_id,
        'status', 'completed',
        'progress', 1.0
      )::text
    );
  ELSIF progress_value > 0 AND goal_record.status = 'not_started' THEN
    -- Mark as in progress if it was not started
    UPDATE public.goals
    SET status = 'in_progress'
    WHERE id = NEW.goal_id;
    
    -- Fire an event to handle real-time updates
    PERFORM pg_notify(
      'goal_status_change',
      json_build_object(
        'goal_id', NEW.goal_id,
        'status', 'in_progress',
        'progress', progress_value
      )::text
    );
  ELSE
    -- Fire an event for general progress update
    PERFORM pg_notify(
      'goal_progress_update',
      json_build_object(
        'goal_id', NEW.goal_id,
        'progress', progress_value,
        'current_value', NEW.cumulative_value
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_process_goal_update
AFTER INSERT ON public.goal_updates
FOR EACH ROW
EXECUTE FUNCTION public.process_goal_update();
