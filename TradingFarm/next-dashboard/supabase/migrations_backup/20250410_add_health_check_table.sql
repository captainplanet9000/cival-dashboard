-- Create health check table for monitoring system availability
CREATE TABLE public.health_checks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  status TEXT NOT NULL DEFAULT 'ok',
  service_name TEXT NOT NULL,
  check_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Add triggers for automatic timestamp management
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.health_checks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.health_checks IS 'Table for tracking health check results and uptime monitoring';

-- Add indexes for performance
CREATE INDEX health_checks_service_name_idx ON public.health_checks (service_name);
CREATE INDEX health_checks_created_at_idx ON public.health_checks (created_at);

-- Enable Row Level Security
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Allow service accounts to insert health checks"
  ON public.health_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'app_role' = 'service');

CREATE POLICY "Allow admin users to select health checks"
  ON public.health_checks
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'app_role' IN ('admin', 'service'));

-- Create a function to automatically prune old health check entries
CREATE OR REPLACE FUNCTION public.prune_health_checks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete health check records older than 30 days
  DELETE FROM public.health_checks
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.prune_health_checks IS 'Function to automatically delete health check records older than 30 days';

-- Create a cron job to run the pruning function daily
SELECT cron.schedule(
  'daily-health-check-pruning',
  '0 0 * * *',  -- Run at midnight every day
  'SELECT public.prune_health_checks();'
);
