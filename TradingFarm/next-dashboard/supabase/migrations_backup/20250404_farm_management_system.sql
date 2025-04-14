-- Migration: Farm Management System
-- 1. Multi-Wallet Management
-- 2. Transaction Recording
-- 3. Agent Monitoring

-- Add farm_wallets table for multiple wallets per farm
CREATE TABLE IF NOT EXISTS public.farm_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_name TEXT NOT NULL,
  exchange_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  api_passphrase TEXT,
  is_testnet BOOLEAN DEFAULT false,
  balance JSONB DEFAULT '{}'::jsonb,
  last_balance_update TIMESTAMP WITH TIME ZONE,
  alert_threshold NUMERIC(20, 8),
  alert_enabled BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on farm_wallets
ALTER TABLE public.farm_wallets ENABLE ROW LEVEL SECURITY;

-- Farm wallets policies
CREATE POLICY farm_wallets_select_policy ON public.farm_wallets
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY farm_wallets_insert_policy ON public.farm_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY farm_wallets_update_policy ON public.farm_wallets
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY farm_wallets_delete_policy ON public.farm_wallets
  FOR DELETE USING (auth.uid() = user_id);

-- Add transaction_logs table
CREATE TABLE IF NOT EXISTS public.transaction_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.farm_wallets(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL, -- deposit, withdrawal, trade, fee, transfer
  transaction_id TEXT, -- exchange transaction ID
  symbol TEXT,
  amount NUMERIC(20, 8),
  price NUMERIC(20, 8),
  fee NUMERIC(20, 8),
  fee_currency TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL, -- pending, completed, failed, disputed
  exchange_reported BOOLEAN DEFAULT false,
  locally_recorded BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transaction_logs
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;

-- Transaction logs policies
CREATE POLICY transaction_logs_select_policy ON public.transaction_logs
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY transaction_logs_insert_policy ON public.transaction_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY transaction_logs_update_policy ON public.transaction_logs
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY transaction_logs_delete_policy ON public.transaction_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Add agent monitoring table
CREATE TABLE IF NOT EXISTS public.agent_health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uptime_seconds INTEGER DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE,
  memory_usage NUMERIC(20, 2),
  cpu_usage NUMERIC(5, 2),
  requests_processed INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0,
  performance_score NUMERIC(5, 2),
  status TEXT DEFAULT 'offline', -- online, offline, degraded, error
  health_check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metrics_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on agent_health_metrics
ALTER TABLE public.agent_health_metrics ENABLE ROW LEVEL SECURITY;

-- Agent health metrics policies
CREATE POLICY agent_health_metrics_select_policy ON public.agent_health_metrics
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY agent_health_metrics_insert_policy ON public.agent_health_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY agent_health_metrics_update_policy ON public.agent_health_metrics
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY agent_health_metrics_delete_policy ON public.agent_health_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- Add agent logs table
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_level TEXT NOT NULL, -- info, warning, error, debug
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  source TEXT, -- component or function that generated the log
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on agent_logs
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Agent logs policies
CREATE POLICY agent_logs_select_policy ON public.agent_logs
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY agent_logs_insert_policy ON public.agent_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY agent_logs_update_policy ON public.agent_logs
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY agent_logs_delete_policy ON public.agent_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Create index to optimize queries
CREATE INDEX IF NOT EXISTS idx_farm_wallets_farm_id ON public.farm_wallets(farm_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_farm_id ON public.transaction_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_wallet_id ON public.transaction_logs(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_agent_id ON public.transaction_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_status ON public.transaction_logs(status);
CREATE INDEX IF NOT EXISTS idx_agent_health_metrics_agent_id ON public.agent_health_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON public.agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_log_level ON public.agent_logs(log_level);

-- Add trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all new tables
CREATE TRIGGER set_farm_wallets_updated_at
BEFORE UPDATE ON public.farm_wallets
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_transaction_logs_updated_at
BEFORE UPDATE ON public.transaction_logs
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_agent_health_metrics_updated_at
BEFORE UPDATE ON public.agent_health_metrics
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Add functions for wallet balance reconciliation
CREATE OR REPLACE FUNCTION public.reconcile_wallet_balances(p_wallet_id UUID)
RETURNS TABLE (
  currency TEXT,
  reported_balance NUMERIC(20, 8),
  calculated_balance NUMERIC(20, 8),
  difference NUMERIC(20, 8),
  reconciled BOOLEAN
) AS $$
DECLARE
  v_wallet_record public.farm_wallets%ROWTYPE;
  v_balance_json JSONB;
BEGIN
  -- Get wallet record
  SELECT * INTO v_wallet_record FROM public.farm_wallets WHERE id = p_wallet_id;
  
  -- If wallet not found, return empty result
  IF v_wallet_record.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get reported balances from wallet record
  v_balance_json := v_wallet_record.balance;
  
  -- For each currency in the wallet balance
  FOR currency, reported_balance IN SELECT * FROM jsonb_each_text(v_balance_json)
  LOOP
    -- Calculate balance based on transaction logs
    SELECT 
      currency,
      (v_balance_json->>currency)::NUMERIC(20, 8) AS reported_balance,
      COALESCE(SUM(
        CASE 
          WHEN transaction_type = 'deposit' THEN amount
          WHEN transaction_type = 'withdrawal' THEN -amount
          WHEN transaction_type = 'trade' AND symbol LIKE (currency || '/%') THEN -amount
          WHEN transaction_type = 'trade' AND symbol LIKE ('%/' || currency) THEN amount * price
          WHEN transaction_type = 'fee' AND fee_currency = currency THEN -fee
          ELSE 0
        END
      ), 0) AS calculated_balance,
      (v_balance_json->>currency)::NUMERIC(20, 8) - COALESCE(SUM(
        CASE 
          WHEN transaction_type = 'deposit' THEN amount
          WHEN transaction_type = 'withdrawal' THEN -amount
          WHEN transaction_type = 'trade' AND symbol LIKE (currency || '/%') THEN -amount
          WHEN transaction_type = 'trade' AND symbol LIKE ('%/' || currency) THEN amount * price
          WHEN transaction_type = 'fee' AND fee_currency = currency THEN -fee
          ELSE 0
        END
      ), 0) AS difference,
      ABS((v_balance_json->>currency)::NUMERIC(20, 8) - COALESCE(SUM(
        CASE 
          WHEN transaction_type = 'deposit' THEN amount
          WHEN transaction_type = 'withdrawal' THEN -amount
          WHEN transaction_type = 'trade' AND symbol LIKE (currency || '/%') THEN -amount
          WHEN transaction_type = 'trade' AND symbol LIKE ('%/' || currency) THEN amount * price
          WHEN transaction_type = 'fee' AND fee_currency = currency THEN -fee
          ELSE 0
        END
      ), 0)) < 0.00001 AS reconciled
    INTO 
      currency,
      reported_balance,
      calculated_balance,
      difference,
      reconciled
    FROM public.transaction_logs
    WHERE wallet_id = p_wallet_id
      AND (
        fee_currency = currency
        OR symbol LIKE (currency || '/%')
        OR symbol LIKE ('%/' || currency)
      );
      
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;
