-- Migration: Unified Vault System
-- Consolidates vault, transactions, wallets, and balances into a unified structure

-- Create extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create vault_master table (top-level vault)
CREATE TABLE IF NOT EXISTS public.vault_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  total_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  allocated_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  reserve_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  high_risk_exposure DECIMAL(20, 8) NOT NULL DEFAULT 0,
  security_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vault_accounts table (farm/agent wallets)
CREATE TABLE IF NOT EXISTS public.vault_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES public.vault_master(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- trading, reserve, settlement, staking, yield
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  locked_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  risk_level TEXT NOT NULL DEFAULT 'medium',
  address TEXT, -- Blockchain address if applicable
  farm_id UUID, -- Optional link to a farm
  agent_id UUID, -- Optional link to an agent
  security_level TEXT NOT NULL DEFAULT 'standard',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  settings JSONB NOT NULL DEFAULT '{
    "withdrawalLimit": 10000,
    "withdrawalTimelock": 24,
    "approvalRequired": false,
    "twoFactorRequired": false
  }'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vault_transactions table (unified transactions)
CREATE TABLE IF NOT EXISTS public.vault_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- deposit, withdrawal, transfer, allocation, fee, interest, reward
  amount DECIMAL(20, 8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  source_id UUID NOT NULL, -- Can be vault_accounts.id or external
  source_type TEXT NOT NULL, -- vault_account, external_wallet, exchange, etc.
  destination_id UUID NOT NULL, -- Can be vault_accounts.id or external
  destination_type TEXT NOT NULL, -- vault_account, external_wallet, exchange, etc.
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  fee DECIMAL(20, 8) DEFAULT 0,
  fee_currency TEXT,
  hash TEXT, -- Transaction hash if blockchain transaction
  reference TEXT, -- Reference code
  description TEXT,
  network TEXT, -- For blockchain transactions
  confirmations INTEGER DEFAULT 0, -- For blockchain transactions
  approvals_required INTEGER DEFAULT 1,
  approvals_current INTEGER DEFAULT 0,
  approver_ids JSONB DEFAULT '[]',
  metadata JSONB,
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vault_balance_history table (for charts and auditing)
CREATE TABLE IF NOT EXISTS public.vault_balance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.vault_accounts(id) ON DELETE CASCADE,
  balance DECIMAL(20, 8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transaction_id UUID REFERENCES public.vault_transactions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vault_security_policies table
CREATE TABLE IF NOT EXISTS public.vault_security_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.vault_accounts(id) ON DELETE CASCADE,
  withdrawal_rules JSONB NOT NULL DEFAULT '{
    "limits": {
      "daily": 10000,
      "weekly": 50000,
      "monthly": 100000
    },
    "whitelistedAddresses": [],
    "requireApprovalThreshold": 5000,
    "cooldownPeriod": 24
  }'::JSONB,
  access_rules JSONB NOT NULL DEFAULT '{
    "ipWhitelist": [],
    "requiredAuthMethods": ["password"],
    "sessionTimeout": 30,
    "inactivityLockout": true
  }'::JSONB,
  alert_rules JSONB NOT NULL DEFAULT '{
    "unusualActivityThreshold": 0.8,
    "largeTransferThreshold": 5000,
    "newDeviceNotification": true,
    "failedLoginThreshold": 3
  }'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vault_audit_logs table
CREATE TABLE IF NOT EXISTS public.vault_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  account_id UUID REFERENCES public.vault_accounts(id),
  transaction_id UUID REFERENCES public.vault_transactions(id),
  details JSONB,
  severity TEXT NOT NULL DEFAULT 'info' -- info, warning, critical
);

-- Create stored procedure for updating account balances
CREATE OR REPLACE FUNCTION public.update_vault_account_balance(
  p_account_id UUID,
  p_change_amount DECIMAL(20, 8),
  p_transaction_id UUID
) RETURNS void AS $$
DECLARE
  v_current_balance DECIMAL(20, 8);
  v_new_balance DECIMAL(20, 8);
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM public.vault_accounts
  WHERE id = p_account_id;
  
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance + p_change_amount;
  
  -- Update account balance
  UPDATE public.vault_accounts
  SET 
    balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_account_id;
  
  -- Record balance history
  INSERT INTO public.vault_balance_history
    (account_id, balance, transaction_id)
  VALUES
    (p_account_id, v_new_balance, p_transaction_id);
    
  -- Update master vault totals if this is a vault account
  UPDATE public.vault_master vm
  SET 
    total_balance = (
      SELECT SUM(balance) 
      FROM public.vault_accounts 
      WHERE master_id = vm.id
    ),
    updated_at = NOW()
  FROM public.vault_accounts va
  WHERE va.id = p_account_id AND va.master_id = vm.id;
  
END;
$$ LANGUAGE plpgsql;

-- Add triggers for created_at and updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER handle_vault_master_created_at
BEFORE INSERT ON public.vault_master
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_vault_master_updated_at
BEFORE UPDATE ON public.vault_master
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_vault_accounts_created_at
BEFORE INSERT ON public.vault_accounts
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_vault_accounts_updated_at
BEFORE UPDATE ON public.vault_accounts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_vault_transactions_created_at
BEFORE INSERT ON public.vault_transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_vault_transactions_updated_at
BEFORE UPDATE ON public.vault_transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_vault_security_policies_created_at
BEFORE INSERT ON public.vault_security_policies
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_vault_security_policies_updated_at
BEFORE UPDATE ON public.vault_security_policies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vault_accounts_master_id ON public.vault_accounts(master_id);
CREATE INDEX IF NOT EXISTS idx_vault_accounts_farm_id ON public.vault_accounts(farm_id);
CREATE INDEX IF NOT EXISTS idx_vault_accounts_agent_id ON public.vault_accounts(agent_id);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_source_id ON public.vault_transactions(source_id);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_destination_id ON public.vault_transactions(destination_id);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_status ON public.vault_transactions(status);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_type ON public.vault_transactions(type);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_created_at ON public.vault_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_vault_balance_history_account_id ON public.vault_balance_history(account_id);
CREATE INDEX IF NOT EXISTS idx_vault_balance_history_timestamp ON public.vault_balance_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_vault_audit_logs_user_id ON public.vault_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_audit_logs_action ON public.vault_audit_logs(action);

-- Enable Row Level Security on all tables
ALTER TABLE public.vault_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can access their own vault master"
ON public.vault_master
FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can access their vault accounts"
ON public.vault_accounts
FOR ALL USING (
  master_id IN (
    SELECT id FROM public.vault_master WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can access their vault transactions"
ON public.vault_transactions
FOR ALL USING (
  source_id IN (
    SELECT va.id FROM public.vault_accounts va
    JOIN public.vault_master vm ON va.master_id = vm.id
    WHERE vm.owner_id = auth.uid()
  )
  OR
  destination_id IN (
    SELECT va.id FROM public.vault_accounts va
    JOIN public.vault_master vm ON va.master_id = vm.id
    WHERE vm.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can access their vault balance history"
ON public.vault_balance_history
FOR ALL USING (
  account_id IN (
    SELECT va.id FROM public.vault_accounts va
    JOIN public.vault_master vm ON va.master_id = vm.id
    WHERE vm.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can access their vault security policies"
ON public.vault_security_policies
FOR ALL USING (
  account_id IN (
    SELECT va.id FROM public.vault_accounts va
    JOIN public.vault_master vm ON va.master_id = vm.id
    WHERE vm.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can access their vault audit logs"
ON public.vault_audit_logs
FOR ALL USING (
  user_id = auth.uid()
  OR
  account_id IN (
    SELECT va.id FROM public.vault_accounts va
    JOIN public.vault_master vm ON va.master_id = vm.id
    WHERE vm.owner_id = auth.uid()
  )
); 