-- DEPRECATED: Use 20250413200000_consolidated_schema.sql for all new environments. This migration is retained for historical reference only.
-- Simple orders table creation with fallback to BIGINT for all ID types
-- This avoids complex dynamic SQL and ensures consistent type usage

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
        RAISE NOTICE 'Orders table already exists, dropping it first';
        DROP TABLE IF EXISTS public.orders;
    END IF;

    -- Create the orders table with BIGINT for all IDs based on the error
    CREATE TABLE public.orders (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        farm_id BIGINT REFERENCES public.farms(id) ON DELETE SET NULL,
        wallet_id BIGINT REFERENCES public.wallets(id) ON DELETE SET NULL,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        strategy_id BIGINT REFERENCES public.strategies(id) ON DELETE SET NULL,
        agent_id BIGINT REFERENCES public.agents(id) ON DELETE SET NULL,
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

    -- Create triggers for timestamps
    DROP TRIGGER IF EXISTS handle_orders_created_at ON public.orders;
    CREATE TRIGGER handle_orders_created_at
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();

    DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
    CREATE TRIGGER handle_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

    -- Enable RLS
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
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
    );

    CREATE POLICY "Users can create orders"
    ON public.orders FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      OR EXISTS (
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

    RAISE NOTICE 'Orders table created successfully';
END
$$;
