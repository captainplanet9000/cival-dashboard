-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create farms table
CREATE TABLE IF NOT EXISTS farms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  goal TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  total_value DECIMAL(20,8) DEFAULT 0,
  value_change_24h DECIMAL(20,8) DEFAULT 0
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  strategy_config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  performance_metrics JSONB DEFAULT '{}'
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  balance DECIMAL(20,8) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'trade', 'flash_loan')),
  amount DECIMAL(20,8) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}'
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  amount DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}'
);

-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  parameters JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Farms policies
CREATE POLICY "Users can view their own farms"
  ON farms FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own farms"
  ON farms FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own farms"
  ON farms FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own farms"
  ON farms FOR DELETE
  USING (auth.uid() = owner_id);

-- Agents policies (through farm ownership)
CREATE POLICY "Users can view agents in their farms"
  ON agents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = agents.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- Wallets policies (through farm ownership)
CREATE POLICY "Users can manage wallets in their farms"
  ON wallets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = wallets.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- Transactions policies (through wallet ownership)
CREATE POLICY "Users can manage transactions in their wallets"
  ON transactions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM wallets w
    JOIN farms f ON f.id = w.farm_id
    WHERE w.id = transactions.wallet_id
    AND f.owner_id = auth.uid()
  ));

-- Trades policies (through agent ownership)
CREATE POLICY "Users can manage trades through their agents"
  ON trades FOR ALL
  USING (EXISTS (
    SELECT 1 FROM agents a
    JOIN farms f ON f.id = a.farm_id
    WHERE a.id = trades.agent_id
    AND f.owner_id = auth.uid()
  ));

-- Strategies policies
CREATE POLICY "Users can view public strategies"
  ON strategies FOR SELECT
  USING (is_public OR owner_id = auth.uid());

CREATE POLICY "Users can manage their own strategies"
  ON strategies FOR ALL
  USING (owner_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX idx_farms_owner ON farms(owner_id);
CREATE INDEX idx_agents_farm ON agents(farm_id);
CREATE INDEX idx_wallets_farm ON wallets(farm_id);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_trades_agent ON trades(agent_id);
CREATE INDEX idx_strategies_owner ON strategies(owner_id); 