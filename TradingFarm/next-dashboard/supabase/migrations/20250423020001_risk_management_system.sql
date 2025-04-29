-- Migration for Risk Management System
-- This migration adds support for position management and risk controls

-- Create positions table for tracking open positions
CREATE TABLE IF NOT EXISTS public.positions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_credential_id BIGINT NOT NULL REFERENCES public.exchange_credentials(id) ON DELETE CASCADE,
  agent_id BIGINT REFERENCES public.agents(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  position_size FLOAT NOT NULL,
  entry_price FLOAT NOT NULL,
  current_price FLOAT NOT NULL,
  unrealized_pnl FLOAT NOT NULL DEFAULT 0,
  realized_pnl FLOAT NOT NULL DEFAULT 0,
  side TEXT NOT NULL, -- 'long' or 'short'
  leverage FLOAT NOT NULL DEFAULT 1,
  liquidation_price FLOAT,
  margin_used FLOAT,
  status TEXT NOT NULL, -- 'open', 'closed', 'liquidated'
  stop_loss FLOAT,
  take_profit FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  metadata JSONB,
  
  -- Add a unique constraint to prevent duplicate positions for the same symbol
  UNIQUE(user_id, exchange_credential_id, symbol, side, status)
);

-- Create risk_profiles table for user risk settings
CREATE TABLE IF NOT EXISTS public.risk_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  max_position_size FLOAT, -- Maximum size for any single position (% of capital)
  max_leverage FLOAT, -- Maximum leverage allowed
  max_drawdown FLOAT, -- Maximum drawdown before stopping trading (%)
  max_daily_loss FLOAT, -- Maximum daily loss allowed (%)
  stop_loss_default FLOAT, -- Default stop loss (%)
  take_profit_default FLOAT, -- Default take profit (%)
  auto_close_enabled BOOLEAN NOT NULL DEFAULT true, -- Enable auto-closing of positions
  circuit_breakers_enabled BOOLEAN NOT NULL DEFAULT true, -- Enable circuit breakers
  max_open_positions INTEGER, -- Maximum number of concurrent open positions
  max_concentration_per_asset FLOAT, -- Maximum allocation to any single asset (%)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create circuit_breakers table for defining trading halts
CREATE TABLE IF NOT EXISTS public.circuit_breakers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL, -- 'drawdown', 'loss_streak', 'volatility', 'rapid_movement'
  trigger_value FLOAT NOT NULL, -- Threshold value that triggers the circuit breaker
  action TEXT NOT NULL, -- 'halt_trading', 'reduce_position_size', 'close_positions', 'notify_only'
  cooldown_minutes INTEGER NOT NULL DEFAULT 60, -- Cooldown period after triggering
  scope TEXT NOT NULL, -- 'account', 'symbol', 'strategy'
  scope_value TEXT, -- Specific value for the scope (e.g., symbol name)
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create position_sizing_rules table for algorithmic position sizing
CREATE TABLE IF NOT EXISTS public.position_sizing_rules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sizing_method TEXT NOT NULL, -- 'fixed', 'percent_equity', 'risk_based', 'kelly', 'martingale', 'custom'
  base_size FLOAT NOT NULL, -- Base position size (units or %)
  min_size FLOAT, -- Minimum position size
  max_size FLOAT, -- Maximum position size
  parameters JSONB, -- Additional parameters specific to the sizing method
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create stop_loss_strategies table for automated stop loss management
CREATE TABLE IF NOT EXISTS public.stop_loss_strategies (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  strategy_type TEXT NOT NULL, -- 'fixed', 'percent', 'atr_based', 'trailing', 'tiered', 'custom'
  initial_value FLOAT NOT NULL, -- Initial stop loss value (% or fixed amount)
  trail_value FLOAT, -- Trailing amount (for trailing stops)
  activation_condition TEXT, -- When to activate trailing ('immediately', 'breakeven', 'profit_threshold')
  activation_threshold FLOAT, -- Threshold for activation
  parameters JSONB, -- Additional parameters specific to the strategy
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create take_profit_strategies table for automated take profit management
CREATE TABLE IF NOT EXISTS public.take_profit_strategies (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  strategy_type TEXT NOT NULL, -- 'fixed', 'percent', 'atr_based', 'tiered', 'scaling_out', 'custom'
  initial_value FLOAT NOT NULL, -- Initial take profit value (% or fixed amount)
  scaling_levels JSONB, -- Levels for scaling out (for scaling_out strategy)
  parameters JSONB, -- Additional parameters specific to the strategy
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create risk_events table for tracking risk-related events
CREATE TABLE IF NOT EXISTS public.risk_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'stop_loss_hit', 'take_profit_hit', 'circuit_breaker_triggered', 'risk_limit_exceeded'
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  position_id BIGINT REFERENCES public.positions(id) ON DELETE SET NULL,
  symbol TEXT,
  original_value FLOAT,
  new_value FLOAT,
  description TEXT,
  severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
  metadata JSONB
);

-- Enable Row Level Security
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_sizing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stop_loss_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.take_profit_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS handle_positions_updated_at ON public.positions;
DROP TRIGGER IF EXISTS handle_risk_profiles_updated_at ON public.risk_profiles;
DROP TRIGGER IF EXISTS handle_circuit_breakers_updated_at ON public.circuit_breakers;
DROP TRIGGER IF EXISTS handle_position_sizing_rules_updated_at ON public.position_sizing_rules;
DROP TRIGGER IF EXISTS handle_stop_loss_strategies_updated_at ON public.stop_loss_strategies;
DROP TRIGGER IF EXISTS handle_take_profit_strategies_updated_at ON public.take_profit_strategies;

-- Create triggers for updated_at timestamp
CREATE TRIGGER handle_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_risk_profiles_updated_at
BEFORE UPDATE ON public.risk_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_circuit_breakers_updated_at
BEFORE UPDATE ON public.circuit_breakers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_position_sizing_rules_updated_at
BEFORE UPDATE ON public.position_sizing_rules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_stop_loss_strategies_updated_at
BEFORE UPDATE ON public.stop_loss_strategies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_take_profit_strategies_updated_at
BEFORE UPDATE ON public.take_profit_strategies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create RLS policies for positions
CREATE POLICY "Users can view their own positions"
  ON public.positions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own positions"
  ON public.positions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own positions"
  ON public.positions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own positions"
  ON public.positions
  FOR DELETE
  USING (user_id = auth.uid());

-- Create RLS policies for risk profiles
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

-- Create RLS policies for circuit breakers
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

-- Create RLS policies for position sizing rules
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

-- Create RLS policies for stop loss strategies
CREATE POLICY "Users can view their own stop loss strategies"
  ON public.stop_loss_strategies
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own stop loss strategies"
  ON public.stop_loss_strategies
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stop loss strategies"
  ON public.stop_loss_strategies
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own stop loss strategies"
  ON public.stop_loss_strategies
  FOR DELETE
  USING (user_id = auth.uid());

-- Create RLS policies for take profit strategies
CREATE POLICY "Users can view their own take profit strategies"
  ON public.take_profit_strategies
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own take profit strategies"
  ON public.take_profit_strategies
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own take profit strategies"
  ON public.take_profit_strategies
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own take profit strategies"
  ON public.take_profit_strategies
  FOR DELETE
  USING (user_id = auth.uid());

-- Create RLS policies for risk events
CREATE POLICY "Users can view their own risk events"
  ON public.risk_events
  FOR SELECT
  USING (user_id = auth.uid());

-- Create indexes for faster lookups
DO $$
BEGIN
  -- Positions table indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'positions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_positions_user_id') THEN
      CREATE INDEX idx_positions_user_id ON public.positions(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_positions_symbol') THEN
      CREATE INDEX idx_positions_symbol ON public.positions(symbol);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_positions_status') THEN
      CREATE INDEX idx_positions_status ON public.positions(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_positions_agent_id') THEN
      CREATE INDEX idx_positions_agent_id ON public.positions(agent_id);
    END IF;
  END IF;
  
  -- Risk profiles table indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'risk_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_risk_profiles_user_id') THEN
      CREATE INDEX idx_risk_profiles_user_id ON public.risk_profiles(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_risk_profiles_is_default') THEN
      CREATE INDEX idx_risk_profiles_is_default ON public.risk_profiles(is_default);
    END IF;
  END IF;
  
  -- Circuit breakers table indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'circuit_breakers') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_circuit_breakers_user_id') THEN
      CREATE INDEX idx_circuit_breakers_user_id ON public.circuit_breakers(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_circuit_breakers_is_active') THEN
      CREATE INDEX idx_circuit_breakers_is_active ON public.circuit_breakers(is_active);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_circuit_breakers_trigger_type') THEN
      CREATE INDEX idx_circuit_breakers_trigger_type ON public.circuit_breakers(trigger_type);
    END IF;
  END IF;
  
  -- Position sizing rules table indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'position_sizing_rules') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_position_sizing_rules_user_id') THEN
      CREATE INDEX idx_position_sizing_rules_user_id ON public.position_sizing_rules(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_position_sizing_rules_is_default') THEN
      CREATE INDEX idx_position_sizing_rules_is_default ON public.position_sizing_rules(is_default);
    END IF;
  END IF;
  
  -- Stop loss strategies table indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stop_loss_strategies') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stop_loss_strategies_user_id') THEN
      CREATE INDEX idx_stop_loss_strategies_user_id ON public.stop_loss_strategies(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stop_loss_strategies_is_default') THEN
      CREATE INDEX idx_stop_loss_strategies_is_default ON public.stop_loss_strategies(is_default);
    END IF;
  END IF;
  
  -- Take profit strategies table indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'take_profit_strategies') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_take_profit_strategies_user_id') THEN
      CREATE INDEX idx_take_profit_strategies_user_id ON public.take_profit_strategies(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_take_profit_strategies_is_default') THEN
      CREATE INDEX idx_take_profit_strategies_is_default ON public.take_profit_strategies(is_default);
    END IF;
  END IF;
  
  -- Risk events table indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'risk_events') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_risk_events_user_id') THEN
      CREATE INDEX idx_risk_events_user_id ON public.risk_events(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_risk_events_event_type') THEN
      CREATE INDEX idx_risk_events_event_type ON public.risk_events(event_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_risk_events_event_time') THEN
      CREATE INDEX idx_risk_events_event_time ON public.risk_events(event_time);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_risk_events_position_id') THEN
      CREATE INDEX idx_risk_events_position_id ON public.risk_events(position_id);
    END IF;
  END IF;
END
$$;
