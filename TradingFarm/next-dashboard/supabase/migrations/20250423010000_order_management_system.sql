-- Migration for Order Management System
-- This migration adds support for live trading order management

-- Create orders table for tracking all trading orders
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_credential_id BIGINT NOT NULL REFERENCES public.exchange_credentials(id) ON DELETE CASCADE,
  agent_id BIGINT REFERENCES public.agents(id) ON DELETE SET NULL,
  order_id TEXT NOT NULL, -- Exchange order ID
  client_order_id TEXT, -- Custom client order ID if provided
  symbol TEXT NOT NULL,
  order_type TEXT NOT NULL, -- 'market', 'limit', 'stop_limit', 'stop_market', etc.
  side TEXT NOT NULL, -- 'buy' or 'sell'
  quantity FLOAT NOT NULL,
  price FLOAT, -- Price for limit orders
  executed_quantity FLOAT DEFAULT 0, -- Quantity that has been filled
  executed_price FLOAT, -- Average execution price
  status TEXT NOT NULL, -- 'new', 'partially_filled', 'filled', 'canceled', 'rejected', 'expired'
  time_in_force TEXT DEFAULT 'GTC', -- 'GTC' (Good Till Canceled), 'IOC' (Immediate or Cancel), 'FOK' (Fill or Kill)
  stop_price FLOAT, -- For stop orders
  is_post_only BOOLEAN DEFAULT false,
  is_reduce_only BOOLEAN DEFAULT false,
  is_close_position BOOLEAN DEFAULT false,
  error_message TEXT, -- Error message if rejected
  filled_at TIMESTAMPTZ, -- Time when fully filled
  cancelled_at TIMESTAMPTZ, -- Time when cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB, -- Additional order metadata
  
  -- Add a unique constraint on exchange and order_id
  UNIQUE(exchange_credential_id, order_id)
);

-- Create order_updates table for tracking order status changes
CREATE TABLE IF NOT EXISTS public.order_updates (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  executed_quantity FLOAT,
  executed_price FLOAT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  update_type TEXT, -- 'status_change', 'fill', 'partial_fill', 'cancellation', etc.
  fee_amount FLOAT, -- Fee amount if applicable
  fee_currency TEXT, -- Fee currency if applicable
  raw_data JSONB -- Raw update data from exchange
);

-- Create execution_strategies table
CREATE TABLE IF NOT EXISTS public.execution_strategies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  strategy_type TEXT NOT NULL, -- 'twap', 'vwap', 'iceberg', 'smart', etc.
  parameters JSONB NOT NULL, -- Strategy-specific parameters
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add a unique constraint on user_id and name
  UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_strategies ENABLE ROW LEVEL SECURITY;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS handle_execution_strategies_updated_at ON public.execution_strategies;
DROP TRIGGER IF EXISTS on_order_update_trigger ON public.orders;

-- Create triggers for updated_at timestamp
CREATE TRIGGER handle_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_execution_strategies_updated_at
BEFORE UPDATE ON public.execution_strategies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create a function to handle order status updates
CREATE OR REPLACE FUNCTION public.log_order_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the order update
  IF OLD.status != NEW.status OR OLD.executed_quantity != NEW.executed_quantity THEN
    INSERT INTO public.order_updates (
      order_id, 
      status, 
      executed_quantity, 
      executed_price,
      update_type
    ) VALUES (
      NEW.id, 
      NEW.status, 
      NEW.executed_quantity, 
      NEW.executed_price,
      CASE 
        WHEN OLD.status != NEW.status THEN 'status_change'
        WHEN NEW.executed_quantity > OLD.executed_quantity AND NEW.executed_quantity = NEW.quantity THEN 'fill'
        WHEN NEW.executed_quantity > OLD.executed_quantity THEN 'partial_fill'
        ELSE 'other'
      END
    );
  END IF;
  
  -- Set filled_at timestamp when order is completely filled
  IF NEW.status = 'filled' AND OLD.status != 'filled' THEN
    NEW.filled_at := now();
  END IF;
  
  -- Set cancelled_at timestamp when order is cancelled
  IF NEW.status = 'canceled' AND OLD.status != 'canceled' THEN
    NEW.cancelled_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Register the order update trigger
CREATE TRIGGER on_order_update_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_update();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;

DROP POLICY IF EXISTS "Users can view updates to their own orders" ON public.order_updates;
DROP POLICY IF EXISTS "Service role can insert order updates" ON public.order_updates;

DROP POLICY IF EXISTS "Users can view their own execution strategies" ON public.execution_strategies;
DROP POLICY IF EXISTS "Users can insert their own execution strategies" ON public.execution_strategies;
DROP POLICY IF EXISTS "Users can update their own execution strategies" ON public.execution_strategies;
DROP POLICY IF EXISTS "Users can delete their own execution strategies" ON public.execution_strategies;

-- Create RLS policies for orders
CREATE POLICY "Users can view their own orders"
  ON public.orders
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own orders"
  ON public.orders
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own orders"
  ON public.orders
  FOR DELETE
  USING (user_id = auth.uid());

-- Create RLS policies for order_updates
CREATE POLICY "Users can view updates to their own orders"
  ON public.order_updates
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND o.user_id = auth.uid()
  ));

-- Order updates are inserted by the system/triggers, so we don't need INSERT policies
-- But we need a service role policy for external updates

-- Create RLS policies for execution_strategies
CREATE POLICY "Users can view their own execution strategies"
  ON public.execution_strategies
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own execution strategies"
  ON public.execution_strategies
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own execution strategies"
  ON public.execution_strategies
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own execution strategies"
  ON public.execution_strategies
  FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for faster lookups on commonly queried columns
DO $$
BEGIN
  -- Check if orders table exists before creating indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    -- Create index for user_id column
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'orders' 
              AND column_name = 'user_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_user_id') THEN
        CREATE INDEX idx_orders_user_id ON public.orders(user_id);
      END IF;
    END IF;
    
    -- Create index for symbol column
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'orders' 
              AND column_name = 'symbol') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_symbol') THEN
        CREATE INDEX idx_orders_symbol ON public.orders(symbol);
      END IF;
    END IF;
    
    -- Create index for status column
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'orders' 
              AND column_name = 'status') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_status') THEN
        CREATE INDEX idx_orders_status ON public.orders(status);
      END IF;
    END IF;
    
    -- Create index for agent_id column
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'orders' 
              AND column_name = 'agent_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_agent_id') THEN
        CREATE INDEX idx_orders_agent_id ON public.orders(agent_id);
      END IF;
    END IF;
    
    -- Create composite index for user_id and status
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'orders' 
              AND column_name = 'user_id') AND
       EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'orders' 
              AND column_name = 'status') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_user_id_status') THEN
        CREATE INDEX idx_orders_user_id_status ON public.orders(user_id, status);
      END IF;
    END IF;
  END IF;
  
  -- Create indexes for order_updates table
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_updates') THEN
    -- Create index for order_id column
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'order_updates' 
              AND column_name = 'order_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_updates_order_id') THEN
        CREATE INDEX idx_order_updates_order_id ON public.order_updates(order_id);
      END IF;
    END IF;
    
    -- Create index for timestamp column
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'order_updates' 
              AND column_name = 'timestamp') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_updates_timestamp') THEN
        CREATE INDEX idx_order_updates_timestamp ON public.order_updates(timestamp);
      END IF;
    END IF;
  END IF;
  
  -- Create indexes for execution_strategies table
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'execution_strategies') THEN
    -- Create index for user_id column
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'execution_strategies' 
              AND column_name = 'user_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_execution_strategies_user_id') THEN
        CREATE INDEX idx_execution_strategies_user_id ON public.execution_strategies(user_id);
      END IF;
    END IF;
    
    -- Create index for strategy_type column
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'execution_strategies' 
              AND column_name = 'strategy_type') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_execution_strategies_strategy_type') THEN
        CREATE INDEX idx_execution_strategies_strategy_type ON public.execution_strategies(strategy_type);
      END IF;
    END IF;
  END IF;
END
$$;
