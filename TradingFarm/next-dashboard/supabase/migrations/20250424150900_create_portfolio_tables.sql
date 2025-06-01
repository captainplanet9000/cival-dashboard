-- Create Portfolio Management Tables
-- Date: 2025-04-24

-- Portfolios table to store portfolio definitions
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  initial_capital FLOAT NOT NULL,
  current_value FLOAT NOT NULL,
  allocation_method TEXT NOT NULL,
  rebalancing_frequency TEXT NOT NULL,
  drift_threshold FLOAT,
  last_rebalanced TIMESTAMPTZ,
  next_rebalance TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for portfolios
CREATE POLICY "Users can view their own portfolios"
  ON public.portfolios
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own portfolios"
  ON public.portfolios
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own portfolios"
  ON public.portfolios
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own portfolios"
  ON public.portfolios
  FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER handle_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Portfolio allocations table to store current allocations
CREATE TABLE public.portfolio_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  allocation_percentage FLOAT NOT NULL,
  current_value FLOAT,
  target_value FLOAT,
  actual_percentage FLOAT,
  drift FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, strategy_id)
);

-- Enable RLS
ALTER TABLE public.portfolio_allocations ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for portfolio allocations
CREATE POLICY "Users can view their own portfolio allocations"
  ON public.portfolio_allocations
  FOR SELECT
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own portfolio allocations"
  ON public.portfolio_allocations
  FOR INSERT
  WITH CHECK (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own portfolio allocations"
  ON public.portfolio_allocations
  FOR UPDATE
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own portfolio allocations"
  ON public.portfolio_allocations
  FOR DELETE
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER handle_portfolio_allocations_updated_at
  BEFORE UPDATE ON public.portfolio_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Allocation targets table to store target allocations for portfolio optimization
CREATE TABLE public.allocation_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  target_percentage FLOAT NOT NULL,
  min_percentage FLOAT,
  max_percentage FLOAT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, strategy_id)
);

-- Enable RLS
ALTER TABLE public.allocation_targets ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for allocation targets
CREATE POLICY "Users can view their own allocation targets"
  ON public.allocation_targets
  FOR SELECT
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own allocation targets"
  ON public.allocation_targets
  FOR INSERT
  WITH CHECK (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own allocation targets"
  ON public.allocation_targets
  FOR UPDATE
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own allocation targets"
  ON public.allocation_targets
  FOR DELETE
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER handle_allocation_targets_updated_at
  BEFORE UPDATE ON public.allocation_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Portfolio performance table to track daily performance metrics
CREATE TABLE public.portfolio_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  value FLOAT NOT NULL,
  daily_return FLOAT NOT NULL,
  daily_return_pct FLOAT NOT NULL,
  cumulative_return FLOAT NOT NULL,
  cumulative_return_pct FLOAT NOT NULL,
  drawdown FLOAT NOT NULL,
  drawdown_pct FLOAT NOT NULL,
  volatility_30d FLOAT,
  sharpe_ratio_30d FLOAT,
  sortino_ratio_30d FLOAT,
  max_drawdown_30d FLOAT,
  max_drawdown_30d_pct FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, date)
);

-- Enable RLS
ALTER TABLE public.portfolio_performance ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for portfolio performance
CREATE POLICY "Users can view their own portfolio performance"
  ON public.portfolio_performance
  FOR SELECT
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own portfolio performance"
  ON public.portfolio_performance
  FOR INSERT
  WITH CHECK (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own portfolio performance"
  ON public.portfolio_performance
  FOR UPDATE
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

-- Rebalancing transactions table to track portfolio rebalancing actions
CREATE TABLE public.rebalancing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  amount FLOAT NOT NULL,
  previous_allocation FLOAT NOT NULL,
  new_allocation FLOAT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('scheduled', 'threshold', 'manual')),
  executed_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rebalancing_transactions ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for rebalancing transactions
CREATE POLICY "Users can view their own rebalancing transactions"
  ON public.rebalancing_transactions
  FOR SELECT
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own rebalancing transactions"
  ON public.rebalancing_transactions
  FOR INSERT
  WITH CHECK (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own rebalancing transactions"
  ON public.rebalancing_transactions
  FOR UPDATE
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER handle_rebalancing_transactions_updated_at
  BEFORE UPDATE ON public.rebalancing_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Optimization parameters table to store portfolio optimization settings
CREATE TABLE public.optimization_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  optimization_goal TEXT NOT NULL CHECK (optimization_goal IN ('maximize_return', 'minimize_risk', 'maximize_sharpe', 'custom')),
  risk_free_rate FLOAT NOT NULL DEFAULT 0.02,
  max_allocation_per_strategy FLOAT,
  min_allocation_per_strategy FLOAT,
  max_portfolio_volatility FLOAT,
  min_expected_return FLOAT,
  custom_constraints JSONB,
  lookback_period TEXT NOT NULL CHECK (lookback_period IN ('1m', '3m', '6m', '1y', 'ytd', 'all')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.optimization_parameters ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for optimization parameters
CREATE POLICY "Users can view their own optimization parameters"
  ON public.optimization_parameters
  FOR SELECT
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own optimization parameters"
  ON public.optimization_parameters
  FOR INSERT
  WITH CHECK (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own optimization parameters"
  ON public.optimization_parameters
  FOR UPDATE
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER handle_optimization_parameters_updated_at
  BEFORE UPDATE ON public.optimization_parameters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Optimization results table to store the results of portfolio optimization runs
CREATE TABLE public.optimization_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_id UUID NOT NULL REFERENCES public.optimization_parameters(id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  allocations JSONB NOT NULL,
  expected_portfolio_return FLOAT NOT NULL,
  expected_portfolio_volatility FLOAT NOT NULL,
  expected_sharpe_ratio FLOAT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.optimization_results ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for optimization results
CREATE POLICY "Users can view their own optimization results"
  ON public.optimization_results
  FOR SELECT
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own optimization results"
  ON public.optimization_results
  FOR INSERT
  WITH CHECK (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own optimization results"
  ON public.optimization_results
  FOR UPDATE
  USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX idx_portfolio_allocations_portfolio_id ON public.portfolio_allocations(portfolio_id);
CREATE INDEX idx_allocation_targets_portfolio_id ON public.allocation_targets(portfolio_id);
CREATE INDEX idx_portfolio_performance_portfolio_id_date ON public.portfolio_performance(portfolio_id, date);
CREATE INDEX idx_rebalancing_transactions_portfolio_id ON public.rebalancing_transactions(portfolio_id);
