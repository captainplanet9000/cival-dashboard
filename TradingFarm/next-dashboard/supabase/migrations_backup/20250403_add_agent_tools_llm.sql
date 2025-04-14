-- Migration to enhance agents with tools, exchange connections, and LLM access
-- Created for the Trading Farm Dashboard

-- Create agent_tools table to store available tools
CREATE TABLE IF NOT EXISTS public.agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tool_type TEXT NOT NULL, -- 'exchange', 'defi', 'analytics', 'llm', etc.
  config JSONB DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.agent_tools IS 'Available tools that can be equipped by agents';

-- Set up RLS for agent_tools
ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;

-- Create policy for agent_tools
CREATE POLICY "Agent tools are viewable by all authenticated users"
  ON public.agent_tools
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy for admin operations
CREATE POLICY "Agent tools are manageable by admin users"
  ON public.agent_tools
  USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

-- Create agent_equipped_tools junction table
CREATE TABLE IF NOT EXISTS public.agent_equipped_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.agent_tools(id) ON DELETE CASCADE,
  config JSONB DEFAULT '{}'::jsonb, -- Tool-specific configuration for this agent
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (agent_id, tool_id) -- An agent can equip a specific tool only once
);

-- Add comment to the table
COMMENT ON TABLE public.agent_equipped_tools IS 'Junction table connecting agents to their equipped tools';

-- Set up RLS for agent_equipped_tools
ALTER TABLE public.agent_equipped_tools ENABLE ROW LEVEL SECURITY;

-- Create policy for agent_equipped_tools
CREATE POLICY "Agent equipped tools are viewable by owner"
  ON public.agent_equipped_tools
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = agent_equipped_tools.agent_id
      AND a.user_id = auth.uid()
    )
  );

-- Create policy for agent_equipped_tools management
CREATE POLICY "Agent equipped tools are manageable by owner"
  ON public.agent_equipped_tools
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = agent_equipped_tools.agent_id
      AND a.user_id = auth.uid()
    )
  );

-- Create llm_configs table for agent LLM access
CREATE TABLE IF NOT EXISTS public.llm_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'gemini', etc.
  model TEXT NOT NULL, -- 'gpt-4', 'claude-3', etc.
  api_key TEXT, -- Encrypted API key (consider using vault pattern)
  config JSONB DEFAULT '{}'::jsonb, -- Additional configuration options
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.llm_configs IS 'LLM configurations for agents to use';

-- Set up RLS for llm_configs
ALTER TABLE public.llm_configs ENABLE ROW LEVEL SECURITY;

-- Create policy for llm_configs
CREATE POLICY "LLM configs are viewable by owner"
  ON public.llm_configs
  FOR SELECT
  USING (user_id = auth.uid());

-- Create policy for llm_configs management
CREATE POLICY "LLM configs are manageable by owner"
  ON public.llm_configs
  USING (user_id = auth.uid());

-- Update the agents table with new columns for tool and LLM access
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS tools_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS llm_config_id UUID REFERENCES public.llm_configs(id);
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS trading_permissions JSONB DEFAULT '{"exchanges": [], "defi_protocols": []}'::jsonb;

-- Create functions to handle timestamps
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

-- Create triggers for new tables
CREATE TRIGGER set_agent_tools_created_at
BEFORE INSERT ON public.agent_tools
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_agent_tools_updated_at
BEFORE UPDATE ON public.agent_tools
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_agent_equipped_tools_created_at
BEFORE INSERT ON public.agent_equipped_tools
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_agent_equipped_tools_updated_at
BEFORE UPDATE ON public.agent_equipped_tools
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_llm_configs_created_at
BEFORE INSERT ON public.llm_configs
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_llm_configs_updated_at
BEFORE UPDATE ON public.llm_configs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default tool types
INSERT INTO public.agent_tools (name, description, tool_type, config) VALUES
('Exchange Connector', 'Connects to cryptocurrency exchanges for trading', 'exchange', '{"supported_exchanges": ["binance", "bybit", "coinbase"]}'::jsonb),
('DeFi Protocol Gateway', 'Interacts with decentralized finance protocols', 'defi', '{"supported_protocols": ["uniswap", "aave", "curve"]}'::jsonb),
('Market Data Analyzer', 'Fetches and analyzes market data', 'analytics', '{"data_sources": ["tradingview", "coingecko", "glassnode"]}'::jsonb),
('Strategy Backtester', 'Backtests trading strategies against historical data', 'analytics', '{"timeframes": ["1m", "5m", "15m", "1h", "4h", "1d"]}'::jsonb),
('Technical Indicator Suite', 'Provides technical analysis indicators', 'analytics', '{"indicators": ["RSI", "MACD", "Bollinger Bands", "Moving Averages"]}'::jsonb),
('Risk Management System', 'Manages position sizing and risk parameters', 'risk', '{"features": ["position sizing", "stop loss", "take profit", "drawdown protection"]}'::jsonb),
('Sentiment Analyzer', 'Analyzes market sentiment from news and social media', 'analytics', '{"sources": ["twitter", "reddit", "news", "discord"]}'::jsonb),
('GPT-4 Assistant', 'Provides advanced language capabilities using OpenAI GPT-4', 'llm', '{"provider": "openai", "model": "gpt-4"}'::jsonb),
('Claude Opus Assistant', 'Provides advanced reasoning using Anthropic Claude', 'llm', '{"provider": "anthropic", "model": "claude-3-opus"}'::jsonb),
('Gemini Pro Assistant', 'Provides AI capabilities using Google Gemini', 'llm', '{"provider": "google", "model": "gemini-pro"}'::jsonb);

-- Add JSON Schema validation for agent configs
ALTER TABLE public.agents ADD CONSTRAINT agent_trading_permissions_check 
CHECK (jsonb_typeof(trading_permissions) = 'object');

ALTER TABLE public.agents ADD CONSTRAINT agent_tools_config_check 
CHECK (jsonb_typeof(tools_config) = 'object');
