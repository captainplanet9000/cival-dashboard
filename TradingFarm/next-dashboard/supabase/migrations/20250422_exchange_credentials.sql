-- Exchange Credentials Table
-- This migration creates a table for securely storing exchange API credentials
-- with proper RLS policies and timestamp management

-- Create the exchange_credentials table
CREATE TABLE IF NOT EXISTS public.exchange_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  farm_id UUID NOT NULL,
  exchange_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_testnet BOOLEAN NOT NULL DEFAULT FALSE,
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  FOREIGN KEY (farm_id) REFERENCES public.farms (id) ON DELETE CASCADE
);

-- Comment on table
COMMENT ON TABLE public.exchange_credentials IS 'Securely stores encrypted exchange API credentials';

-- Add timestamp triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.exchange_credentials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- 1. Users can only view their own credentials
CREATE POLICY "Users can view own exchange credentials"
  ON public.exchange_credentials FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can only insert their own credentials
CREATE POLICY "Users can insert own exchange credentials"
  ON public.exchange_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Users can only update their own credentials
CREATE POLICY "Users can update own exchange credentials"
  ON public.exchange_credentials FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Users can only delete their own credentials
CREATE POLICY "Users can delete own exchange credentials"
  ON public.exchange_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX exchange_credentials_farm_exchange_idx ON public.exchange_credentials (farm_id, exchange_id, is_testnet);
CREATE INDEX exchange_credentials_user_idx ON public.exchange_credentials (user_id);

-- Create a secure function to verify credential access
CREATE OR REPLACE FUNCTION public.verify_credential_access(credential_id UUID, requesting_user_id UUID)
RETURNS BOOLEAN
SECURITY INVOKER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.exchange_credentials
    WHERE id = credential_id AND user_id = requesting_user_id
  );
END;
$$;
