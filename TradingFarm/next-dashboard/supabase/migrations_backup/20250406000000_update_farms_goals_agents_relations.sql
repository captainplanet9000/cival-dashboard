-- This migration enhances the relationships between farms, goals, and agents
-- to ensure proper integration throughout the dashboard and backend

-- Fix the goals table farm_id type to be UUID instead of INTEGER to match the farms table
DO $$
BEGIN
  -- Check if the farm_id column in goals table is INTEGER
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'goals'
    AND column_name = 'farm_id'
    AND data_type = 'integer'
  ) THEN
    -- Alter the farm_id column to UUID
    ALTER TABLE public.goals
    ALTER COLUMN farm_id TYPE UUID
    USING farm_id::text::uuid;
  END IF;
END
$$;

-- Add a goals reference to agents table to track which goal an agent is working on
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'agents'
    AND column_name = 'goal_id'
  ) THEN
    ALTER TABLE public.agents
    ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.agents.goal_id IS 'Reference to the goal this agent is working towards';
  END IF;
END
$$;

-- Add a goals reference to elizaos_agents table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'elizaos_agents'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'elizaos_agents'
    AND column_name = 'goal_id'
  ) THEN
    ALTER TABLE public.elizaos_agents
    ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.elizaos_agents.goal_id IS 'Reference to the goal this ElizaOS agent is working towards';
  END IF;
END
$$;

-- Add a status_summary column to farms table to store goal progress information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'farms'
    AND column_name = 'status_summary'
  ) THEN
    ALTER TABLE public.farms
    ADD COLUMN status_summary JSONB DEFAULT '{
      "goals_total": 0,
      "goals_completed": 0,
      "goals_in_progress": 0,
      "goals_not_started": 0,
      "goals_cancelled": 0,
      "agents_total": 0,
      "agents_active": 0
    }'::jsonb;
    
    COMMENT ON COLUMN public.farms.status_summary IS 'Summary of goal and agent statuses for this farm';
  END IF;
END
$$;

-- Create a function to update farm status_summary based on goals and agents
CREATE OR REPLACE FUNCTION public.update_farm_status_summary()
RETURNS TRIGGER AS $$
DECLARE
  farm_id UUID;
  goals_count INTEGER;
  goals_completed INTEGER;
  goals_in_progress INTEGER;
  goals_not_started INTEGER;
  goals_cancelled INTEGER;
  agents_count INTEGER;
  elizaos_agents_count INTEGER;
  agents_active INTEGER;
  elizaos_agents_active INTEGER;
BEGIN
  -- Determine which farm to update based on the operation
  IF TG_OP = 'DELETE' THEN
    farm_id := OLD.farm_id;
  ELSE
    farm_id := NEW.farm_id;
  END IF;
  
  -- Skip if farm_id is null
  IF farm_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Count goals by status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'in_progress'),
    COUNT(*) FILTER (WHERE status = 'not_started'),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO 
    goals_count,
    goals_completed,
    goals_in_progress,
    goals_not_started,
    goals_cancelled
  FROM public.goals
  WHERE farm_id = farm_id;
  
  -- Count regular agents
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active = true)
  INTO 
    agents_count,
    agents_active
  FROM public.agents
  WHERE farm_id = farm_id;
  
  -- Count ElizaOS agents if the table exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'elizaos_agents'
  ) THEN
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'active')
    INTO 
      elizaos_agents_count,
      elizaos_agents_active
    FROM public.elizaos_agents
    WHERE farm_id = farm_id;
  ELSE
    elizaos_agents_count := 0;
    elizaos_agents_active := 0;
  END IF;
  
  -- Update the farm's status_summary
  UPDATE public.farms
  SET status_summary = jsonb_build_object(
    'goals_total', goals_count,
    'goals_completed', goals_completed,
    'goals_in_progress', goals_in_progress,
    'goals_not_started', goals_not_started,
    'goals_cancelled', goals_cancelled,
    'agents_total', agents_count + elizaos_agents_count,
    'agents_active', agents_active + elizaos_agents_active,
    'updated_at', NOW()
  )
  WHERE id = farm_id;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update farm status_summary when goals or agents change
DO $$
BEGIN
  -- Drop existing triggers if they exist
  DROP TRIGGER IF EXISTS update_farm_summary_on_goal_change ON public.goals;
  DROP TRIGGER IF EXISTS update_farm_summary_on_agent_change ON public.agents;
  
  -- Create new triggers
  CREATE TRIGGER update_farm_summary_on_goal_change
  AFTER INSERT OR UPDATE OR DELETE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_farm_status_summary();
  
  CREATE TRIGGER update_farm_summary_on_agent_change
  AFTER INSERT OR UPDATE OR DELETE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_farm_status_summary();
  
  -- Create trigger for ElizaOS agents if the table exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'elizaos_agents'
  ) THEN
    DROP TRIGGER IF EXISTS update_farm_summary_on_elizaos_agent_change ON public.elizaos_agents;
    
    CREATE TRIGGER update_farm_summary_on_elizaos_agent_change
    AFTER INSERT OR UPDATE OR DELETE ON public.elizaos_agents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_farm_status_summary();
  END IF;
END
$$;

-- Add index to improve queries for goals by farm
CREATE INDEX IF NOT EXISTS idx_goals_farm_id ON public.goals(farm_id);

-- Make sure goals have RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'goals' AND schemaname = 'public' AND policyname = 'goals_select_policy'
  ) THEN
    -- Create policies so users can only access their own goals
    CREATE POLICY goals_select_policy
      ON public.goals
      FOR SELECT
      USING (
        farm_id IN (
          SELECT id FROM public.farms WHERE owner_id = auth.uid()
        )
      );

    CREATE POLICY goals_insert_policy
      ON public.goals
      FOR INSERT
      WITH CHECK (
        farm_id IN (
          SELECT id FROM public.farms WHERE owner_id = auth.uid()
        )
      );

    CREATE POLICY goals_update_policy
      ON public.goals
      FOR UPDATE
      USING (
        farm_id IN (
          SELECT id FROM public.farms WHERE owner_id = auth.uid()
        )
      )
      WITH CHECK (
        farm_id IN (
          SELECT id FROM public.farms WHERE owner_id = auth.uid()
        )
      );

    CREATE POLICY goals_delete_policy
      ON public.goals
      FOR DELETE
      USING (
        farm_id IN (
          SELECT id FROM public.farms WHERE owner_id = auth.uid()
        )
      );
  END IF;
END
$$;
