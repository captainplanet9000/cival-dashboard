-- Migration: MCP Server Integration
-- Creates tables for MCP server configs and activity logs

-- Table: mcp_server_configs
CREATE TABLE IF NOT EXISTS public.mcp_server_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  api_key VARCHAR(255),
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  auto_connect BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Update trigger for updated_at
CREATE TRIGGER handle_updated_at_mcp_server_configs
BEFORE UPDATE ON public.mcp_server_configs
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.mcp_server_configs ENABLE ROW LEVEL SECURITY;

-- Create policy: Only admins can modify, anyone can view
CREATE POLICY "Admins can manage MCP server configs"
ON public.mcp_server_configs
USING (
  -- Check if user is an admin
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Anyone can view MCP server configs"
ON public.mcp_server_configs
FOR SELECT
USING (true);

-- Table: mcp_activity_logs
CREATE TABLE IF NOT EXISTS public.mcp_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id VARCHAR(255) NOT NULL,
  tool_name VARCHAR(255) NOT NULL,
  parameters JSONB,
  result JSONB,
  user_id UUID REFERENCES auth.users(id),
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  vault_transaction_id UUID REFERENCES public.vault_transactions(id),
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.mcp_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own MCP logs"
ON public.mcp_activity_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all MCP logs"
ON public.mcp_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "System can insert MCP logs"
ON public.mcp_activity_logs
FOR INSERT
WITH CHECK (true);

-- Insert default MCP server configurations
INSERT INTO public.mcp_server_configs (server_id, name, base_url, category, priority, auto_connect)
VALUES
  ('heurist-mesh', 'Heurist Mesh', 'http://localhost:3456', 'blockchain', 'high', true),
  ('uniswap-trader', 'Uniswap Trader', 'http://localhost:3457', 'defi', 'high', true),
  ('crypto-indicators', 'Crypto Indicators', 'http://localhost:3458', 'market-data', 'high', true),
  ('crypto-sentiment', 'Crypto Sentiment', 'http://localhost:3459', 'market-data', 'medium', true),
  ('alpha-vantage', 'Alpha Vantage', 'http://localhost:3460', 'market-data', 'high', true)
ON CONFLICT (server_id) 
DO NOTHING;
