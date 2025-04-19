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

    -- Drop the table if it exists
    DROP TABLE IF EXISTS public.orders;
    
    -- Log information about data types
    RAISE NOTICE 'farms.id type: %', farms_id_type;
    RAISE NOTICE 'agents.id type: %', agents_id_type;
    RAISE NOTICE 'wallets.id type: %', wallets_id_type;
    RAISE NOTICE 'strategies.id type: %', strategies_id_type;
    
    -- Create dynamic SQL for creating the orders table with correct types
    EXECUTE format('
        CREATE TABLE public.orders (
            id %1$s PRIMARY KEY DEFAULT %2$s,
            farm_id %3$s REFERENCES public.farms(id) ON DELETE SET NULL,
            wallet_id %4$s REFERENCES public.wallets(id) ON DELETE SET NULL,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
    EXECUTE 'CREATE INDEX idx_orders_farm_id ON public.orders(farm_id)';
    EXECUTE 'CREATE INDEX idx_orders_wallet_id ON public.orders(wallet_id)';
    EXECUTE 'CREATE INDEX idx_orders_user_id ON public.orders(user_id)';
    EXECUTE 'CREATE INDEX idx_orders_strategy_id ON public.orders(strategy_id)';
    EXECUTE 'CREATE INDEX idx_orders_agent_id ON public.orders(agent_id)';
    EXECUTE 'CREATE INDEX idx_orders_symbol ON public.orders(symbol)';
    EXECUTE 'CREATE INDEX idx_orders_status ON public.orders(status)';
    EXECUTE 'CREATE INDEX idx_orders_created_at ON public.orders(created_at)';

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
