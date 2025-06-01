-- Phase 5: Monitoring & Operations Tables
-- Execute this directly in the Supabase SQL Editor

-- Alerts Configuration Table
CREATE TABLE IF NOT EXISTS public.alert_configs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  severity TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  notification_channels JSONB,
  agent_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;

-- Set RLS policies
DROP POLICY IF EXISTS "Users can view their own alert configs" ON public.alert_configs;
DROP POLICY IF EXISTS "Users can insert their own alert configs" ON public.alert_configs;
DROP POLICY IF EXISTS "Users can update their own alert configs" ON public.alert_configs;
DROP POLICY IF EXISTS "Users can delete their own alert configs" ON public.alert_configs;

CREATE POLICY "Users can view their own alert configs"
  ON public.alert_configs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own alert configs"
  ON public.alert_configs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own alert configs"
  ON public.alert_configs
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own alert configs"
  ON public.alert_configs
  FOR DELETE
  USING (user_id = auth.uid());

-- Triggered Alerts Table
CREATE TABLE IF NOT EXISTS public.triggered_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_config_id BIGINT REFERENCES public.alert_configs(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_value NUMERIC NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  message TEXT NOT NULL,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.triggered_alerts ENABLE ROW LEVEL SECURITY;

-- Set RLS policies
DROP POLICY IF EXISTS "Users can view their own triggered alerts" ON public.triggered_alerts;
DROP POLICY IF EXISTS "Users can update their own triggered alerts" ON public.triggered_alerts;

CREATE POLICY "Users can view their own triggered alerts"
  ON public.triggered_alerts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own triggered alerts"
  ON public.triggered_alerts
  FOR UPDATE
  USING (user_id = auth.uid());

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id INTEGER,
  metric_type TEXT NOT NULL,
  time_period TEXT NOT NULL,
  value NUMERIC NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Set RLS policies
DROP POLICY IF EXISTS "Users can view their own performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Users can insert their own performance metrics" ON public.performance_metrics;

CREATE POLICY "Users can view their own performance metrics"
  ON public.performance_metrics
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own performance metrics"
  ON public.performance_metrics
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Set RLS policies
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

CREATE POLICY "Users can view their own audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Set RLS policies
DROP POLICY IF EXISTS "Users can view their own notification prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can delete their own notification prefs" ON public.notification_preferences;

CREATE POLICY "Users can view their own notification prefs"
  ON public.notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification prefs"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification prefs"
  ON public.notification_preferences
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification prefs"
  ON public.notification_preferences
  FOR DELETE
  USING (user_id = auth.uid());

-- Create Triggers for updated_at fields
CREATE TRIGGER handle_alert_configs_updated_at
  BEFORE UPDATE ON public.alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add default notification preferences for existing users
INSERT INTO public.notification_preferences (user_id, channel, enabled, config)
SELECT 
  id as user_id,
  'email' as channel,
  true as enabled,
  jsonb_build_object('frequency', 'immediate') as config
FROM auth.users
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alert_configs_user_id ON public.alert_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_user_id ON public.triggered_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_config_id ON public.triggered_alerts(alert_config_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_agent_id ON public.performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
