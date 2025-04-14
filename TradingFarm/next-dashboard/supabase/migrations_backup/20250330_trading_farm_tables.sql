-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create triggers for auto-updating timestamps if they don't exist
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  risk_profile_id UUID,
  settings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS handle_farms_created_at ON public.farms;
CREATE TRIGGER handle_farms_created_at
BEFORE INSERT ON public.farms
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS handle_farms_updated_at ON public.farms;
CREATE TRIGGER handle_farms_updated_at
BEFORE UPDATE ON public.farms
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create risk_profiles table
CREATE TABLE IF NOT EXISTS public.risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  max_position_size NUMERIC NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  daily_loss_limit NUMERIC NOT NULL,
  max_trades_per_day INTEGER,
  max_exposure NUMERIC,
  parameters JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_risk_profiles_created_at
BEFORE INSERT ON public.risk_profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_risk_profiles_updated_at
BEFORE UPDATE ON public.risk_profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create strategies table
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  version TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deployed BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performance_metrics JSONB DEFAULT '{}'::JSONB,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS handle_strategies_created_at ON public.strategies;
CREATE TRIGGER handle_strategies_created_at
BEFORE INSERT ON public.strategies
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS handle_strategies_updated_at ON public.strategies;
CREATE TRIGGER handle_strategies_updated_at
BEFORE UPDATE ON public.strategies
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  capital_allocation NUMERIC NOT NULL,
  risk_profile_id UUID REFERENCES public.risk_profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  parameters JSONB DEFAULT '{}'::JSONB,
  status TEXT DEFAULT 'idle',
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS handle_agents_created_at ON public.agents;
CREATE TRIGGER handle_agents_created_at
BEFORE INSERT ON public.agents
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS handle_agents_updated_at ON public.agents;
CREATE TRIGGER handle_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  order_type TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  stop_price NUMERIC,
  time_in_force TEXT,
  status TEXT NOT NULL,
  filled_quantity NUMERIC NOT NULL DEFAULT 0,
  filled_price NUMERIC,
  external_id TEXT,
  external_status TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_orders_created_at
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  external_id TEXT,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  fee NUMERIC,
  fee_currency TEXT,
  executed_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_trades_created_at
BEFORE INSERT ON public.trades
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create backtest_results table
CREATE TABLE IF NOT EXISTS public.backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_capital NUMERIC NOT NULL,
  final_capital NUMERIC NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  win_rate NUMERIC NOT NULL,
  profit_factor NUMERIC NOT NULL,
  total_trades INTEGER NOT NULL,
  sharpe_ratio NUMERIC NOT NULL,
  results JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_backtest_results_created_at
BEFORE INSERT ON public.backtest_results
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_backtest_results_updated_at
BEFORE UPDATE ON public.backtest_results
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create execution_quality table
CREATE TABLE IF NOT EXISTS public.execution_quality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  slippage_percent NUMERIC,
  execution_speed INTEGER,
  fill_quality NUMERIC NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_execution_quality_created_at
BEFORE INSERT ON public.execution_quality
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_execution_quality_updated_at
BEFORE UPDATE ON public.execution_quality
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create capital_allocation_logs table
CREATE TABLE IF NOT EXISTS public.capital_allocation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  previous_amount NUMERIC NOT NULL,
  new_amount NUMERIC NOT NULL,
  change_amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_capital_allocation_logs_created_at
BEFORE INSERT ON public.capital_allocation_logs
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_capital_allocation_logs_updated_at
BEFORE UPDATE ON public.capital_allocation_logs
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  level TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER handle_alerts_created_at
BEFORE INSERT ON public.alerts
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_alerts_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create RPC function for getting average execution quality by exchange
CREATE OR REPLACE FUNCTION public.get_avg_execution_quality_by_exchange(days_threshold TEXT)
RETURNS TABLE (
  exchange TEXT,
  avg_slippage NUMERIC,
  avg_execution_speed NUMERIC,
  avg_fill_quality NUMERIC,
  total_reports INTEGER
) 
LANGUAGE SQL
AS $$
  SELECT 
    exchange,
    AVG(slippage_percent) as avg_slippage,
    AVG(execution_speed) as avg_execution_speed,
    AVG(fill_quality) as avg_fill_quality,
    COUNT(*) as total_reports
  FROM 
    public.execution_quality
  WHERE 
    created_at >= days_threshold::TIMESTAMPTZ
  GROUP BY 
    exchange
  ORDER BY 
    avg_fill_quality DESC;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_allocation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Add RLS policies

-- Farms: User can only access their own farms
CREATE POLICY "Users can view their own farms"
  ON public.farms
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own farms"
  ON public.farms
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own farms"
  ON public.farms
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own farms"
  ON public.farms
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Risk Profiles: All users can view, only owners can modify
CREATE POLICY "Everyone can view risk profiles"
  ON public.risk_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Strategies: User can access their own strategies
CREATE POLICY "Users can view their own strategies"
  ON public.strategies
  FOR SELECT
  USING (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can create their own strategies"
  ON public.strategies
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can update their own strategies"
  ON public.strategies
  FOR UPDATE
  USING (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can delete their own strategies"
  ON public.strategies
  FOR DELETE
  USING (auth.uid() = owner_id OR owner_id IS NULL);

-- Agents: Users can access their farm's agents
CREATE POLICY "Users can view their farm's agents"
  ON public.agents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = agents.farm_id AND farms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create agents for their farms"
  ON public.agents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = agents.farm_id AND farms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their farm's agents"
  ON public.agents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = agents.farm_id AND farms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their farm's agents"
  ON public.agents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = agents.farm_id AND farms.owner_id = auth.uid()
    )
  );

-- Orders: Users can access their farm's orders
CREATE POLICY "Users can view their farm's orders"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = orders.farm_id AND farms.owner_id = auth.uid()
    )
  );

-- Trades: Users can access trades for their farm's orders
CREATE POLICY "Users can view trades for their farm's orders"
  ON public.trades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.farms ON orders.farm_id = farms.id
      WHERE orders.id = trades.order_id AND farms.owner_id = auth.uid()
    )
  );

-- Insert default values
-- Create default risk profile
INSERT INTO public.risk_profiles (
  name, 
  max_position_size, 
  max_drawdown, 
  daily_loss_limit,
  max_trades_per_day,
  max_exposure,
  parameters
) VALUES (
  'Default', 
  5.0, -- 5% max position size 
  15.0, -- 15% max drawdown
  2.0, -- 2% daily loss limit
  10, -- 10 trades per day max
  20.0, -- 20% max exposure
  '{
    "position_sizing_method": "percent",
    "stop_loss_type": "atr",
    "stop_loss_value": 2.0,
    "take_profit_type": "r_multiple",
    "take_profit_value": 2.0,
    "max_correlated_trades": 3,
    "max_open_positions": 5
  }'::jsonb
);
