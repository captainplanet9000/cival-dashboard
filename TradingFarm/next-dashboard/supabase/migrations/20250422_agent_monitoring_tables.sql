-- Migration: 20250422_agent_monitoring_tables.sql
-- Description: Creates agent_health and agent_events tables for monitoring agent activities
-- Generated: 2025-04-22T01:15:00Z

BEGIN;

-- Create agent_health table for real-time monitoring of agent status
CREATE TABLE IF NOT EXISTS public.agent_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  memory_usage FLOAT,
  cpu_usage FLOAT,
  active_tasks INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automatically update the 'updated_at' timestamp
DROP TRIGGER IF EXISTS agent_health_updated_at ON public.agent_health;
CREATE TRIGGER agent_health_updated_at
BEFORE UPDATE ON public.agent_health
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.agent_health ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_health
CREATE POLICY "Users can view agent health for their farms" ON public.agent_health
  FOR SELECT 
  USING (farm_id IN (
    SELECT id FROM public.farms WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert agent health for their farms" ON public.agent_health
  FOR INSERT
  WITH CHECK (farm_id IN (
    SELECT id FROM public.farms WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update agent health for their farms" ON public.agent_health
  FOR UPDATE
  USING (farm_id IN (
    SELECT id FROM public.farms WHERE user_id = auth.uid()
  ));

-- Create agent_events table for tracking agent activities
CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'info',
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automatically update the 'updated_at' timestamp
DROP TRIGGER IF EXISTS agent_events_updated_at ON public.agent_events;
CREATE TRIGGER agent_events_updated_at
BEFORE UPDATE ON public.agent_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_events
CREATE POLICY "Users can view agent events for their farms" ON public.agent_events
  FOR SELECT 
  USING (farm_id IN (
    SELECT id FROM public.farms WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert agent events for their farms" ON public.agent_events
  FOR INSERT
  WITH CHECK (farm_id IN (
    SELECT id FROM public.farms WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update agent events for their farms" ON public.agent_events
  FOR UPDATE
  USING (farm_id IN (
    SELECT id FROM public.farms WHERE user_id = auth.uid()
  ));

-- Create function for logging agent events
CREATE OR REPLACE FUNCTION public.log_agent_event(
  p_agent_id UUID,
  p_event_type TEXT,
  p_event_details JSONB,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_farm_id UUID;
  v_event_id UUID;
BEGIN
  -- Get the farm_id from the agents table
  SELECT farm_id INTO v_farm_id
  FROM public.agents
  WHERE id = p_agent_id;
  
  -- Insert the event
  INSERT INTO public.agent_events (
    agent_id,
    event_type,
    event_details,
    severity,
    farm_id
  ) VALUES (
    p_agent_id,
    p_event_type,
    p_event_details,
    p_severity,
    v_farm_id
  ) RETURNING id INTO v_event_id;
  
  -- Update agent health last_active timestamp
  UPDATE public.agent_health
  SET last_active = now(),
      error_count = CASE WHEN p_severity = 'error' THEN error_count + 1 ELSE error_count END
  WHERE agent_id = p_agent_id;
  
  RETURN v_event_id;
END;
$$;

-- Create function to update agent health status
CREATE OR REPLACE FUNCTION public.update_agent_health(
  p_agent_id UUID,
  p_status TEXT,
  p_memory_usage FLOAT DEFAULT NULL,
  p_cpu_usage FLOAT DEFAULT NULL,
  p_active_tasks INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_farm_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Get the farm_id from the agents table
  SELECT farm_id INTO v_farm_id
  FROM public.agents
  WHERE id = p_agent_id;
  
  -- Check if an entry already exists
  SELECT EXISTS(
    SELECT 1 FROM public.agent_health
    WHERE agent_id = p_agent_id
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Update existing record
    UPDATE public.agent_health
    SET status = p_status,
        last_active = now(),
        memory_usage = COALESCE(p_memory_usage, memory_usage),
        cpu_usage = COALESCE(p_cpu_usage, cpu_usage),
        active_tasks = COALESCE(p_active_tasks, active_tasks)
    WHERE agent_id = p_agent_id;
  ELSE
    -- Create new record
    INSERT INTO public.agent_health (
      agent_id,
      status,
      memory_usage,
      cpu_usage,
      active_tasks,
      farm_id
    ) VALUES (
      p_agent_id,
      p_status,
      p_memory_usage,
      p_cpu_usage,
      COALESCE(p_active_tasks, 0),
      v_farm_id
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_health_agent_id ON public.agent_health(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_health_farm_id ON public.agent_health(farm_id);
CREATE INDEX IF NOT EXISTS idx_agent_health_status ON public.agent_health(status);

CREATE INDEX IF NOT EXISTS idx_agent_events_agent_id ON public.agent_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_farm_id ON public.agent_events(farm_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_event_type ON public.agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_severity ON public.agent_events(severity);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON public.agent_events(created_at);

-- Add comments for documentation
COMMENT ON TABLE public.agent_health IS 'Real-time health and status information for agents';
COMMENT ON TABLE public.agent_events IS 'Event log for agent activities';
COMMENT ON FUNCTION public.log_agent_event IS 'Logs an event for an agent and updates its last_active timestamp';
COMMENT ON FUNCTION public.update_agent_health IS 'Updates an agent''s health status information';

-- Record this migration
INSERT INTO public._migrations (name)
VALUES ('20250422_agent_monitoring_tables.sql')
ON CONFLICT (name) DO NOTHING;

COMMIT;
