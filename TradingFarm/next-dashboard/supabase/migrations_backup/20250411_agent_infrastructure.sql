-- Migration for ElizaOS Agent Integration Infrastructure
-- This migration creates the necessary tables for agent management, monitoring, and API key storage

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agent Logs Table
CREATE TABLE IF NOT EXISTS public.agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('info', 'warning', 'error', 'debug')),
    message TEXT NOT NULL,
    details JSONB,
    source VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agent_logs IS 'Logs for ElizaOS agents activities and events';

-- API Keys Vault Table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('exchange', 'market_data', 'news', 'llm', 'other')),
    service VARCHAR(100) NOT NULL,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('user', 'system', 'farm')),
    owner_id UUID NOT NULL,
    vault_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.api_keys IS 'Metadata for API keys stored in Supabase Vault';

-- Market Data Cache Table
CREATE TABLE IF NOT EXISTS public.market_data_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    data JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.market_data_cache IS 'Cache for market data to reduce external API calls';

-- Monitoring Events Table
CREATE TABLE IF NOT EXISTS public.monitoring_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    user_id UUID,
    farm_id UUID,
    agent_id UUID,
    source VARCHAR(50) NOT NULL,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.monitoring_events IS 'System-wide monitoring events for logging and alerting';

-- Alert Rules Table
CREATE TABLE IF NOT EXISTS public.alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL,
    severity_threshold VARCHAR(20) NOT NULL CHECK (severity_threshold IN ('debug', 'info', 'warning', 'error', 'critical')),
    subject_pattern TEXT,
    message_pattern TEXT,
    conditions JSONB,
    actions JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    cooldown_minutes INTEGER NOT NULL DEFAULT 60,
    last_triggered_at TIMESTAMPTZ,
    owner_id UUID NOT NULL,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('user', 'farm', 'system')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.alert_rules IS 'Rules for triggering alerts based on monitoring events';

-- User Notifications Table
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_notifications IS 'In-app notifications for users';

-- System Status Table
CREATE TABLE IF NOT EXISTS public.system_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    overall_health VARCHAR(20) NOT NULL CHECK (overall_health IN ('healthy', 'degraded', 'unhealthy')),
    components JSONB NOT NULL,
    active_alerts INTEGER NOT NULL DEFAULT 0,
    unresolved_errors INTEGER NOT NULL DEFAULT 0,
    active_agents INTEGER NOT NULL DEFAULT 0,
    system_load FLOAT NOT NULL DEFAULT 0,
    uptime_seconds BIGINT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_status IS 'Overall system status and health metrics';

-- Add any missing fields to elizaos_agents table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'elizaos_agents') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'elizaos_agents' AND column_name = 'performance_metrics') THEN
            ALTER TABLE public.elizaos_agents ADD COLUMN performance_metrics JSONB NOT NULL DEFAULT '{"commands_processed": 0, "success_rate": 1.0, "average_response_time_ms": 0, "uptime_percentage": 100}';
        END IF;
    END IF;
END
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON public.agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON public.agent_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_owner_scope_service ON public.api_keys(owner_id, scope, service);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_timestamp ON public.monitoring_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_severity ON public.monitoring_events(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_type ON public.monitoring_events(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(user_id, read);

-- Add Vault functions
CREATE OR REPLACE FUNCTION store_secret_in_vault(secret_name text, secret_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  secret_id uuid;
BEGIN
  -- Generate a UUID for the secret
  secret_id := uuid_generate_v4();
  
  -- Store in vault
  -- This is a placeholder - in production, you would use Supabase Vault's actual API
  -- The actual implementation would depend on your Supabase setup
  
  -- For now, we'll just return the UUID
  RETURN secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_secret_from_vault(secret_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  secret_value text;
BEGIN
  -- In production, this would retrieve from Supabase Vault
  -- For now, we'll just return a placeholder
  secret_value := '{"redacted":"For security reasons, actual implementation required"}';
  
  RETURN secret_value;
END;
$$;

CREATE OR REPLACE FUNCTION delete_secret_from_vault(secret_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- In production, this would delete from Supabase Vault
  -- For now, we'll just return success
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION update_agent_metrics(p_agent_id uuid, p_metrics jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.elizaos_agents
  SET performance_metrics = performance_metrics || p_metrics,
      updated_at = now()
  WHERE id = p_agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_json_field(
  table_name text,
  record_id uuid,
  field_name text,
  nested_field_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_value jsonb;
  updated_value jsonb;
  query text;
BEGIN
  -- Construct dynamic query to get current JSON value
  query := format('SELECT %I FROM %I WHERE id = $1', field_name, table_name);
  
  -- Execute query with parameters
  EXECUTE query INTO current_value USING record_id;
  
  -- Merge the nested updates with current value
  updated_value := current_value || nested_field_updates;
  
  -- Construct update query
  query := format('UPDATE %I SET %I = $1, updated_at = now() WHERE id = $2 RETURNING %I', 
                  table_name, field_name, field_name);
  
  -- Execute update query
  EXECUTE query INTO updated_value USING updated_value, record_id;
  
  RETURN updated_value;
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Agent Logs policies
CREATE POLICY "Agent logs visible to farm members and system" 
ON public.agent_logs
FOR SELECT
USING (
  (
    -- User has access to the farm the agent belongs to
    EXISTS (
      SELECT 1 FROM public.elizaos_agents a
      JOIN public.farm_members fm ON a.farm_id = fm.farm_id
      WHERE a.id = agent_logs.agent_id AND fm.user_id = auth.uid()
    )
  ) OR (
    -- User is system admin
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  )
);

-- API Keys policies
CREATE POLICY "Users can view their own API keys" 
ON public.api_keys
FOR SELECT
USING (
  (scope = 'user' AND owner_id = auth.uid()) OR
  (
    -- Farm members can view farm API keys
    scope = 'farm' AND EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = owner_id AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create their own API keys" 
ON public.api_keys
FOR INSERT
WITH CHECK (
  (scope = 'user' AND owner_id = auth.uid()) OR
  (
    -- Farm admins can create farm API keys
    scope = 'farm' AND EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = owner_id AND user_id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "Users can update their own API keys" 
ON public.api_keys
FOR UPDATE
USING (
  (scope = 'user' AND owner_id = auth.uid()) OR
  (
    -- Farm admins can update farm API keys
    scope = 'farm' AND EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = owner_id AND user_id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "Users can delete their own API keys" 
ON public.api_keys
FOR DELETE
USING (
  (scope = 'user' AND owner_id = auth.uid()) OR
  (
    -- Farm admins can delete farm API keys
    scope = 'farm' AND EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = owner_id AND user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- User Notifications policies
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Market Data Cache is accessible to all authenticated users
CREATE POLICY "Market data cache is accessible to all authenticated users" 
ON public.market_data_cache
FOR SELECT
USING (auth.role() = 'authenticated');

-- Monitoring Events policies
CREATE POLICY "Users can see monitoring events related to their farms and agents" 
ON public.monitoring_events
FOR SELECT
USING (
  (
    -- User's own events
    user_id = auth.uid()
  ) OR (
    -- Events for farms the user belongs to
    farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = monitoring_events.farm_id AND user_id = auth.uid()
    )
  ) OR (
    -- Events for agents in farms the user belongs to
    agent_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.elizaos_agents a
      JOIN public.farm_members fm ON a.farm_id = fm.farm_id
      WHERE a.id = monitoring_events.agent_id AND fm.user_id = auth.uid()
    )
  ) OR (
    -- System admins can see all events
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  )
);

-- Alert Rules policies
CREATE POLICY "Users can manage their own alert rules" 
ON public.alert_rules
FOR ALL
USING (
  (
    -- User's own rules
    scope = 'user' AND owner_id = auth.uid()
  ) OR (
    -- Farm rules for farms the user is an admin of
    scope = 'farm' AND EXISTS (
      SELECT 1 FROM public.farm_members
      WHERE farm_id = owner_id AND user_id = auth.uid() AND role = 'admin'
    )
  ) OR (
    -- System admins can manage all rules
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  )
);

-- System Status is visible to all authenticated users
CREATE POLICY "System status is visible to all authenticated users" 
ON public.system_status
FOR SELECT
USING (auth.role() = 'authenticated');

-- Only system processes can update system status
CREATE POLICY "Only system processes can update system status" 
ON public.system_status
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND 
          table_name IN ('agent_logs', 'api_keys', 'market_data_cache', 'monitoring_events', 'alert_rules', 'user_notifications', 'system_status')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.%I
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
    ', tbl, tbl);
  END LOOP;
END
$$;
