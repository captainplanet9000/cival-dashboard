-- Create performance metrics table for production monitoring
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metric_unit TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster querying by user_id and timestamp
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON public.performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON public.performance_metrics(metric_name);

-- Set up Row Level Security
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to access only their own metrics
CREATE POLICY user_metrics_policy ON public.performance_metrics 
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Create policy to allow service roles to read all metrics
CREATE POLICY service_read_metrics_policy ON public.performance_metrics 
  FOR SELECT
  TO service_role
  USING (true);

-- Trigger to handle created_at and updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.performance_metrics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to aggregate performance metrics for dashboard display
CREATE OR REPLACE FUNCTION public.get_aggregated_metrics(
  p_user_id UUID,
  p_timeframe TEXT DEFAULT '24h',
  p_metric_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  metric_name TEXT,
  avg_value DOUBLE PRECISION,
  min_value DOUBLE PRECISION,
  max_value DOUBLE PRECISION,
  median_value DOUBLE PRECISION,
  p95_value DOUBLE PRECISION,
  metric_unit TEXT,
  sample_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = '';
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
BEGIN
  -- Calculate time range based on input parameter
  CASE p_timeframe
    WHEN '1h' THEN v_start_time := now() - INTERVAL '1 hour';
    WHEN '6h' THEN v_start_time := now() - INTERVAL '6 hours';
    WHEN '24h' THEN v_start_time := now() - INTERVAL '24 hours';
    WHEN '7d' THEN v_start_time := now() - INTERVAL '7 days';
    WHEN '30d' THEN v_start_time := now() - INTERVAL '30 days';
    ELSE v_start_time := now() - INTERVAL '24 hours';
  END CASE;

  -- Return aggregated metrics
  RETURN QUERY 
  SELECT 
    public.performance_metrics.metric_name,
    AVG(public.performance_metrics.metric_value) AS avg_value,
    MIN(public.performance_metrics.metric_value) AS min_value,
    MAX(public.performance_metrics.metric_value) AS max_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY public.performance_metrics.metric_value) AS median_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY public.performance_metrics.metric_value) AS p95_value,
    MAX(public.performance_metrics.metric_unit) AS metric_unit,
    COUNT(*) AS sample_count
  FROM 
    public.performance_metrics
  WHERE 
    (public.performance_metrics.user_id = p_user_id OR p_user_id IS NULL)
    AND public.performance_metrics.timestamp >= v_start_time
    AND (p_metric_type IS NULL OR public.performance_metrics.metric_name LIKE p_metric_type || '%')
  GROUP BY 
    public.performance_metrics.metric_name;
END;
$$;

-- Create a monitor table to track system health
CREATE TABLE IF NOT EXISTS public.system_monitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitor_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  last_check_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster monitoring queries
CREATE INDEX IF NOT EXISTS idx_system_monitors_status ON public.system_monitors(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_monitors_name ON public.system_monitors(monitor_name);

-- Add row level security
ALTER TABLE public.system_monitors ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to manage monitors
CREATE POLICY admin_manage_monitors ON public.system_monitors 
  FOR ALL
  TO service_role
  USING (true);

-- Create policy to allow all authenticated users to read monitor status
CREATE POLICY users_read_monitors ON public.system_monitors 
  FOR SELECT
  TO authenticated
  USING (true);

-- Trigger to handle created_at and updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.system_monitors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
