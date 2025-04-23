-- Migration for Exchange Credentials and Wallet Balances
-- This migration adds support for live trading by securely storing exchange API credentials
-- and tracking wallet balances across multiple exchanges and currencies.

-- Create exchange_credentials table for storing encrypted API keys
CREATE TABLE IF NOT EXISTS public.exchange_credentials (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  passphrase TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used TIMESTAMPTZ,
  last_failed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wallet_balances table for tracking user balances across exchanges and currencies
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  currency TEXT NOT NULL,
  free FLOAT NOT NULL DEFAULT 0,
  locked FLOAT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Add a unique constraint to avoid duplicate entries
  UNIQUE(user_id, exchange, currency)
);

-- Enable Row Level Security
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing triggers if they exist (to make migration idempotent)
DROP TRIGGER IF EXISTS handle_exchange_credentials_updated_at ON public.exchange_credentials;

-- Create triggers for updated_at timestamp
CREATE TRIGGER handle_exchange_credentials_updated_at
BEFORE UPDATE ON public.exchange_credentials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Users can view their own exchange credentials" ON public.exchange_credentials;
DROP POLICY IF EXISTS "Users can insert their own exchange credentials" ON public.exchange_credentials;
DROP POLICY IF EXISTS "Users can update their own exchange credentials" ON public.exchange_credentials;
DROP POLICY IF EXISTS "Users can delete their own exchange credentials" ON public.exchange_credentials;

-- Create RLS policies for exchange_credentials
CREATE POLICY "Users can view their own exchange credentials"
  ON public.exchange_credentials
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own exchange credentials"
  ON public.exchange_credentials
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own exchange credentials"
  ON public.exchange_credentials
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own exchange credentials"
  ON public.exchange_credentials
  FOR DELETE
  USING (user_id = auth.uid());

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can insert their own wallet balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users can update their own wallet balances" ON public.wallet_balances;

-- Create RLS policies for wallet_balances
CREATE POLICY "Users can view their own wallet balances"
  ON public.wallet_balances
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wallet balances"
  ON public.wallet_balances
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own wallet balances"
  ON public.wallet_balances
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create indexes only if the tables exist
DO $$
BEGIN
  -- Check if exchange_credentials table exists before creating indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exchange_credentials') THEN
    -- Create index for user_id column if it exists
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'exchange_credentials' 
              AND column_name = 'user_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exchange_credentials_user_id') THEN
        CREATE INDEX idx_exchange_credentials_user_id ON public.exchange_credentials(user_id);
      END IF;
    END IF;
    
    -- Create index for exchange column if it exists
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'exchange_credentials' 
              AND column_name = 'exchange') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exchange_credentials_exchange') THEN
        CREATE INDEX idx_exchange_credentials_exchange ON public.exchange_credentials(exchange);
      END IF;
    END IF;
  END IF;
  
  -- Check if wallet_balances table exists before creating indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wallet_balances') THEN
    -- Create index for user_id column if it exists
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'wallet_balances' 
              AND column_name = 'user_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wallet_balances_user_id') THEN
        CREATE INDEX idx_wallet_balances_user_id ON public.wallet_balances(user_id);
      END IF;
    END IF;
    
    -- Create index for currency column if it exists
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'wallet_balances' 
              AND column_name = 'currency') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wallet_balances_currency') THEN
        CREATE INDEX idx_wallet_balances_currency ON public.wallet_balances(currency);
      END IF;
    END IF;
  END IF;
END
$$;
