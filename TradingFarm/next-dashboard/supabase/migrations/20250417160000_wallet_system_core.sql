-- Trading Farm Wallet System: Core Schema
-- Phase 1: Wallets, Balances, Transactions, Assignments, Vaults, Permissions

-- 1. Wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address TEXT NOT NULL,
    chain TEXT NOT NULL, -- e.g. 'ethereum', 'polygon'
    type TEXT NOT NULL,  -- 'metamask', 'vault', 'external', etc.
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES public.elizaos_agents(id) ON DELETE SET NULL,
    vault_id UUID REFERENCES public.vaults(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_address ON public.wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_farm_id ON public.wallets(farm_id);
CREATE INDEX IF NOT EXISTS idx_wallets_agent_id ON public.wallets(agent_id);
CREATE INDEX IF NOT EXISTS idx_wallets_vault_id ON public.wallets(vault_id);

-- Triggers for timestamps
DROP TRIGGER IF EXISTS handle_wallets_created_at ON public.wallets;
CREATE TRIGGER handle_wallets_created_at
  BEFORE INSERT ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_wallets_updated_at ON public.wallets;
CREATE TRIGGER handle_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS and policies
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their wallets" ON public.wallets FOR SELECT
  USING (user_id = auth.uid() OR farm_id IN (SELECT farm_id FROM public.farm_users WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage their wallets" ON public.wallets FOR ALL
  USING (user_id = auth.uid());

-- 2. Wallet Balances table
CREATE TABLE IF NOT EXISTS public.wallet_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    asset TEXT NOT NULL, -- e.g. 'ETH', 'USDC'
    balance NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_wallet_id ON public.wallet_balances(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_asset ON public.wallet_balances(asset);

-- 3. Wallet Transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    tx_hash TEXT,
    asset TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    tx_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'transfer', 'fee', etc.
    counterparty_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tx_hash ON public.wallet_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_asset ON public.wallet_transactions(asset);

-- Triggers for timestamps
DROP TRIGGER IF EXISTS handle_wallet_transactions_created_at ON public.wallet_transactions;
CREATE TRIGGER handle_wallet_transactions_created_at
  BEFORE INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_wallet_transactions_updated_at ON public.wallet_transactions;
CREATE TRIGGER handle_wallet_transactions_updated_at
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Wallet Assignments table
CREATE TABLE IF NOT EXISTS public.wallet_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    assigned_to_type TEXT NOT NULL, -- 'farm', 'agent', 'goal', etc.
    assigned_to_id UUID NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_wallet_assignments_wallet_id ON public.wallet_assignments(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_assignments_assigned_to_id ON public.wallet_assignments(assigned_to_id);

-- Triggers for timestamps
DROP TRIGGER IF EXISTS handle_wallet_assignments_created_at ON public.wallet_assignments;
CREATE TRIGGER handle_wallet_assignments_created_at
  BEFORE INSERT ON public.wallet_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_wallet_assignments_updated_at ON public.wallet_assignments;
CREATE TRIGGER handle_wallet_assignments_updated_at
  BEFORE UPDATE ON public.wallet_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Vaults table
CREATE TABLE IF NOT EXISTS public.vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_vaults_owner_id ON public.vaults(owner_id);

-- Triggers for timestamps
DROP TRIGGER IF EXISTS handle_vaults_created_at ON public.vaults;
CREATE TRIGGER handle_vaults_created_at
  BEFORE INSERT ON public.vaults
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_vaults_updated_at ON public.vaults;
CREATE TRIGGER handle_vaults_updated_at
  BEFORE UPDATE ON public.vaults
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Wallet Permissions table
CREATE TABLE IF NOT EXISTS public.wallet_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'owner', 'manager', 'agent', 'viewer'
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wallet_permissions_wallet_id ON public.wallet_permissions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_permissions_user_id ON public.wallet_permissions(user_id);

-- Triggers for timestamps
DROP TRIGGER IF EXISTS handle_wallet_permissions_created_at ON public.wallet_permissions;
CREATE TRIGGER handle_wallet_permissions_created_at
  BEFORE INSERT ON public.wallet_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_wallet_permissions_updated_at ON public.wallet_permissions;
CREATE TRIGGER handle_wallet_permissions_updated_at
  BEFORE UPDATE ON public.wallet_permissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS and policies for all tables (example shown for wallets, repeat as needed)
-- Add additional policies for assignments, vaults, permissions as required
