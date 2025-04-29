-- Create table for alerts
CREATE TABLE public.trading_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- farm_id BIGINT REFERENCES public.farms(id) ON DELETE CASCADE,
  farm_id BIGINT,
  -- strategy_id BIGINT REFERENCES public.yield_strategies(id) ON DELETE SET NULL,
  strategy_id BIGINT,
  -- agent_id BIGINT REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_id BIGINT,
  exchange VARCHAR(50),
  alert_type VARCHAR(50) NOT NULL,
  level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  details JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trading_alerts ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for trading_alerts
CREATE POLICY "Users can view their own alerts"
  ON public.trading_alerts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own alerts"
  ON public.trading_alerts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own alerts"
  ON public.trading_alerts
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own alerts"
  ON public.trading_alerts
  FOR DELETE
  USING (user_id = auth.uid());

-- Create table for alert rules
CREATE TABLE public.alert_rules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- farm_id BIGINT REFERENCES public.farms(id) ON DELETE CASCADE,
  farm_id BIGINT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  notification_channels JSONB NOT NULL DEFAULT '["ui"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  throttle_minutes INTEGER NOT NULL DEFAULT 60,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_channels CHECK (jsonb_typeof(notification_channels) = 'array')
);

-- Enable Row Level Security
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for alert_rules
CREATE POLICY "Users can view their own alert rules"
  ON public.alert_rules
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own alert rules"
  ON public.alert_rules
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own alert rules"
  ON public.alert_rules
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own alert rules"
  ON public.alert_rules
  FOR DELETE
  USING (user_id = auth.uid());

-- Create table for monitoring events
CREATE TABLE public.monitoring_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- farm_id BIGINT REFERENCES public.farms(id) ON DELETE CASCADE,
  farm_id BIGINT,
  event_type VARCHAR(50) NOT NULL,
  component VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('ok', 'warning', 'error')),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.monitoring_events ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for monitoring_events
CREATE POLICY "Users can view their own monitoring events"
  ON public.monitoring_events
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own monitoring events"
  ON public.monitoring_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create table for exchange monitoring
CREATE TABLE public.exchange_monitoring (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('connected', 'limited', 'disconnected', 'error')),
  latency_ms INTEGER,
  last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exchange_monitoring ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for exchange_monitoring
CREATE POLICY "Users can view their own exchange monitoring"
  ON public.exchange_monitoring
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own exchange monitoring"
  ON public.exchange_monitoring
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own exchange monitoring"
  ON public.exchange_monitoring
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own exchange monitoring"
  ON public.exchange_monitoring
  FOR DELETE
  USING (user_id = auth.uid());

-- Create table for trading audit logs
CREATE TABLE public.trading_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- farm_id BIGINT REFERENCES public.farms(id) ON DELETE CASCADE,
  farm_id BIGINT,
  -- agent_id BIGINT REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_id BIGINT,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trading_audit_logs ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for trading_audit_logs
CREATE POLICY "Users can view their own audit logs"
  ON public.trading_audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own audit logs"
  ON public.trading_audit_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create a function to log audit events
CREATE OR REPLACE FUNCTION public.log_trading_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.trading_audit_logs (
    user_id, 
    farm_id, 
    agent_id,
    action, 
    entity_type, 
    entity_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    CASE WHEN TG_TABLE_NAME = 'farms' THEN 
      CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
    ELSE
      CASE WHEN TG_OP = 'DELETE' THEN OLD.farm_id ELSE NEW.farm_id END
    END,
    CASE WHEN TG_TABLE_NAME = 'agents' THEN 
      CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
    ELSE
      CASE WHEN TG_OP = 'DELETE' THEN OLD.agent_id ELSE NEW.agent_id END
    END,
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' 
      THEN row_to_json(OLD)
      ELSE NULL
    END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE'
      THEN row_to_json(NEW)
      ELSE NULL
    END
  );
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at
CREATE TRIGGER handle_trading_alerts_updated_at
  BEFORE UPDATE ON public.trading_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_exchange_monitoring_updated_at
  BEFORE UPDATE ON public.exchange_monitoring
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
