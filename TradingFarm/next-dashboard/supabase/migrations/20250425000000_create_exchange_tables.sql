-- Create handler functions if they don't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Exchange Credentials Table
CREATE TABLE IF NOT EXISTS public.exchange_credentials (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID,
  exchange_id TEXT NOT NULL,
  encrypted_data JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used TIMESTAMPTZ,
  last_failed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Set RLS policies
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

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_exchange_credentials_updated_at ON public.exchange_credentials;
CREATE TRIGGER handle_exchange_credentials_updated_at
  BEFORE UPDATE ON public.exchange_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Wallet Balances Table
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  free FLOAT NOT NULL DEFAULT 0,
  locked FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- Set RLS policies
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

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_wallet_balances_updated_at ON public.wallet_balances;
CREATE TRIGGER handle_wallet_balances_updated_at
  BEFORE UPDATE ON public.wallet_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
