-- Create exchange_credentials table for storing API keys and credentials
-- Migration: 20250426_exchange_credentials.sql

-- Create the exchange_credentials table
CREATE TABLE public.exchange_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  api_passphrase TEXT,
  is_testnet BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  nickname TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create updated_at trigger function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END
$$;

-- Create trigger for updated_at
CREATE TRIGGER handle_exchange_credentials_updated_at
BEFORE UPDATE ON public.exchange_credentials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see and modify their own credentials
CREATE POLICY "Users can only view their own exchange credentials"
  ON public.exchange_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own exchange credentials"
  ON public.exchange_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own exchange credentials"
  ON public.exchange_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own exchange credentials"
  ON public.exchange_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create an index for faster lookups by user
CREATE INDEX exchange_credentials_user_id_idx ON public.exchange_credentials(user_id);

-- Encrypt sensitive fields
-- This requires the pgcrypto extension to be enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to securely handle API secrets and keys
CREATE OR REPLACE FUNCTION encrypt_api_credentials()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.api_key <> OLD.api_key) THEN
    NEW.api_key = pgp_sym_encrypt(NEW.api_key, current_setting('app.settings.jwt_secret'));
  END IF;
  
  IF (TG_OP = 'INSERT' OR NEW.api_secret <> OLD.api_secret) THEN
    NEW.api_secret = pgp_sym_encrypt(NEW.api_secret, current_setting('app.settings.jwt_secret'));
  END IF;
  
  IF (NEW.api_passphrase IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.api_passphrase <> OLD.api_passphrase)) THEN
    NEW.api_passphrase = pgp_sym_encrypt(NEW.api_passphrase, current_setting('app.settings.jwt_secret'));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Add the encryption trigger
CREATE TRIGGER encrypt_exchange_credentials
BEFORE INSERT OR UPDATE ON public.exchange_credentials
FOR EACH ROW EXECUTE FUNCTION encrypt_api_credentials();

-- Create functions to securely handle decryption
CREATE OR REPLACE FUNCTION get_decrypted_api_key(credential_id UUID)
RETURNS TEXT AS $$
DECLARE
  decrypted TEXT;
BEGIN
  SELECT pgp_sym_decrypt(ec.api_key::bytea, current_setting('app.settings.jwt_secret'))
  INTO decrypted
  FROM public.exchange_credentials ec
  WHERE ec.id = credential_id AND ec.user_id = auth.uid();
  
  RETURN decrypted;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER
SET search_path = '';

CREATE OR REPLACE FUNCTION get_decrypted_api_secret(credential_id UUID)
RETURNS TEXT AS $$
DECLARE
  decrypted TEXT;
BEGIN
  SELECT pgp_sym_decrypt(ec.api_secret::bytea, current_setting('app.settings.jwt_secret'))
  INTO decrypted
  FROM public.exchange_credentials ec
  WHERE ec.id = credential_id AND ec.user_id = auth.uid();
  
  RETURN decrypted;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER
SET search_path = '';

-- Add to supabase_functions schema for RPC calls
CREATE OR REPLACE FUNCTION public.get_all_exchange_credentials()
RETURNS SETOF public.exchange_credentials AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.exchange_credentials 
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Comments for documentation
COMMENT ON TABLE public.exchange_credentials IS 'Stores encrypted exchange API credentials for users';
COMMENT ON COLUMN public.exchange_credentials.exchange_name IS 'Name of the exchange (e.g., Binance, Coinbase)';
COMMENT ON COLUMN public.exchange_credentials.api_key IS 'Encrypted API key';
COMMENT ON COLUMN public.exchange_credentials.api_secret IS 'Encrypted API secret';
COMMENT ON COLUMN public.exchange_credentials.api_passphrase IS 'Encrypted API passphrase (if required by exchange)';
COMMENT ON COLUMN public.exchange_credentials.is_testnet IS 'Whether these credentials are for a testnet/sandbox environment';
COMMENT ON COLUMN public.exchange_credentials.permissions IS 'JSON object containing permissions granted to these API credentials';
