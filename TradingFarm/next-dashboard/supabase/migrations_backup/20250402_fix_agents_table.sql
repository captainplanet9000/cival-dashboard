-- Check if configuration column exists and add it if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'agents'
        AND column_name = 'configuration'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb;
        
        -- Announce the column was added
        RAISE NOTICE 'Added configuration column to agents table';
    ELSE
        RAISE NOTICE 'Configuration column already exists in agents table';
    END IF;
END;
$$;

-- Refresh the schema cache
ALTER TABLE public.agents ADD COLUMN _temp_column TEXT;
ALTER TABLE public.agents DROP COLUMN _temp_column;

-- Grant permissions to the table
GRANT ALL ON TABLE public.agents TO authenticated;
GRANT ALL ON TABLE public.agents TO service_role;

-- Verify the configuration column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'agents' 
AND column_name = 'configuration';

-- Create a simple function to directly insert an agent (bypassing PostgREST)
CREATE OR REPLACE FUNCTION public.direct_insert_agent(
    p_name TEXT,
    p_farm_id INTEGER,
    p_status TEXT DEFAULT 'initializing',
    p_type TEXT DEFAULT 'eliza',
    p_config JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_result JSONB;
    v_agent public.agents;
BEGIN
    INSERT INTO public.agents (
        name, 
        farm_id, 
        status, 
        type, 
        configuration, 
        created_at, 
        updated_at
    ) VALUES (
        p_name,
        p_farm_id,
        p_status,
        p_type,
        p_config,
        now(),
        now()
    )
    RETURNING * INTO v_agent;
    
    v_result = jsonb_build_object(
        'id', v_agent.id,
        'name', v_agent.name,
        'farm_id', v_agent.farm_id,
        'status', v_agent.status,
        'type', v_agent.type,
        'configuration', v_agent.configuration
    );
    
    RETURN v_result;
END;
$$;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION public.direct_insert_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.direct_insert_agent TO service_role;
