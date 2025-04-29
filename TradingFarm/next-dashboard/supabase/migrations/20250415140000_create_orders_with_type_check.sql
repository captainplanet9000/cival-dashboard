-- Create orders table with proper type detection
-- This migration checks the actual type of farm.id and creates orders with compatible type

DO $$
DECLARE
    farms_id_type TEXT;
    agents_id_type TEXT;
    wallets_id_type TEXT;
    strategies_id_type TEXT;
BEGIN
    -- Get the actual data type of farms.id column
    SELECT data_type INTO farms_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'farms'
      AND column_name = 'id';
      
    -- Get the actual data type of agents.id column
    SELECT data_type INTO agents_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agents'
      AND column_name = 'id';
      
    -- Get the actual data type of wallets.id column
    SELECT data_type INTO wallets_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wallets'
      AND column_name = 'id';
      
    -- Get the actual data type of strategies.id column
    SELECT data_type INTO strategies_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'strategies'
      AND column_name = 'id';

    -- Drop existing orders table if it exists (might cause issues if dependencies exist)
    -- DROP TABLE IF EXISTS public.orders;
    
    -- Log information about data types
    RAISE NOTICE 'farms.id type: %', farms_id_type;
    RAISE NOTICE 'agents.id type: %', agents_id_type;
    RAISE NOTICE 'wallets.id type: %', wallets_id_type;
    RAISE NOTICE 'strategies.id type: %', strategies_id_type;
    
    -- Create the orders table dynamically based on detected types
    EXECUTE format('
        CREATE TABLE public.orders (
            id %1$s PRIMARY KEY DEFAULT %2$s,
            farm_id %3$s REFERENCES public.farms(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            wallet_id %4$s REFERENCES public.wallets(id) ON DELETE SET NULL,
            strategy_id %5$s REFERENCES public.strategies(id) ON DELETE SET NULL,
            agent_id %6$s REFERENCES public.agents(id) ON DELETE SET NULL,
            exchange VARCHAR(50) NOT NULL,
            symbol VARCHAR(20) NOT NULL,
            order_type VARCHAR(20) NOT NULL,
            side VARCHAR(4) NOT NULL,
            quantity DECIMAL(20, 8) NOT NULL,
            price DECIMAL(20, 8),
            status VARCHAR(20) DEFAULT ''pending'',
            exchange_order_id VARCHAR(100),
            filled_quantity DECIMAL(20, 8) DEFAULT 0,
            average_fill_price DECIMAL(20, 8),
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            execution_time TIMESTAMPTZ,
            time_in_force VARCHAR(10) DEFAULT ''GTC'',
            stop_loss_price NUMERIC(24, 8),
            execution_strategy VARCHAR(20),
            expiration TIMESTAMPTZ,
            leverage NUMERIC(10, 2),
            is_conditional BOOLEAN DEFAULT false,
            condition_type VARCHAR(20),
            condition_value TEXT,
            metadata JSONB DEFAULT ''{}''::jsonb
        )',
        CASE WHEN farms_id_type = 'uuid' THEN 'UUID' ELSE 'BIGINT' END,
        CASE WHEN farms_id_type = 'uuid' THEN 'uuid_generate_v4()' ELSE 'bigint_generate_series()' END,
        farms_id_type,
        wallets_id_type,
        strategies_id_type,
        agents_id_type
    );

    -- Create indexes for performance
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_farm_id ON public.orders(farm_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_wallet_id ON public.orders(wallet_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_strategy_id ON public.orders(strategy_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON public.orders(agent_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_symbol ON public.orders(symbol)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at)';

    -- Add triggers for created_at and updated_at management
    EXECUTE '
        CREATE TRIGGER handle_orders_created_at
        BEFORE INSERT ON public.orders
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_created_at()
    ';

    EXECUTE '
        CREATE TRIGGER handle_orders_updated_at
        BEFORE UPDATE ON public.orders
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at()
    ';

    -- Enable Row Level Security
    EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';

    -- Create RLS policies
    EXECUTE '
        CREATE POLICY "Users can view their own orders"
        ON public.orders FOR SELECT
        USING (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.wallets
            WHERE wallets.id = orders.wallet_id
            AND wallets.owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.farm_users
            WHERE farm_users.farm_id = orders.farm_id
            AND farm_users.user_id = auth.uid()
          )
        )
    ';

    EXECUTE '
        CREATE POLICY "Users can create orders"
        ON public.orders FOR INSERT
        WITH CHECK (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.wallets
            WHERE wallets.id = orders.wallet_id
            AND wallets.owner_id = auth.uid()
          )
        )
    ';

    EXECUTE '
        CREATE POLICY "Farm admins can manage farm orders"
        ON public.orders FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.farm_users
            WHERE farm_users.farm_id = orders.farm_id
            AND farm_users.user_id = auth.uid()
            AND farm_users.role IN (''owner'', ''admin'')
          )
        )
    ';

    RAISE NOTICE 'Orders table created successfully with appropriate types';
END
$$;

-- Check if the custom type exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('pending', 'filled', 'canceled', 'failed');
        RAISE NOTICE 'order_status type created';
    ELSE
        RAISE NOTICE 'order_status type already exists';
    END IF;
END
$$;

-- Check if the custom type exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
        CREATE TYPE public.order_type AS ENUM ('market', 'limit', 'stop', 'stop_limit');
        RAISE NOTICE 'order_type type created';
    ELSE
        RAISE NOTICE 'order_type type already exists';
    END IF;
END
$$;

-- Check if the custom type exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_side') THEN
        CREATE TYPE public.order_side AS ENUM ('buy', 'sell');
        RAISE NOTICE 'order_side type created';
    ELSE
        RAISE NOTICE 'order_side type already exists';
    END IF;
END
$$;

-- Create the orders table if it doesn't exist, handling potential existing type dependencies
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    agent_id uuid REFERENCES public.agents(id) NOT NULL, -- Link to the agents table
    farm_id uuid REFERENCES public.farms(id), -- Optional: Link to the farms table if applicable
    exchange_order_id TEXT, -- Identifier from the exchange
    client_order_id TEXT UNIQUE, -- Unique identifier generated by the client/system
    symbol TEXT NOT NULL, -- Trading pair, e.g., 'BTC/USD'
    type public.order_type NOT NULL, -- Type of order (market, limit, etc.)
    side public.order_side NOT NULL, -- Side of the order (buy/sell)
    price NUMERIC, -- Price for limit/stop orders
    quantity NUMERIC NOT NULL, -- Quantity of the asset to trade
    filled_quantity NUMERIC DEFAULT 0, -- Quantity that has been filled
    average_fill_price NUMERIC, -- Average price at which the order was filled
    status public.order_status NOT NULL DEFAULT 'pending', -- Current status of the order
    exchange TEXT NOT NULL, -- Name of the exchange, e.g., 'binance', 'kraken'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata JSONB -- For storing additional information specific to the order or exchange
);

-- Handle created_at and updated_at automatically
CREATE OR REPLACE TRIGGER handle_orders_created_at
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE OR REPLACE TRIGGER handle_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON public.orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_farm_id ON public.orders(farm_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON public.orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_exchange ON public.orders(exchange);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
DROP POLICY IF EXISTS "Allow users to view their own orders" ON public.orders;
CREATE POLICY "Allow users to view their own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to insert their own orders" ON public.orders;
CREATE POLICY "Allow users to insert their own orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to update their own orders" ON public.orders;
CREATE POLICY "Allow users to update their own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: Deletion might be restricted or handled differently based on application logic.
-- Consider if a 'canceled' status is preferred over direct deletion.
-- DROP POLICY IF EXISTS "Allow users to delete their own orders" ON public.orders;
-- CREATE POLICY "Allow users to delete their own orders"
-- ON public.orders
-- FOR DELETE
-- USING (auth.uid() = user_id);

RAISE NOTICE 'RLS policies for orders table applied successfully.';
