-- Create trade_status enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.trade_status AS ENUM (
        'pending',
        'open',
        'filled',
        'partially_filled',
        'cancelled',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create order_type enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.order_type AS ENUM (
        'market',
        'limit',
        'stop_loss',
        'take_profit',
        'stop_loss_limit',
        'take_profit_limit'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create order_side enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.order_side AS ENUM (
        'buy',
        'sell'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the trade_executions table
CREATE TABLE public.trade_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE, -- Assuming agents execute trades and link directly
    strategy_version_id uuid NULL REFERENCES public.strategy_versions(id) ON DELETE SET NULL, -- Link to specific strategy version if applicable
    exchange text NOT NULL,
    symbol text NOT NULL,
    exchange_order_id text NULL,
    client_order_id text NULL,
    side public.order_side NOT NULL,
    order_type public.order_type NOT NULL,
    status public.trade_status NOT NULL,
    quantity_requested numeric NOT NULL,
    quantity_executed numeric DEFAULT 0.0,
    price numeric NULL, -- Limit price for limit orders
    average_fill_price numeric NULL,
    commission numeric NULL,
    commission_asset text NULL,
    execution_timestamp timestamptz NULL, -- Timestamp of actual execution/fill
    error_message text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_trade_executions_farm_id ON public.trade_executions(farm_id);
CREATE INDEX idx_trade_executions_agent_id ON public.trade_executions(agent_id);
CREATE INDEX idx_trade_executions_strategy_version_id ON public.trade_executions(strategy_version_id);
CREATE INDEX idx_trade_executions_exchange_symbol ON public.trade_executions(exchange, symbol);
CREATE INDEX idx_trade_executions_status ON public.trade_executions(status);
CREATE INDEX idx_trade_executions_timestamp ON public.trade_executions(execution_timestamp);

-- Add comment explaining the table
COMMENT ON TABLE public.trade_executions IS 'Logs individual trade execution attempts and results.';

-- Ensure the handle_updated_at function exists (assuming it was created in a previous migration like 20250406040500_create_timestamp_functions.sql)
-- Setup trigger for updated_at timestamp
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.trade_executions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();
