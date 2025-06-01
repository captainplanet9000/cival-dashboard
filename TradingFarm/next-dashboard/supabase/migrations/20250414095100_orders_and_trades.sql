-- Migration: Add orders and trades schema
-- This migration adds tables for handling exchange orders and trade execution

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    exchange_connection_id UUID NOT NULL REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES public.elizaos_agents(id) ON DELETE SET NULL,
    exchange_order_id VARCHAR(100),
    symbol VARCHAR(50) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    quantity NUMERIC(24, 8) NOT NULL,
    price NUMERIC(24, 8),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    filled_quantity NUMERIC(24, 8) DEFAULT 0,
    average_fill_price NUMERIC(24, 8),
    commission NUMERIC(24, 8) DEFAULT 0,
    commission_asset VARCHAR(10),
    execution_time_ms INTEGER,
    is_paper_trading BOOLEAN DEFAULT FALSE,
    raw_exchange_data JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_order_side CHECK (side IN ('buy', 'sell')),
    CONSTRAINT chk_order_type CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'oco', 'post_only'))
);

-- Create indexes for orders (with safety checks)
DO $$
BEGIN
    -- Ensure user_id column exists before creating index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
    ELSE
        RAISE NOTICE 'Skipping idx_orders_user_id creation as user_id column does not exist';
        -- Try to add the column if it doesn't exist
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        -- Now try to create the index
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
    END IF;
END$$;

-- Add defensive code for each index column that might be missing

-- For farm_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'farm_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added missing farm_id column to orders table';
    END IF;
    CREATE INDEX IF NOT EXISTS idx_orders_farm_id ON public.orders(farm_id);
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating farm_id index: %', SQLERRM;
END$$;

-- For exchange_connection_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'exchange_connection_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_connection_id UUID REFERENCES public.exchange_connections(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added missing exchange_connection_id column to orders table';
    END IF;
    CREATE INDEX IF NOT EXISTS idx_orders_exchange_connection_id ON public.orders(exchange_connection_id);
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating exchange_connection_id index: %', SQLERRM;
END$$;

-- For strategy_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'strategy_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added missing strategy_id column to orders table';
    END IF;
    CREATE INDEX IF NOT EXISTS idx_orders_strategy_id ON public.orders(strategy_id);
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating strategy_id index: %', SQLERRM;
END$$;

-- For agent_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'agent_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.elizaos_agents(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added missing agent_id column to orders table';
    END IF;
    CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON public.orders(agent_id);
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating agent_id index: %', SQLERRM;
END$$;

-- For symbol
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'symbol'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS symbol VARCHAR(50);
        RAISE NOTICE 'Added missing symbol column to orders table';
    END IF;
    CREATE INDEX IF NOT EXISTS idx_orders_symbol ON public.orders(symbol);
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating symbol index: %', SQLERRM;
END$$;

-- For status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE 'Added missing status column to orders table';
    END IF;
    CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating status index: %', SQLERRM;
END$$;

-- For created_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added missing created_at column to orders table';
    END IF;
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating created_at index: %', SQLERRM;
END$$;

-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    exchange_connection_id UUID NOT NULL REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
    exchange_trade_id VARCHAR(100),
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL,
    quantity NUMERIC(24, 8) NOT NULL,
    price NUMERIC(24, 8) NOT NULL,
    commission NUMERIC(24, 8) DEFAULT 0,
    commission_asset VARCHAR(10),
    realized_pnl NUMERIC(24, 8),
    execution_timestamp TIMESTAMPTZ NOT NULL,
    is_paper_trading BOOLEAN DEFAULT FALSE,
    raw_exchange_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_trade_side CHECK (side IN ('buy', 'sell'))
);

-- Create indexes for trades
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_farm_id ON public.trades(farm_id);
CREATE INDEX IF NOT EXISTS idx_trades_order_id ON public.trades(order_id);
CREATE INDEX IF NOT EXISTS idx_trades_exchange_connection_id ON public.trades(exchange_connection_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_execution_timestamp ON public.trades(execution_timestamp);

-- Add triggers for automatic timestamp handling (with safety checks for orders)
DO $$
BEGIN
    -- Check if the orders created_at trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'handle_orders_created_at'
        AND tgrelid = 'public.orders'::regclass
    ) THEN
        CREATE TRIGGER handle_orders_created_at
        BEFORE INSERT ON public.orders
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        RAISE NOTICE 'Created handle_orders_created_at trigger';
    ELSE
        RAISE NOTICE 'Trigger handle_orders_created_at already exists, skipping';
    END IF;

    -- Check if the orders updated_at trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'handle_orders_updated_at'
        AND tgrelid = 'public.orders'::regclass
    ) THEN
        CREATE TRIGGER handle_orders_updated_at
        BEFORE UPDATE ON public.orders
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        RAISE NOTICE 'Created handle_orders_updated_at trigger';
    ELSE
        RAISE NOTICE 'Trigger handle_orders_updated_at already exists, skipping';
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error in orders trigger creation: %', SQLERRM;
END$$;

-- Separate block for trades triggers with proper exception handling
DO $$
BEGIN
    -- Check if trades table exists
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trades';
    
    -- If we get here, trades table exists, so we can safely add triggers
    -- Check if the trades created_at trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'handle_trades_created_at'
        AND tgrelid = 'public.trades'::regclass
    ) THEN
        CREATE TRIGGER handle_trades_created_at
        BEFORE INSERT ON public.trades
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        RAISE NOTICE 'Created handle_trades_created_at trigger';
    ELSE
        RAISE NOTICE 'Trigger handle_trades_created_at already exists, skipping';
    END IF;

    -- Check if the trades updated_at trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'handle_trades_updated_at'
        AND tgrelid = 'public.trades'::regclass
    ) THEN
        CREATE TRIGGER handle_trades_updated_at
        BEFORE UPDATE ON public.trades
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        RAISE NOTICE 'Created handle_trades_updated_at trigger';
    ELSE
        RAISE NOTICE 'Trigger handle_trades_updated_at already exists, skipping';
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table public.trades does not exist yet, skipping trigger creation';
WHEN others THEN
    RAISE NOTICE 'Error in trades trigger creation: %', SQLERRM;
END$$;

-- Enable RLS (safely)
DO $$
BEGIN
    EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'Enabled RLS on orders table';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error enabling RLS on orders: %', SQLERRM;
END$$;

DO $$
BEGIN
    EXECUTE 'ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'Enabled RLS on trades table';
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table trades does not exist yet, skipping RLS';
WHEN others THEN
    RAISE NOTICE 'Error enabling RLS on trades: %', SQLERRM;
END$$;

-- Create RLS policies for orders with safety checks
DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Users can view their own orders'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can view their own orders"
        ON public.orders FOR SELECT
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = orders.farm_id
                AND farm_users.user_id = auth.uid()
            )
        )';
        RAISE NOTICE 'Created "Users can view their own orders" policy';
    ELSE
        RAISE NOTICE 'Policy "Users can view their own orders" already exists, skipping';
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating view orders policy: %', SQLERRM;
END$$;

DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Users can create their own orders'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can create their own orders"
        ON public.orders FOR INSERT
        WITH CHECK (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = orders.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN (''owner'', ''admin'', ''trader'')
            )
        )';
        RAISE NOTICE 'Created "Users can create their own orders" policy';
    ELSE
        RAISE NOTICE 'Policy "Users can create their own orders" already exists, skipping';
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating insert orders policy: %', SQLERRM;
END$$;

DO $$
BEGIN
    -- Check if the policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Users can update their own orders'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update their own orders"
        ON public.orders FOR UPDATE
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = orders.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN (''owner'', ''admin'', ''trader'')
            )
        )';
        RAISE NOTICE 'Created "Users can update their own orders" policy';
    ELSE
        RAISE NOTICE 'Policy "Users can update their own orders" already exists, skipping';
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating update orders policy: %', SQLERRM;
END$$;

-- Create RLS policies for trades with safety checks
DO $$
BEGIN
    -- First check if trades table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trades') THEN
        -- Check if the policy already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'trades' 
            AND policyname = 'Users can view their own trades'
        ) THEN
            EXECUTE 'CREATE POLICY "Users can view their own trades"
            ON public.trades FOR SELECT
            USING (
                auth.uid() = user_id
                OR EXISTS (
                    SELECT 1 FROM public.farm_users
                    WHERE farm_users.farm_id = trades.farm_id
                    AND farm_users.user_id = auth.uid()
                )
            )';
            RAISE NOTICE 'Created "Users can view their own trades" policy';
        ELSE
            RAISE NOTICE 'Policy "Users can view their own trades" already exists, skipping';
        END IF;
    ELSE
        RAISE NOTICE 'Table trades does not exist yet, skipping view policy';
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating view trades policy: %', SQLERRM;
END$$;

DO $$
BEGIN
    -- First check if trades table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trades') THEN
        -- Check if the policy already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'trades' 
            AND policyname = 'Users can create trade records'
        ) THEN
            EXECUTE 'CREATE POLICY "Users can create trade records"
            ON public.trades FOR INSERT
            WITH CHECK (
                auth.uid() = user_id
                OR EXISTS (
                    SELECT 1 FROM public.farm_users
                    WHERE farm_users.farm_id = trades.farm_id
                    AND farm_users.user_id = auth.uid()
                    AND farm_users.role IN (''owner'', ''admin'', ''trader'')
                )
            )';
            RAISE NOTICE 'Created "Users can create trade records" policy';
        ELSE
            RAISE NOTICE 'Policy "Users can create trade records" already exists, skipping';
        END IF;
    ELSE
        RAISE NOTICE 'Table trades does not exist yet, skipping insert policy';
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating insert trades policy: %', SQLERRM;
END$$;

-- Function to calculate order fill status and update related data
CREATE OR REPLACE FUNCTION public.update_order_fill_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_filled NUMERIC(24, 8) := 0;
    v_weighted_price NUMERIC(24, 8) := 0;
    v_new_status VARCHAR(20) := 'pending';
BEGIN
    -- Calculate total filled quantity and weighted average price
    SELECT 
        COALESCE(SUM(quantity), 0),
        CASE 
            WHEN COALESCE(SUM(quantity), 0) > 0 
            THEN COALESCE(SUM(quantity * price) / SUM(quantity), 0)
            ELSE 0
        END
    INTO v_total_filled, v_weighted_price
    FROM public.trades
    WHERE order_id = NEW.order_id;
    
    -- Update the parent order
    IF v_total_filled > 0 THEN
        -- Determine new status
        IF v_total_filled >= (SELECT quantity FROM public.orders WHERE id = NEW.order_id) THEN
            v_new_status := 'filled';
        ELSE
            v_new_status := 'partially_filled';
        END IF;
        
        -- Update order
        UPDATE public.orders
        SET 
            filled_quantity = v_total_filled,
            average_fill_price = v_weighted_price,
            status = v_new_status,
            updated_at = NOW()
        WHERE id = NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = '';

-- Create trigger to update order status when trades are added
CREATE TRIGGER update_order_on_trade
AFTER INSERT OR UPDATE ON public.trades
FOR EACH ROW
WHEN (NEW.order_id IS NOT NULL)
EXECUTE FUNCTION public.update_order_fill_status();
