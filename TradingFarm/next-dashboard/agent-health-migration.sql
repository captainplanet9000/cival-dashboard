-- Agent Health Monitoring Migration

-- Create agent health table
CREATE TABLE IF NOT EXISTS public.agent_health (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'offline')),
  metrics JSONB NOT NULL DEFAULT '{}',
  last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent events table for health events
CREATE TABLE IF NOT EXISTS public.agent_events (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT REFERENCES public.agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create system events table
CREATE TABLE IF NOT EXISTS public.system_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent alert configurations
CREATE TABLE IF NOT EXISTS public.agent_alert_configs (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT REFERENCES public.agents(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  threshold FLOAT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  notification_channels JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create circuit breaker configurations
CREATE TABLE IF NOT EXISTS public.agent_circuit_breakers (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT REFERENCES public.agents(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  threshold FLOAT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  action TEXT NOT NULL CHECK (action IN ('pause_trading', 'stop_agent', 'reduce_position_size')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create performance metrics
CREATE TABLE IF NOT EXISTS public.agent_performance (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT REFERENCES public.agents(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly', 'all_time')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, period, start_date, end_date)
);

-- Create agent capital history
CREATE TABLE IF NOT EXISTS public.agent_capital (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT REFERENCES public.agents(id) ON DELETE CASCADE,
  amount FLOAT NOT NULL,
  currency TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'profit', 'loss', 'fee')),
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create positions table for tracking trades
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  entry_price FLOAT NOT NULL,
  size FLOAT NOT NULL,
  current_price FLOAT,
  take_profit FLOAT,
  stop_loss FLOAT,
  unrealized_pnl FLOAT,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'partially_closed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table for tracking pending/executed orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.positions(id),
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

-- Agent events policies
CREATE POLICY "Enable access to agent events for authenticated users"
  ON public.agent_events
  FOR ALL
  USING (auth.role() = 'authenticated');

-- System events policies
CREATE POLICY "Enable access to system events for authenticated users"
  ON public.system_events
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Agent alert configs policies
CREATE POLICY "Enable access to alert configs for authenticated users"
  ON public.agent_alert_configs
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Circuit breaker configs
CREATE POLICY "Enable access to circuit breaker configs for authenticated users"
  ON public.agent_circuit_breakers
  FOR ALL
  USING (auth.role() = 'authenticated');

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

-- Apply the trigger to all tables with updated_at
-- First drop existing triggers if they exist
DROP TRIGGER IF EXISTS handle_agent_health_updated_at ON public.agent_health;

CREATE TRIGGER handle_agent_health_updated_at
BEFORE UPDATE ON public.agent_health
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_agent_alert_configs_updated_at ON public.agent_alert_configs;

CREATE TRIGGER handle_agent_alert_configs_updated_at
BEFORE UPDATE ON public.agent_alert_configs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_agent_circuit_breakers_updated_at ON public.agent_circuit_breakers;

CREATE TRIGGER handle_agent_circuit_breakers_updated_at
BEFORE UPDATE ON public.agent_circuit_breakers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_agent_performance_updated_at ON public.agent_performance;

CREATE TRIGGER handle_agent_performance_updated_at
BEFORE UPDATE ON public.agent_performance
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_positions_updated_at ON public.positions;

CREATE TRIGGER handle_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;

CREATE TRIGGER handle_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
