-- Create agent_health table for storing health metrics
CREATE TABLE IF NOT EXISTS public.agent_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  cpu_usage FLOAT,
  memory_usage FLOAT,
  disk_usage FLOAT,
  response_time INTEGER,
  uptime INTEGER,
  last_heartbeat TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  message TEXT,
  active_tasks INTEGER DEFAULT 0,
  error_rate FLOAT DEFAULT 0,

  -- Live trading metrics
  trading_status TEXT CHECK (trading_status IN ('active', 'paused', 'inactive')),
  order_count INTEGER DEFAULT 0,
  trade_count INTEGER DEFAULT 0,
  position_count INTEGER DEFAULT 0,
  capital_allocated FLOAT DEFAULT 0,
  capital_available FLOAT DEFAULT 0,

  -- Performance metrics
  profit_loss FLOAT DEFAULT 0,
  win_rate FLOAT DEFAULT 0,
  drawdown FLOAT DEFAULT 0,
  sharpe_ratio FLOAT DEFAULT 0,
  max_drawdown FLOAT DEFAULT 0,

  -- Circuit breaker data
  circuit_breaker_status TEXT CHECK (circuit_breaker_status IN ('open', 'closed')),
  circuit_breaker_triggered_at TIMESTAMPTZ,
  circuit_breaker_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for agent events (errors, warnings, info messages)
CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create system_events table for global events
CREATE TABLE IF NOT EXISTS public.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create alert configurations table
CREATE TABLE IF NOT EXISTS public.agent_alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  threshold FLOAT NOT NULL,
  comparison TEXT NOT NULL CHECK (comparison IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  notify_channels TEXT[] NOT NULL DEFAULT '{dashboard}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create circuit breaker configurations table
CREATE TABLE IF NOT EXISTS public.agent_circuit_breakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  threshold FLOAT NOT NULL,
  comparison TEXT NOT NULL CHECK (comparison IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  message TEXT,
  auto_reset BOOLEAN NOT NULL DEFAULT false,
  reset_after_seconds INTEGER,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent performance table
CREATE TABLE IF NOT EXISTS public.agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  profit_loss FLOAT DEFAULT 0,
  win_rate FLOAT DEFAULT 0,
  drawdown FLOAT DEFAULT 0,
  sharpe_ratio FLOAT DEFAULT 0,
  max_drawdown FLOAT DEFAULT 0,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('1h', '1d', '7d', '30d', 'all')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for agent capital tracking
CREATE TABLE IF NOT EXISTS public.agent_capital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  allocated FLOAT NOT NULL DEFAULT 0,
  available FLOAT NOT NULL DEFAULT 0,
  reserved FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_agent_capital UNIQUE (agent_id)
);

-- Create positions table for tracking open positions
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  quantity FLOAT NOT NULL,
  entry_price FLOAT NOT NULL,
  current_price FLOAT,
  take_profit FLOAT,
  stop_loss FLOAT,
  pnl FLOAT,
  pnl_percentage FLOAT,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'pending')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table for tracking orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  type TEXT NOT NULL CHECK (type IN ('market', 'limit', 'stop', 'stop_limit')),
  quantity FLOAT NOT NULL,
  price FLOAT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'filled', 'partially_filled', 'canceled', 'rejected')),
  filled_quantity FLOAT DEFAULT 0,
  filled_price FLOAT,
  external_id TEXT,
  exchange TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trades table for completed trades
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.positions(id),
  order_id UUID REFERENCES public.orders(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity FLOAT NOT NULL,
  price FLOAT NOT NULL,
  fees FLOAT DEFAULT 0,
  pnl FLOAT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Setup Row Level Security
ALTER TABLE public.agent_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_circuit_breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Agent health policies
CREATE POLICY "Enable access to agent health for authenticated users"
  ON public.agent_health
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Simplified update policy removed in favor of the ALL policy above

-- Simplified insert policy removed in favor of the ALL policy above

-- Agent events policies
CREATE POLICY "Enable access to agent events for authenticated users"
  ON public.agent_events
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Simplified insert policy removed in favor of the ALL policy above

-- System events policies
CREATE POLICY "Enable access to system events for authenticated users"
  ON public.system_events
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Simplified insert policy removed in favor of the ALL policy above

-- Agent alert configs policies
CREATE POLICY "Enable access to alert configs for authenticated users"
  ON public.agent_alert_configs
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Simplified insert policy removed in favor of the ALL policy above

-- Simplified update policy removed in favor of the ALL policy above

-- Simplified delete policy removed in favor of the ALL policy above

-- Circuit breaker configs
CREATE POLICY "Enable access to circuit breaker configs for authenticated users"
  ON public.agent_circuit_breakers
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Simplified insert policy removed in favor of the ALL policy above

-- Simplified update policy removed in favor of the ALL policy above

-- Simplified delete policy removed in favor of the ALL policy above

-- Add policies for other tables
CREATE POLICY "Enable access to agent performance for authenticated users"
  ON public.agent_performance
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access to agent capital for authenticated users"
  ON public.agent_capital
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access to positions for authenticated users"
  ON public.positions
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access to orders for authenticated users"
  ON public.orders
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access to trades for authenticated users"
  ON public.trades
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER handle_agent_health_updated_at
  BEFORE UPDATE ON public.agent_health
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_alert_configs_updated_at
  BEFORE UPDATE ON public.agent_alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_circuit_breakers_updated_at
  BEFORE UPDATE ON public.agent_circuit_breakers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_capital_updated_at
  BEFORE UPDATE ON public.agent_capital
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
