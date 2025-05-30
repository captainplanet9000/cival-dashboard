-- Enhance Exchange Integration Tables
-- This migration adds tables and functions for secure exchange API credential storage
-- and market data caching capabilities

-- Create or update API credential storage for exchanges
CREATE TABLE IF NOT EXISTS public.exchange_credentials (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  exchange_name TEXT NOT NULL CHECK (exchange_name IN ('bybit', 'hyperliquid', 'coinbase', 'binance')),
  chain TEXT DEFAULT 'arbitrum' CHECK (chain IN ('arbitrum', 'ethereum', 'solana', 'base')),
  api_key TEXT NOT NULL,
  -- Sensitive information is stored encrypted
  encrypted_api_secret BYTEA NOT NULL,
  encrypted_private_key BYTEA,
  wallet_address TEXT,
  label TEXT,
  is_testnet BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"trade": false, "withdraw": false, "deposit": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (user_id, exchange_name, label)
);

-- Create market data cache table for storing recent market data
CREATE TABLE IF NOT EXISTS public.market_data_cache (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('ticker', 'orderbook', 'trades', 'kline')),
  interval TEXT, -- For kline data
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE (exchange, symbol, data_type, interval)
);

-- Create table for storing historical market data
CREATE TABLE IF NOT EXISTS public.market_data_history (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('ticker', 'orderbook', 'trades', 'kline')),
  interval TEXT, -- For kline data
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  -- Add time-based partitioning strategy
  CONSTRAINT market_data_history_partition_check CHECK (
    timestamp >= '2024-01-01'::timestamptz AND 
    timestamp < '2030-01-01'::timestamptz
  )
);

-- Create partitions by month for efficient querying
CREATE TABLE IF NOT EXISTS public.market_data_history_y2025m01 PARTITION OF public.market_data_history
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS public.market_data_history_y2025m02 PARTITION OF public.market_data_history
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS public.market_data_history_y2025m03 PARTITION OF public.market_data_history
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS public.market_data_history_y2025m04 PARTITION OF public.market_data_history
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

-- Add index for efficient timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_market_data_history_timestamp 
  ON public.market_data_history (timestamp);

-- Add composite index for symbol+exchange+data_type queries
CREATE INDEX IF NOT EXISTS idx_market_data_history_symbol_exchange_type 
  ON public.market_data_history (symbol, exchange, data_type);

-- Create security function for encrypting API secrets
CREATE OR REPLACE FUNCTION public.encrypt_secret(
  secret TEXT,
  key_id TEXT DEFAULT 'default'
)
RETURNS BYTEA AS $$
DECLARE
  encryption_key BYTEA;
  encrypted_result BYTEA;
BEGIN
  -- In production, this would use a secure vault or KMS
  -- For now, we'll use a simplified approach with pgcrypto
  
  -- Get encryption key from secure vault
  -- This is a placeholder - in production, implement proper key management
  encryption_key = digest('trading-farm-secret-key-' || key_id, 'sha256');
  
  -- Encrypt the secret using AES
  encrypted_result = pgp_sym_encrypt(secret, encode(encryption_key, 'hex'));
  
  RETURN encrypted_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security function for decrypting API secrets
CREATE OR REPLACE FUNCTION public.decrypt_secret(
  encrypted_secret BYTEA,
  key_id TEXT DEFAULT 'default'
)
RETURNS TEXT AS $$
DECLARE
  encryption_key BYTEA;
  decrypted_result TEXT;
BEGIN
  -- Get encryption key from secure vault
  -- This is a placeholder - in production, implement proper key management
  encryption_key = digest('trading-farm-secret-key-' || key_id, 'sha256');
  
  -- Decrypt the secret
  decrypted_result = pgp_sym_decrypt(encrypted_secret, encode(encryption_key, 'hex'));
  
  RETURN decrypted_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a secure function to store API credentials
CREATE OR REPLACE FUNCTION public.store_exchange_credentials(
  p_exchange_name TEXT,
  p_api_key TEXT,
  p_api_secret TEXT,
  p_private_key TEXT DEFAULT NULL,
  p_wallet_address TEXT DEFAULT NULL,
  p_chain TEXT DEFAULT 'arbitrum',
  p_label TEXT DEFAULT NULL,
  p_is_testnet BOOLEAN DEFAULT true,
  p_permissions JSONB DEFAULT '{"trade": false, "withdraw": false, "deposit": true}'::jsonb
)
RETURNS BIGINT AS $$
DECLARE
  v_user_id UUID;
  v_credential_id BIGINT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Generate a default label if none provided
  IF p_label IS NULL THEN
    p_label := p_exchange_name || '-' || to_char(now(), 'YYYY-MM-DD');
  END IF;
  
  -- Insert or update credentials
  INSERT INTO public.exchange_credentials (
    user_id,
    exchange_name,
    chain,
    api_key,
    encrypted_api_secret,
    encrypted_private_key,
    wallet_address,
    label,
    is_testnet,
    permissions
  ) VALUES (
    v_user_id,
    p_exchange_name,
    p_chain,
    p_api_key,
    public.encrypt_secret(p_api_secret),
    CASE WHEN p_private_key IS NOT NULL THEN public.encrypt_secret(p_private_key) ELSE NULL END,
    p_wallet_address,
    p_label,
    p_is_testnet,
    p_permissions
  )
  ON CONFLICT (user_id, exchange_name, label)
  DO UPDATE SET
    api_key = EXCLUDED.api_key,
    encrypted_api_secret = EXCLUDED.encrypted_api_secret,
    encrypted_private_key = EXCLUDED.encrypted_private_key,
    wallet_address = EXCLUDED.wallet_address,
    is_testnet = EXCLUDED.is_testnet,
    permissions = EXCLUDED.permissions,
    updated_at = now()
  RETURNING id INTO v_credential_id;
  
  RETURN v_credential_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get decrypted credentials (securely)
CREATE OR REPLACE FUNCTION public.get_exchange_credentials(p_credential_id BIGINT)
RETURNS TABLE (
  id BIGINT,
  exchange_name TEXT,
  chain TEXT,
  api_key TEXT,
  api_secret TEXT,
  private_key TEXT,
  wallet_address TEXT,
  label TEXT,
  is_testnet BOOLEAN,
  permissions JSONB
) AS $$
DECLARE
  v_user_id UUID;
  v_record RECORD;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get the credential record and check ownership
  SELECT * INTO v_record
  FROM public.exchange_credentials
  WHERE id = p_credential_id AND user_id = v_user_id;
  
  -- Check if record exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credential not found or access denied';
  END IF;
  
  -- Update last used timestamp
  UPDATE public.exchange_credentials
  SET last_used_at = now()
  WHERE id = p_credential_id;
  
  -- Return decrypted credentials
  RETURN QUERY
  SELECT
    v_record.id,
    v_record.exchange_name,
    v_record.chain,
    v_record.api_key,
    public.decrypt_secret(v_record.encrypted_api_secret),
    CASE WHEN v_record.encrypted_private_key IS NOT NULL 
         THEN public.decrypt_secret(v_record.encrypted_private_key)
         ELSE NULL
    END,
    v_record.wallet_address,
    v_record.label,
    v_record.is_testnet,
    v_record.permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to safely store market data
CREATE OR REPLACE FUNCTION public.cache_market_data(
  p_exchange TEXT,
  p_symbol TEXT,
  p_data_type TEXT,
  p_interval TEXT,
  p_data JSONB,
  p_ttl_seconds INT DEFAULT 60
)
RETURNS VOID AS $$
BEGIN
  -- Validate inputs
  IF p_data_type NOT IN ('ticker', 'orderbook', 'trades', 'kline') THEN
    RAISE EXCEPTION 'Invalid data type: %', p_data_type;
  END IF;
  
  -- Insert or update cache entry
  INSERT INTO public.market_data_cache (
    exchange,
    symbol,
    data_type,
    interval,
    data,
    expires_at
  ) VALUES (
    p_exchange,
    p_symbol,
    p_data_type,
    p_interval,
    p_data,
    now() + (p_ttl_seconds || ' seconds')::interval
  )
  ON CONFLICT (exchange, symbol, data_type, interval)
  DO UPDATE SET
    data = EXCLUDED.data,
    timestamp = now(),
    expires_at = now() + (p_ttl_seconds || ' seconds')::interval;

  -- Also store in history if it's a valid data point
  IF p_data_type = 'kline' OR p_data_type = 'ticker' THEN
    INSERT INTO public.market_data_history (
      exchange,
      symbol,
      data_type,
      interval,
      data,
      timestamp
    ) VALUES (
      p_exchange,
      p_symbol,
      p_data_type,
      p_interval,
      p_data,
      now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_market_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.market_data_cache
  WHERE expires_at < now()
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on exchange credentials table
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Define RLS policies
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

-- Add updated_at trigger for exchange_credentials table
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.exchange_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
