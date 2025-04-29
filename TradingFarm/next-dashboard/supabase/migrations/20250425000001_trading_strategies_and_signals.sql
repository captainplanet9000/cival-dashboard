-- Migration for Trading Strategies and Signals
-- Created: 2025-04-25

-- Trading Strategies Table
CREATE TABLE public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'trend_following',
  symbols TEXT[] NOT NULL DEFAULT '{}',
  exchange TEXT NOT NULL DEFAULT 'binance',
  parameters JSONB NOT NULL DEFAULT '{}',
  timeframes TEXT[] NOT NULL DEFAULT '{"1h"}',
  indicators JSONB[] NOT NULL DEFAULT '{}',
  signal_thresholds JSONB NOT NULL DEFAULT '{"buy": 70, "sell": 30}',
  position JSONB NOT NULL DEFAULT '{"sizing": "percentage", "sizingValue": 5, "maxPositions": 10}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER handle_strategies_updated_at
  BEFORE UPDATE ON public.strategies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own strategies"
  ON public.strategies
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own strategies"
  ON public.strategies
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own strategies"
  ON public.strategies
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own strategies"
  ON public.strategies
  FOR DELETE
  USING (user_id = auth.uid());

-- Add column to portfolios table for automated trading
ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS automated_trading_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL;

-- Trading Signals Table
CREATE TABLE public.trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'hold', 'rebalance', 'close')),
  strength TEXT NOT NULL CHECK (strength IN ('weak', 'moderate', 'strong')),
  source TEXT NOT NULL CHECK (source IN ('technical', 'fundamental', 'rebalancing', 'risk_management', 'manual')),
  price FLOAT NOT NULL,
  target_price FLOAT,
  stop_loss FLOAT,
  take_profit FLOAT,
  quantity FLOAT,
  executed BOOLEAN NOT NULL DEFAULT false,
  execution_timestamp TIMESTAMPTZ,
  execution_details JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER handle_trading_signals_updated_at
  BEFORE UPDATE ON public.trading_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.trading_signals ENABLE ROW LEVEL SECURITY;

-- Create index for fast queries
CREATE INDEX trading_signals_portfolio_id_idx ON public.trading_signals(portfolio_id);
CREATE INDEX trading_signals_strategy_id_idx ON public.trading_signals(strategy_id);
CREATE INDEX trading_signals_timestamp_idx ON public.trading_signals(timestamp);
CREATE INDEX trading_signals_executed_idx ON public.trading_signals(executed);

-- Create policies for RLS
CREATE POLICY "Users can view trading signals for their portfolios"
  ON public.trading_signals
  FOR SELECT
  USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert trading signals for their portfolios"
  ON public.trading_signals
  FOR INSERT
  WITH CHECK (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update trading signals for their portfolios"
  ON public.trading_signals
  FOR UPDATE
  USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete trading signals for their portfolios"
  ON public.trading_signals
  FOR DELETE
  USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

-- Activity Logs for strategy actions (if not already created)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on activity logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for activity logs
CREATE POLICY IF NOT EXISTS "Users can view their own activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert their own activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
