-- Creates simple utility functions for the application
-- This includes diagnostic functions used by the integration tests

-- Simple timestamp function for connection testing
CREATE OR REPLACE FUNCTION public.get_timestamp()
RETURNS TIMESTAMPTZ
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT NOW();
$$;

-- Function to create the timestamp function if it doesn't exist
-- This is used only by the integration tests as a fallback
CREATE OR REPLACE FUNCTION public.create_timestamp_function()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Function is already created above, this just returns without error
  RETURN;
END;
$$;

-- Monitor server status
CREATE OR REPLACE FUNCTION public.get_system_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'server_version', version(),
      'current_timestamp', now(),
      'uptime', pg_postmaster_start_time(),
      'database', current_database()
    ) INTO result;
  
  RETURN result;
END;
$$;

-- Enable RLS on all created functions
ALTER FUNCTION public.get_timestamp() SET search_path = '';
ALTER FUNCTION public.create_timestamp_function() SET search_path = '';
ALTER FUNCTION public.get_system_status() SET search_path = '';

-- Add comment
COMMENT ON FUNCTION public.get_timestamp() IS 'Returns the current server timestamp, used for connection testing';
COMMENT ON FUNCTION public.create_timestamp_function() IS 'Utility function for integration tests';
COMMENT ON FUNCTION public.get_system_status() IS 'Returns basic system status information';
