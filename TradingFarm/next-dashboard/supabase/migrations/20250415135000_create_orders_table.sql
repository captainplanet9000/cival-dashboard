-- DEPRECATED: Use 20250413200000_consolidated_schema.sql for all new environments. This migration is retained for historical reference only.
-- Create the orders table with proper structure
-- This creates a complete orders table with all required columns

-- Check if orders table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'orders'
  ) THEN
    CREATE TABLE public.orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
      exchange VARCHAR(50) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      order_type VARCHAR(20) NOT NULL,
      side VARCHAR(4) NOT NULL,
      quantity DECIMAL(20, 8) NOT NULL,
      price DECIMAL(20, 8),
      status VARCHAR(20) DEFAULT 'pending',
      exchange_order_id VARCHAR(100),
      strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
      agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
      filled_quantity DECIMAL(20, 8) DEFAULT 0,
      average_fill_price DECIMAL(20, 8),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      execution_time TIMESTAMPTZ,
      time_in_force VARCHAR(10) DEFAULT 'GTC',
      metadata JSONB DEFAULT '{}'::jsonb
    );

    -- Create indexes for performance
    CREATE INDEX idx_orders_user_id ON public.orders(user_id);
    CREATE INDEX idx_orders_farm_id ON public.orders(farm_id);
    CREATE INDEX idx_orders_status ON public.orders(status);
    CREATE INDEX idx_orders_symbol ON public.orders(symbol);
    CREATE INDEX idx_orders_created_at ON public.orders(created_at);
    CREATE INDEX idx_orders_strategy_id ON public.orders(strategy_id);
    CREATE INDEX idx_orders_agent_id ON public.orders(agent_id);

    -- Add triggers for created_at and updated_at management
    CREATE TRIGGER set_orders_created_at
      BEFORE INSERT ON public.orders
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_created_at();

    CREATE TRIGGER set_orders_updated_at
      BEFORE UPDATE ON public.orders
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();

    -- Enable Row Level Security
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY orders_user_id_policy ON public.orders
      FOR ALL
      USING (auth.uid() = user_id);

    -- Allow service role to bypass RLS
    CREATE POLICY orders_service_role_policy ON public.orders
      FOR ALL
      TO service_role
      USING (true);

    RAISE NOTICE 'Created orders table with proper structure';
  ELSE
    RAISE NOTICE 'Orders table already exists, skipping creation';
  END IF;
END
$$;
