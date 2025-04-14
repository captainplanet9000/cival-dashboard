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

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_farm_id ON public.orders(farm_id);
CREATE INDEX IF NOT EXISTS idx_orders_exchange_connection_id ON public.orders(exchange_connection_id);
CREATE INDEX IF NOT EXISTS idx_orders_strategy_id ON public.orders(strategy_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON public.orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON public.orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

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

-- Add triggers for automatic timestamp handling
CREATE TRIGGER handle_orders_created_at
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_trades_created_at
BEFORE INSERT ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = orders.farm_id
        AND farm_users.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create their own orders"
ON public.orders FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = orders.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin', 'trader')
    )
);

CREATE POLICY "Users can update their own orders"
ON public.orders FOR UPDATE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = orders.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin', 'trader')
    )
);

-- Create RLS policies for trades
CREATE POLICY "Users can view their own trades"
ON public.trades FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = trades.farm_id
        AND farm_users.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create trade records"
ON public.trades FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = trades.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin', 'trader')
    )
);

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
