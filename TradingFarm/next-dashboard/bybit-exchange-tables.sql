-- Create exchange_credentials table for storing API credentials securely
CREATE TABLE IF NOT EXISTS public.exchange_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange TEXT NOT NULL CHECK (exchange IN ('bybit', 'coinbase', 'hyperliquid', 'binance')),
    name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    passphrase TEXT, -- For Coinbase
    testnet BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for exchange_credentials
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exchange credentials"
    ON public.exchange_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exchange credentials"
    ON public.exchange_credentials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exchange credentials"
    ON public.exchange_credentials
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exchange credentials"
    ON public.exchange_credentials
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create exchange_configs table for configuration and status
CREATE TABLE IF NOT EXISTS public.exchange_configs (
    id UUID PRIMARY KEY REFERENCES public.exchange_credentials(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    exchange TEXT NOT NULL,
    testnet BOOLEAN NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for exchange_configs
ALTER TABLE public.exchange_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exchange configs"
    ON public.exchange_configs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exchange configs"
    ON public.exchange_configs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exchange configs"
    ON public.exchange_configs
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exchange configs"
    ON public.exchange_configs
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create order_history table for tracking orders
CREATE TABLE IF NOT EXISTS public.order_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange_id UUID NOT NULL REFERENCES public.exchange_credentials(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    order_type TEXT NOT NULL,
    price TEXT,
    quantity TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for order_history
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order history"
    ON public.order_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own order history"
    ON public.order_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS exchange_credentials_updated_at_trigger ON public.exchange_credentials;
CREATE TRIGGER exchange_credentials_updated_at_trigger
BEFORE UPDATE ON public.exchange_credentials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS exchange_configs_updated_at_trigger ON public.exchange_configs;
CREATE TRIGGER exchange_configs_updated_at_trigger
BEFORE UPDATE ON public.exchange_configs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS order_history_updated_at_trigger ON public.order_history;
CREATE TRIGGER order_history_updated_at_trigger
BEFORE UPDATE ON public.order_history
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
