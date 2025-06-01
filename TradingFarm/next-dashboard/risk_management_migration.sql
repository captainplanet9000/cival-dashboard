-- Risk Management Tables Migration Script
-- Execute this directly in the Supabase SQL Editor or via psql

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Risk Profiles Table
CREATE TABLE IF NOT EXISTS public.risk_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_drawdown FLOAT,
  max_position_size FLOAT,
  max_daily_loss FLOAT,
  risk_per_trade FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own risk profiles" ON public.risk_profiles;
DROP POLICY IF EXISTS "Users can insert their own risk profiles" ON public.risk_profiles;
DROP POLICY IF EXISTS "Users can update their own risk profiles" ON public.risk_profiles;
DROP POLICY IF EXISTS "Users can delete their own risk profiles" ON public.risk_profiles;

-- Set RLS policies
CREATE POLICY "Users can view their own risk profiles"
  ON public.risk_profiles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own risk profiles"
  ON public.risk_profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own risk profiles"
  ON public.risk_profiles
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own risk profiles"
  ON public.risk_profiles
  FOR DELETE
  USING (user_id = auth.uid());

-- Circuit Breakers Table
CREATE TABLE IF NOT EXISTS public.circuit_breakers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  trigger_type TEXT NOT NULL,
  threshold FLOAT NOT NULL,
  cooldown_minutes INTEGER DEFAULT 60,
  notification_channels JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.circuit_breakers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own circuit breakers" ON public.circuit_breakers;
DROP POLICY IF EXISTS "Users can insert their own circuit breakers" ON public.circuit_breakers;
DROP POLICY IF EXISTS "Users can update their own circuit breakers" ON public.circuit_breakers;
DROP POLICY IF EXISTS "Users can delete their own circuit breakers" ON public.circuit_breakers;

-- Set RLS policies
CREATE POLICY "Users can view their own circuit breakers"
  ON public.circuit_breakers
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own circuit breakers"
  ON public.circuit_breakers
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own circuit breakers"
  ON public.circuit_breakers
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own circuit breakers"
  ON public.circuit_breakers
  FOR DELETE
  USING (user_id = auth.uid());

-- Risk Events Table
CREATE TABLE IF NOT EXISTS public.risk_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own risk events" ON public.risk_events;
DROP POLICY IF EXISTS "Users can insert their own risk events" ON public.risk_events;
DROP POLICY IF EXISTS "Users can update their own risk events" ON public.risk_events;

-- Set RLS policies
CREATE POLICY "Users can view their own risk events"
  ON public.risk_events
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own risk events"
  ON public.risk_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own risk events"
  ON public.risk_events
  FOR UPDATE
  USING (user_id = auth.uid());

-- Position Sizing Rules Table
CREATE TABLE IF NOT EXISTS public.position_sizing_rules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_type TEXT NOT NULL,
  calculation_method TEXT NOT NULL,
  max_risk_percent FLOAT NOT NULL,
  position_sizing_model TEXT,
  parameters JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.position_sizing_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own position sizing rules" ON public.position_sizing_rules;
DROP POLICY IF EXISTS "Users can insert their own position sizing rules" ON public.position_sizing_rules;
DROP POLICY IF EXISTS "Users can update their own position sizing rules" ON public.position_sizing_rules;
DROP POLICY IF EXISTS "Users can delete their own position sizing rules" ON public.position_sizing_rules;

-- Set RLS policies
CREATE POLICY "Users can view their own position sizing rules"
  ON public.position_sizing_rules
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own position sizing rules"
  ON public.position_sizing_rules
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own position sizing rules"
  ON public.position_sizing_rules
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own position sizing rules"
  ON public.position_sizing_rules
  FOR DELETE
  USING (user_id = auth.uid());

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS handle_risk_profiles_updated_at ON public.risk_profiles;
DROP TRIGGER IF EXISTS handle_circuit_breakers_updated_at ON public.circuit_breakers;
DROP TRIGGER IF EXISTS handle_risk_events_updated_at ON public.risk_events;
DROP TRIGGER IF EXISTS handle_position_sizing_rules_updated_at ON public.position_sizing_rules;

-- Triggers for updated_at
CREATE TRIGGER handle_risk_profiles_updated_at
  BEFORE UPDATE ON public.risk_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_circuit_breakers_updated_at
  BEFORE UPDATE ON public.circuit_breakers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_risk_events_updated_at
  BEFORE UPDATE ON public.risk_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_position_sizing_rules_updated_at
  BEFORE UPDATE ON public.position_sizing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add Default Circuit Breakers (Optional)
INSERT INTO public.circuit_breakers (user_id, enabled, trigger_type, threshold, cooldown_minutes)
SELECT 
  id as user_id, 
  false as enabled, 
  'drawdown' as trigger_type,
  0.05 as threshold,
  60 as cooldown_minutes
FROM auth.users
ON CONFLICT DO NOTHING;
