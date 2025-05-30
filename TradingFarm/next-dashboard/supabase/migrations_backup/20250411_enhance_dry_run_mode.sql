-- Migration to enhance the dry-run trading mode with more configuration options
-- and better simulation capabilities

-- Add execution_mode to trading_agents table
ALTER TABLE IF EXISTS public.trading_agents 
ADD COLUMN IF NOT EXISTS execution_mode TEXT NOT NULL DEFAULT 'dry_run' 
CHECK (execution_mode IN ('live', 'dry_run'));

-- Add confirmation for live mode to prevent accidental switching
ALTER TABLE IF EXISTS public.trading_agents
ADD COLUMN IF NOT EXISTS live_mode_confirmed BOOLEAN NOT NULL DEFAULT false;

-- Create simulation models table for configurable simulation behavior
CREATE TABLE IF NOT EXISTS public.simulation_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  model_type TEXT NOT NULL CHECK (model_type IN ('slippage', 'fee', 'latency', 'fill', 'error')),
  is_system_model BOOLEAN NOT NULL DEFAULT false,
  parameters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, name, model_type)
);

-- Apply RLS to simulation_models
ALTER TABLE public.simulation_models ENABLE ROW LEVEL SECURITY;

-- Create policy for simulation_models
CREATE POLICY "Users can manage their own simulation models" 
ON public.simulation_models 
FOR ALL
USING (auth.uid() = user_id OR is_system_model = true);

-- Create agent simulation configuration table
CREATE TABLE IF NOT EXISTS public.agent_simulation_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.trading_agents(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  symbols TEXT[] NOT NULL,
  slippage_model_id UUID REFERENCES public.simulation_models(id),
  fee_model_id UUID REFERENCES public.simulation_models(id),
  latency_model_id UUID REFERENCES public.simulation_models(id),
  fill_model_id UUID REFERENCES public.simulation_models(id),
  error_model_id UUID REFERENCES public.simulation_models(id),
  initial_balances JSONB NOT NULL DEFAULT '{"USDT": 10000, "BTC": 0.5, "ETH": 5, "SOL": 100}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Apply RLS to agent_simulation_config
ALTER TABLE public.agent_simulation_config ENABLE ROW LEVEL SECURITY;

-- Create policy for agent_simulation_config
CREATE POLICY "Users can manage simulation configs for their agents" 
ON public.agent_simulation_config 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.trading_agents a
  WHERE a.id = agent_id AND a.user_id = auth.uid()
));

-- Add simulation run tracking for better analytics
ALTER TABLE IF EXISTS public.simulated_trades
ADD COLUMN IF NOT EXISTS simulation_run_id UUID;

CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.trading_agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  initial_balances JSONB NOT NULL,
  final_balances JSONB,
  parameters JSONB,
  metrics JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'aborted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Apply RLS to simulation_runs
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;

-- Create policy for simulation_runs
CREATE POLICY "Users can manage their own simulation runs" 
ON public.simulation_runs 
FOR ALL
USING (auth.uid() = user_id);

-- Enhance the virtual_balances table to track simulation runs
ALTER TABLE IF EXISTS public.virtual_balances
ADD COLUMN IF NOT EXISTS simulation_run_id UUID REFERENCES public.simulation_runs(id) ON DELETE CASCADE;

-- Populate system default simulation models
INSERT INTO public.simulation_models 
  (user_id, name, description, model_type, is_system_model, parameters)
VALUES
  -- Default slippage models
  ('00000000-0000-0000-0000-000000000000', 'Simple Fixed', 'Simple fixed slippage percentage', 'slippage', true, 
   '{"type": "fixed", "slippage_bps": 5, "description": "Fixed 0.05% slippage"}'::JSONB),
  
  ('00000000-0000-0000-0000-000000000000', 'Volatility Based', 'Slippage based on market volatility', 'slippage', true, 
   '{"type": "volatility", "base_slippage_bps": 2, "volatility_multiplier": 0.5, "description": "Base 0.02% slippage plus volatility adjustment"}'::JSONB),
  
  ('00000000-0000-0000-0000-000000000000', 'Smart Spread', 'Slippage based on smart spread estimation', 'slippage', true, 
   '{"type": "spread", "spread_multiplier": 0.75, "description": "Spread-based slippage with 75% of estimated spread"}'::JSONB),
  
  -- Default fee models
  ('00000000-0000-0000-0000-000000000000', 'Bybit Standard', 'Standard Bybit fee structure', 'fee', true, 
   '{"maker_fee_bps": 1, "taker_fee_bps": 6, "description": "0.01% maker fee, 0.06% taker fee"}'::JSONB),
  
  ('00000000-0000-0000-0000-000000000000', 'Coinbase Standard', 'Standard Coinbase fee structure', 'fee', true, 
   '{"maker_fee_bps": 5, "taker_fee_bps": 5, "description": "0.05% maker and taker fee"}'::JSONB),
  
  -- Default latency models
  ('00000000-0000-0000-0000-000000000000', 'No Latency', 'Instant execution, no latency', 'latency', true, 
   '{"type": "none", "description": "Orders execute instantly"}'::JSONB),
  
  ('00000000-0000-0000-0000-000000000000', 'Realistic Latency', 'Realistic network and exchange latency', 'latency', true, 
   '{"type": "random", "min_ms": 50, "max_ms": 500, "description": "Random latency between 50-500ms"}'::JSONB),
  
  -- Default fill models
  ('00000000-0000-0000-0000-000000000000', 'Full Fill', 'All orders are fully filled', 'fill', true, 
   '{"type": "full", "description": "Orders are always filled completely"}'::JSONB),
  
  ('00000000-0000-0000-0000-000000000000', 'Volume Based', 'Fill rate based on order size relative to volume', 'fill', true, 
   '{"type": "volume", "volume_threshold": 0.1, "description": "Orders larger than 10% of volume may be partially filled"}'::JSONB),
  
  -- Default error models
  ('00000000-0000-0000-0000-000000000000', 'No Errors', 'No simulated errors', 'error', true, 
   '{"type": "none", "description": "No simulated errors"}'::JSONB),
  
  ('00000000-0000-0000-0000-000000000000', 'Realistic Errors', 'Realistic random error simulation', 'error', true, 
   '{"type": "random", "network_error_rate": 0.01, "rate_limit_error_rate": 0.005, "insufficient_funds_rate": 0.01, "description": "Realistic random errors with configurable rates"}'::JSONB);

-- Create enhanced performance metrics view
CREATE OR REPLACE VIEW public.simulation_performance_metrics AS
WITH trade_data AS (
  SELECT
    st.simulation_run_id,
    sr.agent_id,
    sr.name as run_name,
    sr.start_time,
    sr.end_time,
    COUNT(st.id) as total_trades,
    SUM(CASE WHEN st.side = 'buy' THEN 1 ELSE 0 END) AS buy_count,
    SUM(CASE WHEN st.side = 'sell' THEN 1 ELSE 0 END) AS sell_count,
    SUM(CASE WHEN st.side = 'buy' THEN -st.cost ELSE st.cost END) - SUM(st.fee) AS total_pnl,
    SUM(st.fee) AS total_fees,
    MAX(st.price) AS max_price,
    MIN(st.price) AS min_price,
    AVG(st.price) AS avg_price,
    COALESCE(MAX(CASE WHEN st.side = 'sell' THEN st.cost END), 0) AS max_win,
    COALESCE(MIN(CASE WHEN st.side = 'buy' THEN -st.cost END), 0) AS max_loss,
    EXTRACT(EPOCH FROM (COALESCE(sr.end_time, NOW()) - sr.start_time))/86400 AS days_active
  FROM 
    public.simulated_trades st
  JOIN
    public.simulation_runs sr ON st.simulation_run_id = sr.id
  GROUP BY
    st.simulation_run_id, sr.agent_id, sr.name, sr.start_time, sr.end_time
)
SELECT
  td.*,
  CASE WHEN td.total_trades > 0 THEN td.total_pnl / td.total_trades ELSE 0 END AS avg_trade_pnl,
  CASE WHEN td.total_pnl <> 0 THEN ABS(td.total_fees / td.total_pnl) ELSE 0 END AS fee_to_pnl_ratio,
  CASE WHEN td.days_active > 0 THEN td.total_pnl / td.days_active ELSE td.total_pnl END AS daily_pnl,
  CASE WHEN td.buy_count > 0 THEN td.sell_count::FLOAT / td.buy_count ELSE 0 END AS sell_to_buy_ratio,
  -- Calculate additional metrics
  CASE WHEN td.total_trades > 0 THEN td.total_pnl / (td.days_active * SQRT(GREATEST(1, td.total_trades))) ELSE 0 END AS sharpe_approximation
FROM
  trade_data td;

-- Create function to calculate drawdown and other key metrics
CREATE OR REPLACE FUNCTION public.calculate_simulation_metrics(
  simulation_run_id UUID
) 
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  metric_label TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  trade_count INT;
  win_count INT;
  loss_count INT;
  total_pnl NUMERIC;
  running_balance NUMERIC;
  max_balance NUMERIC := 0;
  current_drawdown NUMERIC := 0;
  max_drawdown NUMERIC := 0;
  profit_factor NUMERIC;
  win_rate NUMERIC;
  avg_win NUMERIC;
  avg_loss NUMERIC;
  expectancy NUMERIC;
BEGIN
  -- Get initial balance from simulation_runs
  SELECT COALESCE((initial_balances->>'USDT')::NUMERIC, 10000)
  INTO running_balance
  FROM public.simulation_runs
  WHERE id = simulation_run_id;

  max_balance := running_balance;
  
  -- Create a temporary table to process trades in order
  CREATE TEMP TABLE IF NOT EXISTS temp_trades AS
  SELECT
    id,
    timestamp,
    side,
    symbol,
    price,
    amount,
    cost,
    fee,
    CASE WHEN side = 'buy' THEN -cost ELSE cost END - fee AS trade_pnl
  FROM
    public.simulated_trades
  WHERE
    simulation_run_id = calculate_simulation_metrics.simulation_run_id
  ORDER BY
    timestamp ASC;
    
  -- Calculate key metrics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE trade_pnl > 0),
    COUNT(*) FILTER (WHERE trade_pnl < 0),
    SUM(trade_pnl)
  INTO
    trade_count, win_count, loss_count, total_pnl
  FROM
    temp_trades;
    
  -- Calculate win rate
  win_rate := CASE WHEN trade_count > 0 THEN win_count::NUMERIC / trade_count ELSE 0 END;
  
  -- Calculate average win/loss
  SELECT
    COALESCE(AVG(trade_pnl) FILTER (WHERE trade_pnl > 0), 0),
    COALESCE(ABS(AVG(trade_pnl) FILTER (WHERE trade_pnl < 0)), 0)
  INTO
    avg_win, avg_loss
  FROM
    temp_trades;
    
  -- Calculate profit factor
  SELECT
    CASE 
      WHEN SUM(ABS(trade_pnl)) FILTER (WHERE trade_pnl < 0) = 0 THEN 
        CASE WHEN SUM(trade_pnl) FILTER (WHERE trade_pnl > 0) > 0 THEN 999 ELSE 0 END
      ELSE SUM(trade_pnl) FILTER (WHERE trade_pnl > 0) / SUM(ABS(trade_pnl)) FILTER (WHERE trade_pnl < 0)
    END
  INTO
    profit_factor
  FROM
    temp_trades;
    
  -- Calculate expectancy
  expectancy := (win_rate * avg_win) - ((1 - win_rate) * avg_loss);
  
  -- Calculate maximum drawdown
  FOR r IN SELECT trade_pnl FROM temp_trades ORDER BY timestamp LOOP
    running_balance := running_balance + r.trade_pnl;
    
    IF running_balance > max_balance THEN
      max_balance := running_balance;
      current_drawdown := 0;
    ELSE
      current_drawdown := (max_balance - running_balance) / max_balance;
      IF current_drawdown > max_drawdown THEN
        max_drawdown := current_drawdown;
      END IF;
    END IF;
  END LOOP;
  
  -- Return all metrics as rows
  RETURN QUERY
  SELECT 'total_trades'::TEXT, trade_count::NUMERIC, 'Total Trades'::TEXT
  UNION ALL
  SELECT 'win_rate'::TEXT, win_rate * 100, 'Win Rate (%)'::TEXT
  UNION ALL
  SELECT 'profit_factor'::TEXT, profit_factor, 'Profit Factor'::TEXT
  UNION ALL
  SELECT 'expectancy'::TEXT, expectancy, 'Expectancy'::TEXT
  UNION ALL
  SELECT 'avg_win'::TEXT, avg_win, 'Average Win'::TEXT
  UNION ALL
  SELECT 'avg_loss'::TEXT, avg_loss, 'Average Loss'::TEXT
  UNION ALL
  SELECT 'max_drawdown'::TEXT, max_drawdown * 100, 'Maximum Drawdown (%)'::TEXT
  UNION ALL
  SELECT 'total_pnl'::TEXT, total_pnl, 'Total P&L'::TEXT
  UNION ALL
  SELECT 'final_balance'::TEXT, running_balance, 'Final Balance'::TEXT;
  
  -- Clean up
  DROP TABLE IF EXISTS temp_trades;
END;
$$;

-- Add triggers for automatic updated_at
CREATE TRIGGER handle_simulation_models_updated_at
BEFORE UPDATE ON public.simulation_models
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_simulation_config_updated_at
BEFORE UPDATE ON public.agent_simulation_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_simulation_runs_updated_at
BEFORE UPDATE ON public.simulation_runs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
