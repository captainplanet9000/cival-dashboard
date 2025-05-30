-- Final attempt to create orders table with minimal dependencies
-- This creates a standalone orders table that will work regardless of other tables

-- Make sure we have UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
    -- Check if orders table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
    ) THEN
        RAISE NOTICE 'Orders table already exists, skipping creation';
        RETURN;
    END IF;

    -- Create the orders table WITHOUT foreign key constraints
    CREATE TABLE public.orders (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        farm_id BIGINT, -- No constraint initially
        wallet_id BIGINT, -- No constraint initially
        user_id UUID, -- No constraint initially
        strategy_id BIGINT, -- No constraint initially
        agent_id BIGINT, -- No constraint initially
        exchange VARCHAR(50) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        order_type VARCHAR(20) NOT NULL,
        side VARCHAR(4) NOT NULL,
        quantity DECIMAL(20, 8) NOT NULL,
        price DECIMAL(20, 8),
        status VARCHAR(20) DEFAULT 'pending',
        exchange_order_id VARCHAR(100),
        filled_quantity DECIMAL(20, 8) DEFAULT 0,
        average_fill_price DECIMAL(20, 8),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        execution_time TIMESTAMPTZ,
        time_in_force VARCHAR(10) DEFAULT 'GTC',
        stop_loss_price NUMERIC(24, 8),
        execution_strategy VARCHAR(20),
        expiration TIMESTAMPTZ,
        leverage NUMERIC(10, 2),
        is_conditional BOOLEAN DEFAULT false,
        condition_type VARCHAR(20),
        condition_value TEXT,
        metadata JSONB DEFAULT '{}'::jsonb
    );

    -- Create indexes for performance
    CREATE INDEX idx_orders_farm_id ON public.orders(farm_id);
    CREATE INDEX idx_orders_wallet_id ON public.orders(wallet_id);
    CREATE INDEX idx_orders_user_id ON public.orders(user_id);
    CREATE INDEX idx_orders_strategy_id ON public.orders(strategy_id);
    CREATE INDEX idx_orders_agent_id ON public.orders(agent_id);
    CREATE INDEX idx_orders_symbol ON public.orders(symbol);
    CREATE INDEX idx_orders_status ON public.orders(status);
    CREATE INDEX idx_orders_created_at ON public.orders(created_at);

    -- Check if handle_created_at function exists before creating trigger
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_created_at') THEN
        -- Create trigger for created_at
        DROP TRIGGER IF EXISTS handle_orders_created_at ON public.orders;
        CREATE TRIGGER handle_orders_created_at
        BEFORE INSERT ON public.orders
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_created_at();
    END IF;

    -- Check if handle_updated_at function exists before creating trigger
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        -- Create trigger for updated_at
        DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
        CREATE TRIGGER handle_orders_updated_at
        BEFORE UPDATE ON public.orders
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;

    -- Enable RLS
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

    -- Create a simple RLS policy
    CREATE POLICY "Only authenticated users can access orders"
    ON public.orders FOR ALL
    USING (auth.uid() IS NOT NULL);
    
    -- Add service role policy
    CREATE POLICY "Service role can do anything"
    ON public.orders FOR ALL
    TO service_role
    USING (true);

    RAISE NOTICE 'Orders table created successfully';
END
$$;
