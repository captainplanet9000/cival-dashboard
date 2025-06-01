-- Define the reset_agent function
CREATE OR REPLACE FUNCTION public.reset_agent(p_agent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER -- Run with the permissions of the user calling the function
SET search_path = ''; -- Prevent hijacking
AS $$
BEGIN
  -- Update the agent's status to 'idle'
  -- The updated_at column will be handled by the existing trigger (public.handle_updated_at)
  UPDATE public.agents
  SET status = 'idle'
  WHERE id = p_agent_id; -- Use prefixed parameter name
END;
$$;

 