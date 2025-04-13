-- Create wallet connections table
CREATE TABLE wallet_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('metamask', 'walletconnect', 'coinbase', 'manual')),
  chain_id INTEGER NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (address, user_id)
);

-- Create wallet transactions table
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'fee', 'profit', 'loss')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  timestamp TIMESTAMPTZ NOT NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wallet balances table
CREATE TABLE wallet_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  currency TEXT NOT NULL,
  balance TEXT NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet_address, currency, user_id)
);

-- Create farm funding allocations table
CREATE TABLE farm_funding_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('initial', 'additional', 'withdrawal')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create strategy allocations table
CREATE TABLE strategy_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('initial', 'additional', 'withdrawal')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at_wallet_connections
BEFORE UPDATE ON wallet_connections
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_wallet_transactions
BEFORE UPDATE ON wallet_transactions
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_wallet_balances
BEFORE UPDATE ON wallet_balances
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_farm_funding_allocations
BEFORE UPDATE ON farm_funding_allocations
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_strategy_allocations
BEFORE UPDATE ON strategy_allocations
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Add Row Level Security (RLS)
ALTER TABLE wallet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_funding_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wallet connections
CREATE POLICY "Users can view their own wallet connections" ON wallet_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet connections" ON wallet_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet connections" ON wallet_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallet connections" ON wallet_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for wallet transactions
CREATE POLICY "Users can view their own wallet transactions" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet transactions" ON wallet_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet transactions" ON wallet_transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for wallet balances
CREATE POLICY "Users can view their own wallet balances" ON wallet_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet balances" ON wallet_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet balances" ON wallet_balances
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for farm funding allocations
CREATE POLICY "Users can view their own farm funding allocations" ON farm_funding_allocations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own farm funding allocations" ON farm_funding_allocations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own farm funding allocations" ON farm_funding_allocations
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for strategy allocations
CREATE POLICY "Users can view their own strategy allocations" ON strategy_allocations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategy allocations" ON strategy_allocations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategy allocations" ON strategy_allocations
  FOR UPDATE USING (auth.uid() = user_id); 