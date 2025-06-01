-- check_table_structure: Function to check if a table exists and has required columns
CREATE OR REPLACE FUNCTION public.check_table_structure(
  table_name text,
  required_columns text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  column_exists boolean;
  column_name text;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = check_table_structure.table_name
  ) THEN
    RETURN false;
  END IF;
  
  -- Check if all required columns exist
  FOREACH column_name IN ARRAY required_columns
  LOOP
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = check_table_structure.table_name 
      AND column_name = column_name
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$;

-- create_agent: Function to create an agent with proper configuration
CREATE OR REPLACE FUNCTION public.create_agent(
  agent_name text,
  agent_farm_id bigint,
  agent_status text,
  agent_type text,
  agent_config jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  created_agent record;
  config_exists boolean;
  result json;
BEGIN
  -- Check if configuration column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agents' 
    AND column_name = 'configuration'
  ) INTO config_exists;
  
  -- Create agent with or without configuration
  IF config_exists THEN
    -- Insert with configuration
    INSERT INTO public.agents (
      name, 
      farm_id, 
      status, 
      type, 
      configuration,
      created_at,
      updated_at
    ) 
    VALUES (
      agent_name,
      agent_farm_id,
      agent_status,
      agent_type,
      agent_config,
      NOW(),
      NOW()
    )
    RETURNING * INTO created_agent;
  ELSE
    -- Insert without configuration
    INSERT INTO public.agents (
      name, 
      farm_id, 
      status, 
      type,
      created_at,
      updated_at
    ) 
    VALUES (
      agent_name,
      agent_farm_id,
      agent_status,
      agent_type,
      NOW(),
      NOW()
    )
    RETURNING * INTO created_agent;
    
    -- Try to add configuration column if it doesn't exist
    BEGIN
      ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb;
      
      -- Update the record with the configuration
      UPDATE public.agents 
      SET configuration = agent_config
      WHERE id = created_agent.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore errors here, we'll just return the agent without configuration
        NULL;
    END;
  END IF;
  
  -- Build the result
  SELECT json_build_object(
    'id', created_agent.id,
    'name', created_agent.name,
    'farm_id', created_agent.farm_id,
    'status', created_agent.status,
    'type', created_agent.type,
    'created_at', created_agent.created_at,
    'updated_at', created_agent.updated_at
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Add function documentation comment
COMMENT ON FUNCTION public.check_table_structure IS 'Checks if a table exists and has all the required columns';
COMMENT ON FUNCTION public.create_agent IS 'Creates an agent with proper configuration handling regardless of schema state';