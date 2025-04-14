-- Migration to add support for dry-run trading mode
-- This adds tables for tracking simulated trades and virtual balances

-- Table for simulated trades
CREATE TABLE IF NOT EXISTS public.simulated_trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  client_order_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL,
  side TEXT NOT NULL,
  price DECIMAL(24, 8) NOT NULL,
  amount DECIMAL(24, 8) NOT NULL,
  cost DECIMAL(24, 8) NOT NULL,
  fee DECIMAL(24, 8) NOT NULL,
  fee_currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Apply RLS to simulated_trades
ALTER TABLE public.simulated_trades ENABLE ROW LEVEL SECURITY;

-- Create policy for simulated_trades
CREATE POLICY "Users can only access their own simulated trades" 
ON public.simulated_trades 
FOR ALL
USING (auth.uid() = user_id);

-- Table for virtual balances
CREATE TABLE IF NOT EXISTS public.virtual_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  amount DECIMAL(24, 8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, asset)
);

-- Apply RLS to virtual_balances
ALTER TABLE public.virtual_balances ENABLE ROW LEVEL SECURITY;

-- Create policy for virtual_balances
CREATE POLICY "Users can only access their own virtual balances"
ON public.virtual_balances
FOR ALL
USING (auth.uid() = user_id);

-- Add triggers for automatic updated_at
CREATE TRIGGER handle_simulated_trades_updated_at
BEFORE UPDATE ON public.simulated_trades
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_virtual_balances_updated_at
BEFORE UPDATE ON public.virtual_balances
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add simulation_settings table to store configurations for dry-run testing
CREATE TABLE IF NOT EXISTS public.simulation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  exchange TEXT NOT NULL,
  initial_balances JSONB NOT NULL,
  slippage_model TEXT DEFAULT 'simple' NOT NULL,
  slippage_config JSONB DEFAULT '{"base_slippage": 0.001, "volatility_multiplier": 1.0}'::JSONB,
  fee_model TEXT DEFAULT 'fixed' NOT NULL,
  fee_config JSONB DEFAULT '{"maker_fee": 0.001, "taker_fee": 0.001}'::JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, name)
);

-- Apply RLS to simulation_settings
ALTER TABLE public.simulation_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for simulation_settings
CREATE POLICY "Users can only access their own simulation settings"
ON public.simulation_settings
FOR ALL
USING (auth.uid() = user_id);

-- Add trigger for automatic updated_at
CREATE TRIGGER handle_simulation_settings_updated_at
BEFORE UPDATE ON public.simulation_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create performance analytics view for simulated trades
CREATE OR REPLACE VIEW public.simulated_trade_analytics AS
SELECT 
  user_id,
  symbol,
  DATE_TRUNC('day', timestamp) AS trade_date,
  COUNT(*) AS trade_count,
  SUM(CASE WHEN side = 'buy' THEN 1 ELSE 0 END) AS buy_count,
  SUM(CASE WHEN side = 'sell' THEN 1 ELSE 0 END) AS sell_count,
  SUM(CASE WHEN side = 'buy' THEN -cost ELSE cost END) - SUM(fee) AS pnl,
  SUM(fee) AS total_fees,
  AVG(CASE WHEN side = 'buy' THEN price ELSE NULL END) AS avg_buy_price,
  AVG(CASE WHEN side = 'sell' THEN price ELSE NULL END) AS avg_sell_price
FROM 
  public.simulated_trades
GROUP BY 
  user_id, symbol, DATE_TRUNC('day', timestamp);

-- Apply RLS to the view
ALTER VIEW public.simulated_trade_analytics SECURITY INVOKER;

-- Create aggregate function for calculating cumulative P&L
CREATE OR REPLACE FUNCTION public.calculate_cumulative_pnl(
  user_id UUID,
  symbol TEXT,
  from_date TIMESTAMPTZ,
  to_date TIMESTAMPTZ
) 
RETURNS TABLE (
  date TIMESTAMPTZ,
  symbol TEXT,
  daily_pnl DECIMAL,
  cumulative_pnl DECIMAL
)
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH daily_pnl AS (
    SELECT
      DATE_TRUNC('day', timestamp) AS date,
      symbol,
      SUM(CASE WHEN side = 'buy' THEN -cost ELSE cost END) - SUM(fee) AS pnl
    FROM
      public.simulated_trades
    WHERE
      user_id = calculate_cumulative_pnl.user_id
      AND symbol = calculate_cumulative_pnl.symbol
      AND timestamp BETWEEN calculate_cumulative_pnl.from_date AND calculate_cumulative_pnl.to_date
    GROUP BY
      DATE_TRUNC('day', timestamp), symbol
  )
  SELECT
    date,
    symbol,
    pnl AS daily_pnl,
    SUM(pnl) OVER (PARTITION BY symbol ORDER BY date) AS cumulative_pnl
  FROM
    daily_pnl
  ORDER BY
    date;
$$;

-- Create view for performance metrics
CREATE OR REPLACE VIEW public.simulated_performance_metrics AS
WITH trade_stats AS (
  SELECT
    user_id,
    symbol,
    COUNT(*) AS total_trades,
    SUM(CASE WHEN side = 'buy' THEN 1 ELSE 0 END) AS buy_count,
    SUM(CASE WHEN side = 'sell' THEN 1 ELSE 0 END) AS sell_count,
    SUM(CASE WHEN side = 'buy' THEN -cost ELSE cost END) - SUM(fee) AS total_pnl,
    SUM(fee) AS total_fees,
    MAX(price) AS max_price,
    MIN(price) AS min_price,
    AVG(price) AS avg_price,
    MAX(CASE WHEN side = 'buy' THEN -cost ELSE cost END) AS max_trade_pnl,
    MIN(CASE WHEN side = 'buy' THEN -cost ELSE cost END) AS min_trade_pnl
  FROM
    public.simulated_trades
  GROUP BY
    user_id, symbol
)
SELECT
  ts.*,
  CASE WHEN total_trades > 0 THEN total_pnl / total_trades ELSE 0 END AS avg_trade_pnl,
  CASE WHEN total_pnl <> 0 THEN ABS(total_fees / total_pnl) ELSE 0 END AS fee_to_pnl_ratio,
  CASE WHEN buy_count > 0 THEN sell_count::FLOAT / buy_count ELSE 0 END AS sell_to_buy_ratio
FROM
  trade_stats ts;

-- Apply RLS to the view
ALTER VIEW public.simulated_performance_metrics SECURITY INVOKER;
