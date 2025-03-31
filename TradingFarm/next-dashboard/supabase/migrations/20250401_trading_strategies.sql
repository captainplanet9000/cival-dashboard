-- Migration: Trading Strategies Integration
-- Description: Create tables and functions for trading strategies and signals
-- Connects the farming system with real exchange APIs

-- Create strategy types enum
CREATE TYPE public.strategy_type AS ENUM (
  'trend_following',
  'mean_reversion',
  'breakout',
  'grid_trading',
  'scalping',
  'arbitrage',
  'custom'
);

-- Create signal direction enum
CREATE TYPE public.signal_direction AS ENUM (
  'buy',
  'sell',
  'neutral'
);

-- Create signal type enum
CREATE TYPE public.signal_type AS ENUM (
  'entry',
  'exit',
  'modify'
);

-- Trading strategies table
CREATE TABLE public.trading_strategies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  strategy_type strategy_type NOT NULL,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  max_drawdown NUMERIC,
  max_position_size NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_trading_strategies 
BEFORE UPDATE ON public.trading_strategies 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Strategy signals table
CREATE TABLE public.strategy_signals (
  id BIGSERIAL PRIMARY KEY,
  strategy_id BIGINT NOT NULL REFERENCES public.trading_strategies(id) ON DELETE CASCADE,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction signal_direction NOT NULL,
  signal_type signal_type NOT NULL,
  price NUMERIC NOT NULL,
  quantity NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  is_executed BOOLEAN NOT NULL DEFAULT false,
  execution_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_strategy_signals
BEFORE UPDATE ON public.strategy_signals
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Strategy backtest results table
CREATE TABLE public.strategy_backtest_results (
  id BIGSERIAL PRIMARY KEY,
  strategy_id BIGINT NOT NULL REFERENCES public.trading_strategies(id) ON DELETE CASCADE,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  initial_capital NUMERIC NOT NULL,
  final_capital NUMERIC NOT NULL,
  total_trades INTEGER NOT NULL,
  winning_trades INTEGER NOT NULL,
  losing_trades INTEGER NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  sharpe_ratio NUMERIC,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  trades JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_strategy_backtest_results
BEFORE UPDATE ON public.strategy_backtest_results
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_backtest_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trading_strategies
CREATE POLICY "Users can view their own trading strategies"
  ON public.trading_strategies
  FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can insert their own trading strategies"
  ON public.trading_strategies
  FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can update their own trading strategies"
  ON public.trading_strategies
  FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can delete their own trading strategies"
  ON public.trading_strategies
  FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

-- Create RLS policies for strategy_signals
CREATE POLICY "Users can view their own strategy signals"
  ON public.strategy_signals
  FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can insert signals for their own strategies"
  ON public.strategy_signals
  FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can update signals for their own strategies"
  ON public.strategy_signals
  FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can delete signals for their own strategies"
  ON public.strategy_signals
  FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

-- Create RLS policies for strategy_backtest_results
CREATE POLICY "Users can view their own backtest results"
  ON public.strategy_backtest_results
  FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can insert backtest results for their own strategies"
  ON public.strategy_backtest_results
  FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can update backtest results for their own strategies"
  ON public.strategy_backtest_results
  FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Users can delete backtest results for their own strategies"
  ON public.strategy_backtest_results
  FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.farms WHERE id = farm_id));

-- Function to get active strategies for a farm
CREATE OR REPLACE FUNCTION public.get_farm_active_strategies(p_farm_id BIGINT)
RETURNS SETOF public.trading_strategies
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.trading_strategies
  WHERE farm_id = p_farm_id AND is_active = true
  ORDER BY created_at DESC;
$$;

-- Function to get recent signals for a farm
CREATE OR REPLACE FUNCTION public.get_farm_recent_signals(p_farm_id BIGINT, p_limit INTEGER DEFAULT 100)
RETURNS SETOF public.strategy_signals
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.strategy_signals
  WHERE farm_id = p_farm_id
  ORDER BY timestamp DESC
  LIMIT p_limit;
$$;
