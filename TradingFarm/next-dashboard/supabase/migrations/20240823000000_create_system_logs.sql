-- Create system logs table for comprehensive logging
CREATE TABLE IF NOT EXISTS public.system_logs (
  id TEXT PRIMARY KEY,
  farm_id BIGINT, -- Will add foreign key constraints in a separate migration when all tables exist
  strategy_id BIGINT, -- Will add foreign key constraints in a separate migration when all tables exist
  agent_id BIGINT, -- Will add foreign key constraints in a separate migration when all tables exist
  source TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.system_logs IS 'System-wide logs for trading activities, agent operations, and errors';

-- Apply handle_created_at and handle_updated_at triggers
CREATE TRIGGER handle_system_logs_created_at
  BEFORE INSERT ON public.system_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_system_logs_updated_at
  BEFORE UPDATE ON public.system_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Simple RLS policy for now - authenticated users can read their logs
CREATE POLICY "Authenticated users can view logs" ON public.system_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trading system can insert logs
CREATE POLICY "Trading system can insert logs" ON public.system_logs
  FOR INSERT
  WITH CHECK (true);

-- Create index on common query fields
CREATE INDEX idx_system_logs_farm_id ON public.system_logs (farm_id);
CREATE INDEX idx_system_logs_strategy_id ON public.system_logs (strategy_id);
CREATE INDEX idx_system_logs_agent_id ON public.system_logs (agent_id);
CREATE INDEX idx_system_logs_level ON public.system_logs (level);
CREATE INDEX idx_system_logs_created_at ON public.system_logs (created_at);
CREATE INDEX idx_system_logs_source ON public.system_logs (source);
