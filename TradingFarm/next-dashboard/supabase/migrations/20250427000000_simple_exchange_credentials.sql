-- Simple exchange_credentials table migration
-- Migration: 20250427000000_simple_exchange_credentials.sql

-- Create the exchange_credentials table without dependencies
CREATE TABLE IF NOT EXISTS public.exchange_credentials (
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

-- Create trigger function for updated_at if not exists
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
DROP TRIGGER IF EXISTS handle_exchange_credentials_updated_at ON public.exchange_credentials;
CREATE TRIGGER handle_exchange_credentials_updated_at
BEFORE UPDATE ON public.exchange_credentials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see and modify their own credentials
DROP POLICY IF EXISTS "Users can only view their own exchange credentials" ON public.exchange_credentials;
CREATE POLICY "Users can only view their own exchange credentials"
  ON public.exchange_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only insert their own exchange credentials" ON public.exchange_credentials;
CREATE POLICY "Users can only insert their own exchange credentials"
  ON public.exchange_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only update their own exchange credentials" ON public.exchange_credentials;
CREATE POLICY "Users can only update their own exchange credentials"
  ON public.exchange_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only delete their own exchange credentials" ON public.exchange_credentials;
CREATE POLICY "Users can only delete their own exchange credentials"
  ON public.exchange_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create an index for faster lookups by user
DROP INDEX IF EXISTS exchange_credentials_user_id_idx;
CREATE INDEX exchange_credentials_user_id_idx ON public.exchange_credentials(user_id);
