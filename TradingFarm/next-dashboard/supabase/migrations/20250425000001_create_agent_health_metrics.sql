-- Create agent_health_metrics table
CREATE TABLE IF NOT EXISTS public.agent_health_metrics (
  id BIGSERIAL PRIMARY KEY,
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_check_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'healthy',
  uptime_seconds INTEGER NOT NULL DEFAULT 0,
  memory_usage_mb FLOAT,
  cpu_usage_percent FLOAT,
  error_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_warning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_health_metrics ENABLE ROW LEVEL SECURITY;

-- Set RLS policies
CREATE POLICY "Users can view their own agent health metrics"
  ON public.agent_health_metrics
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own agent health metrics"
  ON public.agent_health_metrics
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own agent health metrics"
  ON public.agent_health_metrics
  FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_agent_health_metrics_updated_at ON public.agent_health_metrics;
CREATE TRIGGER handle_agent_health_metrics_updated_at
  BEFORE UPDATE ON public.agent_health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
