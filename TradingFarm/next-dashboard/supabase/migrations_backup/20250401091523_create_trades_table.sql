-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(255) NOT NULL,
    side VARCHAR(50) NOT NULL CHECK (side IN ('buy', 'sell')),
    entry_price DECIMAL(18, 8) NOT NULL,
    exit_price DECIMAL(18, 8),
    quantity DECIMAL(18, 8) NOT NULL,
    profit_loss DECIMAL(18, 8),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'canceled')),
    agent_id BIGINT REFERENCES public.agents(id),
    farm_id BIGINT NOT NULL REFERENCES public.farms(id),
    strategy_id BIGINT REFERENCES public.strategies(id),
    exchange VARCHAR(255),
    fees DECIMAL(18, 8),
    duration_ms BIGINT,
    roi_percentage DECIMAL(10, 4),
    trade_sentiment VARCHAR(50) CHECK (trade_sentiment IN ('bullish', 'bearish', 'neutral')),
    entry_order_id BIGINT,
    exit_order_id BIGINT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add triggers for created_at and updated_at
DROP TRIGGER IF EXISTS set_trades_updated_at ON public.trades;
CREATE TRIGGER set_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add comment to clarify purpose of the table
COMMENT ON TABLE public.trades IS 'Stores trading activity from Trading Farm agents and strategies';

-- Enable Row Level Security
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create policies for trades table
CREATE POLICY trades_select_policy ON public.trades 
    FOR SELECT 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY trades_insert_policy ON public.trades 
    FOR INSERT 
    WITH CHECK (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY trades_update_policy ON public.trades 
    FOR UPDATE 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY trades_delete_policy ON public.trades 
    FOR DELETE 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

-- Create transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id),
    wallet_id UUID REFERENCES public.wallets(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'trade_profit', 'trade_loss')),
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
    description TEXT,
    reference_id VARCHAR(255),
    external_id VARCHAR(255),
    exchange VARCHAR(255),
    recipient VARCHAR(255),
    sender VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add triggers for created_at and updated_at
DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add comment to clarify purpose of the table
COMMENT ON TABLE public.transactions IS 'Stores financial transactions for Trading Farm accounts';

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions table
CREATE POLICY transactions_select_policy ON public.transactions 
    FOR SELECT 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY transactions_insert_policy ON public.transactions 
    FOR INSERT 
    WITH CHECK (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY transactions_update_policy ON public.transactions 
    FOR UPDATE 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY transactions_delete_policy ON public.transactions 
    FOR DELETE 
    USING (
        farm_id IN (
            SELECT id FROM public.farms 
            WHERE user_id = auth.uid()
        )
    );
