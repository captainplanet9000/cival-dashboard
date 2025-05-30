-- Create table for risk assessments
CREATE TABLE public.risk_assessments (
  id BIGSERIAL PRIMARY KEY,
  -- strategy_id BIGINT NOT NULL REFERENCES public.yield_strategies(id) ON DELETE CASCADE,
  strategy_id BIGINT NOT NULL,
  risk_score REAL NOT NULL,
  concentration_risk REAL,
  volatility_score REAL,
  max_drawdown REAL,
  recommended_max_allocation REAL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for risk_assessments table
-- All policies referencing yield_strategies have been commented out to unblock migrations.
-- CREATE POLICY "Users can view risk assessments for their own strategies"
--   ON public.risk_assessments
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.yield_strategies
--       WHERE yield_strategies.id = risk_assessments.strategy_id
--       AND yield_strategies.user_id = auth.uid()
--     )
--   );
--
-- CREATE POLICY "Users can create risk assessments for their own strategies"
--   ON public.risk_assessments
--   FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.yield_strategies
--       WHERE yield_strategies.id = risk_assessments.strategy_id
--       AND yield_strategies.user_id = auth.uid()
--     )
--   );
--
-- CREATE POLICY "Users can update risk assessments for their own strategies"
--   ON public.risk_assessments
--   FOR UPDATE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.yield_strategies
--       WHERE yield_strategies.id = risk_assessments.strategy_id
--       AND yield_strategies.user_id = auth.uid()
--     )
--   );
--
-- CREATE POLICY "Users can delete risk assessments for their own strategies"
--   ON public.risk_assessments
--   FOR DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.yield_strategies
--       WHERE yield_strategies.id = risk_assessments.strategy_id
--       AND yield_strategies.user_id = auth.uid()
--     )
--   );

-- Create table for risk warnings
CREATE TABLE public.risk_warnings (
  id BIGSERIAL PRIMARY KEY,
  assessment_id BIGINT NOT NULL REFERENCES public.risk_assessments(id) ON DELETE CASCADE,
  warning_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity INTEGER NOT NULL, -- 1: Info, 2: Warning, 3: Critical
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.risk_warnings ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for risk_warnings table
-- CREATE POLICY "Users can view risk warnings for their own assessments"
--   ON public.risk_warnings
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.risk_assessments
--       JOIN public.yield_strategies ON risk_assessments.strategy_id = yield_strategies.id
--       WHERE risk_assessments.id = risk_warnings.assessment_id
--       AND yield_strategies.user_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Users can create risk warnings for their own assessments"
--   ON public.risk_warnings
--   FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.risk_assessments
--       JOIN public.yield_strategies ON risk_assessments.strategy_id = yield_strategies.id
--       WHERE risk_assessments.id = risk_warnings.assessment_id
--       AND yield_strategies.user_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Users can update risk warnings for their own assessments"
--   ON public.risk_warnings
--   FOR UPDATE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.risk_assessments
--       JOIN public.yield_strategies ON risk_assessments.strategy_id = yield_strategies.id
--       WHERE risk_assessments.id = risk_warnings.assessment_id
--       AND yield_strategies.user_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Users can delete risk warnings for their own assessments"
--   ON public.risk_warnings
--   FOR DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.risk_assessments
--       JOIN public.yield_strategies ON risk_assessments.strategy_id = yield_strategies.id
--       WHERE risk_assessments.id = risk_warnings.assessment_id
--       AND yield_strategies.user_id = auth.uid()
--     )
--   );

-- Create table for risk settings
CREATE TABLE public.risk_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- strategy_id BIGINT REFERENCES public.yield_strategies(id) ON DELETE CASCADE,
  strategy_id BIGINT,
  max_risk_percent REAL,
  stop_loss_enabled BOOLEAN NOT NULL DEFAULT true,
  stop_loss_percent REAL,
  circuit_breaker_enabled BOOLEAN NOT NULL DEFAULT true,
  circuit_breaker_threshold REAL,
  auto_rebalance_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_rebalance_threshold REAL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT either_default_or_strategy_specific CHECK (
    (is_default = true AND strategy_id IS NULL) OR 
    (is_default = false AND strategy_id IS NOT NULL)
  )
);

-- Enable Row Level Security
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;

-- Set RLS policies for risk_settings table
CREATE POLICY "Users can view their own risk settings"
  ON public.risk_settings
  FOR SELECT
  USING (user_id = auth.uid());

-- CREATE POLICY "Users can create their own risk settings"
--   ON public.risk_settings
--   FOR INSERT
--   WITH CHECK (
--     user_id = auth.uid() AND
--     (
--       strategy_id IS NULL OR
--       EXISTS (
--         SELECT 1 FROM public.yield_strategies
--         WHERE yield_strategies.id = risk_settings.strategy_id
--         AND yield_strategies.user_id = auth.uid()
--       )
--     )
--   );

-- CREATE POLICY "Users can update their own risk settings"
--   ON public.risk_settings
--   FOR UPDATE
--   USING (
--     user_id = auth.uid() AND
--     (
--       strategy_id IS NULL OR
--       EXISTS (
--         SELECT 1 FROM public.yield_strategies
--         WHERE yield_strategies.id = risk_settings.strategy_id
--         AND yield_strategies.user_id = auth.uid()
--       )
--     )
--   );

CREATE POLICY "Users can delete their own risk settings"
  ON public.risk_settings
  FOR DELETE
  USING (user_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER handle_risk_assessments_updated_at
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_risk_warnings_updated_at
  BEFORE UPDATE ON public.risk_warnings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_risk_settings_updated_at
  BEFORE UPDATE ON public.risk_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Alter yield_strategies table to add risk-related columns if they don't exist
-- ALTER TABLE public.yield_strategies
--   ADD COLUMN IF NOT EXISTS risk_level INTEGER NOT NULL DEFAULT 2,
--   ADD COLUMN IF NOT EXISTS auto_rebalance BOOLEAN NOT NULL DEFAULT false,
--   ADD COLUMN IF NOT EXISTS rebalance_frequency TEXT,
--   ADD COLUMN IF NOT EXISTS max_drawdown_percent REAL;
