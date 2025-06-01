-- 
-- Migration to create a unified banking system
-- This migration consolidates legacy wallet tables and vault tables
-- into a single cohesive banking system
--

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set up shared triggers for created_at and updated_at
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

-- Check if existing tables need to be dropped first
DROP TABLE IF EXISTS security_policies CASCADE;
DROP TABLE IF EXISTS balance_history CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS vault_transactions CASCADE;
DROP TABLE IF EXISTS vault_accounts CASCADE;
DROP TABLE IF EXISTS vault_master CASCADE;
DROP TABLE IF EXISTS external_connections CASCADE;
DROP TABLE IF EXISTS wallet_migration_history CASCADE;

-- Create vault_master table
CREATE TABLE IF NOT EXISTS vault_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  total_balance DECIMAL(18, 6) DEFAULT 0,
  allocated_balance DECIMAL(18, 6) DEFAULT 0,
  reserve_balance DECIMAL(18, 6) DEFAULT 0,
  high_risk_exposure DECIMAL(18, 6) DEFAULT 0,
  security_score INT DEFAULT 80,
  status TEXT DEFAULT 'active',
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create vault_accounts table
CREATE TABLE IF NOT EXISTS vault_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES vault_master(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance DECIMAL(18, 6) DEFAULT 0,
  locked_amount DECIMAL(18, 6) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  risk_level TEXT DEFAULT 'medium',
  address TEXT,
  farm_id TEXT,
  agent_id TEXT,
  security_level TEXT DEFAULT 'standard',
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create vault_transactions table
CREATE TABLE IF NOT EXISTS vault_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  destination_id TEXT NOT NULL,
  destination_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  fee DECIMAL(18, 6),
  fee_currency TEXT,
  hash TEXT,
  reference TEXT,
  description TEXT,
  network TEXT,
  confirmations INT,
  approvals_required INT DEFAULT 1,
  approvals_current INT DEFAULT 0,
  approver_ids TEXT[],
  metadata JSONB,
  initiated_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create security_policies table
CREATE TABLE IF NOT EXISTS security_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES vault_accounts(id) ON DELETE CASCADE,
  withdrawal_rules JSONB,
  access_rules JSONB,
  alert_rules JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action TEXT NOT NULL,
  user_id TEXT,
  account_id TEXT,
  transaction_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  severity TEXT DEFAULT 'info'
);

-- Create balance_history table for time-series data
CREATE TABLE IF NOT EXISTS balance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES vault_accounts(id) ON DELETE CASCADE,
  balance DECIMAL(18, 6) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transaction_id UUID REFERENCES vault_transactions(id) ON DELETE SET NULL
);

-- Create external_connections table for integrations
CREATE TABLE IF NOT EXISTS external_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'exchange', 'wallet', 'bank', etc.
  account_id UUID REFERENCES vault_accounts(id) ON DELETE SET NULL,
  master_id UUID REFERENCES vault_master(id) ON DELETE SET NULL,
  credentials JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  last_sync TIMESTAMP WITH TIME ZONE,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create wallet_migration_history table to track migrations
CREATE TABLE IF NOT EXISTS wallet_migration_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_wallet_id TEXT NOT NULL,
  vault_account_id UUID NOT NULL REFERENCES vault_accounts(id) ON DELETE CASCADE,
  migration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  original_balance DECIMAL(18, 6),
  notes TEXT
);

-- Create RLS policies
ALTER TABLE vault_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_migration_history ENABLE ROW LEVEL SECURITY;

-- Create basic policies for authenticated users
CREATE POLICY vault_master_user_policy ON vault_master
  FOR ALL TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY vault_accounts_user_policy ON vault_accounts
  FOR ALL TO authenticated
  USING (
    master_id IN (
      SELECT id FROM vault_master WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY vault_transactions_user_policy ON vault_transactions
  FOR ALL TO authenticated
  USING (
    source_id IN (
      SELECT id::text FROM vault_accounts WHERE master_id IN (
        SELECT id FROM vault_master WHERE owner_id = auth.uid()
      )
    )
    OR
    destination_id IN (
      SELECT id::text FROM vault_accounts WHERE master_id IN (
        SELECT id FROM vault_master WHERE owner_id = auth.uid()
      )
    )
  );

-- Set up automatic timestamp triggers
CREATE TRIGGER set_vault_master_created_at
  BEFORE INSERT ON vault_master
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_vault_master_updated_at
  BEFORE UPDATE ON vault_master
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_vault_accounts_created_at
  BEFORE INSERT ON vault_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_vault_accounts_updated_at
  BEFORE UPDATE ON vault_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_vault_transactions_created_at
  BEFORE INSERT ON vault_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_vault_transactions_updated_at
  BEFORE UPDATE ON vault_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_security_policies_created_at
  BEFORE INSERT ON security_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_security_policies_updated_at
  BEFORE UPDATE ON security_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_external_connections_created_at
  BEFORE INSERT ON external_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_external_connections_updated_at
  BEFORE UPDATE ON external_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create helpful indexes
CREATE INDEX idx_vault_accounts_master_id ON vault_accounts(master_id);
CREATE INDEX idx_vault_accounts_farm_id ON vault_accounts(farm_id);
CREATE INDEX idx_vault_accounts_agent_id ON vault_accounts(agent_id);
CREATE INDEX idx_vault_transactions_source_id ON vault_transactions(source_id);
CREATE INDEX idx_vault_transactions_destination_id ON vault_transactions(destination_id);
CREATE INDEX idx_vault_transactions_status ON vault_transactions(status);
CREATE INDEX idx_vault_transactions_created_at ON vault_transactions(created_at);
CREATE INDEX idx_security_policies_account_id ON security_policies(account_id);
CREATE INDEX idx_balance_history_account_id ON balance_history(account_id);
CREATE INDEX idx_balance_history_timestamp ON balance_history(timestamp);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Create helper functions for incrementing/decrementing balances
CREATE OR REPLACE FUNCTION increment(row_id TEXT, table_name TEXT, column_name TEXT, increment_amount DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
  current_value DECIMAL;
  new_value DECIMAL;
BEGIN
  EXECUTE format('SELECT %I FROM %I WHERE id = %L', column_name, table_name, row_id)
  INTO current_value;
  
  new_value := current_value + increment_amount;
  
  EXECUTE format('UPDATE %I SET %I = %L WHERE id = %L', 
                table_name, column_name, new_value, row_id);
  
  RETURN new_value;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement(row_id TEXT, table_name TEXT, column_name TEXT, increment_amount DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
  current_value DECIMAL;
  new_value DECIMAL;
BEGIN
  EXECUTE format('SELECT %I FROM %I WHERE id = %L', column_name, table_name, row_id)
  INTO current_value;
  
  new_value := current_value - increment_amount;
  
  -- Don't allow negative values
  IF new_value < 0 THEN
    RAISE EXCEPTION 'Cannot decrement below zero';
  END IF;
  
  EXECUTE format('UPDATE %I SET %I = %L WHERE id = %L', 
                table_name, column_name, new_value, row_id);
  
  RETURN new_value;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update balance history after balance changes
CREATE OR REPLACE FUNCTION record_balance_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO balance_history (account_id, balance)
  VALUES (NEW.id, NEW.balance);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER record_vault_account_balance_change
  AFTER UPDATE OF balance ON vault_accounts
  FOR EACH ROW
  WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
  EXECUTE FUNCTION record_balance_history();

-- Create a function to complete transactions automatically when approvals reached
CREATE OR REPLACE FUNCTION complete_transaction_when_approved()
RETURNS TRIGGER AS $$
BEGIN
  -- If approvals_current >= approvals_required and status is pending, set to completed
  IF NEW.approvals_current >= NEW.approvals_required AND NEW.status = 'pending' THEN
    NEW.status := 'completed';
    NEW.completed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_complete_transaction
  BEFORE UPDATE OF approvals_current ON vault_transactions
  FOR EACH ROW
  EXECUTE FUNCTION complete_transaction_when_approved(); 