-- Migration: Add monitoring tables
-- Created at: 2025-04-28T03:54:13.222Z

-- Create monitoring_events table to store events for analysis
CREATE TABLE IF NOT EXISTS public.monitoring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Add index for event_type to speed up queries
CREATE INDEX IF NOT EXISTS idx_monitoring_events_event_type ON public.monitoring_events(event_type);

-- Add index for created_at to speed up time-based queries
CREATE INDEX IF NOT EXISTS idx_monitoring_events_created_at ON public.monitoring_events(created_at);

-- Add RLS policies
ALTER TABLE public.monitoring_events ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view monitoring events
CREATE POLICY "Allow admins to view monitoring events" 
  ON public.monitoring_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- System can insert monitoring events
CREATE POLICY "System can insert monitoring events" 
  ON public.monitoring_events
  FOR INSERT
  WITH CHECK (true);

-- Create health_check table for database health checks
CREATE TABLE IF NOT EXISTS public.health_check (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ok',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial record
INSERT INTO public.health_check (status) VALUES ('ok') ON CONFLICT DO NOTHING;

-- Create system_alerts table for critical system alerts
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  resolved BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

-- Add index for unresolved alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON public.system_alerts(resolved) WHERE NOT resolved;

-- Add RLS policies
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all alerts
CREATE POLICY "Allow admins to view system alerts" 
  ON public.system_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- System can insert alerts
CREATE POLICY "System can insert alerts" 
  ON public.system_alerts
  FOR INSERT
  WITH CHECK (true);

-- Admins can update alerts (to resolve them)
CREATE POLICY "Allow admins to update system alerts" 
  ON public.system_alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create performance_metrics table to store performance data
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  dimensions JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add TimescaleDB hypertable for time-series data if extension exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
  ) THEN
    PERFORM create_hypertable('public.performance_metrics', 'timestamp', if_not_exists => TRUE);
  END IF;
END $$;

-- Add index for metric_type
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON public.performance_metrics(metric_type);

-- Add RLS policies
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow system to insert metrics
CREATE POLICY "System can insert performance metrics" 
  ON public.performance_metrics
  FOR INSERT
  WITH CHECK (true);

-- Allow admins to view metrics
CREATE POLICY "Allow admins to view performance metrics" 
  ON public.performance_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create function to log performance metrics
CREATE OR REPLACE FUNCTION public.log_performance_metric(
  p_metric_type TEXT,
  p_value NUMERIC,
  p_dimensions JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.performance_metrics (metric_type, value, dimensions)
  VALUES (p_metric_type, p_value, p_dimensions)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Create function to check system health
CREATE OR REPLACE FUNCTION public.check_system_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_start_time TIMESTAMPTZ;
  v_duration_ms INT;
  v_db_size BIGINT;
  v_table_count INT;
  v_active_connections INT;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Get database size
  SELECT pg_database_size(current_database()) INTO v_db_size;
  
  -- Get table count
  SELECT count(*) INTO v_table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public';
  
  -- Get active connections
  SELECT count(*) INTO v_active_connections 
  FROM pg_stat_activity 
  WHERE datname = current_database();
  
  v_duration_ms := extract(milliseconds from clock_timestamp() - v_start_time)::INT;
  
  -- Build result
  v_result := jsonb_build_object(
    'status', 'healthy',
    'timestamp', now(),
    'database_size_bytes', v_db_size,
    'table_count', v_table_count,
    'active_connections', v_active_connections,
    'check_duration_ms', v_duration_ms
  );
  
  -- Update health check table
  UPDATE public.health_check 
  SET updated_at = now(), 
      status = 'ok' 
  WHERE id = 1;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'status', 'unhealthy',
    'timestamp', now(),
    'error', SQLERRM
  );
  
  -- Update health check table
  UPDATE public.health_check 
  SET updated_at = now(), 
      status = 'error: ' || SQLERRM 
  WHERE id = 1;
  
  RETURN v_result;
END;
$$;

-- Create cron job for regular system health checks if extension exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    SELECT cron.schedule('*/30 * * * *', 'SELECT public.check_system_health()');
  END IF;
END $$;
