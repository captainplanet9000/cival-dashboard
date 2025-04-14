-- This migration ensures proper relationships between farms and agents (both standard and ElizaOS)
-- It updates any missing columns in the elizaos_agents table if needed

-- Add a foreign key to link ElizaOS agents to farms if one doesn't exist
DO $$
BEGIN
    -- Check if farm_id column exists in elizaos_agents table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'elizaos_agents' 
        AND column_name = 'farm_id'
    ) THEN
        -- Add the farm_id column
        ALTER TABLE public.elizaos_agents ADD COLUMN farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE;
    END IF;
    
    -- Check if we need to update the foreign key constraint
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_schema = ccu.constraint_schema AND tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public' 
        AND tc.table_name = 'elizaos_agents'
        AND ccu.column_name = 'id'
        AND ccu.table_name = 'farms'
    ) THEN
        -- Make sure the farm_id has the proper constraint
        ALTER TABLE public.elizaos_agents 
        DROP CONSTRAINT IF EXISTS elizaos_agents_farm_id_fkey,
        ADD CONSTRAINT elizaos_agents_farm_id_fkey
        FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;
    END IF;
END$$;

-- Update RLS policies for ElizaOS agents to match regular agents
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their farm's elizaos_agents" ON public.elizaos_agents;
    DROP POLICY IF EXISTS "Users can create elizaos_agents for their farms" ON public.elizaos_agents;
    DROP POLICY IF EXISTS "Users can update their farm's elizaos_agents" ON public.elizaos_agents;
    DROP POLICY IF EXISTS "Users can delete their farm's elizaos_agents" ON public.elizaos_agents;
    
    -- Create policies
    CREATE POLICY "Users can view their farm's elizaos_agents"
    ON public.elizaos_agents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.farms 
            WHERE farms.id = elizaos_agents.farm_id AND farms.owner_id = auth.uid()
        )
    );

    CREATE POLICY "Users can create elizaos_agents for their farms"
    ON public.elizaos_agents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farms 
            WHERE farms.id = elizaos_agents.farm_id AND farms.owner_id = auth.uid()
        )
    );

    CREATE POLICY "Users can update their farm's elizaos_agents"
    ON public.elizaos_agents
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.farms 
            WHERE farms.id = elizaos_agents.farm_id AND farms.owner_id = auth.uid()
        )
    );

    CREATE POLICY "Users can delete their farm's elizaos_agents"
    ON public.elizaos_agents
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.farms 
            WHERE farms.id = elizaos_agents.farm_id AND farms.owner_id = auth.uid()
        )
    );
END$$;

-- Add a function to count agents for a farm (both standard and ElizaOS)
CREATE OR REPLACE FUNCTION get_farm_agents_count(farm_id UUID)
RETURNS TABLE (
    standard_agents_count BIGINT,
    elizaos_agents_count BIGINT,
    total_agents_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
    SELECT
        (SELECT COUNT(*) FROM public.agents WHERE agents.farm_id = $1) AS standard_agents_count,
        (SELECT COUNT(*) FROM public.elizaos_agents WHERE elizaos_agents.farm_id = $1) AS elizaos_agents_count,
        (
            (SELECT COUNT(*) FROM public.agents WHERE agents.farm_id = $1) +
            (SELECT COUNT(*) FROM public.elizaos_agents WHERE elizaos_agents.farm_id = $1)
        ) AS total_agents_count;
$$;

-- Add a function to get an agent summary with status distribution
CREATE OR REPLACE FUNCTION get_farm_agent_status_summary(farm_id UUID)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = '';
AS $$
    SELECT json_build_object(
        'active', (
            (SELECT COUNT(*) FROM public.agents WHERE agents.farm_id = $1 AND status = 'active') +
            (SELECT COUNT(*) FROM public.elizaos_agents WHERE elizaos_agents.farm_id = $1 AND status = 'active')
        ),
        'paused', (
            (SELECT COUNT(*) FROM public.agents WHERE agents.farm_id = $1 AND status = 'paused') +
            (SELECT COUNT(*) FROM public.elizaos_agents WHERE elizaos_agents.farm_id = $1 AND status = 'paused')
        ),
        'idle', (
            (SELECT COUNT(*) FROM public.agents WHERE agents.farm_id = $1 AND status = 'idle') +
            (SELECT COUNT(*) FROM public.elizaos_agents WHERE elizaos_agents.farm_id = $1 AND status = 'idle')
        ),
        'error', (
            (SELECT COUNT(*) FROM public.agents WHERE agents.farm_id = $1 AND status = 'error') +
            (SELECT COUNT(*) FROM public.elizaos_agents WHERE elizaos_agents.farm_id = $1 AND status = 'error')
        ),
        'total', (
            (SELECT COUNT(*) FROM public.agents WHERE agents.farm_id = $1) +
            (SELECT COUNT(*) FROM public.elizaos_agents WHERE elizaos_agents.farm_id = $1)
        )
    );
$$;
