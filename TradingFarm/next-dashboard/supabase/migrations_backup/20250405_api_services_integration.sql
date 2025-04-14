-- Migration: API Services Integration
-- Description: Add tables for managing API service configurations for AI agents

-- Create API Service Types Enum
CREATE TYPE public.api_service_type AS ENUM (
  'llm',
  'search',
  'market_data',
  'voice',
  'research',
  'chart',
  'wolfram'
);

-- Create API Service Providers Table
CREATE TABLE public.api_service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service_type api_service_type NOT NULL,
  description TEXT,
  icon_url TEXT,
  config_schema JSONB NOT NULL,
  rate_limit_info JSONB,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.api_service_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access for all users" ON public.api_service_providers FOR SELECT USING (true);
CREATE POLICY "Allow all access for service accounts" ON public.api_service_providers USING (auth.jwt() ->> 'app_role' = 'service');

-- Create User API Service Configurations Table
CREATE TABLE public.user_api_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.api_service_providers(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  api_key TEXT,
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  configuration JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  usage_metrics JSONB DEFAULT '{}'::JSONB,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_api_configurations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own API configurations" ON public.user_api_configurations USING (auth.uid() = user_id);
CREATE POLICY "Service accounts can access all configurations" ON public.user_api_configurations USING (auth.jwt() ->> 'app_role' = 'service');

-- Create Agent API Service Assignment Table
CREATE TABLE public.agent_api_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  configuration_id UUID REFERENCES public.user_api_configurations(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  usage_quota JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_api_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage API services for agents they own" ON public.agent_api_services 
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = agent_id AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Service accounts can manage all agent API services" ON public.agent_api_services 
  USING (auth.jwt() ->> 'app_role' = 'service');

-- Create API Service Usage Logs Table
CREATE TABLE public.api_service_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID REFERENCES public.user_api_configurations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL,
  request_data JSONB,
  response_status TEXT NOT NULL,
  tokens_used INTEGER,
  cost DECIMAL(12,6),
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.api_service_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own API usage logs" ON public.api_service_usage_logs 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_api_configurations c
      WHERE c.id = configuration_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "Service accounts can access all usage logs" ON public.api_service_usage_logs 
  USING (auth.jwt() ->> 'app_role' = 'service');

-- Add function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updating timestamps
CREATE TRIGGER update_api_service_providers_updated_at
  BEFORE UPDATE ON public.api_service_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_api_configurations_updated_at
  BEFORE UPDATE ON public.user_api_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_agent_api_services_updated_at
  BEFORE UPDATE ON public.agent_api_services
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default providers
INSERT INTO public.api_service_providers (name, service_type, description, config_schema) VALUES
-- LLM Providers
('OpenAI', 'llm', 'OpenAI GPT models for natural language processing and generation', 
  '{"models": ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"], "requires_key": true}'::jsonb),
('DeepSeek', 'llm', 'DeepSeek language models', 
  '{"models": ["deepseek-coder", "deepseek-chat"], "requires_key": true}'::jsonb),
('Google Gemini', 'llm', 'Google Gemini models for natural language processing', 
  '{"models": ["gemini-pro", "gemini-flash"], "requires_key": true}'::jsonb),
('OpenRouter', 'llm', 'Meta-service providing access to multiple LLM providers', 
  '{"models": ["anthropic/claude-3-opus", "anthropic/claude-3-sonnet", "meta/llama-3-70b", "mistral/mistral-medium"], "requires_key": true}'::jsonb),

-- Search Services
('SerpAPI', 'search', 'Search engine results API for market research', 
  '{"features": ["web_search", "news_search"], "requires_key": true}'::jsonb),
('Tavily', 'search', 'AI-powered search API for financial research', 
  '{"features": ["research", "financial_data"], "requires_key": true}'::jsonb),
('Brave Search', 'search', 'Privacy-focused search API', 
  '{"features": ["web_search", "news_search"], "requires_key": true}'::jsonb),
('Firecrawl', 'search', 'Web crawling and data extraction API', 
  '{"features": ["web_crawling", "data_extraction"], "requires_key": true}'::jsonb),

-- Market Data Services
('MarketStack', 'market_data', 'Real-time and historical market data API', 
  '{"endpoints": ["eod", "intraday", "tickers"], "requires_key": true}'::jsonb),
('ChartImage', 'chart', 'Financial chart generation API', 
  '{"chart_types": ["candlestick", "line", "technical"], "requires_key": true}'::jsonb),

-- Other Services
('Wolfram Alpha', 'wolfram', 'Computational knowledge engine for financial calculations', 
  '{"features": ["computation", "data_analysis"], "requires_key": true}'::jsonb),
('ElevenLabs', 'voice', 'Voice synthesis API for trading alerts and notifications', 
  '{"voices": ["premium", "standard"], "requires_key": true}'::jsonb);

-- Add extension to llm_configs table
ALTER TABLE public.llm_configs ADD COLUMN IF NOT EXISTS api_configuration_id UUID REFERENCES public.user_api_configurations(id) ON DELETE SET NULL;
