-- Create a function to create an agent directly
CREATE OR REPLACE FUNCTION public.create_agent(
  agent_name TEXT,
  agent_farm_id INTEGER,
  agent_status TEXT DEFAULT 'initializing',
  agent_type TEXT DEFAULT 'eliza',
  agent_config JSONB DEFAULT '{}'::jsonb
)
RETURNS SETOF agents
SECURITY INVOKER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.agents (name, farm_id, status, type, configuration, created_at, updated_at)
  VALUES (
    agent_name,
    agent_farm_id,
    agent_status,
    agent_type,
    agent_config,
    now(),
    now()
  )
  RETURNING *;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent TO service_role;
