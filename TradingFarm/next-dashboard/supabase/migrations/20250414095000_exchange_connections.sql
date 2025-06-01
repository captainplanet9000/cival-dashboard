-- Migration: Add exchange connections schema
-- This migration adds tables for handling exchange API connections

-- Create exchange_connections table
CREATE TABLE IF NOT EXISTS public.exchange_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    exchange_name VARCHAR(50) NOT NULL,
    exchange_type VARCHAR(20) NOT NULL,
    is_testnet BOOLEAN DEFAULT FALSE,
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    passphrase_encrypted TEXT,
    additional_credentials JSONB DEFAULT '{}'::jsonb,
    connection_status VARCHAR(20) DEFAULT 'pending',
    last_connected_at TIMESTAMPTZ,
    permissions JSONB DEFAULT '{
        "trading": false,
        "margin": false,
        "futures": false,
        "withdrawal": false
    }'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_exchange UNIQUE(user_id, exchange_name, is_testnet)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchange_connections_user_id ON public.exchange_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_connections_farm_id ON public.exchange_connections(farm_id);
CREATE INDEX IF NOT EXISTS idx_exchange_connections_exchange_name ON public.exchange_connections(exchange_name);
CREATE INDEX IF NOT EXISTS idx_exchange_connections_status ON public.exchange_connections(connection_status);

-- Add triggers for automatic timestamp handling
CREATE TRIGGER handle_exchange_connections_created_at
BEFORE INSERT ON public.exchange_connections
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_exchange_connections_updated_at
BEFORE UPDATE ON public.exchange_connections
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.exchange_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own exchange connections"
ON public.exchange_connections FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = exchange_connections.farm_id
        AND farm_users.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create their own exchange connections"
ON public.exchange_connections FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

CREATE POLICY "Users can update their own exchange connections"
ON public.exchange_connections FOR UPDATE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = exchange_connections.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Users can delete their own exchange connections"
ON public.exchange_connections FOR DELETE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = exchange_connections.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin')
    )
);

-- Create function to get exchange connections with secure data handling
CREATE OR REPLACE FUNCTION public.get_exchange_connections(
    p_user_id UUID,
    p_farm_id UUID DEFAULT NULL,
    p_include_secrets BOOLEAN DEFAULT FALSE
)
RETURNS SETOF public.exchange_connections
SECURITY INVOKER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
    -- Only allow users to access their own data
    IF auth.uid() <> p_user_id AND 
       NOT EXISTS (
            SELECT 1 
            FROM public.farm_users 
            WHERE farm_users.farm_id = p_farm_id
            AND farm_users.user_id = auth.uid()
            AND farm_users.role IN ('owner', 'admin')
        ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Return data with or without secrets based on parameter
    IF p_include_secrets THEN
        RETURN QUERY
        SELECT * 
        FROM public.exchange_connections
        WHERE user_id = p_user_id
        AND (p_farm_id IS NULL OR farm_id = p_farm_id);
    ELSE
        RETURN QUERY
        SELECT 
            id, user_id, farm_id, exchange_name, exchange_type, 
            is_testnet, NULL::text as api_key_encrypted, 
            NULL::text as api_secret_encrypted, 
            NULL::text as passphrase_encrypted,
            additional_credentials, connection_status, 
            last_connected_at, permissions, metadata, 
            created_at, updated_at
        FROM public.exchange_connections
        WHERE user_id = p_user_id
        AND (p_farm_id IS NULL OR farm_id = p_farm_id);
    END IF;
END;
$$;
