-- Add SQL functions to handle agent creation without relying on schema cache

-- Function to insert an agent with basic fields
CREATE OR REPLACE FUNCTION public.run_agent_insert(
  p_name TEXT,
  p_farm_id INTEGER,
  p_status TEXT DEFAULT 'initializing',
  p_type TEXT DEFAULT 'eliza'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_id INTEGER;
BEGIN
  -- Insert the agent with only basic fields
  INSERT INTO public.agents(
    name, 
    farm_id,
    status,
    type,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_farm_id,
    p_status,
    p_type,
    NOW(),
    NOW()
  ) RETURNING id INTO v_id;
  
  -- Build result JSON
  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'farm_id', a.farm_id,
    'status', a.status,
    'type', a.type,
    'created_at', a.created_at,
    'updated_at', a.updated_at
  ) INTO v_result
  FROM public.agents a
  WHERE a.id = v_id;
  
  RETURN v_result;
END;
$$;

-- Function to update agent configuration
CREATE OR REPLACE FUNCTION public.update_agent_config(
  p_agent_id INTEGER,
  p_config TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Try to update the configuration if column exists
  EXECUTE FORMAT('
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''agents''
        AND column_name = ''configuration''
      ) THEN
        UPDATE public.agents
        SET configuration = %L::jsonb
        WHERE id = %s;
      END IF;
    END
    $$', p_config, p_agent_id);
END;
$$;

-- Grant permissions to the functions
GRANT EXECUTE ON FUNCTION public.run_agent_insert TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_agent_insert TO service_role;
GRANT EXECUTE ON FUNCTION public.update_agent_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_agent_config TO service_role;
