-- Migration to enhance agent-to-agent communication and agent creation
-- Created for the Trading Farm Dashboard

-- Create agent communication table
CREATE TABLE IF NOT EXISTS public.agent_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  is_broadcast BOOLEAN DEFAULT false,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'broadcast', 'direct', 'command', 'status', 'query', 'analysis', 'alert'
  priority TEXT NOT NULL, -- 'low', 'medium', 'high', 'urgent'
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.agent_communications IS 'Communications between agents within the system';

-- Set up RLS for agent_communications
ALTER TABLE public.agent_communications ENABLE ROW LEVEL SECURITY;

-- Create policy for agent_communications
CREATE POLICY "Agent communications are viewable by farm owners"
  ON public.agent_communications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      JOIN public.farms f ON a.farm_id = f.id
      WHERE (a.id = agent_communications.sender_id OR a.id = agent_communications.recipient_id)
      AND f.user_id = auth.uid()
    )
  );

-- Create policy for agent_communications management
CREATE POLICY "Agent communications are manageable by farm owners"
  ON public.agent_communications
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      JOIN public.farms f ON a.farm_id = f.id
      WHERE (a.id = agent_communications.sender_id OR a.id = agent_communications.recipient_id)
      AND f.user_id = auth.uid()
    )
  );

-- Create agent collaboration table
CREATE TABLE IF NOT EXISTS public.agent_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.agent_collaborations IS 'Collaboration groups for agents to work together';

-- Set up RLS for agent_collaborations
ALTER TABLE public.agent_collaborations ENABLE ROW LEVEL SECURITY;

-- Create policy for agent_collaborations
CREATE POLICY "Agent collaborations are viewable by farm owners"
  ON public.agent_collaborations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = agent_collaborations.farm_id
      AND f.user_id = auth.uid()
    )
  );

-- Create policy for agent_collaborations management
CREATE POLICY "Agent collaborations are manageable by farm owners"
  ON public.agent_collaborations
  USING (
    EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = agent_collaborations.farm_id
      AND f.user_id = auth.uid()
    )
  );

-- Create agent collaboration members junction table
CREATE TABLE IF NOT EXISTS public.agent_collaboration_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id UUID NOT NULL REFERENCES public.agent_collaborations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'leader', 'member', 'observer'
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (collaboration_id, agent_id)
);

-- Add comment to the table
COMMENT ON TABLE public.agent_collaboration_members IS 'Junction table connecting agents to their collaboration groups';

-- Set up RLS for agent_collaboration_members
ALTER TABLE public.agent_collaboration_members ENABLE ROW LEVEL SECURITY;

-- Create policy for agent_collaboration_members
CREATE POLICY "Agent collaboration members are viewable by farm owners"
  ON public.agent_collaboration_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_collaborations ac
      JOIN public.farms f ON ac.farm_id = f.id
      WHERE ac.id = agent_collaboration_members.collaboration_id
      AND f.user_id = auth.uid()
    )
  );

-- Create policy for agent_collaboration_members management
CREATE POLICY "Agent collaboration members are manageable by farm owners"
  ON public.agent_collaboration_members
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_collaborations ac
      JOIN public.farms f ON ac.farm_id = f.id
      WHERE ac.id = agent_collaboration_members.collaboration_id
      AND f.user_id = auth.uid()
    )
  );

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
CREATE TRIGGER set_agent_communications_created_at
BEFORE INSERT ON public.agent_communications
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_agent_communications_updated_at
BEFORE UPDATE ON public.agent_communications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_agent_collaborations_created_at
BEFORE INSERT ON public.agent_collaborations
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_agent_collaborations_updated_at
BEFORE UPDATE ON public.agent_collaborations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_agent_collaboration_members_created_at
BEFORE INSERT ON public.agent_collaboration_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_agent_collaboration_members_updated_at
BEFORE UPDATE ON public.agent_collaboration_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add agent templates table for quicker agent creation
CREATE TABLE IF NOT EXISTS public.agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  strategy_type TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  tools_config JSONB DEFAULT '{}'::jsonb,
  default_tools JSONB DEFAULT '[]'::jsonb,
  trading_permissions JSONB DEFAULT '{"exchanges": [], "defi_protocols": []}'::jsonb,
  instructions TEXT,
  is_public BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.agent_templates IS 'Templates for creating new agents quickly';

-- Set up RLS for agent_templates
ALTER TABLE public.agent_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for agent_templates
CREATE POLICY "Agent templates are viewable by authenticated users if public"
  ON public.agent_templates
  FOR SELECT
  USING (
    is_public = true OR user_id = auth.uid()
  );

-- Create policy for agent_templates management
CREATE POLICY "Agent templates are manageable by owners"
  ON public.agent_templates
  USING (
    user_id = auth.uid()
  );

-- Create triggers for agent_templates
CREATE TRIGGER set_agent_templates_created_at
BEFORE INSERT ON public.agent_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_agent_templates_updated_at
BEFORE UPDATE ON public.agent_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default agent templates
INSERT INTO public.agent_templates (name, description, type, strategy_type, config, tools_config, default_tools, trading_permissions, instructions, is_public)
VALUES
(
  'Momentum Trader', 
  'An agent that uses momentum indicators to identify and trade trends', 
  'trading', 
  'momentum', 
  '{"risk_level": "moderate", "target_markets": ["BTC/USD", "ETH/USD"]}'::jsonb,
  '{"memory_enabled": true, "autonomous_trading": false, "llm_enabled": true}'::jsonb,
  '["exchange-connector", "market-data-analyzer", "technical-indicator-suite"]'::jsonb,
  '{"exchanges": ["bybit-testnet"], "defi_protocols": []}'::jsonb,
  'I am a momentum-based trading agent. I identify trends using indicators like RSI, MACD, and moving averages, then execute trades in the direction of the momentum. I prioritize risk management by using proper position sizing and stop losses.', 
  true
),
(
  'Mean Reversion Trader', 
  'An agent that identifies overbought and oversold conditions for trading reversals', 
  'trading', 
  'mean-reversion', 
  '{"risk_level": "moderate", "target_markets": ["BTC/USD", "ETH/USD"]}'::jsonb,
  '{"memory_enabled": true, "autonomous_trading": false, "llm_enabled": true}'::jsonb,
  '["exchange-connector", "market-data-analyzer", "technical-indicator-suite"]'::jsonb,
  '{"exchanges": ["bybit-testnet"], "defi_protocols": []}'::jsonb,
  'I am a mean reversion trading agent. I look for assets that have deviated significantly from their historical averages and trade on the expectation they will return to the mean. I use indicators like Bollinger Bands, RSI, and stochastic oscillators to identify overbought and oversold conditions.', 
  true
),
(
  'DeFi Liquidity Provider', 
  'An agent that manages liquidity positions across DeFi protocols', 
  'defi', 
  'liquidity-provision', 
  '{"risk_level": "moderate", "target_markets": ["ETH/USDC", "BTC/USDC"]}'::jsonb,
  '{"memory_enabled": true, "autonomous_trading": false, "llm_enabled": true}'::jsonb,
  '["defi-protocol-gateway", "risk-management-system", "sentiment-analyzer"]'::jsonb,
  '{"exchanges": [], "defi_protocols": ["uniswap", "curve"]}'::jsonb,
  'I am a DeFi liquidity provider agent. I manage liquidity positions across multiple protocols, optimizing for yield while managing impermanent loss risk. I monitor gas prices and network conditions to ensure efficient operations.', 
  true
),
(
  'Market Analyst', 
  'An agent that analyzes market conditions and provides insights without trading', 
  'analyst', 
  'multi-strategy', 
  '{"risk_level": "low", "target_markets": ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD"]}'::jsonb,
  '{"memory_enabled": true, "autonomous_trading": false, "llm_enabled": true}'::jsonb,
  '["market-data-analyzer", "technical-indicator-suite", "sentiment-analyzer"]'::jsonb,
  '{"exchanges": [], "defi_protocols": []}'::jsonb,
  'I am a market analyst agent. I provide detailed market analysis using technical indicators, fundamental data, and sentiment analysis. I do not execute trades, but instead offer actionable insights for human decision-makers.', 
  true
),
(
  'Portfolio Manager', 
  'An agent that manages a diversified portfolio with automated rebalancing', 
  'portfolio', 
  'balanced', 
  '{"risk_level": "moderate", "target_markets": ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD", "MATIC/USD"]}'::jsonb,
  '{"memory_enabled": true, "autonomous_trading": false, "llm_enabled": true}'::jsonb,
  '["exchange-connector", "risk-management-system", "market-data-analyzer"]'::jsonb,
  '{"exchanges": ["bybit-testnet", "coinbase"], "defi_protocols": []}'::jsonb,
  'I am a portfolio management agent. I maintain a balanced portfolio according to predefined allocations and risk parameters. I perform regular rebalancing, monitor market conditions, and adjust positions to maintain optimal portfolio composition.', 
  true
);
