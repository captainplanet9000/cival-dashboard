-- Consolidated schema migration
-- This file combines the essential tables and relationships in the correct order
-- with proper types and constraints to avoid migration issues

-- Ensure utility functions are available
-- These should already be created in the previous migration
-- Check if handle_created_at function exists
DO $func$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_created_at') THEN
        EXECUTE E'
        CREATE FUNCTION public.handle_created_at()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.created_at = now();
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;
        ';
    END IF;

    -- Check if handle_updated_at function exists
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        EXECUTE E'
        CREATE FUNCTION public.handle_updated_at()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $function$ LANGUAGE plpgsql;
        ';
    END IF;
END $func$;

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create farms table - foundation for all farm-related entities
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);

-- Create farm_users table for managing farm collaborators
CREATE TABLE IF NOT EXISTS public.farm_users (
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (farm_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_farm_users_user_id ON public.farm_users(user_id);

-- Create agents table with farm_id reference
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    agent_type VARCHAR(50),
    configuration JSONB,
    status VARCHAR(20) DEFAULT 'idle',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_farm_id ON public.agents(farm_id);

-- Create strategies table
CREATE TABLE IF NOT EXISTS public.strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    configuration JSONB,
    performance_metrics JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_strategies_farm_id ON public.strategies(farm_id);
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON public.strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_is_template ON public.strategies(is_template);

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    network VARCHAR(50) NOT NULL,
    exchange VARCHAR(100),
    balance NUMERIC(20, 8) DEFAULT 0,
    currency VARCHAR(20) NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallets_farm_id ON public.wallets(farm_id);
CREATE INDEX IF NOT EXISTS idx_wallets_owner_id ON public.wallets(owner_id);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    exchange VARCHAR(50),
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop')),
    quantity NUMERIC(24, 8) NOT NULL,
    price NUMERIC(24, 8),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'filled', 'partially_filled', 'canceled', 'rejected', 'expired')),
    external_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    executed_at TIMESTAMPTZ,
    -- Advanced order parameters
    trail_value NUMERIC,
    trail_type VARCHAR(10) CHECK (trail_type IN ('amount', 'percentage')),
    time_in_force VARCHAR(10) CHECK (time_in_force IN ('gtc', 'ioc', 'fok', 'day')),
    trigger_price NUMERIC(24, 8),
    take_profit_price NUMERIC(24, 8),
    stop_loss_price NUMERIC(24, 8),
    execution_strategy VARCHAR(20),
    expiration TIMESTAMPTZ,
    leverage NUMERIC(10, 2),
    is_conditional BOOLEAN DEFAULT false,
    condition_type VARCHAR(20),
    condition_value TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_orders_farm_id ON public.orders(farm_id);
CREATE INDEX IF NOT EXISTS idx_orders_wallet_id ON public.orders(wallet_id);
CREATE INDEX IF NOT EXISTS idx_orders_strategy_id ON public.orders(strategy_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'trade_profit', 'trade_loss')),
    amount NUMERIC(20, 8) NOT NULL,
    currency VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
    tx_hash VARCHAR(255),
    description TEXT,
    external_reference VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farm_id ON public.transactions(farm_id);

-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL,
    target_value NUMERIC(24, 8),
    current_value NUMERIC(24, 8) DEFAULT 0,
    progress_percentage DECIMAL(5, 2) DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'paused')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_goals_farm_id ON public.goals(farm_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);

-- Add triggers for all tables
-- Farms triggers
DROP TRIGGER IF EXISTS handle_farms_created_at ON public.farms;
CREATE TRIGGER handle_farms_created_at
BEFORE INSERT ON public.farms
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_farms_updated_at ON public.farms;
CREATE TRIGGER handle_farms_updated_at
BEFORE UPDATE ON public.farms
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Farm users triggers
DROP TRIGGER IF EXISTS handle_farm_users_created_at ON public.farm_users;
CREATE TRIGGER handle_farm_users_created_at
BEFORE INSERT ON public.farm_users
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_farm_users_updated_at ON public.farm_users;
CREATE TRIGGER handle_farm_users_updated_at
BEFORE UPDATE ON public.farm_users
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Agents triggers
DROP TRIGGER IF EXISTS handle_agents_created_at ON public.agents;
CREATE TRIGGER handle_agents_created_at
BEFORE INSERT ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_agents_updated_at ON public.agents;
CREATE TRIGGER handle_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Strategies triggers
DROP TRIGGER IF EXISTS handle_strategies_created_at ON public.strategies;
CREATE TRIGGER handle_strategies_created_at
BEFORE INSERT ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_strategies_updated_at ON public.strategies;
CREATE TRIGGER handle_strategies_updated_at
BEFORE UPDATE ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Wallets triggers
DROP TRIGGER IF EXISTS handle_wallets_created_at ON public.wallets;
CREATE TRIGGER handle_wallets_created_at
BEFORE INSERT ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_wallets_updated_at ON public.wallets;
CREATE TRIGGER handle_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Orders triggers
DROP TRIGGER IF EXISTS handle_orders_created_at ON public.orders;
CREATE TRIGGER handle_orders_created_at
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
CREATE TRIGGER handle_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Transactions triggers
DROP TRIGGER IF EXISTS handle_transactions_created_at ON public.transactions;
CREATE TRIGGER handle_transactions_created_at
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_transactions_updated_at ON public.transactions;
CREATE TRIGGER handle_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Goals triggers
DROP TRIGGER IF EXISTS handle_goals_created_at ON public.goals;
CREATE TRIGGER handle_goals_created_at
BEFORE INSERT ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_goals_updated_at ON public.goals;
CREATE TRIGGER handle_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security on all tables
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
-- Farms policies
CREATE POLICY "Users can view their own farms"
ON public.farms FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own farms"
ON public.farms FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own farms"
ON public.farms FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own farms"
ON public.farms FOR DELETE
USING (auth.uid() = user_id);

-- Farm Users policies
CREATE POLICY "Farm members can view farm users"
ON public.farm_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = farm_users.farm_id
    AND fu.user_id = auth.uid()
  )
);

CREATE POLICY "Farm owners can manage farm users"
ON public.farm_users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = farm_users.farm_id
    AND farms.user_id = auth.uid()
  )
);

-- Agents policies
CREATE POLICY "Users can view their own agents"
ON public.agents FOR SELECT
USING (auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = agents.farm_id
    AND farm_users.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own agents"
ON public.agents FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Farm admins can manage farm agents"
ON public.agents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = agents.farm_id
    AND farm_users.user_id = auth.uid()
    AND farm_users.role IN ('owner', 'admin')
  )
);

-- Strategies policies
CREATE POLICY "Users can view strategies"
ON public.strategies FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = strategies.farm_id
    AND farm_users.user_id = auth.uid()
  )
  OR is_template = true
);

CREATE POLICY "Users can manage their own strategies"
ON public.strategies FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Farm admins can manage farm strategies"
ON public.strategies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = strategies.farm_id
    AND farm_users.user_id = auth.uid()
    AND farm_users.role IN ('owner', 'admin')
  )
);

-- Wallets policies
CREATE POLICY "Users can view their own wallets"
ON public.wallets FOR SELECT
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = wallets.farm_id
    AND farm_users.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own wallets"
ON public.wallets FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own wallets"
ON public.wallets FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Farm admins can manage farm wallets"
ON public.wallets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = wallets.farm_id
    AND farm_users.user_id = auth.uid()
    AND farm_users.role IN ('owner', 'admin')
  )
);

-- Orders policies
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wallets
    WHERE wallets.id = orders.wallet_id
    AND wallets.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = orders.farm_id
    AND farm_users.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create orders from their wallets"
ON public.orders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wallets
    WHERE wallets.id = orders.wallet_id
    AND wallets.owner_id = auth.uid()
  )
);

CREATE POLICY "Farm admins can manage farm orders"
ON public.orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = orders.farm_id
    AND farm_users.user_id = auth.uid()
    AND farm_users.role IN ('owner', 'admin')
  )
);

-- Transactions policies
CREATE POLICY "Users can view their wallet transactions"
ON public.transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wallets
    WHERE wallets.id = transactions.wallet_id
    AND (
      wallets.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = wallets.farm_id
        AND farm_users.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create transactions for their wallets"
ON public.transactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wallets
    WHERE wallets.id = transactions.wallet_id
    AND wallets.owner_id = auth.uid()
  )
);

-- Goals policies
CREATE POLICY "Users can view their goals"
ON public.goals FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = goals.farm_id
    AND farm_users.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own goals"
ON public.goals FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Farm admins can manage farm goals"
ON public.goals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = goals.farm_id
    AND farm_users.user_id = auth.uid()
    AND farm_users.role IN ('owner', 'admin')
  )
);
