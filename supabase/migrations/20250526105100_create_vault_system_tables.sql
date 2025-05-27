-- Enable pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function to automatically set updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supported Currencies Table
CREATE TABLE IF NOT EXISTS public.supported_currencies (
    currency_code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('fiat', 'crypto')), -- 'fiat', 'crypto'
    precision INT NOT NULL DEFAULT 2, -- Number of decimal places
    min_transaction_amount NUMERIC(36, 18) DEFAULT 0.01,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.supported_currencies IS 'Stores information about currencies supported by the vault system.';
COMMENT ON COLUMN public.supported_currencies.precision IS 'Number of decimal places for the currency.';

-- Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL, -- Can be a user_id from auth.users or an agent_id from trading_agents
    owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'agent')), -- 'user' or 'agent'
    currency TEXT NOT NULL REFERENCES public.supported_currencies(currency_code),
    balance NUMERIC(36, 18) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.wallets IS 'Stores wallet information for users and trading agents.';
COMMENT ON COLUMN public.wallets.owner_id IS 'The ID of the user (from auth.users) or trading agent (from trading_agents) who owns the wallet.';
COMMENT ON COLUMN public.wallets.balance IS 'Current balance of the wallet, respecting currency precision.';

-- Vault Users Table (Links auth.users to their primary vault wallet)
CREATE TABLE IF NOT EXISTS public.vault_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    primary_vault_wallet_id UUID UNIQUE REFERENCES public.wallets(wallet_id) ON DELETE SET NULL, -- A user's primary wallet in the vault system
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.vault_users IS 'Links authenticated users to their primary wallet in the vault system.';

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_wallet_id UUID REFERENCES public.wallets(wallet_id),
    destination_wallet_id UUID REFERENCES public.wallets(wallet_id), -- Nullable for external deposits/withdrawals
    amount NUMERIC(36, 18) NOT NULL,
    currency TEXT NOT NULL REFERENCES public.supported_currencies(currency_code),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'trade_settlement', 'fee', 'initial_funding')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    description TEXT,
    transaction_timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT chk_wallets_different CHECK (source_wallet_id <> destination_wallet_id OR source_wallet_id IS NULL OR destination_wallet_id IS NULL),
    CONSTRAINT chk_amount_positive CHECK (amount > 0)
);
COMMENT ON TABLE public.wallet_transactions IS 'Records all financial transactions within the vault system.';
COMMENT ON COLUMN public.wallet_transactions.destination_wallet_id IS 'Can be null for deposits from external sources or withdrawals to external destinations.';
COMMENT ON COLUMN public.wallet_transactions.type IS 'Type of transaction, e.g., deposit, withdrawal, transfer, trade_settlement, fee, initial_funding.';


-- Triggers for updated_at
CREATE TRIGGER set_supported_currencies_updated_at
BEFORE UPDATE ON public.supported_currencies
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_vault_users_updated_at
BEFORE UPDATE ON public.vault_users
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_wallet_transactions_updated_at
BEFORE UPDATE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_owner_id_owner_type ON public.wallets(owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_source_wallet_id ON public.wallet_transactions(source_wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_destination_wallet_id ON public.wallet_transactions(destination_wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_currency ON public.wallet_transactions(currency);


-- RLS Policies

-- Supported Currencies: Publicly readable, admin writable (or use service_role for inserts/updates)
ALTER TABLE public.supported_currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to supported currencies" ON public.supported_currencies FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to supported currencies" ON public.supported_currencies FOR ALL
  USING (auth.role() = 'service_role') 
  WITH CHECK (auth.role() = 'service_role');


-- Wallets: Users can manage their own wallets. Agents will need service_role access or specific RLS.
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own wallets" ON public.wallets
  FOR SELECT USING (auth.uid() = owner_id AND owner_type = 'user');

CREATE POLICY "Users can create wallets for themselves" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = owner_id AND owner_type = 'user');

CREATE POLICY "Users can update their own wallets" ON public.wallets
  FOR UPDATE USING (auth.uid() = owner_id AND owner_type = 'user');

CREATE POLICY "Allow service_role full access to wallets" ON public.wallets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- Vault Users: Users can manage their own entry.
ALTER TABLE public.vault_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own vault_user entry" ON public.vault_users
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow service_role full access to vault_users" ON public.vault_users FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- Wallet Transactions: Users can see their own transactions.
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions related to their wallets" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE (w.wallet_id = source_wallet_id OR w.wallet_id = destination_wallet_id)
      AND w.owner_id = auth.uid() AND w.owner_type = 'user'
    )
  );

CREATE POLICY "Users can insert transactions if they own the source wallet" ON public.wallet_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE w.wallet_id = source_wallet_id
      AND w.owner_id = auth.uid() AND w.owner_type = 'user'
    ) OR source_wallet_id IS NULL 
  );

CREATE POLICY "Allow service_role full access to wallet_transactions" ON public.wallet_transactions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed some default supported currencies
INSERT INTO public.supported_currencies (currency_code, name, type, precision, min_transaction_amount) VALUES
('USD', 'US Dollar', 'fiat', 2, 0.01),
('EUR', 'Euro', 'fiat', 2, 0.01),
('GBP', 'British Pound', 'fiat', 2, 0.01),
('BTC', 'Bitcoin', 'crypto', 8, 0.000001),
('ETH', 'Ethereum', 'crypto', 18, 0.00001)
ON CONFLICT (currency_code) DO NOTHING;
