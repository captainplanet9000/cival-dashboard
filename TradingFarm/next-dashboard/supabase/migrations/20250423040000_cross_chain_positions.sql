-- Migration: Cross-Chain Position Management
-- Created: 2025-04-23

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table for cross-chain positions
CREATE TABLE IF NOT EXISTS public.cross_chain_positions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_id BIGINT NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  total_value_usd numeric(28,18) NOT NULL DEFAULT 0,
  risk_level smallint NOT NULL DEFAULT 1, -- 1 = low, 2 = medium, 3 = high
  rebalance_frequency varchar(20) NOT NULL DEFAULT 'weekly', -- daily, weekly, monthly
  last_rebalanced_at timestamptz,
  next_rebalance_at timestamptz,
  auto_rebalance boolean NOT NULL DEFAULT false,
  target_allocations jsonb NOT NULL DEFAULT '{}',
  performance_metrics jsonb NOT NULL DEFAULT '{}',
  max_slippage_percent numeric(5,2) NOT NULL DEFAULT 0.5,
  max_gas_usd numeric(10,2) NOT NULL DEFAULT 100.00,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for cross-chain position components (individual allocations on specific chains)
CREATE TABLE IF NOT EXISTS public.cross_chain_position_components (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id uuid NOT NULL REFERENCES public.cross_chain_positions(id) ON DELETE CASCADE,
  chain_id varchar(50) NOT NULL,
  protocol_id varchar(100) NOT NULL,
  asset_address varchar(255) NOT NULL,
  asset_symbol varchar(50) NOT NULL,
  asset_decimals integer NOT NULL,
  current_amount numeric(28,18) NOT NULL DEFAULT 0,
  current_value_usd numeric(28,18) NOT NULL DEFAULT 0,
  target_allocation_percent numeric(5,2) NOT NULL DEFAULT 0, -- Percentage of total position value
  strategy_type varchar(100) NOT NULL DEFAULT 'hold', -- hold, yield, lend, stake, etc.
  strategy_params jsonb NOT NULL DEFAULT '{}',
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  performance_data jsonb NOT NULL DEFAULT '{}',
  status varchar(50) NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for cross-chain position rebalance history
CREATE TABLE IF NOT EXISTS public.cross_chain_rebalance_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id uuid NOT NULL REFERENCES public.cross_chain_positions(id) ON DELETE CASCADE,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status varchar(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed
  before_allocations jsonb NOT NULL,
  target_allocations jsonb NOT NULL,
  actual_allocations jsonb,
  transactions jsonb[] NOT NULL DEFAULT '{}',
  total_gas_cost_usd numeric(10,2),
  total_slippage_usd numeric(10,2),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for cross-chain position performance history (for charting/analytics)
CREATE TABLE IF NOT EXISTS public.cross_chain_performance_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id uuid NOT NULL REFERENCES public.cross_chain_positions(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  total_value_usd numeric(28,18) NOT NULL,
  component_values jsonb NOT NULL,
  benchmark_comparison jsonb NOT NULL DEFAULT '{}', -- Comparison to benchmarks like ETH, BTC, S&P500
  period_return_percent numeric(8,4),
  rolling_returns jsonb NOT NULL DEFAULT '{}', -- 24h, 7d, 30d, YTD, 1y returns
  risk_metrics jsonb NOT NULL DEFAULT '{}', -- Sharpe, Sortino, max drawdown, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Set up triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
CREATE TRIGGER set_cross_chain_positions_updated_at
BEFORE UPDATE ON public.cross_chain_positions
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_cross_chain_position_components_updated_at
BEFORE UPDATE ON public.cross_chain_position_components
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_cross_chain_rebalance_history_updated_at
BEFORE UPDATE ON public.cross_chain_rebalance_history
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.cross_chain_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_chain_position_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_chain_rebalance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_chain_performance_history ENABLE ROW LEVEL SECURITY;

-- Create policies for cross_chain_positions
CREATE POLICY "Authenticated users can read their positions" ON public.cross_chain_positions
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create positions" ON public.cross_chain_positions
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their positions" ON public.cross_chain_positions
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their positions" ON public.cross_chain_positions
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create policies for cross_chain_position_components
CREATE POLICY "Authenticated users can read position components" ON public.cross_chain_position_components
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create position components" ON public.cross_chain_position_components
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update position components" ON public.cross_chain_position_components
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete position components" ON public.cross_chain_position_components
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create policies for cross_chain_rebalance_history
CREATE POLICY "Authenticated users can read rebalance history" ON public.cross_chain_rebalance_history
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create rebalance history" ON public.cross_chain_rebalance_history
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update rebalance history" ON public.cross_chain_rebalance_history
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create policies for cross_chain_performance_history
CREATE POLICY "Authenticated users can read performance history" ON public.cross_chain_performance_history
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create performance history" ON public.cross_chain_performance_history
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for better query performance
CREATE INDEX idx_cross_chain_positions_vault_id ON public.cross_chain_positions(vault_id);
CREATE INDEX idx_cross_chain_position_components_position_id ON public.cross_chain_position_components(position_id);
CREATE INDEX idx_cross_chain_position_components_chain_id ON public.cross_chain_position_components(chain_id);
CREATE INDEX idx_cross_chain_rebalance_history_position_id ON public.cross_chain_rebalance_history(position_id);
CREATE INDEX idx_cross_chain_performance_history_position_id ON public.cross_chain_performance_history(position_id);
CREATE INDEX idx_cross_chain_performance_history_timestamp ON public.cross_chain_performance_history(timestamp);

-- Create function to calculate position value
CREATE OR REPLACE FUNCTION update_cross_chain_position_value()
RETURNS TRIGGER AS $$
DECLARE
  total_value numeric(28,18) := 0;
BEGIN
  -- Sum all component values
  SELECT SUM(current_value_usd)
  INTO total_value
  FROM public.cross_chain_position_components
  WHERE position_id = NEW.position_id;
  
  -- Update the position's total value
  UPDATE public.cross_chain_positions
  SET total_value_usd = total_value,
      updated_at = now()
  WHERE id = NEW.position_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update position value when components change
CREATE TRIGGER update_position_value_on_component_change
AFTER INSERT OR UPDATE OF current_value_usd ON public.cross_chain_position_components
FOR EACH ROW
EXECUTE FUNCTION update_cross_chain_position_value();

-- Create trigger to record performance history daily
CREATE OR REPLACE FUNCTION record_cross_chain_position_performance()
RETURNS TRIGGER AS $$
DECLARE
  component_values jsonb := '{}';
BEGIN
  -- Get all component values
  SELECT jsonb_object_agg(id::text, current_value_usd)
  INTO component_values
  FROM public.cross_chain_position_components
  WHERE position_id = NEW.id;

  -- Insert performance record
  INSERT INTO public.cross_chain_performance_history (
    position_id,
    total_value_usd,
    component_values,
    benchmark_comparison,
    period_return_percent
  )
  VALUES (
    NEW.id,
    NEW.total_value_usd,
    component_values,
    '{}',
    NULL -- Will be calculated by a separate process
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create daily performance snapshot trigger
CREATE OR REPLACE FUNCTION create_daily_performance_snapshots()
RETURNS void AS $$
DECLARE
  pos RECORD;
  component_values jsonb := '{}';
BEGIN
  FOR pos IN SELECT id, total_value_usd FROM public.cross_chain_positions WHERE is_active = true
  LOOP
    -- Get all component values
    SELECT jsonb_object_agg(id::text, current_value_usd)
    INTO component_values
    FROM public.cross_chain_position_components
    WHERE position_id = pos.id;
    
    -- Insert performance record
    INSERT INTO public.cross_chain_performance_history (
      position_id,
      total_value_usd,
      component_values,
      benchmark_comparison
    )
    VALUES (
      pos.id,
      pos.total_value_usd,
      component_values,
      '{}'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comment on tables and columns for better documentation
COMMENT ON TABLE public.cross_chain_positions IS 'Manages multi-chain investment positions with allocation targets';
COMMENT ON TABLE public.cross_chain_position_components IS 'Individual chain-specific allocations within a cross-chain position';
COMMENT ON TABLE public.cross_chain_rebalance_history IS 'Historical record of position rebalancing operations';
COMMENT ON TABLE public.cross_chain_performance_history IS 'Historical performance data for cross-chain positions';
