
-- Migration for Unified Banking System
-- Implements a consolidated banking system with vault-based structure

-- Unified vault accounts table
CREATE TABLE IF NOT EXISTS public.vault_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  balance DECIMAL(18, 8) NOT NULL DEFAULT 0,
  account_type TEXT NOT NULL, -- 'master', 'farm', 'agent'
  parent_id UUID REFERENCES public.vault_accounts(id), -- hierarchical relationship
  farm_id UUID REFERENCES public.farms(id), -- associated farm if applicable
  agent_id UUID REFERENCES public.agents(id), -- associated agent if applicable
  security_level TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'multisig', 'high'
  security_config JSONB, -- security configurations (keys, signatures required, etc.)
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_vault_accounts
BEFORE UPDATE ON public.vault_accounts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Unified transactions table
CREATE TABLE IF NOT EXISTS public.unified_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'transfer', 'trade', 'fee'
  amount DECIMAL(18, 8) NOT NULL,
  currency TEXT NOT NULL,
  source_account_id UUID REFERENCES public.vault_accounts(id),
  destination_account_id UUID REFERENCES public.vault_accounts(id), 
  exchange_id TEXT, -- external exchange identifier if applicable
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'rejected', 'failed'
  approval_status TEXT DEFAULT NULL, -- 'required', 'approved', 'rejected'
  approved_by UUID REFERENCES auth.users(id),
  approval_date TIMESTAMP WITH TIME ZONE,
  transaction_hash TEXT, -- blockchain transaction hash if applicable
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_unified_transactions
BEFORE UPDATE ON public.unified_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Transaction approvals for multi-signature accounts
CREATE TABLE IF NOT EXISTS public.transaction_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.unified_transactions(id),
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  comments TEXT,
  approval_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(transaction_id, approver_id)
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_transaction_approvals
BEFORE UPDATE ON public.transaction_approvals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Account balance history for analytics
CREATE TABLE IF NOT EXISTS public.account_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.vault_accounts(id),
  balance DECIMAL(18, 8) NOT NULL,
  currency TEXT NOT NULL,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Exchange integrations table
CREATE TABLE IF NOT EXISTS public.exchange_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  exchange_type TEXT NOT NULL, -- 'binance', 'coinbase', 'bybit', etc.
  status TEXT NOT NULL DEFAULT 'active',
  credentials_id UUID, -- Reference to secure credentials storage
  farm_id UUID REFERENCES public.farms(id),
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_exchange_integrations
BEFORE UPDATE ON public.exchange_integrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Account alert settings
CREATE TABLE IF NOT EXISTS public.account_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.vault_accounts(id),
  alert_type TEXT NOT NULL, -- 'balance_threshold', 'security', 'transaction'
  threshold DECIMAL(18, 8),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notification_channels JSONB, -- email, sms, in-app
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_account_alerts
BEFORE UPDATE ON public.account_alerts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Legacy wallet migration tracking table
CREATE TABLE IF NOT EXISTS public.legacy_wallet_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  vault_account_id UUID NOT NULL REFERENCES public.vault_accounts(id),
  migration_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  migration_date TIMESTAMP WITH TIME ZONE,
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_legacy_wallet_migrations
BEFORE UPDATE ON public.legacy_wallet_migrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to update account balance
CREATE OR REPLACE FUNCTION public.update_account_balance(
  account_id UUID,
  amount DECIMAL,
  is_credit BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Set search path for security
  SET search_path = '';
  
  -- Update the account balance
  IF is_credit THEN
    UPDATE public.vault_accounts
    SET balance = balance + amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = account_id;
  ELSE
    UPDATE public.vault_accounts
    SET balance = balance - amount,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = account_id;
  END IF;
END;
$$;

-- Function to process a transaction
CREATE OR REPLACE FUNCTION public.process_transaction(
  transaction_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_transaction public.unified_transactions;
  v_source_security_level TEXT;
  v_requires_approval BOOLEAN := FALSE;
  v_approval_count INTEGER;
  v_required_approvals INTEGER := 1;
BEGIN
  -- Set search path for security
  SET search_path = '';
  
  -- Get the transaction
  SELECT * INTO v_transaction
  FROM public.unified_transactions
  WHERE id = transaction_id AND status = 'pending';
  
  -- Check if transaction exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check security level if it's a withdrawal or transfer
  IF v_transaction.transaction_type IN ('withdrawal', 'transfer') AND 
     v_transaction.source_account_id IS NOT NULL THEN
    
    SELECT security_level INTO v_source_security_level
    FROM public.vault_accounts
    WHERE id = v_transaction.source_account_id;
    
    -- Determine if approval is required
    IF v_source_security_level = 'multisig' THEN
      v_requires_approval := TRUE;
      -- Get required number of approvals from security config (default: 2)
      SELECT COALESCE(
        (SELECT (security_config->>'required_approvals')::INTEGER 
         FROM public.vault_accounts 
         WHERE id = v_transaction.source_account_id),
        2)
      INTO v_required_approvals;
      
      -- Check if we have enough approvals
      SELECT COUNT(*) INTO v_approval_count
      FROM public.transaction_approvals
      WHERE transaction_id = transaction_id AND approved = TRUE;
      
      IF v_approval_count < v_required_approvals THEN
        -- Update transaction to require approval
        UPDATE public.unified_transactions
        SET approval_status = 'required'
        WHERE id = transaction_id;
        
        RETURN FALSE; -- Pending approval
      END IF;
    END IF;
  END IF;
  
  -- Process the transaction based on type
  CASE v_transaction.transaction_type
    WHEN 'deposit' THEN
      -- Credit the destination account
      IF v_transaction.destination_account_id IS NOT NULL THEN
        PERFORM public.update_account_balance(
          v_transaction.destination_account_id,
          v_transaction.amount,
          TRUE -- is credit
        );
      END IF;
      
    WHEN 'withdrawal' THEN
      -- Debit the source account
      IF v_transaction.source_account_id IS NOT NULL THEN
        PERFORM public.update_account_balance(
          v_transaction.source_account_id,
          v_transaction.amount,
          FALSE -- is debit
        );
      END IF;
      
    WHEN 'transfer' THEN
      -- Debit the source account and credit the destination
      IF v_transaction.source_account_id IS NOT NULL THEN
        PERFORM public.update_account_balance(
          v_transaction.source_account_id,
          v_transaction.amount,
          FALSE -- is debit
        );
      END IF;
      
      IF v_transaction.destination_account_id IS NOT NULL THEN
        PERFORM public.update_account_balance(
          v_transaction.destination_account_id,
          v_transaction.amount,
          TRUE -- is credit
        );
      END IF;
      
    ELSE
      -- Handle other transaction types as needed
  END CASE;
  
  -- Update transaction status
  UPDATE public.unified_transactions
  SET status = 'completed',
      updated_at = TIMEZONE('utc', NOW())
  WHERE id = transaction_id;
  
  -- Record historical balance for analytics
  IF v_transaction.source_account_id IS NOT NULL THEN
    INSERT INTO public.account_balance_history (
      account_id, balance, currency, snapshot_date
    )
    SELECT 
      id, balance, 'USD', TIMEZONE('utc', NOW())
    FROM public.vault_accounts
    WHERE id = v_transaction.source_account_id;
  END IF;
  
  IF v_transaction.destination_account_id IS NOT NULL THEN
    INSERT INTO public.account_balance_history (
      account_id, balance, currency, snapshot_date
    )
    SELECT 
      id, balance, 'USD', TIMEZONE('utc', NOW())
    FROM public.vault_accounts
    WHERE id = v_transaction.destination_account_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Trigger function to handle transaction approval
CREATE OR REPLACE FUNCTION public.handle_transaction_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_account_id UUID;
  v_required_approvals INTEGER := 1;
  v_approval_count INTEGER;
BEGIN
  -- Set search path for security
  SET search_path = '';
  
  -- Set approval date
  NEW.approval_date = TIMEZONE('utc', NOW());
  
  -- Only proceed if approved
  IF NEW.approved = TRUE THEN
    -- Get the transaction details
    SELECT source_account_id INTO v_source_account_id
    FROM public.unified_transactions
    WHERE id = NEW.transaction_id;
    
    -- Get required number of approvals
    SELECT COALESCE(
      (SELECT (security_config->>'required_approvals')::INTEGER 
       FROM public.vault_accounts 
       WHERE id = v_source_account_id),
      2)
    INTO v_required_approvals;
    
    -- Count approvals
    SELECT COUNT(*) INTO v_approval_count
    FROM public.transaction_approvals
    WHERE transaction_id = NEW.transaction_id AND approved = TRUE;
    
    -- If we have enough approvals, process the transaction
    IF v_approval_count >= v_required_approvals THEN
      -- Update transaction approval status
      UPDATE public.unified_transactions
      SET 
        approval_status = 'approved',
        approved_by = NEW.approver_id,
        approval_date = NEW.approval_date
      WHERE id = NEW.transaction_id;
      
      -- Process the transaction
      PERFORM public.process_transaction(NEW.transaction_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for transaction approvals
CREATE TRIGGER handle_approval_transaction_approvals
AFTER INSERT OR UPDATE OF approved ON public.transaction_approvals
FOR EACH ROW
EXECUTE FUNCTION public.handle_transaction_approval();

-- Enable Row Level Security (RLS)
ALTER TABLE public.vault_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_wallet_migrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Vault Accounts policies
CREATE POLICY "Users can view their own vault accounts"
  ON public.vault_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vault accounts"
  ON public.vault_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vault accounts"
  ON public.vault_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Unified Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.unified_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
  ON public.unified_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON public.unified_transactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Transaction Approvals policies
CREATE POLICY "Users can view their transaction approvals"
  ON public.transaction_approvals
  FOR SELECT
  USING (auth.uid() = approver_id);

CREATE POLICY "Users can create their own transaction approvals"
  ON public.transaction_approvals
  FOR INSERT
  WITH CHECK (auth.uid() = approver_id);

CREATE POLICY "Users can update their own transaction approvals"
  ON public.transaction_approvals
  FOR UPDATE
  USING (auth.uid() = approver_id);

-- Account Balance History policies
CREATE POLICY "Users can view their account balance history"
  ON public.account_balance_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vault_accounts va
      WHERE va.id = account_id
      AND va.user_id = auth.uid()
    )
  );

-- Exchange Integrations policies
CREATE POLICY "Users can view their exchange integrations"
  ON public.exchange_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their exchange integrations"
  ON public.exchange_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their exchange integrations"
  ON public.exchange_integrations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Account Alerts policies
CREATE POLICY "Users can view their account alerts"
  ON public.account_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their account alerts"
  ON public.account_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their account alerts"
  ON public.account_alerts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Legacy Wallet Migrations policies
CREATE POLICY "Users can view their legacy wallet migrations"
  ON public.legacy_wallet_migrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vault_accounts va
      WHERE va.id = vault_account_id
      AND va.user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vault_accounts_farm_id ON public.vault_accounts(farm_id);
CREATE INDEX IF NOT EXISTS idx_vault_accounts_agent_id ON public.vault_accounts(agent_id);
CREATE INDEX IF NOT EXISTS idx_vault_accounts_parent_id ON public.vault_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_vault_accounts_user_id ON public.vault_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_unified_transactions_source_account ON public.unified_transactions(source_account_id);
CREATE INDEX IF NOT EXISTS idx_unified_transactions_destination_account ON public.unified_transactions(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_unified_transactions_user_id ON public.unified_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_transactions_status ON public.unified_transactions(status);
CREATE INDEX IF NOT EXISTS idx_unified_transactions_type ON public.unified_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_unified_transactions_created_at ON public.unified_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_transaction_approvals_transaction_id ON public.transaction_approvals(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_approvals_approver_id ON public.transaction_approvals(approver_id);

CREATE INDEX IF NOT EXISTS idx_account_balance_history_account_id ON public.account_balance_history(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balance_history_snapshot_date ON public.account_balance_history(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_exchange_integrations_farm_id ON public.exchange_integrations(farm_id);
CREATE INDEX IF NOT EXISTS idx_exchange_integrations_user_id ON public.exchange_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_account_alerts_account_id ON public.account_alerts(account_id);
CREATE INDEX IF NOT EXISTS idx_account_alerts_user_id ON public.account_alerts(user_id);

CREATE INDEX IF NOT EXISTS idx_legacy_wallet_migrations_wallet_id ON public.legacy_wallet_migrations(wallet_id);
CREATE INDEX IF NOT EXISTS idx_legacy_wallet_migrations_vault_account_id ON public.legacy_wallet_migrations(vault_account_id);