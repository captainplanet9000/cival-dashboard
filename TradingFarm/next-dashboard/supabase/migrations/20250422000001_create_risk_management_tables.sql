-- Migration to create risk management tables
-- Create risk_profiles table for storing user risk management profiles

-- Create enum for risk levels
CREATE TYPE public.risk_level AS ENUM (
  'conservative',
  'moderate',
  'aggressive',
  'custom'
);

-- Table for storing risk profiles
CREATE TABLE public.risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  level risk_level NOT NULL DEFAULT 'moderate',
  parameters JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure timestamps are automatically handled
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.risk_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create risk_profile_assignments table for linking profiles to agents
CREATE TABLE public.risk_profile_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  risk_profile_id UUID NOT NULL REFERENCES public.risk_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (agent_id, risk_profile_id)
);

-- Ensure timestamps are automatically handled
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.risk_profile_assignments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create portfolio_risk_snapshots table for recording risk snapshots over time
CREATE TABLE public.portfolio_risk_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  total_equity DECIMAL(18, 8) NOT NULL,
  total_exposure DECIMAL(18, 8) NOT NULL,
  current_drawdown DECIMAL(8, 4) NOT NULL,
  exposure_by_symbol JSONB NOT NULL,
  exposure_by_sector JSONB NOT NULL,
  leverage_utilization DECIMAL(8, 4) NOT NULL,
  risk_score INTEGER NOT NULL,
  diversification_score INTEGER NOT NULL,
  correlation_matrix JSONB,
  circuit_breaker_warnings JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create risk_limits table for storing user-defined risk limits
CREATE TABLE public.risk_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  max_daily_loss DECIMAL(8, 4), -- percentage
  max_position_size DECIMAL(8, 4), -- percentage
  max_leverage DECIMAL(8, 4),
  max_drawdown DECIMAL(8, 4), -- percentage
  is_trading_halted BOOLEAN NOT NULL DEFAULT false,
  halt_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure timestamps are automatically handled
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.risk_limits
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create trade_risk_assessments table for logging risk assessments of trades
CREATE TABLE public.trade_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  is_allowed BOOLEAN NOT NULL,
  reasons JSONB,
  warnings JSONB,
  position_sizing JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_profile_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_risk_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Risk Profiles policies
CREATE POLICY "Users can view their own risk profiles"
  ON public.risk_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risk profiles"
  ON public.risk_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk profiles"
  ON public.risk_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk profiles"
  ON public.risk_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Risk Profile Assignments policies
CREATE POLICY "Users can view their own risk profile assignments"
  ON public.risk_profile_assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = agent_id
    AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert risk profile assignments for their agents"
  ON public.risk_profile_assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = agent_id
    AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can update risk profile assignments for their agents"
  ON public.risk_profile_assignments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = agent_id
    AND agents.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = agent_id
    AND agents.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete risk profile assignments for their agents"
  ON public.risk_profile_assignments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.agents
    WHERE agents.id = agent_id
    AND agents.user_id = auth.uid()
  ));

-- Portfolio Risk Snapshots policies
CREATE POLICY "Users can view their own portfolio risk snapshots"
  ON public.portfolio_risk_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolio risk snapshots"
  ON public.portfolio_risk_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Risk Limits policies
CREATE POLICY "Users can view their own risk limits"
  ON public.risk_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risk limits"
  ON public.risk_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk limits"
  ON public.risk_limits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trade Risk Assessments policies
CREATE POLICY "Users can view their own trade risk assessments"
  ON public.trade_risk_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade risk assessments"
  ON public.trade_risk_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_risk_profiles_user_id ON public.risk_profiles(user_id);
CREATE INDEX idx_risk_profiles_is_default ON public.risk_profiles(is_default);
CREATE INDEX idx_risk_profile_assignments_agent_id ON public.risk_profile_assignments(agent_id);
CREATE INDEX idx_risk_profile_assignments_risk_profile_id ON public.risk_profile_assignments(risk_profile_id);
CREATE INDEX idx_portfolio_risk_snapshots_user_id ON public.portfolio_risk_snapshots(user_id);
CREATE INDEX idx_portfolio_risk_snapshots_farm_id ON public.portfolio_risk_snapshots(farm_id);
CREATE INDEX idx_portfolio_risk_snapshots_created_at ON public.portfolio_risk_snapshots(created_at);
CREATE INDEX idx_risk_limits_user_id ON public.risk_limits(user_id);
CREATE INDEX idx_risk_limits_farm_id ON public.risk_limits(farm_id);
CREATE INDEX idx_trade_risk_assessments_user_id ON public.trade_risk_assessments(user_id);
CREATE INDEX idx_trade_risk_assessments_order_id ON public.trade_risk_assessments(order_id);
CREATE INDEX idx_trade_risk_assessments_created_at ON public.trade_risk_assessments(created_at);
