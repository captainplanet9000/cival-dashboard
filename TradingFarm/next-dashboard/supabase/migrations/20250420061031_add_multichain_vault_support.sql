-- Trading Farm Multi-Chain Integration: Add Chain-Native Multisig Support
-- Creating schema for farm_vault_multisigs to support multisig wallets across different chains

-- Create farm_vault_multisigs table with chain-specific multisig wallet details
CREATE TABLE IF NOT EXISTS public.farm_vault_multisigs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    chain_slug TEXT NOT NULL, -- 'evm', 'sonic', 'sui', 'solana'
    multisig_address TEXT NOT NULL,
    multisig_type TEXT NOT NULL, -- 'safe', 'msafe', 'squads'
    policy_config JSONB DEFAULT '{}'::jsonb, -- unified policy rules
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'pending'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(vault_id, chain_slug)
);

-- Create multisig_owners table for storing owner addresses per multisig
CREATE TABLE IF NOT EXISTS public.multisig_owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    multisig_id UUID NOT NULL REFERENCES public.farm_vault_multisigs(id) ON DELETE CASCADE,
    owner_address TEXT NOT NULL,
    owner_type TEXT NOT NULL, -- 'user', 'backend', 'agent'
    weight INTEGER DEFAULT 1, -- for weighted multisigs
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(multisig_id, owner_address)
);

-- Create multisig_transactions table for tracking multisig transaction status
CREATE TABLE IF NOT EXISTS public.multisig_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    multisig_id UUID NOT NULL REFERENCES public.farm_vault_multisigs(id) ON DELETE CASCADE,
    tx_hash TEXT,
    tx_data TEXT, -- serialized transaction data
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'executed', 'failed', 'rejected'
    nonce INTEGER, -- transaction nonce (for tracking purposes)
    confirmations INTEGER DEFAULT 0, -- number of confirmations received
    threshold INTEGER DEFAULT 2, -- required confirmations to execute
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create multisig_confirmations table for tracking signatures
CREATE TABLE IF NOT EXISTS public.multisig_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_id UUID NOT NULL REFERENCES public.multisig_transactions(id) ON DELETE CASCADE,
    signer_address TEXT NOT NULL,
    signature TEXT,
    confirmed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create chain_asset_mapping table for tracking canonical asset representations
CREATE TABLE IF NOT EXISTS public.chain_asset_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name TEXT NOT NULL, -- e.g. 'USDC'
    chain_slug TEXT NOT NULL, -- 'evm', 'sonic', 'sui', 'solana'
    contract_address TEXT NOT NULL, -- address on specific chain
    decimals INTEGER NOT NULL DEFAULT 18,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(canonical_name, chain_slug)
);

-- Create bridge_transactions table
CREATE TABLE IF NOT EXISTS public.bridge_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_chain TEXT NOT NULL,
    destination_chain TEXT NOT NULL,
    bridge_provider TEXT NOT NULL, -- 'layerzero', 'wormhole', 'sonic_gateway'
    source_tx_hash TEXT,
    destination_tx_hash TEXT,
    amount NUMERIC NOT NULL,
    asset TEXT NOT NULL,
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_farm_vault_multisigs_vault_id ON public.farm_vault_multisigs(vault_id);
CREATE INDEX IF NOT EXISTS idx_farm_vault_multisigs_chain_slug ON public.farm_vault_multisigs(chain_slug);
CREATE INDEX IF NOT EXISTS idx_farm_vault_multisigs_multisig_address ON public.farm_vault_multisigs(multisig_address);

CREATE INDEX IF NOT EXISTS idx_multisig_owners_multisig_id ON public.multisig_owners(multisig_id);
CREATE INDEX IF NOT EXISTS idx_multisig_owners_owner_address ON public.multisig_owners(owner_address);

CREATE INDEX IF NOT EXISTS idx_multisig_transactions_multisig_id ON public.multisig_transactions(multisig_id);
CREATE INDEX IF NOT EXISTS idx_multisig_transactions_tx_hash ON public.multisig_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_multisig_transactions_status ON public.multisig_transactions(status);

CREATE INDEX IF NOT EXISTS idx_multisig_confirmations_tx_id ON public.multisig_confirmations(tx_id);
CREATE INDEX IF NOT EXISTS idx_multisig_confirmations_signer_address ON public.multisig_confirmations(signer_address);

CREATE INDEX IF NOT EXISTS idx_chain_asset_mapping_canonical_name ON public.chain_asset_mapping(canonical_name);
CREATE INDEX IF NOT EXISTS idx_chain_asset_mapping_chain_slug ON public.chain_asset_mapping(chain_slug);

CREATE INDEX IF NOT EXISTS idx_bridge_transactions_vault_id ON public.bridge_transactions(vault_id);
CREATE INDEX IF NOT EXISTS idx_bridge_transactions_source_chain ON public.bridge_transactions(source_chain);
CREATE INDEX IF NOT EXISTS idx_bridge_transactions_destination_chain ON public.bridge_transactions(destination_chain);
CREATE INDEX IF NOT EXISTS idx_bridge_transactions_status ON public.bridge_transactions(status);

-- Add triggers for created_at and updated_at timestamps
-- farm_vault_multisigs
DROP TRIGGER IF EXISTS handle_farm_vault_multisigs_created_at ON public.farm_vault_multisigs;
CREATE TRIGGER handle_farm_vault_multisigs_created_at
  BEFORE INSERT ON public.farm_vault_multisigs
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_farm_vault_multisigs_updated_at ON public.farm_vault_multisigs;
CREATE TRIGGER handle_farm_vault_multisigs_updated_at
  BEFORE UPDATE ON public.farm_vault_multisigs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- multisig_owners
DROP TRIGGER IF EXISTS handle_multisig_owners_created_at ON public.multisig_owners;
CREATE TRIGGER handle_multisig_owners_created_at
  BEFORE INSERT ON public.multisig_owners
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_multisig_owners_updated_at ON public.multisig_owners;
CREATE TRIGGER handle_multisig_owners_updated_at
  BEFORE UPDATE ON public.multisig_owners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- multisig_transactions
DROP TRIGGER IF EXISTS handle_multisig_transactions_created_at ON public.multisig_transactions;
CREATE TRIGGER handle_multisig_transactions_created_at
  BEFORE INSERT ON public.multisig_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_multisig_transactions_updated_at ON public.multisig_transactions;
CREATE TRIGGER handle_multisig_transactions_updated_at
  BEFORE UPDATE ON public.multisig_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- chain_asset_mapping
DROP TRIGGER IF EXISTS handle_chain_asset_mapping_created_at ON public.chain_asset_mapping;
CREATE TRIGGER handle_chain_asset_mapping_created_at
  BEFORE INSERT ON public.chain_asset_mapping
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_chain_asset_mapping_updated_at ON public.chain_asset_mapping;
CREATE TRIGGER handle_chain_asset_mapping_updated_at
  BEFORE UPDATE ON public.chain_asset_mapping
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- bridge_transactions
DROP TRIGGER IF EXISTS handle_bridge_transactions_created_at ON public.bridge_transactions;
CREATE TRIGGER handle_bridge_transactions_created_at
  BEFORE INSERT ON public.bridge_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_bridge_transactions_updated_at ON public.bridge_transactions;
CREATE TRIGGER handle_bridge_transactions_updated_at
  BEFORE UPDATE ON public.bridge_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.farm_vault_multisigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multisig_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multisig_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multisig_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_asset_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- farm_vault_multisigs - owners can manage their vault multisigs
CREATE POLICY "Users can view their vault multisigs" ON public.farm_vault_multisigs FOR SELECT
  USING (vault_id IN (SELECT id FROM public.vaults WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage their vault multisigs" ON public.farm_vault_multisigs FOR ALL
  USING (vault_id IN (SELECT id FROM public.vaults WHERE owner_id = auth.uid()));

CREATE POLICY "Farm admins can view farm vault multisigs" ON public.farm_vault_multisigs FOR SELECT
  USING (
    vault_id IN (
      SELECT v.id FROM public.vaults v
      JOIN public.wallets w ON w.vault_id = v.id
      JOIN public.farms f ON w.farm_id = f.id
      JOIN public.farm_users fu ON fu.farm_id = f.id
      WHERE fu.user_id = auth.uid() AND fu.role = 'admin'
    )
  );

-- multisig_owners - same policies as farm_vault_multisigs
CREATE POLICY "Users can view their multisig owners" ON public.multisig_owners FOR SELECT
  USING (multisig_id IN (SELECT id FROM public.farm_vault_multisigs WHERE vault_id IN (SELECT id FROM public.vaults WHERE owner_id = auth.uid())));

CREATE POLICY "Users can manage their multisig owners" ON public.multisig_owners FOR ALL
  USING (multisig_id IN (SELECT id FROM public.farm_vault_multisigs WHERE vault_id IN (SELECT id FROM public.vaults WHERE owner_id = auth.uid())));

CREATE POLICY "Farm admins can view multisig owners" ON public.multisig_owners FOR SELECT
  USING (
    multisig_id IN (
      SELECT fvm.id FROM public.farm_vault_multisigs fvm
      JOIN public.vaults v ON fvm.vault_id = v.id
      JOIN public.wallets w ON w.vault_id = v.id
      JOIN public.farms f ON w.farm_id = f.id
      JOIN public.farm_users fu ON fu.farm_id = f.id
      WHERE fu.user_id = auth.uid() AND fu.role = 'admin'
    )
  );

-- Similar policies for multisig_transactions and multisig_confirmations
CREATE POLICY "Users can view their multisig transactions" ON public.multisig_transactions FOR SELECT
  USING (multisig_id IN (SELECT id FROM public.farm_vault_multisigs WHERE vault_id IN (SELECT id FROM public.vaults WHERE owner_id = auth.uid())));

CREATE POLICY "Users can manage their multisig transactions" ON public.multisig_transactions FOR ALL
  USING (multisig_id IN (SELECT id FROM public.farm_vault_multisigs WHERE vault_id IN (SELECT id FROM public.vaults WHERE owner_id = auth.uid())));

CREATE POLICY "Users can view multisig confirmations" ON public.multisig_confirmations FOR SELECT
  USING (tx_id IN (SELECT id FROM public.multisig_transactions WHERE multisig_id IN 
    (SELECT id FROM public.farm_vault_multisigs WHERE vault_id IN (SELECT id FROM public.vaults WHERE owner_id = auth.uid()))));

CREATE POLICY "Users can manage multisig confirmations" ON public.multisig_confirmations FOR ALL
  USING (tx_id IN (SELECT id FROM public.multisig_transactions WHERE multisig_id IN 
    (SELECT id FROM public.farm_vault_multisigs WHERE vault_id IN (SELECT id FROM public.vaults WHERE owner_id = auth.uid()))));

-- chain_asset_mapping - read-only for all authenticated users
CREATE POLICY "All users can view chain asset mappings" ON public.chain_asset_mapping FOR SELECT
  USING (auth.role() = 'authenticated');

-- bridge_transactions - same rules as vaults
CREATE POLICY "Users can view their bridge transactions" ON public.bridge_transactions FOR SELECT
  USING (vault_id IN (SELECT id FROM public.vaults WHERE owner_id = auth.uid()));

CREATE POLICY "Users can manage their bridge transactions" ON public.bridge_transactions FOR ALL
  USING (vault_id IN (SELECT id FROM public.vaults WHERE owner_id = auth.uid()));

CREATE POLICY "Farm admins can view bridge transactions" ON public.bridge_transactions FOR SELECT
  USING (
    vault_id IN (
      SELECT v.id FROM public.vaults v
      JOIN public.wallets w ON w.vault_id = v.id
      JOIN public.farms f ON w.farm_id = f.id
      JOIN public.farm_users fu ON fu.farm_id = f.id
      WHERE fu.user_id = auth.uid() AND fu.role = 'admin'
    )
  );