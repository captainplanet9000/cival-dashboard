-- migrations/20250411_enhance_elizaos_integration.sql

-- Add processing information to agents table
ALTER TABLE public.elizaos_agents 
ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_id UUID,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5;

-- Create agent events table for realtime updates
CREATE TABLE IF NOT EXISTS public.elizaos_agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS for agent events table
ALTER TABLE public.elizaos_agent_events ENABLE ROW LEVEL SECURITY;

-- Create policy for agent events
CREATE POLICY agent_events_select_policy ON public.elizaos_agent_events
  FOR SELECT USING (
    agent_id IN (
      SELECT ea.id FROM public.elizaos_agents ea
      JOIN public.farm_members fm ON ea.farm_id = fm.farm_id
      WHERE fm.user_id = auth.uid()
    )
  );

-- Create monitoring alert rules table
CREATE TABLE IF NOT EXISTS public.monitoring_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_types TEXT[] NOT NULL,
  condition JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  severity TEXT NOT NULL,
  throttle_seconds INTEGER DEFAULT 300,
  notification_channels TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS for monitoring alert rules
ALTER TABLE public.monitoring_alert_rules ENABLE ROW LEVEL SECURITY;

-- Create policy for monitoring alert rules
CREATE POLICY alert_rules_select_policy ON public.monitoring_alert_rules
  FOR SELECT USING (true); -- All authenticated users can view rules

CREATE POLICY alert_rules_insert_update_policy ON public.monitoring_alert_rules
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.farm_members
      WHERE role = 'admin'
    )
  );

-- Create API key access logs
CREATE TABLE IF NOT EXISTS public.api_key_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id TEXT NOT NULL,
  user_id UUID,
  agent_id UUID REFERENCES public.elizaos_agents(id) ON DELETE SET NULL,
  function_id TEXT,
  farm_id UUID NOT NULL,
  access_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS for API key access logs
ALTER TABLE public.api_key_access_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for API key access logs
CREATE POLICY api_key_logs_select_policy ON public.api_key_access_logs
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM public.farm_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Create stored procedure for agent locking
CREATE OR REPLACE FUNCTION public.get_active_agents_with_lock(
  batch_size INT, 
  max_processing_time_ms INT
) RETURNS SETOF public.elizaos_agents AS $$
BEGIN
  RETURN QUERY
  UPDATE public.elizaos_agents
  SET last_processed_at = NOW(),
      processing_id = gen_random_uuid()
  WHERE id IN (
    SELECT id FROM public.elizaos_agents
    WHERE status = 'active'
    AND (last_processed_at IS NULL OR 
         last_processed_at < NOW() - INTERVAL '1 minute')
    AND (processing_id IS NULL OR
         processing_id IN (
           SELECT processing_id FROM public.elizaos_agents
           WHERE last_processed_at < NOW() - (max_processing_time_ms * INTERVAL '1 millisecond')
         ))
    ORDER BY priority DESC, last_processed_at ASC NULLS FIRST
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stored procedure for agent control transaction
CREATE OR REPLACE FUNCTION public.control_agent_transaction(
  p_agent_id UUID,
  p_action TEXT,
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_new_status TEXT;
BEGIN
  -- Determine new status based on action
  CASE p_action
    WHEN 'start' THEN v_new_status := 'active';
    WHEN 'stop' THEN v_new_status := 'idle';
    WHEN 'pause' THEN v_new_status := 'paused';
    WHEN 'resume' THEN v_new_status := 'active';
    WHEN 'restart' THEN v_new_status := 'active';
    ELSE RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  -- Update agent status
  UPDATE public.elizaos_agents
  SET status = v_new_status,
      updated_at = NOW()
  WHERE id = p_agent_id;

  -- Log the control action
  INSERT INTO public.monitoring_events (
    type,
    level,
    agent_id,
    user_id,
    message,
    details
  ) VALUES (
    'agent.control',
    'info',
    p_agent_id,
    p_user_id,
    format('Agent %s by user %s', p_action, p_user_id),
    jsonb_build_object(
      'action', p_action,
      'new_status', v_new_status,
      'timestamp', NOW()
    )
  );

  -- Insert agent event for realtime updates
  INSERT INTO public.elizaos_agent_events (
    agent_id,
    event_type,
    created_at
  ) VALUES (
    p_agent_id,
    format('agent.control.%s', p_action),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get API key from vault with proper security checks
CREATE OR REPLACE FUNCTION public.get_api_key_from_vault(
  exchange_id TEXT,
  farm_id UUID
) RETURNS TEXT AS $$
DECLARE
  api_key TEXT;
BEGIN
  -- Check that the user is a member of the farm
  IF NOT EXISTS (
    SELECT 1 FROM public.farm_members
    WHERE user_id = auth.uid()
    AND farm_id = get_api_key_from_vault.farm_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of the farm';
  END IF;

  -- Get the API key from vault
  SELECT key INTO api_key
  FROM public.api_keys
  WHERE exchange = exchange_id
  AND farm_id = get_api_key_from_vault.farm_id;

  -- Log the access
  INSERT INTO public.api_key_access_logs (
    exchange_id,
    user_id,
    farm_id,
    access_type
  ) VALUES (
    exchange_id,
    auth.uid(),
    farm_id,
    'read'
  );

  RETURN api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add status triggers for agent error states
CREATE OR REPLACE FUNCTION public.handle_agent_error() RETURNS TRIGGER AS $$
BEGIN
  -- If the status is changed to an error state, log it
  IF NEW.status LIKE 'error%' AND (OLD.status IS NULL OR OLD.status NOT LIKE 'error%') THEN
    INSERT INTO public.monitoring_events (
      type,
      level,
      agent_id,
      message,
      details
    ) VALUES (
      'agent.error',
      'error',
      NEW.id,
      format('Agent entered error state: %s', NEW.status),
      jsonb_build_object(
        'previous_status', OLD.status,
        'current_status', NEW.status,
        'timestamp', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_error_trigger
AFTER UPDATE OF status ON public.elizaos_agents
FOR EACH ROW
WHEN (NEW.status LIKE 'error%')
EXECUTE FUNCTION public.handle_agent_error();
