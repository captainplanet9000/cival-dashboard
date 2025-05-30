-- Migration: Exchange Integration Completion
-- Adds tables for enhanced exchange integration, market data streaming,
-- and wallet connection functionality

-- Create enum types for various statuses
CREATE TYPE public.exchange_connection_status AS ENUM (
  'connected', 'disconnected', 'error', 'rate_limited', 'maintenance'
);

CREATE TYPE public.wallet_connection_status AS ENUM (
  'connected', 'disconnected', 'locked', 'insufficient_funds', 'error'
);

-- Create exchange_connections table for tracking connection status to exchanges
CREATE TABLE IF NOT EXISTS public.exchange_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  exchange_credential_id BIGINT REFERENCES public.exchange_credentials(id) ON DELETE CASCADE,
  exchange VARCHAR(50) NOT NULL,
  status exchange_connection_status NOT NULL DEFAULT 'disconnected',
  last_connected TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  connection_info JSONB DEFAULT '{}'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure unique connection per credential
  UNIQUE(exchange_credential_id)
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_exchange_connections
BEFORE UPDATE ON public.exchange_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.exchange_connections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own exchange connections"
ON public.exchange_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can modify their own exchange connections"
ON public.exchange_connections
FOR ALL
USING (auth.uid() = user_id);

-- Create exchange_balances table for tracking real-time account balances
CREATE TABLE IF NOT EXISTS public.exchange_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  exchange VARCHAR(50) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'spot', -- spot, margin, futures, etc.
  asset VARCHAR(20) NOT NULL,
  free_balance NUMERIC NOT NULL DEFAULT 0,
  locked_balance NUMERIC NOT NULL DEFAULT 0,
  total_balance NUMERIC NOT NULL DEFAULT 0,
  usd_value NUMERIC,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure one balance entry per user/farm, exchange, account_type, and asset
  UNIQUE(user_id, farm_id, exchange, account_type, asset)
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_exchange_balances
BEFORE UPDATE ON public.exchange_balances
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.exchange_balances ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own exchange balances"
ON public.exchange_balances
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can modify exchange balances"
ON public.exchange_balances
FOR ALL
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Create table for real-time market data streams
CREATE TABLE IF NOT EXISTS public.market_data_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange VARCHAR(50) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  stream_type VARCHAR(50) NOT NULL, -- ticker, trades, orderbook, kline, etc.
  interval VARCHAR(10), -- For kline/candle data
  status VARCHAR(20) NOT NULL DEFAULT 'inactive',
  last_active TIMESTAMP WITH TIME ZONE,
  subscribers INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure unique streams per exchange, symbol, type, and interval
  UNIQUE(exchange, symbol, stream_type, interval)
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_market_data_streams
BEFORE UPDATE ON public.market_data_streams
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.market_data_streams ENABLE ROW LEVEL SECURITY;

-- Create policies - public read-only access for market data streams
CREATE POLICY "Anyone can view market data streams"
ON public.market_data_streams
FOR SELECT
USING (true);

CREATE POLICY "Admins can modify market data streams"
ON public.market_data_streams
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Create table for connected blockchain wallets
CREATE TABLE IF NOT EXISTS public.connected_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  wallet_type VARCHAR(50) NOT NULL, -- 'metamask', 'walletconnect', etc.
  chain_id INTEGER NOT NULL,
  network_name VARCHAR(50) NOT NULL,
  status wallet_connection_status NOT NULL DEFAULT 'disconnected',
  last_connected TIMESTAMP WITH TIME ZONE,
  nickname VARCHAR(100),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure unique wallet address per user
  UNIQUE(user_id, wallet_address, chain_id)
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_connected_wallets
BEFORE UPDATE ON public.connected_wallets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.connected_wallets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own connected wallets"
ON public.connected_wallets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can modify their own connected wallets"
ON public.connected_wallets
FOR ALL
USING (auth.uid() = user_id);

-- Create table for exchange rate snapshots
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency VARCHAR(10) NOT NULL,
  quote_currency VARCHAR(10) NOT NULL,
  rate NUMERIC NOT NULL,
  source VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure unique rates per currency pair, source, and timestamp
  UNIQUE(base_currency, quote_currency, source, timestamp)
);

-- No RLS needed for exchange rates as they are public data
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view exchange rates"
ON public.exchange_rates
FOR SELECT
USING (true);

-- Create functions for exchange integration

-- Function to connect to an exchange
CREATE OR REPLACE FUNCTION public.connect_exchange(
  p_exchange VARCHAR(50),
  p_credential_id BIGINT,
  p_farm_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_connection_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Ensure the credential belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.exchange_credentials
    WHERE id = p_credential_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Credential not found or does not belong to user';
  END IF;
  
  -- If farm_id is provided, ensure it belongs to the user
  IF p_farm_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.farms
    WHERE id = p_farm_id AND owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Farm not found or does not belong to user';
  END IF;
  
  -- Insert or update the connection
  INSERT INTO public.exchange_connections (
    user_id,
    farm_id,
    exchange_credential_id,
    exchange,
    status,
    last_connected,
    connection_info
  )
  SELECT
    v_user_id,
    p_farm_id,
    p_credential_id,
    ec.exchange,
    'connected'::exchange_connection_status,
    NOW(),
    jsonb_build_object(
      'is_testnet', ec.is_testnet,
      'connection_time', extract(epoch from now())
    )
  FROM public.exchange_credentials ec
  WHERE ec.id = p_credential_id
  ON CONFLICT (exchange_credential_id) 
  DO UPDATE SET
    status = 'connected'::exchange_connection_status,
    last_connected = NOW(),
    farm_id = p_farm_id,
    updated_at = NOW()
  RETURNING id INTO v_connection_id;
  
  RETURN v_connection_id;
END;
$$;

-- Function to disconnect from an exchange
CREATE OR REPLACE FUNCTION public.disconnect_exchange(
  p_connection_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.exchange_connections
  SET
    status = 'disconnected'::exchange_connection_status,
    updated_at = NOW()
  WHERE
    id = p_connection_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to update exchange balance
CREATE OR REPLACE FUNCTION public.update_exchange_balance(
  p_exchange VARCHAR(50),
  p_account_type VARCHAR(50),
  p_asset VARCHAR(20),
  p_free_balance NUMERIC,
  p_locked_balance NUMERIC,
  p_usd_value NUMERIC,
  p_farm_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total_balance NUMERIC;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Calculate total balance
  v_total_balance := p_free_balance + p_locked_balance;
  
  -- Insert or update the balance
  INSERT INTO public.exchange_balances (
    user_id,
    farm_id,
    exchange,
    account_type,
    asset,
    free_balance,
    locked_balance,
    total_balance,
    usd_value,
    last_updated
  ) VALUES (
    v_user_id,
    p_farm_id,
    p_exchange,
    p_account_type,
    p_asset,
    p_free_balance,
    p_locked_balance,
    v_total_balance,
    p_usd_value,
    NOW()
  )
  ON CONFLICT (user_id, farm_id, exchange, account_type, asset)
  DO UPDATE SET
    free_balance = p_free_balance,
    locked_balance = p_locked_balance,
    total_balance = v_total_balance,
    usd_value = p_usd_value,
    last_updated = NOW(),
    updated_at = NOW();
  
  RETURN true;
END;
$$;

-- Function to subscribe to market data stream
CREATE OR REPLACE FUNCTION public.subscribe_to_market_data(
  p_exchange VARCHAR(50),
  p_symbol VARCHAR(20),
  p_stream_type VARCHAR(50),
  p_interval VARCHAR(10) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stream_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Insert or update the stream subscription
  INSERT INTO public.market_data_streams (
    user_id,
    exchange,
    symbol,
    stream_type,
    interval,
    status,
    last_active,
    subscribers
  ) VALUES (
    v_user_id,
    p_exchange,
    p_symbol,
    p_stream_type,
    p_interval,
    'active',
    NOW(),
    1
  )
  ON CONFLICT (exchange, symbol, stream_type, interval)
  DO UPDATE SET
    status = 'active',
    last_active = NOW(),
    subscribers = public.market_data_streams.subscribers + 1,
    updated_at = NOW()
  RETURNING id INTO v_stream_id;
  
  RETURN v_stream_id;
END;
$$;

-- Function to unsubscribe from market data stream
CREATE OR REPLACE FUNCTION public.unsubscribe_from_market_data(
  p_stream_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.market_data_streams
  SET
    subscribers = GREATEST(0, subscribers - 1),
    status = CASE WHEN GREATEST(0, subscribers - 1) = 0 THEN 'inactive' ELSE status END,
    updated_at = NOW()
  WHERE
    id = p_stream_id;
  
  RETURN FOUND;
END;
$$;

-- Function to connect wallet
CREATE OR REPLACE FUNCTION public.connect_wallet(
  p_wallet_address TEXT,
  p_wallet_type VARCHAR(50),
  p_chain_id INTEGER,
  p_network_name VARCHAR(50),
  p_nickname VARCHAR(100) DEFAULT NULL,
  p_farm_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- If farm_id is provided, ensure it belongs to the user
  IF p_farm_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.farms
    WHERE id = p_farm_id AND owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Farm not found or does not belong to user';
  END IF;
  
  -- Insert or update the wallet connection
  INSERT INTO public.connected_wallets (
    user_id,
    farm_id,
    wallet_address,
    wallet_type,
    chain_id,
    network_name,
    status,
    last_connected,
    nickname
  ) VALUES (
    v_user_id,
    p_farm_id,
    p_wallet_address,
    p_wallet_type,
    p_chain_id,
    p_network_name,
    'connected'::wallet_connection_status,
    NOW(),
    p_nickname
  )
  ON CONFLICT (user_id, wallet_address, chain_id)
  DO UPDATE SET
    status = 'connected'::wallet_connection_status,
    last_connected = NOW(),
    farm_id = COALESCE(p_farm_id, public.connected_wallets.farm_id),
    nickname = COALESCE(p_nickname, public.connected_wallets.nickname),
    updated_at = NOW()
  RETURNING id INTO v_wallet_id;
  
  RETURN v_wallet_id;
END;
$$;

-- Function to disconnect wallet
CREATE OR REPLACE FUNCTION public.disconnect_wallet(
  p_wallet_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.connected_wallets
  SET
    status = 'disconnected'::wallet_connection_status,
    updated_at = NOW()
  WHERE
    id = p_wallet_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;
