-- Migration: Vault System for Trading Farm
-- Description: Set up tables for vault system, linked accounts, and transaction logs

-- Create vaults table
CREATE TABLE IF NOT EXISTS public.vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, name)
);

-- Create vault_balances table
CREATE TABLE IF NOT EXISTS public.vault_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL,
  amount DECIMAL(36, 18) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vault_id, asset_symbol)
);

-- Create linked_accounts table (exchange APIs, blockchain wallets, etc.)
CREATE TABLE IF NOT EXISTS public.linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'exchange_api', 'defi_wallet', 'bank_account', etc.
  provider TEXT NOT NULL, -- 'binance', 'coinbase', 'metamask', etc.
  encrypted_credentials TEXT, -- Encrypted JSON string
  status TEXT NOT NULL DEFAULT 'active',
  requires_monitoring BOOLEAN NOT NULL DEFAULT false,
  last_monitored_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create transaction_logs table
CREATE TABLE IF NOT EXISTS public.transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  vault_id UUID REFERENCES public.vaults(id) ON DELETE SET NULL,
  linked_account_id UUID REFERENCES public.linked_accounts(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'transfer', 'fee', etc.
  asset_symbol TEXT NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', etc.
  transaction_hash TEXT, -- Blockchain transaction hash if applicable
  external_id TEXT, -- Exchange transaction ID if applicable
  description TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create triggers for automatic timestamps
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vaults_created_at_trigger') THEN
    CREATE TRIGGER vaults_created_at_trigger
    BEFORE INSERT ON public.vaults
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vaults_updated_at_trigger') THEN
    CREATE TRIGGER vaults_updated_at_trigger
    BEFORE UPDATE ON public.vaults
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vault_balances_created_at_trigger') THEN
    CREATE TRIGGER vault_balances_created_at_trigger
    BEFORE INSERT ON public.vault_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vault_balances_updated_at_trigger') THEN
    CREATE TRIGGER vault_balances_updated_at_trigger
    BEFORE UPDATE ON public.vault_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'linked_accounts_created_at_trigger') THEN
    CREATE TRIGGER linked_accounts_created_at_trigger
    BEFORE INSERT ON public.linked_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'linked_accounts_updated_at_trigger') THEN
    CREATE TRIGGER linked_accounts_updated_at_trigger
    BEFORE UPDATE ON public.linked_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'transaction_logs_created_at_trigger') THEN
    CREATE TRIGGER transaction_logs_created_at_trigger
    BEFORE INSERT ON public.transaction_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'transaction_logs_updated_at_trigger') THEN
    CREATE TRIGGER transaction_logs_updated_at_trigger
    BEFORE UPDATE ON public.transaction_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for vaults
CREATE POLICY "Users can view vaults in their farms" 
ON public.vaults FOR SELECT 
USING (
  (SELECT owner_id FROM public.farms WHERE id = vaults.farm_id) = auth.uid()
);

CREATE POLICY "Users can insert vaults in their farms" 
ON public.vaults FOR INSERT 
WITH CHECK (
  (SELECT owner_id FROM public.farms WHERE id = NEW.farm_id) = auth.uid()
);

CREATE POLICY "Users can update vaults in their farms" 
ON public.vaults FOR UPDATE
USING (
  (SELECT owner_id FROM public.farms WHERE id = vaults.farm_id) = auth.uid()
);

CREATE POLICY "Users can delete vaults in their farms" 
ON public.vaults FOR DELETE
USING (
  (SELECT owner_id FROM public.farms WHERE id = vaults.farm_id) = auth.uid()
);

-- RLS policies for vault_balances
CREATE POLICY "Users can view vault_balances in their farms" 
ON public.vault_balances FOR SELECT 
USING (
    vault_id IN (SELECT v.id FROM public.vaults v WHERE (SELECT owner_id FROM public.farms WHERE id = v.farm_id) = auth.uid())
);

CREATE POLICY "Users can insert vault_balances in their farms" 
ON public.vault_balances FOR INSERT 
WITH CHECK (
    NEW.vault_id IN (SELECT v.id FROM public.vaults v WHERE (SELECT owner_id FROM public.farms WHERE id = v.farm_id) = auth.uid())
);

CREATE POLICY "Users can update vault_balances in their farms" 
ON public.vault_balances FOR UPDATE
USING (
    vault_id IN (SELECT v.id FROM public.vaults v WHERE (SELECT owner_id FROM public.farms WHERE id = v.farm_id) = auth.uid())
);

-- RLS policies for linked_accounts
CREATE POLICY "Users can view linked_accounts in their farms" 
ON public.linked_accounts FOR SELECT 
USING (
  (SELECT owner_id FROM public.farms WHERE id = linked_accounts.farm_id) = auth.uid()
);

CREATE POLICY "Users can insert linked_accounts in their farms" 
ON public.linked_accounts FOR INSERT 
WITH CHECK (
  (SELECT owner_id FROM public.farms WHERE id = NEW.farm_id) = auth.uid()
);

CREATE POLICY "Users can update linked_accounts in their farms" 
ON public.linked_accounts FOR UPDATE
USING (
  (SELECT owner_id FROM public.farms WHERE id = linked_accounts.farm_id) = auth.uid()
);

CREATE POLICY "Users can delete linked_accounts in their farms"
ON public.linked_accounts FOR DELETE
USING (
  (SELECT owner_id FROM public.farms WHERE id = linked_accounts.farm_id) = auth.uid()
);

-- RLS policies for transaction_logs
CREATE POLICY "Users can view transaction_logs in their farms" 
ON public.transaction_logs FOR SELECT 
USING (
  (SELECT owner_id FROM public.farms WHERE id = transaction_logs.farm_id) = auth.uid()
);

CREATE POLICY "Users can insert transaction_logs in their farms" 
ON public.transaction_logs FOR INSERT 
WITH CHECK (
  (SELECT owner_id FROM public.farms WHERE id = NEW.farm_id) = auth.uid()
);

-- Typically logs might not be updatable/deletable by users, only system roles
CREATE POLICY "Allow system to manage transaction_logs" 
ON public.transaction_logs FOR ALL
USING (auth.role() = 'service_role') -- Example: Restrict modification to service role
WITH CHECK (auth.role() = 'service_role'); 