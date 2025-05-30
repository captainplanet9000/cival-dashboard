-- Create Agent Framework Schema
-- This migration creates the tables for the ElizaOS agent framework

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create agent types table
CREATE TABLE IF NOT EXISTS public.agent_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '[]'::JSONB,
  parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default agent types
INSERT INTO public.agent_types (name, description, capabilities, parameters) VALUES
('Market Analyzer', 'Analyzes market conditions and provides insights', '["market_analysis", "pattern_recognition", "trend_detection"]'::JSONB, '{
  "default_timeframes": ["1m", "5m", "15m", "1h", "4h", "1d"],
  "max_lookback_periods": 500,
  "default_indicators": ["RSI", "MACD", "Bollinger Bands"]
}'::JSONB),
('Execution Trader', 'Executes trades based on signals and strategies', '["order_placement", "position_management", "risk_control"]'::JSONB, '{
  "default_risk_per_trade": 1.0,
  "max_leverage": 5,
  "slippage_tolerance": 0.05
}'::JSONB),
('Strategy Manager', 'Manages and optimizes trading strategies', '["strategy_selection", "parameter_optimization", "performance_tracking"]'::JSONB, '{
  "optimization_interval": "1d",
  "performance_metrics": ["sharpe", "drawdown", "win_rate"],
  "strategy_rotation": true
}'::JSONB),
('Risk Manager', 'Monitors and controls trading risk', '["drawdown_protection", "exposure_management", "correlation_analysis"]'::JSONB, '{
  "max_drawdown": 10.0,
  "max_open_positions": 5,
  "position_sizing_method": "risk_parity"
}'::JSONB)
ON CONFLICT (id) DO NOTHING;

-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agent_type_id UUID REFERENCES public.agent_types(id),
  status TEXT DEFAULT 'inactive',
  instructions TEXT,
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  parameters JSONB DEFAULT '{}'::JSONB,
  knowledge_ids JSONB DEFAULT '[]'::JSONB,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Agents are only visible to the user who created them
CREATE POLICY "Users can view their own agents" ON public.agents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own agents
CREATE POLICY "Users can insert their own agents" ON public.agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own agents
CREATE POLICY "Users can update their own agents" ON public.agents
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own agents
CREATE POLICY "Users can delete their own agents" ON public.agents
  FOR DELETE USING (auth.uid() = user_id);

-- Create farms table for multi-agent coordination
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT NOT NULL,
  status TEXT DEFAULT 'inactive',
  parameters JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Farms are only visible to the user who created them
CREATE POLICY "Users can view their own farms" ON public.farms
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own farms
CREATE POLICY "Users can insert their own farms" ON public.farms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own farms
CREATE POLICY "Users can update their own farms" ON public.farms
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own farms
CREATE POLICY "Users can delete their own farms" ON public.farms
  FOR DELETE USING (auth.uid() = user_id);

-- Create farm_agents junction table
CREATE TABLE IF NOT EXISTS public.farm_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(farm_id, agent_id)
);

-- Add RLS policies
ALTER TABLE public.farm_agents ENABLE ROW LEVEL SECURITY;

-- Farm agents are visible to the farm owner
CREATE POLICY "Users can view their farm agents" ON public.farm_agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = farm_agents.farm_id
      AND farms.user_id = auth.uid()
    )
  );

-- Users can insert farm agents for their farms
CREATE POLICY "Users can insert farm agents" ON public.farm_agents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = farm_agents.farm_id
      AND farms.user_id = auth.uid()
    )
  );

-- Users can update farm agents for their farms
CREATE POLICY "Users can update farm agents" ON public.farm_agents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = farm_agents.farm_id
      AND farms.user_id = auth.uid()
    )
  );

-- Users can delete farm agents for their farms
CREATE POLICY "Users can delete farm agents" ON public.farm_agents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = farm_agents.farm_id
      AND farms.user_id = auth.uid()
    )
  );

-- Create agent runs table for logging agent activity
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'::JSONB,
  metrics JSONB DEFAULT '{}'::JSONB,
  error TEXT
);

-- Add RLS policies
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

-- Agent runs are visible to the agent owner
CREATE POLICY "Users can view their agent runs" ON public.agent_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agents 
      WHERE agents.id = agent_runs.agent_id
      AND agents.user_id = auth.uid()
    )
  );

-- Create agent messages table for storing communication
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'system', 'user', 'agent', 'tool'
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Add RLS policies
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- Agent messages are visible to the agent owner
CREATE POLICY "Users can view their agent messages" ON public.agent_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agent_runs 
      JOIN public.agents ON agent_runs.agent_id = agents.id
      WHERE agent_runs.id = agent_messages.run_id
      AND agents.user_id = auth.uid()
    )
  );

-- Create triggers to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_types_updated_at
BEFORE UPDATE ON public.agent_types
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_farms_updated_at
BEFORE UPDATE ON public.farms
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
