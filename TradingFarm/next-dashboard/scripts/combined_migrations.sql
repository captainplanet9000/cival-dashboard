
-- Begin migration: 20250330_create_trading_farm_schema.sql
BEGIN;

-- Migration file for Trading Farm database schema
-- Follows your preference for using migrations with proper RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create created_at trigger function
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = CURRENT_TIMESTAMP;
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table helper function
CREATE OR REPLACE FUNCTION list_tables()
RETURNS TABLE (tablename TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.tablename::text
  FROM pg_catalog.pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Create farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for farms
CREATE TRIGGER handle_farms_created_at
BEFORE INSERT ON farms
FOR EACH ROW
EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_farms_updated_at
BEFORE UPDATE ON farms
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'inactive',
  type TEXT DEFAULT 'standard',
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for agents
CREATE TRIGGER handle_agents_created_at
BEFORE INSERT ON agents
FOR EACH ROW
EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_agents_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Create strategies table
CREATE TABLE IF NOT EXISTS public.strategies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for strategies
CREATE TRIGGER handle_strategies_created_at
BEFORE INSERT ON strategies
FOR EACH ROW
EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_strategies_updated_at
BEFORE UPDATE ON strategies
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL UNIQUE,
  balance NUMERIC(24, 8) DEFAULT 0,
  farm_id INTEGER REFERENCES public.farms(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for wallets
CREATE TRIGGER handle_wallets_created_at
BEFORE INSERT ON wallets
FOR EACH ROW
EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  amount NUMERIC(24, 8) NOT NULL,
  status TEXT DEFAULT 'pending',
  wallet_id INTEGER NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  farm_id INTEGER REFERENCES public.farms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for transactions
CREATE TRIGGER handle_transactions_created_at
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security on all tables
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for farms
CREATE POLICY "Allow users to read farms"
  ON public.farms FOR SELECT
  USING (true);

CREATE POLICY "Allow users to create farms"
  ON public.farms FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow owners to update farms"
  ON public.farms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Allow owners to delete farms"
  ON public.farms FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for agents
CREATE POLICY "Allow users to read agents"
  ON public.agents FOR SELECT
  USING (true);

CREATE POLICY "Allow farm owners to manage agents"
  ON public.agents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.farms
      WHERE farms.id = agents.farm_id
      AND farms.user_id = auth.uid()
    )
  );

-- Create RLS policies for strategies
CREATE POLICY "Allow users to read strategies"
  ON public.strategies FOR SELECT
  USING (true);

CREATE POLICY "Allow users to create strategies"
  ON public.strategies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update strategies"
  ON public.strategies FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create RLS policies for wallets
CREATE POLICY "Allow users to read wallets"
  ON public.wallets FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.farms
      WHERE farms.id = wallets.farm_id
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to create wallets"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow wallet owners to update wallets"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policies for transactions
CREATE POLICY "Allow users to read transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = transactions.wallet_id
      AND (wallets.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.farms
          WHERE farms.id = transactions.farm_id
          AND farms.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Allow wallet owners to create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = transactions.wallet_id
      AND wallets.user_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX idx_farms_user_id ON public.farms(user_id);
CREATE INDEX idx_agents_farm_id ON public.agents(farm_id);
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallets_farm_id ON public.wallets(farm_id);
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_farm_id ON public.transactions(farm_id);


-- End migration: 20250330_create_trading_farm_schema.sql
COMMIT;



-- Begin migration: 20250330_trading_farm_tables.sql
BEGIN;

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

CREATE TRIGGER handle_farms_created_at
BEFORE INSERT ON public.farms
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

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

CREATE TRIGGER handle_strategies_created_at
BEFORE INSERT ON public.strategies
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

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

CREATE TRIGGER handle_agents_created_at
BEFORE INSERT ON public.agents
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

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


-- End migration: 20250330_trading_farm_tables.sql
COMMIT;



-- Begin migration: 20250330_advanced_orders.sql
BEGIN;

-- Add support for advanced order types and risk management 

-- Extend the orders table with additional fields for advanced order types
ALTER TABLE "public"."orders" 
ADD COLUMN IF NOT EXISTS "trail_value" NUMERIC,
ADD COLUMN IF NOT EXISTS "trail_type" TEXT CHECK ("trail_type" IN ('amount', 'percentage')),
ADD COLUMN IF NOT EXISTS "parent_order_id" UUID REFERENCES "public"."orders"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "oco_order_id" UUID REFERENCES "public"."orders"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "iceberg_qty" NUMERIC,
ADD COLUMN IF NOT EXISTS "activation_price" NUMERIC,
ADD COLUMN IF NOT EXISTS "execution_risk_score" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "trigger_condition" TEXT CHECK ("trigger_condition" IN ('gt', 'lt', 'gte', 'lte')),
ADD COLUMN IF NOT EXISTS "trigger_price_source" TEXT CHECK ("trigger_price_source" IN ('mark', 'index', 'last')),
ADD COLUMN IF NOT EXISTS "exchange_account_id" TEXT;

-- Update order_type check constraint to include new order types
ALTER TABLE "public"."orders" DROP CONSTRAINT IF EXISTS "orders_order_type_check";
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_order_type_check" 
CHECK ("order_type" IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'oco', 'iceberg', 'twap', 'vwap', 'take_profit', 'bracket'));

-- Create risk_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."risk_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "max_position_size" NUMERIC NOT NULL,
    "max_drawdown_percent" NUMERIC NOT NULL,
    "max_daily_trades" INTEGER NOT NULL,
    "max_risk_per_trade_percent" NUMERIC NOT NULL,
    "leverage_limit" NUMERIC DEFAULT 1,
    "position_sizing_method" TEXT CHECK ("position_sizing_method" IN ('fixed', 'percent_of_balance', 'risk_based', 'kelly_criterion', 'custom')),
    "auto_hedging" BOOLEAN DEFAULT FALSE,
    "max_open_positions" INTEGER DEFAULT 10,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);

-- Create timestamps trigger for risk_profiles
CREATE TRIGGER "handle_updated_at_risk_profiles"
BEFORE UPDATE ON "public"."risk_profiles"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on risk_profiles
ALTER TABLE "public"."risk_profiles" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for risk_profiles
CREATE POLICY "Users can view their own risk profiles"
ON "public"."risk_profiles"
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own risk profiles"
ON "public"."risk_profiles"
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own risk profiles"
ON "public"."risk_profiles"
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own risk profiles"
ON "public"."risk_profiles"
FOR DELETE
USING (user_id = auth.uid());

-- Create agent_risk_assignments table for assigning risk profiles to agents
CREATE TABLE IF NOT EXISTS "public"."agent_risk_assignments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "agent_id" UUID NOT NULL REFERENCES "public"."agents"("id") ON DELETE CASCADE,
    "risk_profile_id" UUID NOT NULL REFERENCES "public"."risk_profiles"("id") ON DELETE CASCADE,
    "active" BOOLEAN DEFAULT TRUE,
    "override_params" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    UNIQUE ("agent_id", "risk_profile_id")
);

-- Create timestamps trigger for agent_risk_assignments
CREATE TRIGGER "handle_updated_at_agent_risk_assignments"
BEFORE UPDATE ON "public"."agent_risk_assignments"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on agent_risk_assignments
ALTER TABLE "public"."agent_risk_assignments" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for agent_risk_assignments
CREATE POLICY "Users can view their own agent risk assignments"
ON "public"."agent_risk_assignments"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."agents" a
        WHERE a.id = agent_id AND a.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own agent risk assignments"
ON "public"."agent_risk_assignments"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."agents" a
        WHERE a.id = agent_id AND a.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own agent risk assignments"
ON "public"."agent_risk_assignments"
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM "public"."agents" a
        WHERE a.id = agent_id AND a.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own agent risk assignments"
ON "public"."agent_risk_assignments"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "public"."agents" a
        WHERE a.id = agent_id AND a.user_id = auth.uid()
    )
);

-- Create exchange_accounts table for managing multiple exchange connections
CREATE TABLE IF NOT EXISTS "public"."exchange_accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "exchange" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "api_secret" TEXT NOT NULL,
    "passphrase" TEXT,
    "is_testnet" BOOLEAN DEFAULT FALSE,
    "status" TEXT DEFAULT 'active',
    "permissions" TEXT[] DEFAULT ARRAY['read', 'trade'],
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);

-- Create timestamps trigger for exchange_accounts
CREATE TRIGGER "handle_updated_at_exchange_accounts"
BEFORE UPDATE ON "public"."exchange_accounts"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on exchange_accounts
ALTER TABLE "public"."exchange_accounts" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for exchange_accounts
CREATE POLICY "Users can view their own exchange accounts"
ON "public"."exchange_accounts"
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own exchange accounts"
ON "public"."exchange_accounts"
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own exchange accounts"
ON "public"."exchange_accounts"
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own exchange accounts"
ON "public"."exchange_accounts"
FOR DELETE
USING (user_id = auth.uid());

-- Create positions table for position reconciliation
CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "farm_id" UUID NOT NULL REFERENCES "public"."farms"("id") ON DELETE CASCADE,
    "agent_id" UUID REFERENCES "public"."agents"("id") ON DELETE SET NULL,
    "exchange" TEXT NOT NULL,
    "exchange_account_id" UUID REFERENCES "public"."exchange_accounts"("id"),
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL CHECK ("side" IN ('long', 'short')),
    "quantity" NUMERIC NOT NULL,
    "entry_price" NUMERIC NOT NULL,
    "current_price" NUMERIC,
    "unrealized_pnl" NUMERIC,
    "realized_pnl" NUMERIC DEFAULT 0,
    "status" TEXT DEFAULT 'open' CHECK ("status" IN ('open', 'closed', 'liquidated')),
    "open_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "close_time" TIMESTAMP WITH TIME ZONE,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);

-- Create timestamps trigger for positions
CREATE TRIGGER "handle_updated_at_positions"
BEFORE UPDATE ON "public"."positions"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on positions
ALTER TABLE "public"."positions" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for positions
CREATE POLICY "Users can view their own positions"
ON "public"."positions"
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own positions"
ON "public"."positions"
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own positions"
ON "public"."positions"
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own positions"
ON "public"."positions"
FOR DELETE
USING (user_id = auth.uid());

-- Create performance_metrics table for monitoring
CREATE TABLE IF NOT EXISTS "public"."performance_metrics" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "farm_id" UUID REFERENCES "public"."farms"("id") ON DELETE CASCADE,
    "agent_id" UUID REFERENCES "public"."agents"("id") ON DELETE CASCADE,
    "strategy_id" UUID REFERENCES "public"."strategies"("id") ON DELETE SET NULL,
    "period" TEXT CHECK ("period" IN ('daily', 'weekly', 'monthly', 'yearly', 'all_time')),
    "period_start" TIMESTAMP WITH TIME ZONE,
    "period_end" TIMESTAMP WITH TIME ZONE,
    "total_trades" INTEGER DEFAULT 0,
    "winning_trades" INTEGER DEFAULT 0,
    "losing_trades" INTEGER DEFAULT 0,
    "win_rate" NUMERIC,
    "profit_loss" NUMERIC DEFAULT 0,
    "profit_loss_percent" NUMERIC,
    "max_drawdown" NUMERIC,
    "sharpe_ratio" NUMERIC,
    "volatility" NUMERIC,
    "largest_win" NUMERIC,
    "largest_loss" NUMERIC,
    "avg_win" NUMERIC,
    "avg_loss" NUMERIC,
    "avg_trade_duration" NUMERIC,
    "roi" NUMERIC,
    "data" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);

-- Create timestamps trigger for performance_metrics
CREATE TRIGGER "handle_updated_at_performance_metrics"
BEFORE UPDATE ON "public"."performance_metrics"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on performance_metrics
ALTER TABLE "public"."performance_metrics" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for performance_metrics
CREATE POLICY "Users can view their own performance metrics"
ON "public"."performance_metrics"
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own performance metrics"
ON "public"."performance_metrics"
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own performance metrics"
ON "public"."performance_metrics"
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own performance metrics"
ON "public"."performance_metrics"
FOR DELETE
USING (user_id = auth.uid());

-- Create position_reconciliation_logs table
CREATE TABLE IF NOT EXISTS "public"."position_reconciliation_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "exchange" TEXT NOT NULL,
    "exchange_account_id" UUID REFERENCES "public"."exchange_accounts"("id"),
    "reconciliation_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "status" TEXT DEFAULT 'success' CHECK ("status" IN ('success', 'partial', 'failed')),
    "discrepancies_found" INTEGER DEFAULT 0,
    "discrepancies_resolved" INTEGER DEFAULT 0,
    "details" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);

-- Enable RLS on position_reconciliation_logs
ALTER TABLE "public"."position_reconciliation_logs" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for position_reconciliation_logs
CREATE POLICY "Users can view their own reconciliation logs"
ON "public"."position_reconciliation_logs"
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own reconciliation logs"
ON "public"."position_reconciliation_logs"
FOR INSERT
WITH CHECK (user_id = auth.uid());


-- End migration: 20250330_advanced_orders.sql
COMMIT;



-- Begin migration: 20250330_eliza_integration.sql
BEGIN;

-- Create tables for ElizaOS Strategy Integration

-- Strategy analyses table - stores AI-generated analyses of strategies
CREATE TABLE IF NOT EXISTS "public"."strategy_analyses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "strategy_id" UUID NOT NULL,
    "analysis_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE CASCADE
);

-- Create timestamps trigger for strategy_analyses
CREATE TRIGGER "handle_updated_at_strategy_analyses"
BEFORE UPDATE ON "public"."strategy_analyses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on strategy_analyses
ALTER TABLE "public"."strategy_analyses" ENABLE ROW LEVEL SECURITY;

-- Strategy analyses policies
CREATE POLICY "Users can view their own strategy analyses"
ON "public"."strategy_analyses"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own strategy analyses"
ON "public"."strategy_analyses"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own strategy analyses"
ON "public"."strategy_analyses"
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own strategy analyses"
ON "public"."strategy_analyses"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

-- Strategy optimizations table - tracks parameter optimization requests and results
CREATE TABLE IF NOT EXISTS "public"."strategy_optimizations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "strategy_id" UUID NOT NULL,
    "optimization_goal" TEXT NOT NULL,
    "constraints" JSONB,
    "original_parameters" JSONB,
    "optimized_parameters" JSONB,
    "performance_improvement" FLOAT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE CASCADE
);

-- Create timestamps trigger for strategy_optimizations
CREATE TRIGGER "handle_updated_at_strategy_optimizations"
BEFORE UPDATE ON "public"."strategy_optimizations"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on strategy_optimizations
ALTER TABLE "public"."strategy_optimizations" ENABLE ROW LEVEL SECURITY;

-- Strategy optimizations policies
CREATE POLICY "Users can view their own strategy optimizations"
ON "public"."strategy_optimizations"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own strategy optimizations"
ON "public"."strategy_optimizations"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own strategy optimizations"
ON "public"."strategy_optimizations"
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own strategy optimizations"
ON "public"."strategy_optimizations"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "public"."strategies" s
        WHERE s.id = strategy_id
        AND s.user_id = auth.uid()
    )
);

-- Extend the existing agents table with ElizaOS specific fields if not already present
ALTER TABLE "public"."agents" 
ADD COLUMN IF NOT EXISTS "ai_config" JSONB,
ADD COLUMN IF NOT EXISTS "knowledge_base_enabled" BOOLEAN DEFAULT TRUE;

-- ElizaOS command history table - stores user commands and responses
CREATE TABLE IF NOT EXISTS "public"."eliza_command_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "agent_id" UUID,
    "strategy_id" UUID,
    "command" TEXT NOT NULL,
    "response" TEXT,
    "command_type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE SET NULL,
    FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE SET NULL
);

-- Enable RLS on eliza_command_history
ALTER TABLE "public"."eliza_command_history" ENABLE ROW LEVEL SECURITY;

-- ElizaOS command history policies
CREATE POLICY "Users can view their own command history"
ON "public"."eliza_command_history"
FOR SELECT
USING (
    user_id = auth.uid()
);

CREATE POLICY "Users can insert their own command history"
ON "public"."eliza_command_history"
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Users can update their own command history"
ON "public"."eliza_command_history"
FOR UPDATE
USING (
    user_id = auth.uid()
);

CREATE POLICY "Users can delete their own command history"
ON "public"."eliza_command_history"
FOR DELETE
USING (
    user_id = auth.uid()
);

-- Add ElizaOS knowledge connection to strategies
ALTER TABLE "public"."strategies"
ADD COLUMN IF NOT EXISTS "eliza_enabled" BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "eliza_instructions" TEXT;


-- End migration: 20250330_eliza_integration.sql
COMMIT;



-- Begin migration: 20250330_trading_execution_system.sql
BEGIN;

-- Create types for order statuses and types
CREATE TYPE public.order_status AS ENUM (
  'pending', 'filled', 'partially_filled', 'canceled', 'rejected', 'expired'
);

CREATE TYPE public.order_type AS ENUM (
  'market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'oco', 'take_profit', 'iceberg'
);

-- Trading strategies table
CREATE TABLE public.strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  type TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  performance_metrics JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own strategies" ON public.strategies
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  type order_type NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  filled_quantity NUMERIC DEFAULT 0,
  average_price NUMERIC,
  fees NUMERIC DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  extra_params JSONB DEFAULT '{}',
  external_id TEXT
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own orders" ON public.orders
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Trades table
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fees NUMERIC DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  pnl NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own trades" ON public.trades
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Strategy backtest results
CREATE TABLE public.backtest_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  initial_capital NUMERIC NOT NULL,
  final_capital NUMERIC NOT NULL,
  max_drawdown NUMERIC,
  win_rate NUMERIC,
  profit_factor NUMERIC,
  total_trades INTEGER,
  sharpe_ratio NUMERIC,
  results JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own backtest results" ON public.backtest_results
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.backtest_results
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Risk profiles table
CREATE TABLE public.risk_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  max_position_size NUMERIC NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  daily_loss_limit NUMERIC NOT NULL,
  max_trades_per_day INTEGER,
  max_exposure NUMERIC,
  parameters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own risk profiles" ON public.risk_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.risk_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Execution quality reports table
CREATE TABLE public.execution_quality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  slippage_percent NUMERIC,
  execution_speed NUMERIC,
  fill_quality NUMERIC,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.execution_quality ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD their own execution quality reports" ON public.execution_quality
  FOR ALL USING (auth.uid() = user_id);


-- End migration: 20250330_trading_execution_system.sql
COMMIT;



-- Begin migration: 20250330_update_schema_eliza_integration.sql
BEGIN;

-- Migration to update Trading Farm schema for ElizaOS integration
-- This adds necessary columns and tables for ElizaOS integration

-- Update farms table to add status column
ALTER TABLE IF EXISTS farms
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update agents table to add configuration column for ElizaOS integration
ALTER TABLE IF EXISTS agents
ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}';

-- Create eliza_connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS eliza_connections (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  eliza_id TEXT NOT NULL,
  connection_type TEXT DEFAULT 'read-only',
  capabilities TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  last_connected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS knowledge_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_access table if it doesn't exist
CREATE TABLE IF NOT EXISTS knowledge_access (
  id SERIAL PRIMARY KEY,
  knowledge_id INTEGER NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  access_level TEXT DEFAULT 'read-only',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(knowledge_id, agent_id)
);

-- Add Row-Level Security policies for the new tables
ALTER TABLE IF EXISTS eliza_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS eliza_connections_select_policy ON eliza_connections FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS eliza_connections_insert_policy ON eliza_connections FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS eliza_connections_update_policy ON eliza_connections FOR UPDATE USING (true);

ALTER TABLE IF EXISTS knowledge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS knowledge_items_select_policy ON knowledge_items FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS knowledge_items_insert_policy ON knowledge_items FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS knowledge_items_update_policy ON knowledge_items FOR UPDATE USING (true);

ALTER TABLE IF EXISTS knowledge_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS knowledge_access_select_policy ON knowledge_access FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS knowledge_access_insert_policy ON knowledge_access FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS knowledge_access_update_policy ON knowledge_access FOR UPDATE USING (true);

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at column
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
    AND table_name IN ('farms', 'agents', 'eliza_connections', 'knowledge_items', 'knowledge_access')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS %I_updated_at ON %I;
      CREATE TRIGGER %I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- End migration: 20250330_update_schema_eliza_integration.sql
COMMIT;



-- Begin migration: 20250331_add_config_table.sql
BEGIN;

-- Create necessary functions for automatically setting created_at and updated_at
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

-- Create the config table
CREATE TABLE IF NOT EXISTS public.config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add timestamps triggers
CREATE TRIGGER set_config_created_at
BEFORE INSERT ON public.config
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_config_updated_at
BEFORE UPDATE ON public.config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to everyone" ON public.config
FOR SELECT USING (true);

CREATE POLICY "Allow insert to authenticated users" ON public.config
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update to authenticated users" ON public.config
FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Insert default socket.io config
INSERT INTO public.config (key, value, category, description)
VALUES 
('socket_io_url', '"http://localhost:3002"', 'connectivity', 'URL for the Socket.io server'),
('api_base_url', '"http://localhost:3001/api"', 'connectivity', 'Base URL for API endpoints');

-- Create farms table if not exists (needed for many relations)
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add timestamps triggers
CREATE TRIGGER set_farms_created_at
BEFORE INSERT ON public.farms
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_farms_updated_at
BEFORE UPDATE ON public.farms
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to own farms" ON public.farms
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow insert to authenticated users" ON public.farms
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update to farm owners" ON public.farms
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create elizaos_interactions table for Command Console
CREATE TABLE IF NOT EXISTS public.elizaos_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id),
  command TEXT NOT NULL,
  response TEXT NOT NULL,
  category TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add timestamps triggers
CREATE TRIGGER set_elizaos_interactions_created_at
BEFORE INSERT ON public.elizaos_interactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_elizaos_interactions_updated_at
BEFORE UPDATE ON public.elizaos_interactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.elizaos_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to farm owners" ON public.elizaos_interactions
FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Allow insert to farm owners" ON public.elizaos_interactions
FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT user_id FROM public.farms WHERE id = farm_id));

-- Insert a test farm for development
INSERT INTO public.farms (name, description, user_id)
VALUES ('Test Farm', 'A farm for testing purposes', '00000000-0000-0000-0000-000000000000');


-- End migration: 20250331_add_config_table.sql
COMMIT;



-- Begin migration: 20250331_exchange_credentials.sql
BEGIN;

-- Migration: Exchange Credentials table
-- This migration creates a table for storing exchange API credentials securely
-- with proper Row Level Security (RLS) policies

-- Create exchange_credentials table
CREATE TABLE IF NOT EXISTS exchange_credentials (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id BIGINT REFERENCES farms(id) ON DELETE SET NULL,
  exchange VARCHAR(50) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  api_secret TEXT NOT NULL, -- Encrypted, never stored in plain text
  additional_params JSONB, -- For exchange-specific parameters (passphrase, wallet address, etc.)
  is_testnet BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Each user can only have one default credential per exchange
  UNIQUE(user_id, exchange, is_default),
  
  -- Ensure API keys are unique per user and exchange
  UNIQUE(user_id, exchange, api_key)
);

-- Add triggers for timestamps
CREATE TRIGGER handle_updated_at_exchange_credentials
  BEFORE UPDATE ON exchange_credentials
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own credentials
CREATE POLICY "Users can view their own exchange credentials"
  ON exchange_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own credentials
CREATE POLICY "Users can insert their own exchange credentials"
  ON exchange_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own credentials
CREATE POLICY "Users can update their own exchange credentials"
  ON exchange_credentials
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own credentials
CREATE POLICY "Users can delete their own exchange credentials"
  ON exchange_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create farm-credential associations table for shared credentials
CREATE TABLE IF NOT EXISTS farm_exchange_credentials (
  id BIGSERIAL PRIMARY KEY,
  farm_id BIGINT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  credential_id BIGINT NOT NULL REFERENCES exchange_credentials(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure a credential is only associated with a farm once
  UNIQUE(farm_id, credential_id)
);

-- Add triggers for timestamps
CREATE TRIGGER handle_created_at_farm_exchange_credentials
  BEFORE INSERT ON farm_exchange_credentials
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_created_at();

-- Enable Row Level Security
ALTER TABLE farm_exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view farm credential associations they own
CREATE POLICY "Users can view farm credential associations they own"
  ON farm_exchange_credentials
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_exchange_credentials.farm_id
    AND farms.user_id = auth.uid()
  ));

-- Create policy for users to insert farm credential associations they own
CREATE POLICY "Users can insert farm credential associations they own"
  ON farm_exchange_credentials
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = NEW.farm_id
    AND farms.user_id = auth.uid()
  ));

-- Create policy for users to delete farm credential associations they own
CREATE POLICY "Users can delete farm credential associations they own"
  ON farm_exchange_credentials
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_exchange_credentials.farm_id
    AND farms.user_id = auth.uid()
  ));


-- End migration: 20250331_exchange_credentials.sql
COMMIT;



-- Begin migration: 20250331_market_data_cache.sql
BEGIN;

-- Migration: Market Data Cache
-- This migration creates a table for caching market data to reduce external API usage

-- Create market_data_cache table
CREATE TABLE IF NOT EXISTS market_data_cache (
  id BIGSERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookups by cache key
CREATE INDEX IF NOT EXISTS market_data_cache_key_idx ON market_data_cache (cache_key);

-- Add index for easier cleanup of expired cache entries
CREATE INDEX IF NOT EXISTS market_data_expires_idx ON market_data_cache (expires_at);

-- Add triggers for timestamps
CREATE TRIGGER handle_updated_at_market_data_cache
  BEFORE UPDATE ON market_data_cache
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Setup function for automatic cleanup of expired market data cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_market_data_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM market_data_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run the cleanup function every hour
-- Note: This requires pg_cron extension to be enabled in Supabase
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'market-data-cache-cleanup',
      '0 * * * *', -- Every hour
      $$SELECT cleanup_expired_market_data_cache()$$
    );
  END IF;
END $$;

-- No RLS policies needed since this is just a cache table used by the system
-- but we'll implement a simple policy to prevent unauthorized access

-- Enable Row Level Security
ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read from the cache
CREATE POLICY "Public market data cache access"
  ON market_data_cache
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the service account can modify the cache
CREATE POLICY "Service can update market data cache"
  ON market_data_cache
  FOR ALL
  USING (auth.uid() = service_role());


-- End migration: 20250331_market_data_cache.sql
COMMIT;



-- Begin migration: 20250331_orders_tables.sql
BEGIN;

-- Migration: Orders Tables
-- This migration creates tables for storing orders and order history

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id BIGINT REFERENCES farms(id) ON DELETE SET NULL,
  agent_id BIGINT REFERENCES agents(id) ON DELETE SET NULL,
  exchange VARCHAR(50) NOT NULL,
  exchange_order_id VARCHAR(100),
  symbol VARCHAR(50) NOT NULL,
  side VARCHAR(10) NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  quantity DECIMAL(24, 8) NOT NULL,
  price DECIMAL(24, 8),
  status VARCHAR(20) NOT NULL,
  filled_quantity DECIMAL(24, 8) DEFAULT 0,
  avg_fill_price DECIMAL(24, 8),
  commission DECIMAL(24, 8),
  commission_asset VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add triggers for timestamps
CREATE TRIGGER handle_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own orders
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own orders
CREATE POLICY "Users can insert their own orders"
  ON orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own orders
CREATE POLICY "Users can update their own orders"
  ON orders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own orders
CREATE POLICY "Users can delete their own orders"
  ON orders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create order_history table for tracking order actions
CREATE TABLE IF NOT EXISTS order_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id BIGINT REFERENCES farms(id) ON DELETE SET NULL,
  agent_id BIGINT REFERENCES agents(id) ON DELETE SET NULL,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  exchange VARCHAR(50) NOT NULL,
  exchange_order_id VARCHAR(100),
  action_type VARCHAR(50) NOT NULL, -- place, cancel, modify, fill, fetch_active, fetch_history
  status VARCHAR(20) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add triggers for timestamps
CREATE TRIGGER handle_created_at_order_history
  BEFORE INSERT ON order_history
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_created_at();

-- Enable Row Level Security
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own order history
CREATE POLICY "Users can view their own order history"
  ON order_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own order history
CREATE POLICY "Users can insert their own order history"
  ON order_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create positions table to track active positions
CREATE TABLE IF NOT EXISTS positions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id BIGINT REFERENCES farms(id) ON DELETE SET NULL,
  agent_id BIGINT REFERENCES agents(id) ON DELETE SET NULL,
  exchange VARCHAR(50) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  position_size DECIMAL(24, 8) NOT NULL,
  entry_price DECIMAL(24, 8) NOT NULL,
  liquidation_price DECIMAL(24, 8),
  unrealized_pnl DECIMAL(24, 8),
  realized_pnl DECIMAL(24, 8),
  margin DECIMAL(24, 8),
  leverage DECIMAL(10, 2),
  status VARCHAR(20) NOT NULL, -- open, closed, liquidated
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Each user can only have one active position for a given exchange/symbol/farm
  UNIQUE(user_id, exchange, symbol, farm_id, status) WHERE status = 'open'
);

-- Add triggers for timestamps
CREATE TRIGGER handle_updated_at_positions
  BEFORE UPDATE ON positions
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own positions
CREATE POLICY "Users can view their own positions"
  ON positions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own positions
CREATE POLICY "Users can insert their own positions"
  ON positions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own positions
CREATE POLICY "Users can update their own positions"
  ON positions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own positions
CREATE POLICY "Users can delete their own positions"
  ON positions
  FOR DELETE
  USING (auth.uid() = user_id);


-- End migration: 20250331_orders_tables.sql
COMMIT;



-- Begin migration: 20250401073459_fix_agents_schema.sql
BEGIN;

-- Fix agents table schema
-- This migration ensures the agents table has the correct schema with the configuration column

-- Check if configuration column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'configuration'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb NOT NULL;
    END IF;
END
$$;

-- Make sure we have the right types for all columns
ALTER TABLE public.agents 
  ALTER COLUMN name TYPE VARCHAR,
  ALTER COLUMN status TYPE VARCHAR,
  ALTER COLUMN type TYPE VARCHAR,
  ALTER COLUMN configuration TYPE JSONB USING configuration::jsonb;

-- Ensure we have created_at and updated_at columns with the proper triggers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;
    END IF;
END
$$;

-- Add updated_at trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'set_agents_updated_at'
    ) THEN
        CREATE TRIGGER set_agents_updated_at
        BEFORE UPDATE ON public.agents
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- Ensure row level security is enabled
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'agents' 
        AND policyname = 'agents_select_policy'
    ) THEN
        CREATE POLICY agents_select_policy ON public.agents
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.farms
                    WHERE farms.id = agents.farm_id
                    AND farms.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'agents' 
        AND policyname = 'agents_insert_policy'
    ) THEN
        CREATE POLICY agents_insert_policy ON public.agents
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.farms
                    WHERE farms.id = agents.farm_id
                    AND farms.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'agents' 
        AND policyname = 'agents_update_policy'
    ) THEN
        CREATE POLICY agents_update_policy ON public.agents
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.farms
                    WHERE farms.id = agents.farm_id
                    AND farms.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'agents' 
        AND policyname = 'agents_delete_policy'
    ) THEN
        CREATE POLICY agents_delete_policy ON public.agents
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.farms
                    WHERE farms.id = agents.farm_id
                    AND farms.user_id = auth.uid()
                )
            );
    END IF;
END
$$;

-- End migration: 20250401073459_fix_agents_schema.sql
COMMIT;



-- Begin migration: 20250401073626_add_agent_functions.sql
BEGIN;

-- check_table_structure: Function to check if a table exists and has required columns
CREATE OR REPLACE FUNCTION public.check_table_structure(
  table_name text,
  required_columns text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  column_exists boolean;
  column_name text;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = check_table_structure.table_name
  ) THEN
    RETURN false;
  END IF;
  
  -- Check if all required columns exist
  FOREACH column_name IN ARRAY required_columns
  LOOP
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = check_table_structure.table_name 
      AND column_name = column_name
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$;

-- create_agent: Function to create an agent with proper configuration
CREATE OR REPLACE FUNCTION public.create_agent(
  agent_name text,
  agent_farm_id bigint,
  agent_status text,
  agent_type text,
  agent_config jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  created_agent record;
  config_exists boolean;
  result json;
BEGIN
  -- Check if configuration column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agents' 
    AND column_name = 'configuration'
  ) INTO config_exists;
  
  -- Create agent with or without configuration
  IF config_exists THEN
    -- Insert with configuration
    INSERT INTO public.agents (
      name, 
      farm_id, 
      status, 
      type, 
      configuration,
      created_at,
      updated_at
    ) 
    VALUES (
      agent_name,
      agent_farm_id,
      agent_status,
      agent_type,
      agent_config,
      NOW(),
      NOW()
    )
    RETURNING * INTO created_agent;
  ELSE
    -- Insert without configuration
    INSERT INTO public.agents (
      name, 
      farm_id, 
      status, 
      type,
      created_at,
      updated_at
    ) 
    VALUES (
      agent_name,
      agent_farm_id,
      agent_status,
      agent_type,
      NOW(),
      NOW()
    )
    RETURNING * INTO created_agent;
    
    -- Try to add configuration column if it doesn't exist
    BEGIN
      ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb;
      
      -- Update the record with the configuration
      UPDATE public.agents 
      SET configuration = agent_config
      WHERE id = created_agent.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore errors here, we'll just return the agent without configuration
        NULL;
    END;
  END IF;
  
  -- Build the result
  SELECT json_build_object(
    'id', created_agent.id,
    'name', created_agent.name,
    'farm_id', created_agent.farm_id,
    'status', created_agent.status,
    'type', created_agent.type,
    'created_at', created_agent.created_at,
    'updated_at', created_agent.updated_at
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Add function documentation comment
COMMENT ON FUNCTION public.check_table_structure IS 'Checks if a table exists and has all the required columns';
COMMENT ON FUNCTION public.create_agent IS 'Creates an agent with proper configuration handling regardless of schema state';

-- End migration: 20250401073626_add_agent_functions.sql
COMMIT;



-- Begin migration: 20250401082501_fix_agents_schema_cache.sql
BEGIN;

-- Fix schema cache issues by refreshing the agents table structure
-- First, make sure the agents table exists with all required columns

-- Check if agents table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'agents'
  ) THEN
    -- Create the agents table if it doesn't exist
    CREATE TABLE public.agents (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      farm_id BIGINT NOT NULL,
      status TEXT DEFAULT 'initializing' NOT NULL,
      type TEXT DEFAULT 'eliza' NOT NULL,
      configuration JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );

    -- Add comment to table
    COMMENT ON TABLE public.agents IS 'Stores trading agents configuration and status';
  ELSE
    -- Table exists, check for missing columns and add them if needed
    
    -- Check and add 'configuration' column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'configuration'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Check and add 'status' column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'status'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN status TEXT DEFAULT 'initializing' NOT NULL;
    END IF;
    
    -- Check and add 'type' column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'type'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN type TEXT DEFAULT 'eliza' NOT NULL;
    END IF;
    
    -- Check and add 'created_at' column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN created_at TIMESTAMPTZ DEFAULT now() NOT NULL;
    END IF;
    
    -- Check and add 'updated_at' column if missing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;
    END IF;
  END IF;
END $$;

-- Create or replace the trigger functions for handling timestamps
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS on_agents_created ON public.agents;
DROP TRIGGER IF EXISTS on_agents_updated ON public.agents;

CREATE TRIGGER on_agents_created
  BEFORE INSERT ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER on_agents_updated
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create RPC function for agent creation with configuration
CREATE OR REPLACE FUNCTION public.create_agent(
  agent_name TEXT,
  agent_farm_id BIGINT,
  agent_status TEXT DEFAULT 'initializing',
  agent_type TEXT DEFAULT 'eliza',
  agent_config JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  new_agent_id BIGINT;
  result JSONB;
BEGIN
  -- Insert the new agent
  INSERT INTO public.agents (
    name,
    farm_id,
    status,
    type,
    configuration
  )
  VALUES (
    agent_name,
    agent_farm_id,
    agent_status,
    agent_type,
    agent_config
  )
  RETURNING id INTO new_agent_id;
  
  -- Fetch the complete agent record
  SELECT
    jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'farm_id', a.farm_id,
      'status', a.status,
      'type', a.type,
      'configuration', a.configuration,
      'created_at', a.created_at,
      'updated_at', a.updated_at
    ) INTO result
  FROM public.agents a
  WHERE a.id = new_agent_id;
  
  RETURN result;
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create policies for the agents table
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;
  DROP POLICY IF EXISTS "Users can insert their own agents" ON public.agents;
  DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
  DROP POLICY IF EXISTS "Users can delete their own agents" ON public.agents;
  
  -- Create new policies
  CREATE POLICY "Users can view their own agents"
    ON public.agents
    FOR SELECT
    USING (
      farm_id IN (
        SELECT id FROM public.farms WHERE user_id = auth.uid()
      )
    );
  
  CREATE POLICY "Users can insert their own agents"
    ON public.agents
    FOR INSERT
    WITH CHECK (
      farm_id IN (
        SELECT id FROM public.farms WHERE user_id = auth.uid()
      )
    );
  
  CREATE POLICY "Users can update their own agents"
    ON public.agents
    FOR UPDATE
    USING (
      farm_id IN (
        SELECT id FROM public.farms WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      farm_id IN (
        SELECT id FROM public.farms WHERE user_id = auth.uid()
      )
    );
  
  CREATE POLICY "Users can delete their own agents"
    ON public.agents
    FOR DELETE
    USING (
      farm_id IN (
        SELECT id FROM public.farms WHERE user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- Refresh the schema cache
DO $$
BEGIN
  -- Attempt to refresh the schema cache using PostgreSQL's built-in functionality
  ANALYZE public.agents;
  
  -- Force a refresh of the pg_stat_statements stats
  SELECT pg_stat_statements_reset();
EXCEPTION
  WHEN undefined_function THEN
    -- pg_stat_statements might not be enabled
    NULL;
END $$;


-- End migration: 20250401082501_fix_agents_schema_cache.sql
COMMIT;



-- Begin migration: 20250401091523_create_trades_table.sql
BEGIN;

-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(255) NOT NULL,
    side VARCHAR(50) NOT NULL CHECK (side IN ('buy', 'sell')),
    entry_price DECIMAL(18, 8) NOT NULL,
    exit_price DECIMAL(18, 8),
    quantity DECIMAL(18, 8) NOT NULL,
    profit_loss DECIMAL(18, 8),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'canceled')),
    agent_id BIGINT REFERENCES public.agents(id),
    farm_id BIGINT NOT NULL REFERENCES public.farms(id),
    strategy_id BIGINT REFERENCES public.strategies(id),
    exchange VARCHAR(255),
    fees DECIMAL(18, 8),
    duration_ms BIGINT,
    roi_percentage DECIMAL(10, 4),
    trade_sentiment VARCHAR(50) CHECK (trade_sentiment IN ('bullish', 'bearish', 'neutral')),
    entry_order_id BIGINT,
    exit_order_id BIGINT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add triggers for created_at and updated_at
DROP TRIGGER IF EXISTS set_trades_updated_at ON public.trades;
CREATE TRIGGER set_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add comment to clarify purpose of the table
COMMENT ON TABLE public.trades IS 'Stores trading activity from Trading Farm agents and strategies';

-- Enable Row Level Security
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create policies for trades table
CREATE POLICY trades_select_policy ON public.trades 
    FOR SELECT 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY trades_insert_policy ON public.trades 
    FOR INSERT 
    WITH CHECK (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY trades_update_policy ON public.trades 
    FOR UPDATE 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY trades_delete_policy ON public.trades 
    FOR DELETE 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

-- Create transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.transactions (
    id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT NOT NULL REFERENCES public.farms(id),
    wallet_id BIGINT REFERENCES public.wallets(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'trade_profit', 'trade_loss')),
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
    description TEXT,
    reference_id VARCHAR(255),
    external_id VARCHAR(255),
    exchange VARCHAR(255),
    recipient VARCHAR(255),
    sender VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add triggers for created_at and updated_at
DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add comment to clarify purpose of the table
COMMENT ON TABLE public.transactions IS 'Stores financial transactions for Trading Farm accounts';

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions table
CREATE POLICY transactions_select_policy ON public.transactions 
    FOR SELECT 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY transactions_insert_policy ON public.transactions 
    FOR INSERT 
    WITH CHECK (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY transactions_update_policy ON public.transactions 
    FOR UPDATE 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY transactions_delete_policy ON public.transactions 
    FOR DELETE 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );


-- End migration: 20250401091523_create_trades_table.sql
COMMIT;



-- Begin migration: 20250401202938_add_orders_table.sql
BEGIN;


-- Creates the orders table and related functionality for the Trading Farm dashboard
-- This migration adds support for advanced order types including trailing stops

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id INTEGER REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES public.agents(id) ON DELETE SET NULL,
  exchange VARCHAR NOT NULL,
  exchange_account_id VARCHAR,
  symbol VARCHAR NOT NULL,
  order_type VARCHAR NOT NULL,
  side VARCHAR NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  trigger_price NUMERIC,
  trailing_percent NUMERIC,
  stop_price NUMERIC,
  status VARCHAR NOT NULL DEFAULT 'pending',
  external_id VARCHAR,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create created_at trigger
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'orders_updated_at_trigger'
  ) THEN
    CREATE TRIGGER orders_updated_at_trigger
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'orders_created_at_trigger'
  ) THEN
    CREATE TRIGGER orders_created_at_trigger
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
  END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access to orders based on farm association
CREATE POLICY "Users can view their own farm's orders"
  ON public.orders
  FOR SELECT
  USING (
    farm_id IN (
      SELECT id FROM public.farms
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for inserting orders
CREATE POLICY "Users can insert orders for their farms"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT id FROM public.farms
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for updating orders
CREATE POLICY "Users can update their farm's orders"
  ON public.orders
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT id FROM public.farms
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for deleting orders
CREATE POLICY "Users can delete their farm's orders"
  ON public.orders
  FOR DELETE
  USING (
    farm_id IN (
      SELECT id FROM public.farms
      WHERE user_id = auth.uid()
    )
  );

-- End migration: 20250401202938_add_orders_table.sql
COMMIT;



-- Begin migration: 20250401_add_agent_functions.sql
BEGIN;

-- Create a function to create an agent directly
CREATE OR REPLACE FUNCTION public.create_agent(
  agent_name TEXT,
  agent_farm_id INTEGER,
  agent_status TEXT DEFAULT 'initializing',
  agent_type TEXT DEFAULT 'eliza',
  agent_config JSONB DEFAULT '{}'::jsonb
)
RETURNS SETOF agents
SECURITY INVOKER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.agents (name, farm_id, status, type, configuration, created_at, updated_at)
  VALUES (
    agent_name,
    agent_farm_id,
    agent_status,
    agent_type,
    agent_config,
    now(),
    now()
  )
  RETURNING *;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent TO service_role;


-- End migration: 20250401_add_agent_functions.sql
COMMIT;



-- Begin migration: 20250401_add_goals_table.sql
BEGIN;

-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  target_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  progress NUMERIC DEFAULT 0,
  metrics JSONB DEFAULT '{}'::jsonb,
  strategy TEXT,
  priority TEXT DEFAULT 'medium',
  deadline TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow users to view their own goals" 
  ON public.goals 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = goals.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to create goals for their farms" 
  ON public.goals 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = goals.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to update their goals" 
  ON public.goals 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = goals.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to delete their goals" 
  ON public.goals 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = goals.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

-- Create triggers for handling created_at and updated_at
CREATE TRIGGER handle_goals_created_at
  BEFORE INSERT ON public.goals
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Add some example goals
INSERT INTO public.goals (name, description, type, status, farm_id, target_value, current_value, progress, metrics, strategy, priority, deadline)
VALUES 
  ('Monthly Profit Target', 'Achieve a 5% monthly profit across the farm', 'profit', 'in_progress', 1, 0.05, 0.032, 0.64, '{"startValue": 10000, "currentValue": 10320, "targetValue": 10500}'::jsonb, 'Incremental growth with controlled risk', 'high', now() + interval '15 days'),
  ('Risk Reduction', 'Reduce maximum drawdown to under 10%', 'risk', 'in_progress', 1, 0.10, 0.14, 0.40, '{"startValue": 0.22, "currentValue": 0.14, "targetValue": 0.10}'::jsonb, 'Implement tighter stop-losses and improve risk scoring', 'medium', now() + interval '30 days');


-- End migration: 20250401_add_goals_table.sql
COMMIT;



-- Begin migration: 20250401_trading_strategies.sql
BEGIN;

-- Migration: Trading Strategies Integration
-- Description: Create tables and functions for trading strategies and signals
-- Connects the farming system with real exchange APIs

-- Create strategy types enum
CREATE TYPE public.strategy_type AS ENUM (
  'trend_following',
  'mean_reversion',
  'breakout',
  'grid_trading',
  'scalping',
  'arbitrage',
  'custom'
);

-- Create signal direction enum
CREATE TYPE public.signal_direction AS ENUM (
  'buy',
  'sell',
  'neutral'
);

-- Create signal type enum
CREATE TYPE public.signal_type AS ENUM (
  'entry',
  'exit',
  'modify'
);

-- Trading strategies table
CREATE TABLE public.trading_strategies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  strategy_type strategy_type NOT NULL,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  max_drawdown NUMERIC,
  max_position_size NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_trading_strategies 
BEFORE UPDATE ON public.trading_strategies 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Strategy signals table
CREATE TABLE public.strategy_signals (
  id BIGSERIAL PRIMARY KEY,
  strategy_id BIGINT NOT NULL REFERENCES public.trading_strategies(id) ON DELETE CASCADE,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction signal_direction NOT NULL,
  signal_type signal_type NOT NULL,
  price NUMERIC NOT NULL,
  quantity NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  is_executed BOOLEAN NOT NULL DEFAULT false,
  execution_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_strategy_signals
BEFORE UPDATE ON public.strategy_signals
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Strategy backtest results table
CREATE TABLE public.strategy_backtest_results (
  id BIGSERIAL PRIMARY KEY,
  strategy_id BIGINT NOT NULL REFERENCES public.trading_strategies(id) ON DELETE CASCADE,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  initial_capital NUMERIC NOT NULL,
  final_capital NUMERIC NOT NULL,
  total_trades INTEGER NOT NULL,
  winning_trades INTEGER NOT NULL,
  losing_trades INTEGER NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  sharpe_ratio NUMERIC,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  trades JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_strategy_backtest_results
BEFORE UPDATE ON public.strategy_backtest_results
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_backtest_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trading_strategies
CREATE POLICY "Users can view their own trading strategies"
  ON public.trading_strategies
  FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can insert their own trading strategies"
  ON public.trading_strategies
  FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can update their own trading strategies"
  ON public.trading_strategies
  FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can delete their own trading strategies"
  ON public.trading_strategies
  FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

-- Create RLS policies for strategy_signals
CREATE POLICY "Users can view their own strategy signals"
  ON public.strategy_signals
  FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can insert signals for their own strategies"
  ON public.strategy_signals
  FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can update signals for their own strategies"
  ON public.strategy_signals
  FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can delete signals for their own strategies"
  ON public.strategy_signals
  FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

-- Create RLS policies for strategy_backtest_results
CREATE POLICY "Users can view their own backtest results"
  ON public.strategy_backtest_results
  FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can insert backtest results for their own strategies"
  ON public.strategy_backtest_results
  FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can update backtest results for their own strategies"
  ON public.strategy_backtest_results
  FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can delete backtest results for their own strategies"
  ON public.strategy_backtest_results
  FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

-- Function to get active strategies for a farm
CREATE OR REPLACE FUNCTION public.get_farm_active_strategies(p_farm_id BIGINT)
RETURNS SETOF public.trading_strategies
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.trading_strategies
  WHERE farm_id = p_farm_id AND is_active = true
  ORDER BY created_at DESC;
$$;

-- Function to get recent signals for a farm
CREATE OR REPLACE FUNCTION public.get_farm_recent_signals(p_farm_id BIGINT, p_limit INTEGER DEFAULT 100)
RETURNS SETOF public.strategy_signals
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.strategy_signals
  WHERE farm_id = p_farm_id
  ORDER BY timestamp DESC
  LIMIT p_limit;
$$;


-- End migration: 20250401_trading_strategies.sql
COMMIT;



-- Begin migration: 20250401_update_agents_table.sql
BEGIN;

-- Add configuration column to agents table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'agents'
    AND column_name = 'configuration'
  ) THEN
    ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb;
  END IF;
END
$$;

-- Update example data with configuration values
UPDATE public.agents
SET configuration = jsonb_build_object(
  'description', 'Automated trading agent',
  'strategy_type', 'trend_following',
  'risk_level', 'medium',
  'target_markets', jsonb_build_array('BTC/USD', 'ETH/USD'),
  'performance_metrics', jsonb_build_object(
    'win_rate', 0,
    'profit_loss', 0,
    'total_trades', 0,
    'average_trade_duration', 0
  )
)
WHERE configuration IS NULL OR configuration = '{}'::jsonb;


-- End migration: 20250401_update_agents_table.sql
COMMIT;



-- Begin migration: 20250402_add_agent_functions_direct.sql
BEGIN;

-- Add SQL functions to handle agent creation without relying on schema cache

-- Function to insert an agent with basic fields
CREATE OR REPLACE FUNCTION public.run_agent_insert(
  p_name TEXT,
  p_farm_id INTEGER,
  p_status TEXT DEFAULT 'initializing',
  p_type TEXT DEFAULT 'eliza'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_id INTEGER;
BEGIN
  -- Insert the agent with only basic fields
  INSERT INTO public.agents(
    name, 
    farm_id,
    status,
    type,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_farm_id,
    p_status,
    p_type,
    NOW(),
    NOW()
  ) RETURNING id INTO v_id;
  
  -- Build result JSON
  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'farm_id', a.farm_id,
    'status', a.status,
    'type', a.type,
    'created_at', a.created_at,
    'updated_at', a.updated_at
  ) INTO v_result
  FROM public.agents a
  WHERE a.id = v_id;
  
  RETURN v_result;
END;
$$;

-- Function to update agent configuration
CREATE OR REPLACE FUNCTION public.update_agent_config(
  p_agent_id INTEGER,
  p_config TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Try to update the configuration if column exists
  EXECUTE FORMAT('
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ''public''
        AND table_name = ''agents''
        AND column_name = ''configuration''
      ) THEN
        UPDATE public.agents
        SET configuration = %L::jsonb
        WHERE id = %s;
      END IF;
    END
    $$', p_config, p_agent_id);
END;
$$;

-- Grant permissions to the functions
GRANT EXECUTE ON FUNCTION public.run_agent_insert TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_agent_insert TO service_role;
GRANT EXECUTE ON FUNCTION public.update_agent_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_agent_config TO service_role;


-- End migration: 20250402_add_agent_functions_direct.sql
COMMIT;



-- Begin migration: 20250402_agent_eliza_integration.sql
BEGIN;

-- Create ElizaOS integration tables for agents
-- This migration adds tables for agent instructions, command history, messages, and knowledge base

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agent instructions table - stores the instructions given to ElizaOS agents
CREATE TABLE IF NOT EXISTS public.agent_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  instructions TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_agent
    FOREIGN KEY (agent_id)
    REFERENCES public.agents(id)
    ON DELETE CASCADE
);

-- Add timestamp triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.agent_instructions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create index on agent_id
CREATE INDEX IF NOT EXISTS idx_agent_instructions_agent_id ON public.agent_instructions(agent_id);

-- Agent command history - stores the history of commands sent to ElizaOS and their responses
CREATE TABLE IF NOT EXISTS public.agent_command_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  command TEXT NOT NULL,
  response TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('strategy', 'market', 'risk', 'system')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_agent
    FOREIGN KEY (agent_id)
    REFERENCES public.agents(id)
    ON DELETE CASCADE
);

-- Create index on agent_id
CREATE INDEX IF NOT EXISTS idx_agent_command_history_agent_id ON public.agent_command_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_command_history_type ON public.agent_command_history(type);

-- Agent messages - stores messages sent by the agent to the user
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'alert', 'error', 'success')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_agent
    FOREIGN KEY (agent_id)
    REFERENCES public.agents(id)
    ON DELETE CASCADE
);

-- Create index on agent_id and read status
CREATE INDEX IF NOT EXISTS idx_agent_messages_agent_id ON public.agent_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_read ON public.agent_messages(read);
CREATE INDEX IF NOT EXISTS idx_agent_messages_type ON public.agent_messages(type);

-- Agent knowledge - stores knowledge entries for use by ElizaOS
CREATE TABLE IF NOT EXISTS public.agent_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_agent
    FOREIGN KEY (agent_id)
    REFERENCES public.agents(id)
    ON DELETE CASCADE
);

-- Add timestamp triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.agent_knowledge
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create index on agent_id and topic
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_id ON public.agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_topic ON public.agent_knowledge(topic);

-- Add RLS policies
ALTER TABLE public.agent_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_command_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge ENABLE ROW LEVEL SECURITY;

-- Create policy that users can only access their own agent data
-- First, create policies for agent_instructions
CREATE POLICY agent_instructions_select_policy
  ON public.agent_instructions
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_instructions_insert_policy
  ON public.agent_instructions
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_instructions_update_policy
  ON public.agent_instructions
  FOR UPDATE
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_instructions_delete_policy
  ON public.agent_instructions
  FOR DELETE
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

-- Create policies for agent_command_history
CREATE POLICY agent_command_history_select_policy
  ON public.agent_command_history
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_command_history_insert_policy
  ON public.agent_command_history
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

-- Create policies for agent_messages
CREATE POLICY agent_messages_select_policy
  ON public.agent_messages
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_messages_insert_policy
  ON public.agent_messages
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_messages_update_policy
  ON public.agent_messages
  FOR UPDATE
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

-- Create policies for agent_knowledge
CREATE POLICY agent_knowledge_select_policy
  ON public.agent_knowledge
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_knowledge_insert_policy
  ON public.agent_knowledge
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_knowledge_update_policy
  ON public.agent_knowledge
  FOR UPDATE
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_knowledge_delete_policy
  ON public.agent_knowledge
  FOR DELETE
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );


-- End migration: 20250402_agent_eliza_integration.sql
COMMIT;



-- Begin migration: 20250402_agent_sql_functions.sql
BEGIN;

-- Create SQL execution functions for agent operations
-- These functions will help bypass schema cache issues

-- Function to execute arbitrary SQL safely
CREATE OR REPLACE FUNCTION public.execute_sql(query text, params text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE query INTO result USING params;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Function to run SQL with parameters
CREATE OR REPLACE FUNCTION public.run_sql_with_params(sql_query text, param_values text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
  v_sql text;
  v_rows json;
BEGIN
  EXECUTE sql_query USING VARIADIC param_values INTO v_rows;
  
  v_result = jsonb_build_object(
    'success', true,
    'rows', v_rows
  );
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Function to insert a new Eliza agent with full configuration
CREATE OR REPLACE FUNCTION public.insert_eliza_agent(
  p_name text,
  p_farm_id int,
  p_config jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_agent_id int;
  v_agent jsonb;
BEGIN
  -- Check if agents table exists and has configuration column
  PERFORM FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agents';
  
  -- Insert agent with minimal fields first
  INSERT INTO public.agents (
    name,
    farm_id,
    status,
    type,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_farm_id,
    'initializing',
    'eliza',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_agent_id;
  
  -- Check if configuration column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agents' 
    AND column_name = 'configuration'
  ) THEN
    -- Update configuration separately
    UPDATE public.agents
    SET configuration = p_config
    WHERE id = v_agent_id;
  END IF;
  
  -- Get the complete agent record
  SELECT 
    jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'farm_id', a.farm_id,
      'status', a.status,
      'type', a.type,
      'created_at', a.created_at,
      'updated_at', a.updated_at,
      'configuration', COALESCE(
        -- Try to get configuration from the column if it exists
        (SELECT to_jsonb(a.configuration)),
        -- Otherwise use the provided config as a fallback
        p_config
      )
    )
  INTO v_agent
  FROM public.agents a
  WHERE a.id = v_agent_id;
  
  RETURN v_agent;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.execute_sql TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_sql TO service_role;

GRANT EXECUTE ON FUNCTION public.run_sql_with_params TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_sql_with_params TO service_role;

GRANT EXECUTE ON FUNCTION public.insert_eliza_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_eliza_agent TO service_role;


-- End migration: 20250402_agent_sql_functions.sql
COMMIT;



-- Begin migration: 20250402_fix_agents_schema.sql
BEGIN;

-- Fix agents table schema and caching issues

-- First, ensure the configuration column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'agents'
    AND column_name = 'configuration'
  ) THEN
    ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added configuration column to agents table';
  ELSE
    RAISE NOTICE 'Configuration column already exists in agents table';
  END IF;
END
$$;

-- Then force PostgREST to refresh its schema cache
ALTER TABLE public.agents RENAME TO agents_temp;
ALTER TABLE public.agents_temp RENAME TO agents;

-- Set proper permissions for the table
GRANT ALL ON agents TO authenticated;
GRANT ALL ON agents TO service_role;

-- Create a direct function for agent creation that bypasses PostgREST
CREATE OR REPLACE FUNCTION public.create_eliza_agent(
  p_name TEXT,
  p_farm_id INTEGER,
  p_description TEXT DEFAULT '',
  p_strategy_type TEXT DEFAULT 'custom',
  p_risk_level TEXT DEFAULT 'medium',
  p_target_markets JSONB DEFAULT '[]'::jsonb,
  p_config JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_agent_id INTEGER;
  v_result JSONB;
  v_configuration JSONB;
BEGIN
  -- Prepare configuration object
  v_configuration = jsonb_build_object(
    'description', p_description,
    'strategy_type', p_strategy_type,
    'risk_level', p_risk_level,
    'target_markets', p_target_markets,
    'performance_metrics', jsonb_build_object(
      'win_rate', 0,
      'profit_loss', 0,
      'total_trades', 0,
      'average_trade_duration', 0
    )
  );
  
  -- Merge with additional config if provided
  IF p_config IS NOT NULL AND p_config != '{}'::jsonb THEN
    v_configuration = v_configuration || p_config;
  END IF;
  
  -- Insert the agent
  INSERT INTO public.agents(
    name,
    farm_id,
    status,
    type,
    configuration,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_farm_id,
    'initializing',
    'eliza',
    v_configuration,
    NOW(),
    NOW()
  ) RETURNING id INTO v_agent_id;
  
  -- Return the full agent data
  SELECT jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'farm_id', a.farm_id,
    'status', a.status,
    'type', a.type,
    'configuration', a.configuration,
    'created_at', a.created_at,
    'updated_at', a.updated_at
  ) INTO v_result
  FROM public.agents a
  WHERE a.id = v_agent_id;
  
  RETURN v_result;
END;
$$;

-- Grant permission to execute the function
GRANT EXECUTE ON FUNCTION public.create_eliza_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_eliza_agent TO service_role;


-- End migration: 20250402_fix_agents_schema.sql
COMMIT;



-- Begin migration: 20250402_fix_agents_table.sql
BEGIN;

-- Check if configuration column exists and add it if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'agents'
        AND column_name = 'configuration'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb;
        
        -- Announce the column was added
        RAISE NOTICE 'Added configuration column to agents table';
    ELSE
        RAISE NOTICE 'Configuration column already exists in agents table';
    END IF;
END;
$$;

-- Refresh the schema cache
ALTER TABLE public.agents ADD COLUMN _temp_column TEXT;
ALTER TABLE public.agents DROP COLUMN _temp_column;

-- Grant permissions to the table
GRANT ALL ON TABLE public.agents TO authenticated;
GRANT ALL ON TABLE public.agents TO service_role;

-- Verify the configuration column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'agents' 
AND column_name = 'configuration';

-- Create a simple function to directly insert an agent (bypassing PostgREST)
CREATE OR REPLACE FUNCTION public.direct_insert_agent(
    p_name TEXT,
    p_farm_id INTEGER,
    p_status TEXT DEFAULT 'initializing',
    p_type TEXT DEFAULT 'eliza',
    p_config JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_result JSONB;
    v_agent public.agents;
BEGIN
    INSERT INTO public.agents (
        name, 
        farm_id, 
        status, 
        type, 
        configuration, 
        created_at, 
        updated_at
    ) VALUES (
        p_name,
        p_farm_id,
        p_status,
        p_type,
        p_config,
        now(),
        now()
    )
    RETURNING * INTO v_agent;
    
    v_result = jsonb_build_object(
        'id', v_agent.id,
        'name', v_agent.name,
        'farm_id', v_agent.farm_id,
        'status', v_agent.status,
        'type', v_agent.type,
        'configuration', v_agent.configuration
    );
    
    RETURN v_result;
END;
$$;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION public.direct_insert_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.direct_insert_agent TO service_role;


-- End migration: 20250402_fix_agents_table.sql
COMMIT;



-- Begin migration: 20250402_goals_table.sql
BEGIN;

-- Create the goals table if it doesn't already exist from earlier migrations
-- This ensures we have a properly structured goals table in the database

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if the goals table already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'goals'
  ) THEN
    -- Create the goals table
    CREATE TABLE public.goals (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')) DEFAULT 'not_started',
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      deadline TIMESTAMP WITH TIME ZONE,
      farm_id INTEGER NOT NULL,
      target_value NUMERIC NOT NULL DEFAULT 0,
      current_value NUMERIC NOT NULL DEFAULT 0,
      progress NUMERIC NOT NULL DEFAULT 0,
      metrics JSONB,
      strategy TEXT,
      
      CONSTRAINT fk_farm
        FOREIGN KEY (farm_id)
        REFERENCES public.farms(id)
        ON DELETE CASCADE
    );

    -- Add timestamp triggers
    CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.goals
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

    -- Create index on farm_id
    CREATE INDEX idx_goals_farm_id ON public.goals(farm_id);
    CREATE INDEX idx_goals_status ON public.goals(status);
    CREATE INDEX idx_goals_type ON public.goals(type);

    -- Enable row level security
    ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

    -- Create policies so users can only access their own goals
    CREATE POLICY goals_select_policy
      ON public.goals
      FOR SELECT
      USING (
        farm_id IN (
          SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY goals_insert_policy
      ON public.goals
      FOR INSERT
      WITH CHECK (
        farm_id IN (
          SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY goals_update_policy
      ON public.goals
      FOR UPDATE
      USING (
        farm_id IN (
          SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        farm_id IN (
          SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY goals_delete_policy
      ON public.goals
      FOR DELETE
      USING (
        farm_id IN (
          SELECT id FROM public.farms WHERE user_id = auth.uid()
        )
      );
  END IF;
END
$$;


-- End migration: 20250402_goals_table.sql
COMMIT;



-- Begin migration: 20250402_utility_functions.sql
BEGIN;

-- Create utility functions for our application
-- This includes helper functions for checking if tables exist

-- Check table exists function
-- This function can be called from our application to check if a table exists before trying to access it
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  exists BOOLEAN;
BEGIN
  SELECT COUNT(*) > 0 INTO exists
  FROM pg_tables
  WHERE schemaname = 'public' 
  AND tablename = table_name;

  RETURN exists;
END;
$$;

-- Function to create the check_table_exists function
-- This is a utility function that can be called from our application to ensure the check_table_exists function is available
CREATE OR REPLACE FUNCTION public.create_check_table_exists_function()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- We're returning the function definition itself as a string
  EXECUTE $FUNC$
    CREATE OR REPLACE FUNCTION public.check_table_exists(table_name TEXT)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $INNER$
    DECLARE
      exists BOOLEAN;
    BEGIN
      SELECT COUNT(*) > 0 INTO exists
      FROM pg_tables
      WHERE schemaname = 'public' 
      AND tablename = table_name;

      RETURN exists;
    END;
    $INNER$;
  $FUNC$;

  RETURN TRUE;
END;
$$;

-- Function to list all tables in the public schema
-- This is useful for debugging and exploring the database
CREATE OR REPLACE FUNCTION public.list_tables()
RETURNS TABLE (
  table_name TEXT,
  table_size BIGINT,
  row_count BIGINT,
  last_vacuum TIMESTAMP,
  last_analyze TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT, 
    pg_total_relation_size('public.' || t.tablename) AS table_size,
    (SELECT reltuples::BIGINT FROM pg_class WHERE oid = ('public.' || t.tablename)::regclass) AS row_count,
    last_vacuum,
    last_analyze
  FROM pg_tables t
  LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$;


-- End migration: 20250402_utility_functions.sql
COMMIT;



-- Begin migration: 20240626_agent_messages.sql
BEGIN;

-- Create agent messages table for agent-to-agent communication
create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.agents(id) on delete cascade,
  sender_name text not null,
  sender_role text not null,
  recipient_id uuid references public.agents(id) on delete cascade,
  recipient_role text,
  content text not null,
  type text not null,
  priority text not null,
  metadata jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default now(),
  requires_acknowledgment boolean not null default false,
  requires_response boolean not null default false,
  parent_message_id uuid references public.agent_messages(id) on delete set null,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add indexes for faster queries
create index if not exists agent_messages_sender_id_idx on public.agent_messages(sender_id);
create index if not exists agent_messages_recipient_id_idx on public.agent_messages(recipient_id);
create index if not exists agent_messages_timestamp_idx on public.agent_messages(timestamp);
create index if not exists agent_messages_status_idx on public.agent_messages(status);

-- Set up RLS policies
alter table public.agent_messages enable row level security;

-- Setup timestamp triggers
create trigger handle_agent_messages_created_at before insert on public.agent_messages
  for each row execute function public.handle_created_at();

create trigger handle_agent_messages_updated_at before update on public.agent_messages
  for each row execute function public.handle_updated_at();

-- Policy: Allow users to view messages for agents in their farms
create policy "Users can view messages for their farm's agents"
  on public.agent_messages
  for select
  using (
    exists (
      select 1 from public.agents a
      join public.farms f on a.farm_id = f.id
      where (a.id = agent_messages.sender_id or a.id = agent_messages.recipient_id)
        and f.user_id = auth.uid()
    )
  );

-- Policy: Allow users to create messages for agents in their farms
create policy "Users can send messages from their farm's agents"
  on public.agent_messages
  for insert
  with check (
    exists (
      select 1 from public.agents a
      join public.farms f on a.farm_id = f.id
      where a.id = agent_messages.sender_id
        and f.user_id = auth.uid()
    )
  );

-- Policy: Allow users to update messages for agents in their farms
create policy "Users can update messages for their farm's agents"
  on public.agent_messages
  for update
  using (
    exists (
      select 1 from public.agents a
      join public.farms f on a.farm_id = f.id
      where (a.id = agent_messages.sender_id or a.id = agent_messages.recipient_id)
        and f.user_id = auth.uid()
    )
  );

-- Policy: Allow users to delete messages for agents in their farms
create policy "Users can delete messages for their farm's agents"
  on public.agent_messages
  for delete
  using (
    exists (
      select 1 from public.agents a
      join public.farms f on a.farm_id = f.id
      where a.id = agent_messages.sender_id
        and f.user_id = auth.uid()
    )
  );

-- Add a function to get messages for a farm
create or replace function public.get_farm_agent_messages(farm_id_param bigint, limit_param int default 100)
returns setof public.agent_messages
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  select m.*
  from public.agent_messages m
  join public.agents a on (m.sender_id = a.id or m.recipient_id = a.id)
  where a.farm_id = farm_id_param
  order by m.timestamp desc
  limit limit_param;
end;
$$;


-- End migration: 20240626_agent_messages.sql
COMMIT;


