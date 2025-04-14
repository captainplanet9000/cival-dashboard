-- Create SQL execution functions for agent operations
-- These functions will help bypass schema cache issues

-- Function to execute arbitrary SQL safely
CREATE OR REPLACE FUNCTION public.execute_sql(query text, params text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE query INTO result USING params;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Function to run SQL with parameters
CREATE OR REPLACE FUNCTION public.run_sql_with_params(sql_query text, param_values text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
  v_sql text;
  v_rows json;
BEGIN
  EXECUTE sql_query USING VARIADIC param_values INTO v_rows;
  
  v_result = jsonb_build_object(
    'success', true,
    'rows', v_rows
  );
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Function to insert a new Eliza agent with full configuration
CREATE OR REPLACE FUNCTION public.insert_eliza_agent(
  p_name text,
  p_farm_id int,
  p_config jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_agent_id int;
  v_agent jsonb;
BEGIN
  -- Check if agents table exists and has configuration column
  PERFORM FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agents';
  
  -- Insert agent with minimal fields first
  INSERT INTO public.agents (
    name,
    farm_id,
    status,
    type,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_farm_id,
    'initializing',
    'eliza',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_agent_id;
  
  -- Check if configuration column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agents' 
    AND column_name = 'configuration'
  ) THEN
    -- Update configuration separately
    UPDATE public.agents
    SET configuration = p_config
    WHERE id = v_agent_id;
  END IF;
  
  -- Get the complete agent record
  SELECT 
    jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'farm_id', a.farm_id,
      'status', a.status,
      'type', a.type,
      'created_at', a.created_at,
      'updated_at', a.updated_at,
      'configuration', COALESCE(
        -- Try to get configuration from the column if it exists
        (SELECT to_jsonb(a.configuration)),
        -- Otherwise use the provided config as a fallback
        p_config
      )
    )
  INTO v_agent
  FROM public.agents a
  WHERE a.id = v_agent_id;
  
  RETURN v_agent;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.execute_sql TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql TO service_role;

GRANT EXECUTE ON FUNCTION public.run_sql_with_params TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_sql_with_params TO service_role;

GRANT EXECUTE ON FUNCTION public.insert_eliza_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_eliza_agent TO service_role;
