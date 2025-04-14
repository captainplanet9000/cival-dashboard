-- Migration file to set up relationships between farms, goals, and agents
-- Date: 2025-04-03

-- Ensure goals table has proper foreign key to farms
DO $$
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'farm_id'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE;
        
        -- Add index for better performance
        CREATE INDEX idx_goals_farm_id ON public.goals(farm_id);
    END IF;
    
    -- Ensure progress_percentage and current_value fields exist on goals
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'progress_percentage'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN progress_percentage DECIMAL(5, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'current_value'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN current_value FLOAT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND column_name = 'target_value'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN target_value FLOAT DEFAULT 100;
    END IF;
    
    -- Ensure agents table has goal_id field
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'goal_id'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;
        
        -- Add index for better performance
        CREATE INDEX idx_agents_goal_id ON public.agents(goal_id);
    END IF;
    
    -- Ensure ElizaOS agents table has goal_id field if the table exists
    IF EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'elizaos_agents'
    ) THEN
        IF NOT EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'elizaos_agents' 
            AND column_name = 'goal_id'
        ) THEN
            ALTER TABLE public.elizaos_agents ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;
            
            -- Add index for better performance
            CREATE INDEX idx_elizaos_agents_goal_id ON public.elizaos_agents(goal_id);
        END IF;
    END IF;
    
    -- Ensure farms table has status_summary field for caching goal and agent stats
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'farms' 
        AND column_name = 'status_summary'
    ) THEN
        ALTER TABLE public.farms ADD COLUMN status_summary JSONB DEFAULT '{}';
    END IF;
END
$$;

-- Create a function to update the farm status summary
CREATE OR REPLACE FUNCTION public.update_farm_status_summary(farm_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    goals_total INT;
    goals_completed INT;
    goals_in_progress INT;
    goals_not_started INT;
    goals_cancelled INT;
    agents_total INT;
    agents_active INT;
    eliza_agents_total INT;
    eliza_agents_active INT;
    summary JSONB;
BEGIN
    -- Count goals by status
    SELECT 
        COUNT(*) FILTER (WHERE farm_id = $1),
        COUNT(*) FILTER (WHERE farm_id = $1 AND status = 'completed'),
        COUNT(*) FILTER (WHERE farm_id = $1 AND status = 'in_progress'),
        COUNT(*) FILTER (WHERE farm_id = $1 AND status = 'not_started'),
        COUNT(*) FILTER (WHERE farm_id = $1 AND status = 'cancelled')
    INTO 
        goals_total, 
        goals_completed, 
        goals_in_progress, 
        goals_not_started, 
        goals_cancelled
    FROM public.goals;

    -- Count agents
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_active = true)
    INTO 
        agents_total,
        agents_active
    FROM public.agents 
    WHERE farm_id = $1;
    
    -- Count ElizaOS agents if the table exists
    IF EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'elizaos_agents'
    ) THEN
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'active')
        INTO 
            eliza_agents_total,
            eliza_agents_active
        FROM public.elizaos_agents 
        WHERE farm_id = $1;
    ELSE
        eliza_agents_total := 0;
        eliza_agents_active := 0;
    END IF;
    
    -- Create status summary JSON
    summary := jsonb_build_object(
        'goals_total', goals_total,
        'goals_completed', goals_completed,
        'goals_in_progress', goals_in_progress,
        'goals_not_started', goals_not_started,
        'goals_cancelled', goals_cancelled,
        'agents_total', agents_total + eliza_agents_total,
        'agents_active', agents_active + eliza_agents_active,
        'updated_at', now()
    );
    
    -- Update the farm
    UPDATE public.farms 
    SET status_summary = summary,
        updated_at = now()
    WHERE id = $1;
END;
$$;

-- Create triggers to update farm status summary when goals or agents change
CREATE OR REPLACE FUNCTION public.trigger_update_farm_status_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    farm_id_val UUID;
BEGIN
    -- Get farm_id from the record based on context
    IF TG_TABLE_NAME = 'goals' THEN
        IF TG_OP = 'DELETE' THEN
            farm_id_val := OLD.farm_id;
        ELSE
            farm_id_val := NEW.farm_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'agents' OR TG_TABLE_NAME = 'elizaos_agents' THEN
        IF TG_OP = 'DELETE' THEN
            farm_id_val := OLD.farm_id;
        ELSE
            farm_id_val := NEW.farm_id;
        END IF;
    END IF;
    
    -- Call update function if farm_id is not null
    IF farm_id_val IS NOT NULL THEN
        PERFORM public.update_farm_status_summary(farm_id_val);
    END IF;
    
    RETURN NULL;
END;
$$;

-- Create triggers if they don't exist
DO $$
BEGIN
    -- Drop existing triggers if they exist to avoid errors
    DROP TRIGGER IF EXISTS goals_status_summary_trigger ON public.goals;
    DROP TRIGGER IF EXISTS agents_status_summary_trigger ON public.agents;
    
    -- Create triggers for goals and agents
    CREATE TRIGGER goals_status_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.goals
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_farm_status_summary();
    
    CREATE TRIGGER agents_status_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.agents
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_farm_status_summary();
    
    -- Create trigger for ElizaOS agents if the table exists
    IF EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'elizaos_agents'
    ) THEN
        DROP TRIGGER IF EXISTS elizaos_agents_status_summary_trigger ON public.elizaos_agents;
        
        CREATE TRIGGER elizaos_agents_status_summary_trigger
        AFTER INSERT OR UPDATE OR DELETE ON public.elizaos_agents
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_update_farm_status_summary();
    END IF;
END
$$;
