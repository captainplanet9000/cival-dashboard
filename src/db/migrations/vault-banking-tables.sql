-- Create vault_accounts table
CREATE TABLE IF NOT EXISTS vault_accounts (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance DECIMAL(18, 8) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  address TEXT,
  api_keys JSONB DEFAULT '[]'::JSONB,
  risk_score INTEGER NOT NULL DEFAULT 0,
  allocations JSONB DEFAULT '[]'::JSONB,
  security_level TEXT NOT NULL DEFAULT 'standard',
  access_rules JSONB NOT NULL DEFAULT '{
    "twoFactorRequired": false,
    "withdrawalLimit": 10000,
    "withdrawalTimelock": 24,
    "approvalRequired": false
  }'::JSONB,
  locked_amount DECIMAL(18, 8) NOT NULL DEFAULT 0,
  metadata JSONB
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES vault_accounts(id),
  type TEXT NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  description TEXT,
  fee DECIMAL(18, 8) DEFAULT 0,
  hash TEXT,
  reference TEXT,
  metadata JSONB,
  related_transaction_id UUID,
  initiated_by TEXT NOT NULL,
  approved_by TEXT,
  risk_assessment JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create balance_history table for tracking balance changes over time
CREATE TABLE IF NOT EXISTS balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES vault_accounts(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  balance DECIMAL(18, 8) NOT NULL,
  change DECIMAL(18, 8) NOT NULL,
  transaction_id UUID REFERENCES transactions(id)
);

-- Create allocation_plans table
CREATE TABLE IF NOT EXISTS allocation_plans (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES vault_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  allocations JSONB NOT NULL DEFAULT '[]'::JSONB,
  rebalancing_rules JSONB NOT NULL DEFAULT '{
    "threshold": 5,
    "isAutomatic": false
  }'::JSONB,
  last_rebalanced TIMESTAMP WITH TIME ZONE,
  next_scheduled_rebalance TIMESTAMP WITH TIME ZONE
);

-- Create security_policies table
CREATE TABLE IF NOT EXISTS security_policies (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES vault_accounts(id) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  withdrawal_policy JSONB NOT NULL DEFAULT '{
    "limits": {
      "daily": 10000,
      "weekly": 50000,
      "monthly": 100000
    },
    "whitelistedAddresses": [],
    "requireApprovalThreshold": 5000,
    "cooldownPeriod": 24,
    "notificationSettings": {
      "email": true,
      "sms": false,
      "push": true
    }
  }'::JSONB,
  access_control JSONB NOT NULL DEFAULT '{
    "ipWhitelist": [],
    "requiredAuthMethods": ["password", "totp"],
    "sessionTimeout": 30,
    "inactivityLockout": true
  }'::JSONB,
  alert_rules JSONB NOT NULL DEFAULT '{
    "unusualActivityThreshold": 0.8,
    "largeTransferThreshold": 5000,
    "newDeviceNotification": true,
    "failedLoginThreshold": 3
  }'::JSONB
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  account_id UUID REFERENCES vault_accounts(id),
  transaction_id UUID REFERENCES transactions(id),
  details JSONB,
  severity TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_balance_history_account_id ON balance_history(account_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_timestamp ON balance_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_account_id ON audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Create analytics_insights table
CREATE TABLE IF NOT EXISTS analytics_insights (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  related_entities JSONB,
  recommendations JSONB,
  visualizations JSONB,
  ai_confidence DECIMAL(5, 4),
  dismissed BOOLEAN NOT NULL DEFAULT FALSE
); 