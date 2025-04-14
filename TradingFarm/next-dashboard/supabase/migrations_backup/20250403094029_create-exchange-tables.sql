
-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Make sure we have our timestamp functions
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create exchange_credentials table
CREATE TABLE IF NOT EXISTS public.exchange_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_id TEXT NOT NULL,
  exchange_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  passphrase TEXT,
  testnet BOOLEAN DEFAULT false,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, exchange_id)
);

-- Create exchange_configs table
CREATE TABLE IF NOT EXISTS public.exchange_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credentials_id UUID NOT NULL REFERENCES public.exchange_credentials(id) ON DELETE CASCADE,
  exchange_id TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'disconnected',
  last_connected TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, exchange_id)
);

-- Create order_history table
CREATE TABLE IF NOT EXISTS public.order_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL,
  price NUMERIC,
  qty NUMERIC NOT NULL,
  status TEXT NOT NULL,
  filled_qty NUMERIC DEFAULT 0,
  avg_price NUMERIC,
  order_time TIMESTAMPTZ,
  update_time TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exchange_id, order_id)
);

-- Create triggers for created_at and updated_at
DO $$ 
BEGIN
  -- Create triggers for exchange_credentials
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_exchange_credentials_created_at') THEN
    CREATE TRIGGER set_exchange_credentials_created_at
    BEFORE INSERT ON public.exchange_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_exchange_credentials_updated_at') THEN
    CREATE TRIGGER set_exchange_credentials_updated_at
    BEFORE UPDATE ON public.exchange_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  -- Create triggers for exchange_configs
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_exchange_configs_created_at') THEN
    CREATE TRIGGER set_exchange_configs_created_at
    BEFORE INSERT ON public.exchange_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_exchange_configs_updated_at') THEN
    CREATE TRIGGER set_exchange_configs_updated_at
    BEFORE UPDATE ON public.exchange_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  -- Create triggers for order_history
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_order_history_created_at') THEN
    CREATE TRIGGER set_order_history_created_at
    BEFORE INSERT ON public.order_history
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_order_history_updated_at') THEN
    CREATE TRIGGER set_order_history_updated_at
    BEFORE UPDATE ON public.order_history
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Exchange Credentials policies
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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exchange credentials"
  ON public.exchange_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Exchange Configs policies
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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exchange configs"
  ON public.exchange_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Order History policies
CREATE POLICY "Users can view their own order history"
  ON public.order_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own order history"
  ON public.order_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own order history"
  ON public.order_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own order history"
  ON public.order_history
  FOR DELETE
  USING (auth.uid() = user_id);