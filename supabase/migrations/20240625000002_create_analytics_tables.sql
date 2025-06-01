-- Create strategy_analytics table
CREATE TABLE IF NOT EXISTS public.strategy_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'all')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  equity_curve JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(strategy_id, period)
);

-- Create farm_performance_snapshots table
CREATE TABLE IF NOT EXISTS public.farm_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_value DECIMAL(20, 8) NOT NULL,
  daily_profit_loss DECIMAL(20, 8) NOT NULL,
  daily_roi DECIMAL(10, 6) NOT NULL,
  equity_value DECIMAL(20, 8) NOT NULL,
  asset_allocation JSONB NOT NULL DEFAULT '{}'::jsonb,
  strategy_allocation JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, snapshot_date)
);

-- Create risk_assessment_reports table
CREATE TABLE IF NOT EXISTS public.risk_assessment_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  value_at_risk DECIMAL(10, 6) NOT NULL,
  expected_shortfall DECIMAL(10, 6) NOT NULL,
  stress_test_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_by_asset JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_by_strategy JSONB NOT NULL DEFAULT '[]'::jsonb,
  correlation_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
  correlation_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, report_date)
);

-- Create backtest_results table
CREATE TABLE IF NOT EXISTS public.backtest_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_capital DECIMAL(20, 8) NOT NULL,
  final_capital DECIMAL(20, 8) NOT NULL,
  profit_loss DECIMAL(20, 8) NOT NULL,
  roi DECIMAL(10, 6) NOT NULL,
  win_rate DECIMAL(10, 6) NOT NULL,
  trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_strategy_analytics_strategy_id ON public.strategy_analytics(strategy_id);
CREATE INDEX idx_farm_performance_snapshots_farm_id ON public.farm_performance_snapshots(farm_id);
CREATE INDEX idx_farm_performance_snapshots_snapshot_date ON public.farm_performance_snapshots(snapshot_date);
CREATE INDEX idx_risk_assessment_reports_farm_id ON public.risk_assessment_reports(farm_id);
CREATE INDEX idx_risk_assessment_reports_report_date ON public.risk_assessment_reports(report_date);
CREATE INDEX idx_backtest_results_strategy_id ON public.backtest_results(strategy_id);

-- Enable Row Level Security
ALTER TABLE public.strategy_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for strategy_analytics
CREATE POLICY "Users can view analytics for strategies they created"
  ON public.strategy_analytics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = strategy_analytics.strategy_id
    AND strategies.creator_id = auth.uid()
  ));

-- Create RLS policies for farm_performance_snapshots
CREATE POLICY "Users can view performance snapshots for their farms"
  ON public.farm_performance_snapshots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = farm_performance_snapshots.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- Create RLS policies for risk_assessment_reports
CREATE POLICY "Users can view risk reports for their farms"
  ON public.risk_assessment_reports FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = risk_assessment_reports.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- Create RLS policies for backtest_results
CREATE POLICY "Users can view backtest results for strategies they created"
  ON public.backtest_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.strategies
    WHERE strategies.id = backtest_results.strategy_id
    AND strategies.creator_id = auth.uid()
  ));

-- Create analytics functions
CREATE OR REPLACE FUNCTION public.get_farm_performance(
  p_farm_id UUID,
  p_period TEXT DEFAULT 'all'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
  start_date DATE;
  snapshot_data JSONB;
BEGIN
  -- Determine start date based on period
  CASE p_period
    WHEN 'daily' THEN start_date := CURRENT_DATE - INTERVAL '30 days';
    WHEN 'weekly' THEN start_date := CURRENT_DATE - INTERVAL '12 weeks';
    WHEN 'monthly' THEN start_date := CURRENT_DATE - INTERVAL '12 months';
    ELSE start_date := CURRENT_DATE - INTERVAL '2 years';
  END CASE;
  
  -- Get performance snapshots
  SELECT json_agg(json_build_object(
    'date', snapshot_date,
    'equity', equity_value,
    'profit_loss', daily_profit_loss,
    'roi', daily_roi
  ) ORDER BY snapshot_date ASC)
  INTO snapshot_data
  FROM public.farm_performance_snapshots
  WHERE farm_id = p_farm_id
  AND snapshot_date >= start_date;
  
  -- In a real implementation, this would calculate actual metrics
  -- For demo purposes, return sample data
  result := json_build_object(
    'totalProfitLoss', 12587.25,
    'winRate', 0.72,
    'profitFactor', 2.34,
    'tradesCount', 145,
    'maxDrawdown', 0.15,
    'sharpeRatio', 1.89,
    'dailyReturns', (
      SELECT json_agg(json_build_object(
        'date', (CURRENT_DATE - (n || ' days')::INTERVAL)::TEXT,
        'return', (random() * 0.06 - 0.02)
      ))
      FROM generate_series(1, 30) n
    ),
    'monthlyReturns', (
      SELECT json_agg(json_build_object(
        'month', to_char(CURRENT_DATE - (n || ' months')::INTERVAL, 'YYYY-MM'),
        'return', (random() * 0.12 - 0.03)
      ))
      FROM generate_series(0, 11) n
    ),
    'equityCurve', COALESCE(snapshot_data, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_farm_risk_metrics(
  p_farm_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
  latest_report public.risk_assessment_reports%ROWTYPE;
BEGIN
  -- Get latest risk report
  SELECT * INTO latest_report
  FROM public.risk_assessment_reports
  WHERE farm_id = p_farm_id
  ORDER BY report_date DESC
  LIMIT 1;
  
  -- If a report exists, return its data
  IF FOUND THEN
    result := json_build_object(
      'valueAtRisk', latest_report.value_at_risk,
      'expectedShortfall', latest_report.expected_shortfall,
      'stressTestResults', latest_report.stress_test_results,
      'riskByAsset', latest_report.risk_by_asset,
      'riskByStrategy', latest_report.risk_by_strategy,
      'correlationMatrix', latest_report.correlation_matrix,
      'correlationLabels', latest_report.correlation_labels,
      'riskScore', latest_report.risk_score,
      'riskLevel', latest_report.risk_level
    );
  ELSE
    -- For demo purposes, return sample data
    result := json_build_object(
      'valueAtRisk', 0.045,
      'expectedShortfall', 0.062,
      'stressTestResults', json_build_array(
        json_build_object('scenario', 'Market Crash', 'impact', -0.32, 'description', 'Simulated 30% market drop'),
        json_build_object('scenario', 'Liquidity Crisis', 'impact', -0.18, 'description', 'Simulated 50% reduction in market liquidity'),
        json_build_object('scenario', 'Interest Rate Hike', 'impact', -0.12, 'description', 'Simulated 2% increase in interest rates')
      ),
      'riskByAsset', json_build_array(
        json_build_object('asset', 'BTC', 'allocation', 0.35, 'risk', 0.24),
        json_build_object('asset', 'ETH', 'allocation', 0.25, 'risk', 0.22),
        json_build_object('asset', 'SOL', 'allocation', 0.15, 'risk', 0.28),
        json_build_object('asset', 'USDC', 'allocation', 0.25, 'risk', 0.02)
      ),
      'riskByStrategy', json_build_array(
        json_build_object('strategy', 'Trend Following', 'allocation', 0.4, 'risk', 0.18),
        json_build_object('strategy', 'Mean Reversion', 'allocation', 0.3, 'risk', 0.14),
        json_build_object('strategy', 'Arbitrage', 'allocation', 0.2, 'risk', 0.09),
        json_build_object('strategy', 'Market Making', 'allocation', 0.1, 'risk', 0.05)
      ),
      'correlationMatrix', json_build_array(
        json_build_array(1.00, 0.85, 0.65, 0.10),
        json_build_array(0.85, 1.00, 0.72, 0.15),
        json_build_array(0.65, 0.72, 1.00, 0.18),
        json_build_array(0.10, 0.15, 0.18, 1.00)
      ),
      'correlationLabels', json_build_array('BTC', 'ETH', 'SOL', 'USDC'),
      'riskScore', 65,
      'riskLevel', 'medium'
    );
  END IF;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_strategy_analytics(
  p_strategy_id UUID,
  p_period TEXT DEFAULT 'all'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
  start_date DATE;
  end_date DATE := CURRENT_DATE;
BEGIN
  -- Determine start date based on period
  CASE p_period
    WHEN 'daily' THEN start_date := CURRENT_DATE - INTERVAL '1 day';
    WHEN 'weekly' THEN start_date := CURRENT_DATE - INTERVAL '7 days';
    WHEN 'monthly' THEN start_date := CURRENT_DATE - INTERVAL '30 days';
    ELSE start_date := CURRENT_DATE - INTERVAL '60 days';
  END CASE;
  
  -- In a real implementation, this would calculate actual analytics
  -- For demo purposes, return sample data
  result := json_build_object(
    'id', gen_random_uuid(),
    'strategy_id', p_strategy_id,
    'period', p_period,
    'start_date', start_date,
    'end_date', end_date,
    'metrics', json_build_object(
      'trades_count', 87,
      'win_rate', 0.68,
      'profit_factor', 2.15,
      'max_drawdown', 0.12,
      'sharpe_ratio', 1.92,
      'sortino_ratio', 2.35,
      'profit_loss', 4325.75,
      'roi', 0.29,
      'volatility', 0.022
    ),
    'trades', (
      SELECT json_agg(json_build_object(
        'timestamp', (CURRENT_DATE - ((20-n) || ' days')::INTERVAL + '12 hours'::INTERVAL)::TEXT,
        'type', CASE WHEN random() > 0.5 THEN 'buy' ELSE 'sell' END,
        'price', 1000 + (random() * 200),
        'size', 0.5 + (random() * 1.5),
        'profit_loss', CASE WHEN random() > 0.5 THEN (random() * 200 - 50) ELSE NULL END,
        'fees', (random() * 5)
      ))
      FROM generate_series(1, 20) n
    ),
    'equity_curve', (
      SELECT json_agg(json_build_object(
        'date', (CURRENT_DATE - ((60-n) || ' days')::INTERVAL)::TEXT,
        'equity', 10000 * (1 + (0.004 * n) + (random() * 0.015 - 0.005))
      ))
      FROM generate_series(1, 60) n
    )
  );
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_farm_risk_report(
  p_farm_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
  farm_data public.farms%ROWTYPE;
BEGIN
  -- Get farm data
  SELECT * INTO farm_data
  FROM public.farms
  WHERE id = p_farm_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'error', 'Farm not found'
    );
  END IF;
  
  -- In a real implementation, this would generate an actual report
  -- For demo purposes, return sample data
  result := json_build_object(
    'farm', json_build_object(
      'id', farm_data.id,
      'name', farm_data.name,
      'risk_level', farm_data.risk_level
    ),
    'risk_metrics', public.get_farm_risk_metrics(p_farm_id),
    'performance_metrics', public.get_farm_performance(p_farm_id),
    'recommendations', json_build_array(
      'Reduce exposure to high-correlation assets',
      'Consider adding hedging strategies',
      'Maintain sufficient stablecoin reserves',
      'Monitor market volatility closely'
    ),
    'generated_at', now()
  );
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_backtest(
  p_strategy_id UUID,
  p_start_date TEXT,
  p_end_date TEXT,
  p_initial_capital DECIMAL,
  p_parameters JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  -- In a real implementation, this would run an actual backtest
  -- For demo purposes, return sample data
  result := json_build_object(
    'strategy_id', p_strategy_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'initial_capital', p_initial_capital,
    'final_capital', p_initial_capital * (1 + random() * 0.5),
    'roi', random() * 0.5,
    'win_rate', 0.5 + random() * 0.3,
    'trades', (
      SELECT json_agg(json_build_object(
        'timestamp', (p_start_date::DATE + (n || ' days')::INTERVAL)::TEXT,
        'type', CASE WHEN random() > 0.5 THEN 'buy' ELSE 'sell' END,
        'price', 1000 + (random() * 200),
        'size', 0.5 + (random() * 1.5),
        'profit_loss', CASE WHEN random() > 0.4 THEN (random() * 200 - 50) ELSE (random() * -100) END
      ))
      FROM generate_series(1, 20) n
    ),
    'parameters', p_parameters
  );
  
  RETURN result;
END;
$$; 