-- Migration: Cross-Chain Yield Optimization Strategies
-- Created: 2025-04-23

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table for yield protocol definitions
CREATE TABLE IF NOT EXISTS public.yield_protocols (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  chain_id varchar(50) NOT NULL,
  protocol_type varchar(50) NOT NULL, -- 'lending', 'staking', 'liquidity', 'farming', etc.
  contract_address varchar(255),
  token_address varchar(255),
  token_symbol varchar(50),
  token_decimals integer,
  apy_range jsonb NOT NULL DEFAULT '{"min": 0, "max": 0}',
  tvl_usd numeric(28,18) NOT NULL DEFAULT 0,
  risk_level smallint NOT NULL DEFAULT 1, -- 1 = low, 2 = medium, 3 = high
  is_active boolean NOT NULL DEFAULT true,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  logo_url text,
  website_url text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for protocol specific integration settings
CREATE TABLE IF NOT EXISTS public.protocol_integrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id uuid NOT NULL REFERENCES public.yield_protocols(id) ON DELETE CASCADE,
  integration_type varchar(50) NOT NULL, -- 'api', 'subgraph', 'rpc', etc.
  config jsonb NOT NULL,
  credentials jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  health_status varchar(20) NOT NULL DEFAULT 'unknown', -- 'healthy', 'degraded', 'down', 'unknown'
  error_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for yield strategy templates (pre-configured strategies)
CREATE TABLE IF NOT EXISTS public.yield_strategy_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  description text,
  strategy_type varchar(50) NOT NULL, -- 'aggressive', 'balanced', 'conservative', 'stable', etc.
  risk_level smallint NOT NULL DEFAULT 1,
  min_investment_usd numeric(10,2),
  protocols jsonb NOT NULL, -- List of protocol IDs with allocation percentages
  expected_apy_range jsonb NOT NULL DEFAULT '{"min": 0, "max": 0}',
  chain_allocations jsonb NOT NULL DEFAULT '{}',
  creator_id uuid REFERENCES auth.users(id),
  is_public boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  usage_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for user yield strategies
CREATE TABLE IF NOT EXISTS public.yield_strategies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  description text,
  vault_id BIGINT NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  position_id uuid REFERENCES public.cross_chain_positions(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.yield_strategy_templates(id),
  strategy_type varchar(50) NOT NULL,
  risk_level smallint NOT NULL DEFAULT 1,
  target_apy numeric(8,4),
  is_active boolean NOT NULL DEFAULT true,
  auto_compound boolean NOT NULL DEFAULT false,
  auto_rebalance boolean NOT NULL DEFAULT false,
  rebalance_frequency varchar(20) NOT NULL DEFAULT 'weekly',
  last_rebalanced_at timestamptz,
  next_rebalance_at timestamptz,
  total_invested_usd numeric(28,18) NOT NULL DEFAULT 0,
  total_value_usd numeric(28,18) NOT NULL DEFAULT 0,
  total_earned_usd numeric(28,18) NOT NULL DEFAULT 0,
  current_apy numeric(8,4),
  performance_metrics jsonb NOT NULL DEFAULT '{}',
  chain_allocations jsonb NOT NULL DEFAULT '{}',
  protocol_allocations jsonb NOT NULL DEFAULT '{}',
  max_slippage_percent numeric(5,2) NOT NULL DEFAULT 0.5,
  max_gas_usd numeric(10,2) NOT NULL DEFAULT 100.00,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for yield strategy allocations (specific allocations in a strategy)
CREATE TABLE IF NOT EXISTS public.yield_strategy_allocations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id uuid NOT NULL REFERENCES public.yield_strategies(id) ON DELETE CASCADE,
  protocol_id uuid NOT NULL REFERENCES public.yield_protocols(id) ON DELETE CASCADE,
  allocation_percent numeric(5,2) NOT NULL,
  current_amount numeric(28,18) NOT NULL DEFAULT 0,
  current_value_usd numeric(28,18) NOT NULL DEFAULT 0,
  earned_amount numeric(28,18) NOT NULL DEFAULT 0,
  earned_value_usd numeric(28,18) NOT NULL DEFAULT 0,
  current_apy numeric(8,4),
  entry_price_usd numeric(28,18),
  last_compounded_at timestamptz,
  status varchar(20) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'exiting', 'completed'
  position_details jsonb, -- Protocol-specific position details (e.g., LP token IDs)
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for yield strategy transactions (deposits, withdrawals, harvests)
CREATE TABLE IF NOT EXISTS public.yield_strategy_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id uuid NOT NULL REFERENCES public.yield_strategies(id) ON DELETE CASCADE,
  allocation_id uuid REFERENCES public.yield_strategy_allocations(id) ON DELETE SET NULL,
  transaction_type varchar(20) NOT NULL, -- 'deposit', 'withdrawal', 'harvest', 'rebalance'
  chain_id varchar(50) NOT NULL,
  protocol_id uuid REFERENCES public.yield_protocols(id) ON DELETE SET NULL,
  token_address varchar(255),
  token_symbol varchar(50),
  amount numeric(28,18) NOT NULL,
  value_usd numeric(28,18) NOT NULL,
  tx_hash varchar(255),
  status varchar(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  error_message text,
  gas_cost_usd numeric(10,2),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for APY history
CREATE TABLE IF NOT EXISTS public.yield_apy_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_id uuid NOT NULL REFERENCES public.yield_protocols(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  apy numeric(8,4) NOT NULL,
  tvl_usd numeric(28,18) NOT NULL,
  token_price_usd numeric(28,18),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for yield strategy performance history
CREATE TABLE IF NOT EXISTS public.yield_strategy_performance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id uuid NOT NULL REFERENCES public.yield_strategies(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  total_value_usd numeric(28,18) NOT NULL,
  total_earned_usd numeric(28,18) NOT NULL,
  current_apy numeric(8,4) NOT NULL,
  allocation_performance jsonb NOT NULL DEFAULT '{}', -- Performance by allocation
  daily_yield_usd numeric(28,18),
  rolling_yield jsonb NOT NULL DEFAULT '{}', -- 7d, 30d, etc. yield
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create function to update strategy value based on allocation values
CREATE OR REPLACE FUNCTION update_yield_strategy_value()
RETURNS TRIGGER AS $$
DECLARE
  total_value numeric(28,18) := 0;
  total_earned numeric(28,18) := 0;
  weighted_apy numeric(8,4) := 0;
  allocation_sum numeric(5,2) := 0;
BEGIN
  -- Sum all allocation values and earnings
  SELECT 
    SUM(current_value_usd),
    SUM(earned_value_usd),
    SUM(allocation_percent),
    SUM(allocation_percent * current_apy) / 100
  INTO 
    total_value,
    total_earned,
    allocation_sum,
    weighted_apy
  FROM public.yield_strategy_allocations
  WHERE strategy_id = NEW.strategy_id;
  
  -- Update the strategy's total value, earnings, and APY
  UPDATE public.yield_strategies
  SET 
    total_value_usd = COALESCE(total_value, 0),
    total_earned_usd = COALESCE(total_earned, 0),
    current_apy = CASE WHEN allocation_sum > 0 THEN weighted_apy ELSE 0 END,
    updated_at = now()
  WHERE id = NEW.strategy_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating strategy value
CREATE TRIGGER update_strategy_value_on_allocation_change
AFTER INSERT OR UPDATE ON public.yield_strategy_allocations
FOR EACH ROW
EXECUTE FUNCTION update_yield_strategy_value();

-- Create function to track yield strategy performance
CREATE OR REPLACE FUNCTION record_yield_strategy_performance()
RETURNS void AS $$
DECLARE
  strategy RECORD;
  allocation_perf jsonb := '{}';
BEGIN
  FOR strategy IN SELECT id, total_value_usd, total_earned_usd, current_apy FROM public.yield_strategies WHERE is_active = true
  LOOP
    -- Get allocation performance data
    SELECT jsonb_object_agg(id::text, jsonb_build_object(
      'value', current_value_usd,
      'earned', earned_value_usd,
      'apy', current_apy
    ))
    INTO allocation_perf
    FROM public.yield_strategy_allocations
    WHERE strategy_id = strategy.id;
    
    -- Insert performance record
    INSERT INTO public.yield_strategy_performance (
      strategy_id,
      total_value_usd,
      total_earned_usd,
      current_apy,
      allocation_performance
    )
    VALUES (
      strategy.id,
      strategy.total_value_usd,
      strategy.total_earned_usd,
      strategy.current_apy,
      COALESCE(allocation_perf, '{}')
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Set up triggers for updated_at
CREATE TRIGGER set_yield_protocols_updated_at
BEFORE UPDATE ON public.yield_protocols
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_protocol_integrations_updated_at
BEFORE UPDATE ON public.protocol_integrations
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_yield_strategy_templates_updated_at
BEFORE UPDATE ON public.yield_strategy_templates
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_yield_strategies_updated_at
BEFORE UPDATE ON public.yield_strategies
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_yield_strategy_allocations_updated_at
BEFORE UPDATE ON public.yield_strategy_allocations
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_yield_strategy_transactions_updated_at
BEFORE UPDATE ON public.yield_strategy_transactions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.yield_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_strategy_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_strategy_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_strategy_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_apy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_strategy_performance ENABLE ROW LEVEL SECURITY;

-- Create policies for yield_protocols
CREATE POLICY "Anyone can read yield_protocols" ON public.yield_protocols
FOR SELECT USING (true);

CREATE POLICY "Service roles can modify yield_protocols" ON public.yield_protocols
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for protocol_integrations
CREATE POLICY "Service roles can access protocol_integrations" ON public.protocol_integrations
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for yield_strategy_templates
CREATE POLICY "Anyone can read public yield_strategy_templates" ON public.yield_strategy_templates
FOR SELECT USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can create yield_strategy_templates" ON public.yield_strategy_templates
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their yield_strategy_templates" ON public.yield_strategy_templates
FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Users can delete their yield_strategy_templates" ON public.yield_strategy_templates
FOR DELETE USING (creator_id = auth.uid());

CREATE POLICY "Service roles can manage all yield_strategy_templates" ON public.yield_strategy_templates
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for yield_strategies
CREATE POLICY "Authenticated users can read their strategies" ON public.yield_strategies
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create strategies" ON public.yield_strategies
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their strategies" ON public.yield_strategies
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their strategies" ON public.yield_strategies
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create policies for yield_strategy_allocations
CREATE POLICY "Authenticated users can read strategy allocations" ON public.yield_strategy_allocations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create strategy allocations" ON public.yield_strategy_allocations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update strategy allocations" ON public.yield_strategy_allocations
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete strategy allocations" ON public.yield_strategy_allocations
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create policies for yield_strategy_transactions
CREATE POLICY "Authenticated users can read strategy transactions" ON public.yield_strategy_transactions
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create strategy transactions" ON public.yield_strategy_transactions
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update strategy transactions" ON public.yield_strategy_transactions
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create policies for yield_apy_history
CREATE POLICY "Anyone can read yield_apy_history" ON public.yield_apy_history
FOR SELECT USING (true);

CREATE POLICY "Service roles can modify yield_apy_history" ON public.yield_apy_history
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policies for yield_strategy_performance
CREATE POLICY "Authenticated users can read strategy performance" ON public.yield_strategy_performance
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service roles can create strategy performance" ON public.yield_strategy_performance
FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes for better query performance
CREATE INDEX idx_yield_protocols_chain_id ON public.yield_protocols(chain_id);
CREATE INDEX idx_yield_protocols_token_symbol ON public.yield_protocols(token_symbol);
CREATE INDEX idx_protocol_integrations_protocol_id ON public.protocol_integrations(protocol_id);
CREATE INDEX idx_yield_strategy_templates_risk_level ON public.yield_strategy_templates(risk_level);
CREATE INDEX idx_yield_strategies_vault_id ON public.yield_strategies(vault_id);
CREATE INDEX idx_yield_strategies_position_id ON public.yield_strategies(position_id);
CREATE INDEX idx_yield_strategies_template_id ON public.yield_strategies(template_id);
CREATE INDEX idx_yield_strategy_allocations_strategy_id ON public.yield_strategy_allocations(strategy_id);
CREATE INDEX idx_yield_strategy_allocations_protocol_id ON public.yield_strategy_allocations(protocol_id);
CREATE INDEX idx_yield_strategy_transactions_strategy_id ON public.yield_strategy_transactions(strategy_id);
CREATE INDEX idx_yield_strategy_transactions_allocation_id ON public.yield_strategy_transactions(allocation_id);
CREATE INDEX idx_yield_apy_history_protocol_id ON public.yield_apy_history(protocol_id);
CREATE INDEX idx_yield_apy_history_timestamp ON public.yield_apy_history(timestamp);
CREATE INDEX idx_yield_strategy_performance_strategy_id ON public.yield_strategy_performance(strategy_id);
CREATE INDEX idx_yield_strategy_performance_timestamp ON public.yield_strategy_performance(timestamp);

-- Comment on tables for better documentation
COMMENT ON TABLE public.yield_protocols IS 'Yield-generating protocols across different chains';
COMMENT ON TABLE public.protocol_integrations IS 'Technical integration details for yield protocols';
COMMENT ON TABLE public.yield_strategy_templates IS 'Pre-configured yield strategy templates';
COMMENT ON TABLE public.yield_strategies IS 'User yield strategies for optimizing returns';
COMMENT ON TABLE public.yield_strategy_allocations IS 'Allocations within a yield strategy';
COMMENT ON TABLE public.yield_strategy_transactions IS 'Transactions related to yield strategies';
COMMENT ON TABLE public.yield_apy_history IS 'Historical APY data for yield protocols';
COMMENT ON TABLE public.yield_strategy_performance IS 'Historical performance data for yield strategies';
