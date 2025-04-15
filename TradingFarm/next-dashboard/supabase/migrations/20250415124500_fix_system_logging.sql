-- Ensure system_logs table exists with correct schema
CREATE TABLE IF NOT EXISTS public.system_logs (
  id TEXT PRIMARY KEY,
  farm_id BIGINT,
  strategy_id BIGINT,
  agent_id BIGINT,
  source TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Make sure triggers exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'handle_system_logs_created_at'
  ) THEN
    CREATE TRIGGER handle_system_logs_created_at
      BEFORE INSERT ON public.system_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'handle_system_logs_updated_at'
  ) THEN
    CREATE TRIGGER handle_system_logs_updated_at
      BEFORE UPDATE ON public.system_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create necessary indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_farm_id') THEN
    CREATE INDEX idx_system_logs_farm_id ON public.system_logs (farm_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_strategy_id') THEN
    CREATE INDEX idx_system_logs_strategy_id ON public.system_logs (strategy_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_agent_id') THEN
    CREATE INDEX idx_system_logs_agent_id ON public.system_logs (agent_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_level') THEN
    CREATE INDEX idx_system_logs_level ON public.system_logs (level);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_created_at') THEN
    CREATE INDEX idx_system_logs_created_at ON public.system_logs (created_at);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_source') THEN
    CREATE INDEX idx_system_logs_source ON public.system_logs (source);
  END IF;
END $$;

-- Ensure RLS is enabled and policies exist
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.system_logs;
DROP POLICY IF EXISTS "Trading system can insert logs" ON public.system_logs;

-- Create/recreate basic policies
CREATE POLICY "Authenticated users can view logs" ON public.system_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Trading system can insert logs" ON public.system_logs
  FOR INSERT
  WITH CHECK (true);
