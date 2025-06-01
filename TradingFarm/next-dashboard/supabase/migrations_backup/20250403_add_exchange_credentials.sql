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

-- Add RLS policies
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Create row level security policies
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

-- Create functions for created_at and updated_at handling
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS exchange_credentials_updated_at_trigger ON public.exchange_credentials;
CREATE TRIGGER exchange_credentials_updated_at_trigger
BEFORE UPDATE ON public.exchange_credentials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create table for exchange configuration and status
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

-- Add RLS policies
ALTER TABLE public.exchange_configs ENABLE ROW LEVEL SECURITY;

-- Create row level security policies
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

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS exchange_configs_updated_at_trigger ON public.exchange_configs;
CREATE TRIGGER exchange_configs_updated_at_trigger
BEFORE UPDATE ON public.exchange_configs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
