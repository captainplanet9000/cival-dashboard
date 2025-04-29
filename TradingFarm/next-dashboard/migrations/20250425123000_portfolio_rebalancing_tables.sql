-- Add Order Execution Fields to Rebalancing Transactions
ALTER TABLE IF EXISTS public.rebalancing_transactions
ADD COLUMN IF NOT EXISTS order_id TEXT,
ADD COLUMN IF NOT EXISTS execution_price DECIMAL,
ADD COLUMN IF NOT EXISTS execution_quantity DECIMAL;

-- Create Triggers for Timestamp Handling
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

-- Ensure we have a trades table to track execution history
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  fee DECIMAL,
  fee_currency TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('rebalance', 'manual', 'system')),
  exchange TEXT NOT NULL,
  market TEXT NOT NULL,
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add triggers for timestamp handling
CREATE TRIGGER handle_trades_created_at
  BEFORE INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on trades table
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for trades table
CREATE POLICY "Users can view their own trades"
  ON public.trades
  FOR SELECT
  USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

-- Add execution timestamp index for performance
CREATE INDEX IF NOT EXISTS trades_portfolio_date_idx ON public.trades(portfolio_id, date);
