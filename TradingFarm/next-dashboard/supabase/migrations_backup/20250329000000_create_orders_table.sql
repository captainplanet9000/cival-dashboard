-- Migration to create the base orders table
-- This table is required for 20250330_advanced_orders.sql to function correctly

CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "farm_id" UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    "agent_id" UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    "strategy_id" UUID,
    "exchange" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    "order_type" TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
    "price" NUMERIC,
    "stop_price" NUMERIC,
    "quantity" NUMERIC NOT NULL,
    "time_in_force" TEXT CHECK (time_in_force IN ('gtc', 'ioc', 'fok', 'day')),
    "status" TEXT DEFAULT 'new' CHECK (status IN ('new', 'partially_filled', 'filled', 'canceled', 'rejected', 'expired')),
    "order_id" TEXT,
    "client_order_id" TEXT,
    "filled_quantity" NUMERIC DEFAULT 0,
    "average_price" NUMERIC,
    "fees" NUMERIC DEFAULT 0,
    "fee_asset" TEXT,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "executed_at" TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_farm_id ON public.orders(farm_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON public.orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Create timestamps trigger for orders
CREATE TRIGGER handle_orders_created_at
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for orders
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
