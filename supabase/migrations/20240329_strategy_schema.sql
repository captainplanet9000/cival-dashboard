-- Migration: Strategy Schema for Trading Farm
-- Description: Creates and enhances tables for strategy management

-- Strategy Status Enum
CREATE TYPE strategy_status AS ENUM (
  'draft',
  'active',
  'paused',
  'archived',
  'backtesting',
  'optimizing'
);

-- Strategy Type Enum
CREATE TYPE strategy_type AS ENUM (
  'momentum',
  'mean_reversion',
  'breakout',
  'trend_following',
  'arbitrage',
  'grid',
  'martingale',
  'custom'
);

-- Timeframe Enum
CREATE TYPE timeframe AS ENUM (
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w'
);

-- Create enhanced strategies table
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  status strategy_status DEFAULT 'draft' NOT NULL,
  strategy_type strategy_type NOT NULL,
  version TEXT DEFAULT '1.0.0' NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false NOT NULL,
  code TEXT,
  entry_conditions JSONB DEFAULT '{}'::jsonb NOT NULL,
  exit_conditions JSONB DEFAULT '{}'::jsonb NOT NULL,
  risk_management JSONB DEFAULT '{}'::jsonb NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb NOT NULL,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  tags TEXT[]
);

-- Create table for strategy versions
CREATE TABLE IF NOT EXISTS public.strategy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  code TEXT,
  entry_conditions JSONB DEFAULT '{}'::jsonb NOT NULL,
  exit_conditions JSONB DEFAULT '{}'::jsonb NOT NULL,
  risk_management JSONB DEFAULT '{}'::jsonb NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb NOT NULL,
  change_notes TEXT,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Version constraint
  UNIQUE(strategy_id, version)
);

-- Create table for strategy backtest results
CREATE TABLE IF NOT EXISTS public.strategy_backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE NOT NULL,
  strategy_version TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  timeframe timeframe NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  market TEXT NOT NULL,
  initial_capital DECIMAL NOT NULL,
  results JSONB NOT NULL,
  metrics JSONB NOT NULL,
  
  -- Add constraint to link to a specific strategy version
  CONSTRAINT fk_strategy_version FOREIGN KEY (strategy_id, strategy_version) 
  REFERENCES public.strategy_versions(strategy_id, version)
);

-- Create table for linking strategies to agents
CREATE TABLE IF NOT EXISTS public.agent_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  config JSONB DEFAULT '{}'::jsonb NOT NULL,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Each agent can only have one active configuration per strategy
  UNIQUE(agent_id, strategy_id)
);

-- Create table for linking strategies to farms
CREATE TABLE IF NOT EXISTS public.farm_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  allocation DECIMAL DEFAULT 0.0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  config JSONB DEFAULT '{}'::jsonb NOT NULL,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_allocation CHECK (allocation >= 0.0 AND allocation <= 1.0),
  UNIQUE(farm_id, strategy_id)
);

-- Create a view that joins strategies with their latest performance metrics
CREATE OR REPLACE VIEW public.strategy_performance AS
SELECT 
  s.id,
  s.name,
  s.strategy_type,
  s.status,
  s.version,
  s.performance_metrics,
  COUNT(fs.id) AS farm_count,
  COUNT(as.id) AS agent_count,
  COUNT(sb.id) AS backtest_count
FROM 
  public.strategies s
LEFT JOIN 
  public.farm_strategies fs ON s.id = fs.strategy_id
LEFT JOIN 
  public.agent_strategies as ON s.id = as.strategy_id
LEFT JOIN 
  public.strategy_backtests sb ON s.id = sb.strategy_id
GROUP BY 
  s.id, s.name, s.strategy_type, s.status, s.version, s.performance_metrics;

-- Add RLS policies
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_strategies ENABLE ROW LEVEL SECURITY;

-- RLS policies for strategies
CREATE POLICY "Public strategies are viewable by everyone" 
ON public.strategies FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can view their own strategies" 
ON public.strategies FOR SELECT 
USING (creator_id = auth.uid());

CREATE POLICY "Users can insert their own strategies" 
ON public.strategies FOR INSERT 
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own strategies" 
ON public.strategies FOR UPDATE
USING (creator_id = auth.uid());

CREATE POLICY "Users can delete their own strategies" 
ON public.strategies FOR DELETE
USING (creator_id = auth.uid());

-- Add functions for strategy management
CREATE OR REPLACE FUNCTION public.clone_strategy(
  strategy_id UUID,
  new_name TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_strategy_id UUID;
BEGIN
  -- Clone the base strategy
  INSERT INTO public.strategies (
    name, description, strategy_type, version, creator_id, is_public,
    code, entry_conditions, exit_conditions, risk_management, parameters
  )
  SELECT 
    new_name, description, strategy_type, '1.0.0', auth.uid(), false,
    code, entry_conditions, exit_conditions, risk_management, parameters
  FROM 
    public.strategies
  WHERE 
    id = strategy_id AND (is_public = true OR creator_id = auth.uid())
  RETURNING id INTO new_strategy_id;
  
  -- Clone the current version
  INSERT INTO public.strategy_versions (
    strategy_id, version, code, entry_conditions, exit_conditions, 
    risk_management, parameters, change_notes
  )
  SELECT 
    new_strategy_id, '1.0.0', code, entry_conditions, exit_conditions, 
    risk_management, parameters, 'Cloned from strategy ' || strategy_id
  FROM 
    public.strategies
  WHERE 
    id = strategy_id;
    
  RETURN new_strategy_id;
END;
$$;

-- Create a function to deploy a strategy to an agent
CREATE OR REPLACE FUNCTION public.deploy_strategy_to_agent(
  strategy_id UUID,
  agent_id UUID,
  config JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  deployment_id UUID;
BEGIN
  -- Check if strategy exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.strategies 
    WHERE id = strategy_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Strategy does not exist or is not active';
  END IF;
  
  -- Insert or update the agent strategy link
  INSERT INTO public.agent_strategies (
    agent_id, strategy_id, is_active, config
  )
  VALUES (
    agent_id, strategy_id, true, config
  )
  ON CONFLICT (agent_id, strategy_id) 
  DO UPDATE SET
    is_active = true,
    config = EXCLUDED.config,
    updated_at = now()
  RETURNING id INTO deployment_id;
  
  RETURN deployment_id;
END;
$$;

-- Create triggers to keep updated_at columns fresh
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_strategies_updated_at
BEFORE UPDATE ON public.strategies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_agent_strategies_updated_at
BEFORE UPDATE ON public.agent_strategies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_farm_strategies_updated_at
BEFORE UPDATE ON public.farm_strategies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at(); 