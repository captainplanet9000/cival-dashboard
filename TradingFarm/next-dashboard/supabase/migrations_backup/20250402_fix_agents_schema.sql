-- Fix agents table schema and caching issues

-- First, ensure the configuration column exists
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
    RAISE NOTICE 'Added configuration column to agents table';
  ELSE
    RAISE NOTICE 'Configuration column already exists in agents table';
  END IF;
END
$$;

-- Then force PostgREST to refresh its schema cache
ALTER TABLE public.agents RENAME TO agents_temp;
ALTER TABLE public.agents_temp RENAME TO agents;

-- Set proper permissions for the table
GRANT ALL ON agents TO authenticated;
GRANT ALL ON agents TO service_role;

-- Create a direct function for agent creation that bypasses PostgREST
CREATE OR REPLACE FUNCTION public.create_eliza_agent(
  p_name TEXT,
  p_farm_id INTEGER,
  p_description TEXT DEFAULT '',
  p_strategy_type TEXT DEFAULT 'custom',
  p_risk_level TEXT DEFAULT 'medium',
  p_target_markets JSONB DEFAULT '[]'::jsonb,
  p_config JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_agent_id INTEGER;
  v_result JSONB;
  v_configuration JSONB;
BEGIN
  -- Prepare configuration object
  v_configuration = jsonb_build_object(
    'description', p_description,
    'strategy_type', p_strategy_type,
    'risk_level', p_risk_level,
    'target_markets', p_target_markets,
    'performance_metrics', jsonb_build_object(
      'win_rate', 0,
      'profit_loss', 0,
      'total_trades', 0,
      'average_trade_duration', 0
    )
  );
  
  -- Merge with additional config if provided
  IF p_config IS NOT NULL AND p_config != '{}'::jsonb THEN
    v_configuration = v_configuration || p_config;
  END IF;
  
  -- Insert the agent
  INSERT INTO public.agents(
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
    'initializing',
    'eliza',
    v_configuration,
    NOW(),
    NOW()
  ) RETURNING id INTO v_agent_id;
  
  -- Return the full agent data
  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'farm_id', a.farm_id,
    'status', a.status,
    'type', a.type,
    'configuration', a.configuration,
    'created_at', a.created_at,
    'updated_at', a.updated_at
  ) INTO v_result
  FROM public.agents a
  WHERE a.id = v_agent_id;
  
  RETURN v_result;
END;
$$;

-- Grant permission to execute the function
GRANT EXECUTE ON FUNCTION public.create_eliza_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_eliza_agent TO service_role;
