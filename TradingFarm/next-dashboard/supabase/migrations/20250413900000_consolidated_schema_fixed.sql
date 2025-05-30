-- Fixed consolidated schema migration
-- This file combines the essential tables and relationships in the correct order
-- NOTE: Definitions for 'public.orders' have been removed/commented out to avoid conflicts
-- with 20250415140000_create_orders_with_type_check.sql

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper functions for timestamps (assuming they exist in your Supabase project or are created elsewhere)
-- If not, you might need to create them, e.g.:
-- CREATE OR REPLACE FUNCTION public.handle_created_at()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.created_at = now();
--   RETURN NEW;
-- END;
-- $$ language 'plpgsql';
--
-- CREATE OR REPLACE FUNCTION public.handle_updated_at()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = now();
--   RETURN NEW;
-- END;
-- $$ language 'plpgsql';


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
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- e.g., 'owner', 'admin', 'member'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (farm_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_farm_users_user_id ON public.farm_users(user_id);

-- Create agents table with farm_id reference
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Denormalized for easier RLS, ensure consistency
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE, -- Can be NULL if agent is personal? Or always belong to a farm? Assuming NOT NULL based on later RLS. Make NULLABLE if needed.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    agent_type VARCHAR(50), -- e.g., 'trading', 'monitoring'
    configuration JSONB,
    status VARCHAR(20) DEFAULT 'idle', -- e.g., 'running', 'stopped', 'error'
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
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE, -- Strategy belongs to a farm
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Creator/Owner of the strategy
    is_active BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false, -- Can be used as a template for new strategies
    configuration JSONB, -- Strategy parameters
    performance_metrics JSONB, -- Store performance data
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_strategies_farm_id ON public.strategies(farm_id);
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON public.strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_is_template ON public.strategies(is_template);

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE, -- Wallet belongs to a farm
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- User who owns/manages the wallet
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL, -- Blockchain address or Exchange API key identifier
    network VARCHAR(50) NOT NULL, -- e.g., 'Ethereum', 'Binance Smart Chain', 'Binance'
    exchange VARCHAR(100), -- If it's an exchange wallet
    balance NUMERIC(20, 8) DEFAULT 0, -- Current balance (might be updated externally)
    currency VARCHAR(20) NOT NULL, -- e.g., 'USDT', 'BTC'
    last_updated TIMESTAMPTZ DEFAULT NOW(), -- When the balance was last updated
    status VARCHAR(20) DEFAULT 'active', -- e.g., 'active', 'inactive', 'syncing'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallets_farm_id ON public.wallets(farm_id);
CREATE INDEX IF NOT EXISTS idx_wallets_owner_id ON public.wallets(owner_id);

-- Create orders table -- REMOVED TO AVOID CONFLICT WITH LATER MIGRATION
-- CREATE TABLE IF NOT EXISTS public.orders (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
--     wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
--     strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
--     exchange VARCHAR(50),
--     symbol VARCHAR(50) NOT NULL,
--     side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
--     order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop')),
--     quantity NUMERIC(24, 8) NOT NULL,
--     price NUMERIC(24, 8),
--     status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'filled', 'partially_filled', 'canceled', 'rejected', 'expired')),
--     external_id VARCHAR(255),
--     created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
--     updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
--     executed_at TIMESTAMPTZ,
--     -- Advanced order parameters
--     trail_value NUMERIC,
--     trail_type VARCHAR(10) CHECK (trail_type IN ('amount', 'percentage')),
--     time_in_force VARCHAR(10) CHECK (time_in_force IN ('gtc', 'ioc', 'fok', 'day')),
--     trigger_price NUMERIC(24, 8),
--     take_profit_price NUMERIC(24, 8),
--     stop_loss_price NUMERIC(24, 8),
--     execution_strategy VARCHAR(20),
--     expiration TIMESTAMPTZ,
--     leverage NUMERIC(10, 2),
--     is_conditional BOOLEAN DEFAULT false,
--     condition_type VARCHAR(20),
--     condition_value TEXT,
--     metadata JSONB
-- );

-- CREATE INDEX IF NOT EXISTS idx_orders_farm_id ON public.orders(farm_id);
-- CREATE INDEX IF NOT EXISTS idx_orders_wallet_id ON public.orders(wallet_id);
-- CREATE INDEX IF NOT EXISTS idx_orders_strategy_id ON public.orders(strategy_id);
-- CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE, -- Transaction belongs to a wallet
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL, -- Associate with farm for easier querying, set null if farm deleted
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'trade_profit', 'trade_loss')),
    amount NUMERIC(20, 8) NOT NULL,
    currency VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
    tx_hash VARCHAR(255), -- Blockchain transaction hash or exchange transaction ID
    description TEXT,
    external_reference VARCHAR(255), -- Any external reference ID
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farm_id ON public.transactions(farm_id); -- Index added for farm_id

-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE, -- Goal belongs to a farm
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- User who set the goal
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL, -- e.g., 'profit', 'volume', 'risk_limit'
    target_value NUMERIC(24, 8),
    current_value NUMERIC(24, 8) DEFAULT 0,
    progress_percentage DECIMAL(5, 2) DEFAULT 0, -- Calculated or updated periodically
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

-- Add triggers for all tables (assuming handle_created_at and handle_updated_at functions exist)
-- Farms triggers
DROP TRIGGER IF EXISTS handle_farms_created_at ON public.farms;
-- CREATE TRIGGER handle_farms_created_at
-- BEFORE INSERT ON public.farms
-- FOR EACH ROW EXECUTE FUNCTION public.handle_created_at(); -- Use DEFAULT now() instead

DROP TRIGGER IF EXISTS handle_farms_updated_at ON public.farms;
CREATE TRIGGER handle_farms_updated_at
BEFORE UPDATE ON public.farms
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Farm users triggers
DROP TRIGGER IF EXISTS handle_farm_users_created_at ON public.farm_users;
-- CREATE TRIGGER handle_farm_users_created_at
-- BEFORE INSERT ON public.farm_users
-- FOR EACH ROW EXECUTE FUNCTION public.handle_created_at(); -- Use DEFAULT now() instead

DROP TRIGGER IF EXISTS handle_farm_users_updated_at ON public.farm_users;
CREATE TRIGGER handle_farm_users_updated_at
BEFORE UPDATE ON public.farm_users
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Agents triggers
DROP TRIGGER IF EXISTS handle_agents_created_at ON public.agents;
-- CREATE TRIGGER handle_agents_created_at
-- BEFORE INSERT ON public.agents
-- FOR EACH ROW EXECUTE FUNCTION public.handle_created_at(); -- Use DEFAULT now() instead

DROP TRIGGER IF EXISTS handle_agents_updated_at ON public.agents;
CREATE TRIGGER handle_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Strategies triggers
DROP TRIGGER IF EXISTS handle_strategies_created_at ON public.strategies;
-- CREATE TRIGGER handle_strategies_created_at
-- BEFORE INSERT ON public.strategies
-- FOR EACH ROW EXECUTE FUNCTION public.handle_created_at(); -- Use DEFAULT now() instead

DROP TRIGGER IF EXISTS handle_strategies_updated_at ON public.strategies;
CREATE TRIGGER handle_strategies_updated_at
BEFORE UPDATE ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Wallets triggers
DROP TRIGGER IF EXISTS handle_wallets_created_at ON public.wallets;
-- CREATE TRIGGER handle_wallets_created_at
-- BEFORE INSERT ON public.wallets
-- FOR EACH ROW EXECUTE FUNCTION public.handle_created_at(); -- Use DEFAULT now() instead

DROP TRIGGER IF EXISTS handle_wallets_updated_at ON public.wallets;
CREATE TRIGGER handle_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Orders triggers -- REMOVED TO AVOID CONFLICT
-- DROP TRIGGER IF EXISTS handle_orders_created_at ON public.orders;
-- CREATE TRIGGER handle_orders_created_at
-- BEFORE INSERT ON public.orders
-- FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

-- DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
-- CREATE TRIGGER handle_orders_updated_at
-- BEFORE UPDATE ON public.orders
-- FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Transactions triggers
DROP TRIGGER IF EXISTS handle_transactions_created_at ON public.transactions;
-- CREATE TRIGGER handle_transactions_created_at
-- BEFORE INSERT ON public.transactions
-- FOR EACH ROW EXECUTE FUNCTION public.handle_created_at(); -- Use DEFAULT now() instead

DROP TRIGGER IF EXISTS handle_transactions_updated_at ON public.transactions;
CREATE TRIGGER handle_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Goals triggers
DROP TRIGGER IF EXISTS handle_goals_created_at ON public.goals;
-- CREATE TRIGGER handle_goals_created_at
-- BEFORE INSERT ON public.goals
-- FOR EACH ROW EXECUTE FUNCTION public.handle_created_at(); -- Use DEFAULT now() instead

DROP TRIGGER IF EXISTS handle_goals_updated_at ON public.goals;
CREATE TRIGGER handle_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add Row Level Security (RLS) Policies for all tables

-- Enable Row Level Security on all tables (excluding orders)
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY; -- REMOVED
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Farms RLS
DROP POLICY IF EXISTS "Users can view their own farms" ON public.farms;
CREATE POLICY "Users can view their own farms"
ON public.farms FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own farms" ON public.farms;
CREATE POLICY "Users can create their own farms"
ON public.farms FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own farms" ON public.farms;
CREATE POLICY "Users can update their own farms"
ON public.farms FOR UPDATE USING (auth.uid() = user_id); -- Add WITH CHECK if needed

DROP POLICY IF EXISTS "Users can delete their own farms" ON public.farms;
CREATE POLICY "Users can delete their own farms"
ON public.farms FOR DELETE USING (auth.uid() = user_id);

-- Farm users RLS
DROP POLICY IF EXISTS "Farm members can view farm users" ON public.farm_users;
CREATE POLICY "Farm members can view farm users"
ON public.farm_users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = farm_users.farm_id AND fu.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Farm owners/admins can manage farm users" ON public.farm_users;
CREATE POLICY "Farm owners/admins can manage farm users"
ON public.farm_users FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.farm_users fu -- Check user's role in the specific farm
    WHERE fu.farm_id = farm_users.farm_id
      AND fu.user_id = auth.uid()
      AND fu.role IN ('owner', 'admin')
  )
); -- Consider separate policies for INSERT/UPDATE/DELETE if logic differs

-- Agents RLS
DROP POLICY IF EXISTS "Users can view agents in their farms" ON public.agents;
CREATE POLICY "Users can view agents in their farms"
ON public.agents FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = agents.farm_id AND fu.user_id = auth.uid()
  )
  -- OR auth.uid() = agents.user_id -- Uncomment if agents can be personal (not tied to farm)
);

DROP POLICY IF EXISTS "Farm owners/admins can manage agents in their farm" ON public.agents;
CREATE POLICY "Farm owners/admins can manage agents in their farm"
ON public.agents FOR ALL USING ( -- Check user's role in the agent's farm
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = agents.farm_id
      AND fu.user_id = auth.uid()
      AND fu.role IN ('owner', 'admin')
  )
); -- Add WITH CHECK matching USING clause for INSERT/UPDATE


-- Strategies RLS
DROP POLICY IF EXISTS "Users can view strategies in their farms or templates" ON public.strategies;
CREATE POLICY "Users can view strategies in their farms or templates"
ON public.strategies FOR SELECT USING (
  is_template = true OR
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = strategies.farm_id AND fu.user_id = auth.uid()
  )
  -- OR auth.uid() = strategies.user_id -- Uncomment if strategies can be personal
);

DROP POLICY IF EXISTS "Farm owners/admins can manage strategies in their farm" ON public.strategies;
CREATE POLICY "Farm owners/admins can manage strategies in their farm"
ON public.strategies FOR ALL USING ( -- Check user's role in the strategy's farm
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = strategies.farm_id
      AND fu.user_id = auth.uid()
      AND fu.role IN ('owner', 'admin')
  )
); -- Add WITH CHECK matching USING clause for INSERT/UPDATE

DROP POLICY IF EXISTS "Users can create strategies for their farms" ON public.strategies;
CREATE POLICY "Users can create strategies for their farms"
ON public.strategies FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = strategies.farm_id AND fu.user_id = auth.uid() AND fu.role IN ('owner', 'admin', 'member') -- Adjust roles as needed
  )
  AND (user_id IS NULL OR user_id = auth.uid()) -- Ensure user sets user_id correctly if not NULL
);

-- Wallets RLS
DROP POLICY IF EXISTS "Users can view wallets in their farms" ON public.wallets;
CREATE POLICY "Users can view wallets in their farms"
ON public.wallets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = wallets.farm_id AND fu.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Farm owners/admins can manage wallets in their farm" ON public.wallets;
CREATE POLICY "Farm owners/admins can manage wallets in their farm"
ON public.wallets FOR ALL USING ( -- Check user's role in the wallet's farm
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = wallets.farm_id
      AND fu.user_id = auth.uid()
      AND fu.role IN ('owner', 'admin')
  )
); -- Add WITH CHECK matching USING clause for INSERT/UPDATE

DROP POLICY IF EXISTS "Wallet owners can create wallets" ON public.wallets;
CREATE POLICY "Wallet owners can create wallets" -- Simplistic, assumes owner_id is set to creator
ON public.wallets FOR INSERT WITH CHECK (owner_id = auth.uid());


-- Orders RLS -- REMOVED TO AVOID CONFLICT
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
-- CREATE POLICY "Users can view their own orders"
-- ON public.orders FOR SELECT
-- USING (
--   EXISTS ( -- Check via wallet ownership
--     SELECT 1 FROM public.wallets w
--     WHERE w.id = orders.wallet_id AND w.owner_id = auth.uid()
--   ) OR EXISTS ( -- Check via farm membership
--     SELECT 1 FROM public.farm_users fu
--     WHERE fu.farm_id = orders.farm_id AND fu.user_id = auth.uid()
--   )
-- );

-- DROP POLICY IF EXISTS "Users can create orders from their wallets" ON public.orders;
-- CREATE POLICY "Users can create orders from their wallets"
-- ON public.orders FOR INSERT
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM public.wallets w
--     WHERE w.id = orders.wallet_id AND w.owner_id = auth.uid()
--   )
-- );

-- DROP POLICY IF EXISTS "Farm admins can manage farm orders" ON public.orders;
-- CREATE POLICY "Farm admins can manage farm orders"
-- ON public.orders FOR ALL -- Covers SELECT, INSERT, UPDATE, DELETE
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.farm_users fu
--     WHERE fu.farm_id = orders.farm_id
--     AND fu.user_id = auth.uid()
--     AND fu.role IN ('owner', 'admin')
--   )
-- ); -- Add WITH CHECK if INSERT/UPDATE rules differ significantly


-- Transactions RLS -- CORRECTED POLICY
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage transactions for their wallets" ON public.transactions;
CREATE POLICY "Users can manage transactions for their wallets"
ON public.transactions FOR ALL -- Use FOR ALL or specify SELECT, INSERT, UPDATE, DELETE as needed
USING (
  EXISTS (
    SELECT 1 FROM public.wallets w
    JOIN public.farm_users fu ON w.farm_id = fu.farm_id
    WHERE w.id = transactions.wallet_id
    AND fu.user_id = auth.uid() -- Check if user is member of the wallet's farm
     -- Add role check if needed: AND fu.role IN ('owner', 'admin', 'member')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wallets w
    JOIN public.farm_users fu ON w.farm_id = fu.farm_id
    WHERE w.id = transactions.wallet_id
    AND fu.user_id = auth.uid() -- Check if user is member of the wallet's farm
    -- Add role check if needed: AND fu.role IN ('owner', 'admin', 'member')
  )
);


-- Goals RLS
DROP POLICY IF EXISTS "Users can view goals in their farms" ON public.goals;
CREATE POLICY "Users can view goals in their farms"
ON public.goals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = goals.farm_id AND fu.user_id = auth.uid()
  )
  OR auth.uid() = goals.user_id -- Allow viewing personal goals if user_id is set
);

DROP POLICY IF EXISTS "Users can manage goals they own or are farm admin for" ON public.goals;
CREATE POLICY "Users can manage goals they own or are farm admin for"
ON public.goals FOR ALL USING (
  auth.uid() = goals.user_id OR -- User owns the goal directly
  EXISTS ( -- User is owner/admin of the goal's farm
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = goals.farm_id
      AND fu.user_id = auth.uid()
      AND fu.role IN ('owner', 'admin')
  )
); -- Add WITH CHECK matching USING for INSERT/UPDATE

DROP POLICY IF EXISTS "Users can create goals for their farms" ON public.goals;
CREATE POLICY "Users can create goals for their farms"
ON public.goals FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.farm_users fu
    WHERE fu.farm_id = goals.farm_id AND fu.user_id = auth.uid() -- Must be member of the farm
  )
  AND (user_id IS NULL OR user_id = auth.uid()) -- Ensure user_id is set correctly if present
);


RAISE NOTICE 'Consolidated schema fixed migration applied successfully (Orders definitions removed).';
