-- Migration file for Trading Farm database schema
-- Follows your preference for using migrations with proper RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create created_at trigger function
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = CURRENT_TIMESTAMP;
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table helper function
CREATE OR REPLACE FUNCTION list_tables()
RETURNS TABLE (tablename TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.tablename::text
  FROM pg_catalog.pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Create farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for farms
DROP TRIGGER IF EXISTS handle_farms_created_at ON farms;
CREATE TRIGGER handle_farms_created_at
BEFORE INSERT ON farms
FOR EACH ROW
EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS handle_farms_updated_at ON farms;
CREATE TRIGGER handle_farms_updated_at
BEFORE UPDATE ON farms
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'inactive',
  type TEXT DEFAULT 'standard',
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for agents
DROP TRIGGER IF EXISTS handle_agents_created_at ON agents;
CREATE TRIGGER handle_agents_created_at
BEFORE INSERT ON agents
FOR EACH ROW
EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS handle_agents_updated_at ON agents;
CREATE TRIGGER handle_agents_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Create strategies table
CREATE TABLE IF NOT EXISTS public.strategies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for strategies
DROP TRIGGER IF EXISTS handle_strategies_created_at ON strategies;
CREATE TRIGGER handle_strategies_created_at
BEFORE INSERT ON strategies
FOR EACH ROW
EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS handle_strategies_updated_at ON strategies;
CREATE TRIGGER handle_strategies_updated_at
BEFORE UPDATE ON strategies
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL UNIQUE,
  balance NUMERIC(24, 8) DEFAULT 0,
  farm_id INTEGER REFERENCES public.farms(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for wallets
CREATE TRIGGER handle_wallets_created_at
BEFORE INSERT ON wallets
FOR EACH ROW
EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  amount NUMERIC(24, 8) NOT NULL,
  status TEXT DEFAULT 'pending',
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for transactions
CREATE TRIGGER handle_transactions_created_at
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security on all tables
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for farms
CREATE POLICY "Allow users to read farms"
  ON public.farms FOR SELECT
  USING (true);

CREATE POLICY "Allow users to create farms"
  ON public.farms FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow owners to update farms"
  ON public.farms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Allow owners to delete farms"
  ON public.farms FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for agents
CREATE POLICY "Allow users to read agents"
  ON public.agents FOR SELECT
  USING (true);

CREATE POLICY "Allow farm owners to manage agents"
  ON public.agents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.farms
      WHERE farms.id = agents.farm_id
      AND farms.user_id = auth.uid()
    )
  );

-- Create RLS policies for strategies
CREATE POLICY "Allow users to read strategies"
  ON public.strategies FOR SELECT
  USING (true);

CREATE POLICY "Allow users to create strategies"
  ON public.strategies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update strategies"
  ON public.strategies FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create RLS policies for wallets
CREATE POLICY "Allow users to read wallets"
  ON public.wallets FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.farms
      WHERE farms.id = wallets.farm_id
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to create wallets"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Allow wallet owners to update wallets"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = owner_id);

-- Create RLS policies for transactions
CREATE POLICY "Allow users to read transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = transactions.wallet_id
      AND (wallets.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.farms
          WHERE farms.id = transactions.farm_id
          AND farms.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Allow wallet owners to create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE wallets.id = transactions.wallet_id
      AND wallets.owner_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_farm_id ON public.agents(farm_id);
CREATE INDEX IF NOT EXISTS idx_wallets_owner_id ON public.wallets(owner_id);
CREATE INDEX IF NOT EXISTS idx_wallets_farm_id ON public.wallets(farm_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farm_id ON public.transactions(farm_id);
