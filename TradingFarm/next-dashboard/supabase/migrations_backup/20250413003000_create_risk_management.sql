-- Create Risk Management Framework
-- Migration to set up risk parameters, circuit breakers, and risk events

-- Function references for timestamps (these should already be created in previous migrations)
-- CREATE OR REPLACE FUNCTION public.handle_created_at() ... (already created)
-- CREATE OR REPLACE FUNCTION public.handle_updated_at() ... (already created)

-- Risk Profiles (templates for risk settings)
CREATE TABLE IF NOT EXISTS public.risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk Parameters Table (specific risk settings applied to farms, strategies, or accounts)
CREATE TABLE IF NOT EXISTS public.risk_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  profile_id UUID REFERENCES public.risk_profiles(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('farm', 'strategy', 'account', 'goal')),
  target_id UUID NOT NULL,
  -- Maximum drawdown allowed as a percentage
  max_drawdown NUMERIC(5, 2),
  -- Position sizing parameters
  position_sizing JSONB DEFAULT '{"method": "fixed", "value": 1.0}'::JSONB,
  -- Trade limits
  trade_limits JSONB DEFAULT '{
    "max_open_trades": 10,
    "max_daily_trades": 20,
    "max_trade_size": null
  }'::JSONB,
  -- Risk/reward parameters
  risk_reward_parameters JSONB DEFAULT '{
    "min_risk_reward_ratio": 1.5,
    "take_profit_required": false,
    "stop_loss_required": true
  }'::JSONB,
  -- Circuit breaker parameters
  circuit_breakers JSONB DEFAULT '{
    "enabled": true,
    "daily_loss_percentage": 5.0,
    "weekly_loss_percentage": 10.0,
    "monthly_loss_percentage": 15.0,
    "consecutive_losses": 5,
    "volatility_threshold": null
  }'::JSONB,
  -- Other custom parameters
  custom_parameters JSONB,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id)
);

-- Risk Events (record of risk events like breached limits, circuit breakers triggered, etc.)
CREATE TABLE IF NOT EXISTS public.risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'circuit_breaker_triggered', 
    'drawdown_warning', 
    'drawdown_exceeded', 
    'position_size_exceeded',
    'trade_limit_reached',
    'volatility_warning',
    'risk_reward_violation',
    'manual_intervention',
    'system_action'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  target_type TEXT NOT NULL CHECK (target_type IN ('farm', 'strategy', 'account', 'goal', 'agent', 'position', 'order')),
  target_id UUID NOT NULL,
  parameter_id UUID REFERENCES public.risk_parameters(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolution TEXT,
  resolution_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk Actions (automated actions triggered by risk events)
CREATE TABLE IF NOT EXISTS public.risk_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.risk_events(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'trading_paused', 
    'position_closed',
    'farm_disabled',
    'strategy_disabled',
    'size_reduced',
    'notification_sent',
    'agent_paused',
    'agent_override',
    'manual_action'
  )),
  description TEXT NOT NULL,
  details JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')),
  executed_at TIMESTAMPTZ,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Account Risk Metrics (daily/weekly/monthly statistics for risk monitoring)
CREATE TABLE IF NOT EXISTS public.account_risk_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  date DATE NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  -- Balance metrics
  starting_balance NUMERIC(24, 8) NOT NULL,
  ending_balance NUMERIC(24, 8) NOT NULL,
  drawdown_percentage NUMERIC(8, 4),
  max_drawdown_percentage NUMERIC(8, 4),
  -- Trade metrics
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  -- Risk metrics
  average_risk_per_trade NUMERIC(8, 4),
  largest_loss NUMERIC(24, 8),
  largest_gain NUMERIC(24, 8),
  profit_factor NUMERIC(10, 4),
  sharpe_ratio NUMERIC(8, 4),
  -- Volatility metrics
  volatility NUMERIC(8, 4),
  -- Custom metrics
  custom_metrics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_id, date, period)
);

-- Triggers for automatic timestamps
CREATE TRIGGER handle_risk_profiles_created_at
BEFORE INSERT ON public.risk_profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_risk_profiles_updated_at
BEFORE UPDATE ON public.risk_profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_risk_parameters_created_at
BEFORE INSERT ON public.risk_parameters
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_risk_parameters_updated_at
BEFORE UPDATE ON public.risk_parameters
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_risk_actions_created_at
BEFORE INSERT ON public.risk_actions
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_risk_actions_updated_at
BEFORE UPDATE ON public.risk_actions
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_account_risk_metrics_created_at
BEFORE INSERT ON public.account_risk_metrics
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_account_risk_metrics_updated_at
BEFORE UPDATE ON public.account_risk_metrics
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- RLS Policies
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_risk_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for risk_profiles
CREATE POLICY "Users can view their own risk profiles"
  ON public.risk_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own risk profiles"
  ON public.risk_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk profiles"
  ON public.risk_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk profiles"
  ON public.risk_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for risk_parameters
CREATE POLICY "Users can view their own risk parameters"
  ON public.risk_parameters
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own risk parameters"
  ON public.risk_parameters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk parameters"
  ON public.risk_parameters
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk parameters"
  ON public.risk_parameters
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for risk_events
CREATE POLICY "Users can view their own risk events"
  ON public.risk_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create risk events for users"
  ON public.risk_events
  FOR INSERT
  WITH CHECK (true);  -- System needs to be able to create events

CREATE POLICY "Users can update acknowledgment of their own risk events"
  ON public.risk_events
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for risk_actions
CREATE POLICY "Users can view actions for their risk events"
  ON public.risk_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.risk_events
      WHERE risk_events.id = risk_actions.event_id
      AND risk_events.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create actions for risk events"
  ON public.risk_actions
  FOR INSERT
  WITH CHECK (true);  -- System needs to be able to create actions

-- Policies for account_risk_metrics
CREATE POLICY "Users can view their own account risk metrics"
  ON public.account_risk_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create and update account risk metrics"
  ON public.account_risk_metrics
  FOR INSERT
  WITH CHECK (true);  -- System needs to be able to create metrics

CREATE POLICY "System can update account risk metrics"
  ON public.account_risk_metrics
  FOR UPDATE
  USING (true);  -- System needs to be able to update metrics

-- Create indexes for performance
CREATE INDEX idx_risk_profiles_user_id ON public.risk_profiles(user_id);
CREATE INDEX idx_risk_parameters_user_id ON public.risk_parameters(user_id);
CREATE INDEX idx_risk_parameters_target ON public.risk_parameters(target_type, target_id);
CREATE INDEX idx_risk_parameters_profile_id ON public.risk_parameters(profile_id);
CREATE INDEX idx_risk_events_user_id ON public.risk_events(user_id);
CREATE INDEX idx_risk_events_target ON public.risk_events(target_type, target_id);
CREATE INDEX idx_risk_events_event_type ON public.risk_events(event_type);
CREATE INDEX idx_risk_events_severity ON public.risk_events(severity);
CREATE INDEX idx_risk_events_created_at ON public.risk_events(created_at);
CREATE INDEX idx_risk_actions_event_id ON public.risk_actions(event_id);
CREATE INDEX idx_risk_actions_action_type ON public.risk_actions(action_type);
CREATE INDEX idx_risk_actions_status ON public.risk_actions(status);
CREATE INDEX idx_account_risk_metrics_user_id ON public.account_risk_metrics(user_id);
CREATE INDEX idx_account_risk_metrics_date ON public.account_risk_metrics(date);
CREATE INDEX idx_account_risk_metrics_period ON public.account_risk_metrics(period);

-- Insert default risk profiles
INSERT INTO public.risk_profiles (
  id, 
  user_id, 
  name, 
  description, 
  is_default, 
  parameters
)
VALUES 
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- System user, will be copied for new users
  'Conservative',
  'Low-risk profile with strict parameters to minimize losses',
  true,
  '{
    "max_drawdown": 5.0,
    "position_sizing": {
      "method": "percentage",
      "value": 1.0
    },
    "trade_limits": {
      "max_open_trades": 5,
      "max_daily_trades": 10,
      "max_trade_size": 5.0
    },
    "risk_reward_parameters": {
      "min_risk_reward_ratio": 2.0,
      "take_profit_required": true,
      "stop_loss_required": true
    },
    "circuit_breakers": {
      "enabled": true,
      "daily_loss_percentage": 3.0,
      "weekly_loss_percentage": 5.0,
      "monthly_loss_percentage": 8.0,
      "consecutive_losses": 3,
      "volatility_threshold": 2.0
    }
  }'::JSONB
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- System user, will be copied for new users
  'Moderate',
  'Balanced risk profile with reasonable risk parameters',
  false,
  '{
    "max_drawdown": 12.0,
    "position_sizing": {
      "method": "percentage",
      "value": 2.0
    },
    "trade_limits": {
      "max_open_trades": 10,
      "max_daily_trades": 20,
      "max_trade_size": 10.0
    },
    "risk_reward_parameters": {
      "min_risk_reward_ratio": 1.5,
      "take_profit_required": true,
      "stop_loss_required": true
    },
    "circuit_breakers": {
      "enabled": true,
      "daily_loss_percentage": 5.0,
      "weekly_loss_percentage": 8.0,
      "monthly_loss_percentage": 12.0,
      "consecutive_losses": 5,
      "volatility_threshold": 3.0
    }
  }'::JSONB
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- System user, will be copied for new users
  'Aggressive',
  'Higher-risk profile for experienced traders seeking higher returns',
  false,
  '{
    "max_drawdown": 20.0,
    "position_sizing": {
      "method": "percentage",
      "value": 5.0
    },
    "trade_limits": {
      "max_open_trades": 15,
      "max_daily_trades": 30,
      "max_trade_size": 20.0
    },
    "risk_reward_parameters": {
      "min_risk_reward_ratio": 1.0,
      "take_profit_required": false,
      "stop_loss_required": true
    },
    "circuit_breakers": {
      "enabled": true,
      "daily_loss_percentage": 8.0,
      "weekly_loss_percentage": 15.0,
      "monthly_loss_percentage": 20.0,
      "consecutive_losses": 8,
      "volatility_threshold": 5.0
    }
  }'::JSONB
);
