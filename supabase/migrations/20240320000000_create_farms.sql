-- Create farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create farm_wallets table
CREATE TABLE IF NOT EXISTS public.farm_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  chain_id INTEGER NOT NULL,
  token_balances JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, address)
);

-- Create farm_agents table
CREATE TABLE IF NOT EXISTS public.farm_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create agent_wallets table
CREATE TABLE IF NOT EXISTS public.agent_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.farm_agents(id) ON DELETE CASCADE,
  farm_wallet_id UUID NOT NULL REFERENCES public.farm_wallets(id) ON DELETE CASCADE,
  allocation DECIMAL(20, 8) NOT NULL DEFAULT 0,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, farm_wallet_id)
);

-- Create agent_tools table
CREATE TABLE IF NOT EXISTS public.agent_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.farm_agents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create agent_apis table
CREATE TABLE IF NOT EXISTS public.agent_apis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.farm_agents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  auth_config JSONB DEFAULT '{}'::jsonb,
  rate_limit JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farm_wallets_updated_at
  BEFORE UPDATE ON public.farm_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farm_agents_updated_at
  BEFORE UPDATE ON public.farm_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_wallets_updated_at
  BEFORE UPDATE ON public.agent_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tools_updated_at
  BEFORE UPDATE ON public.agent_tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_apis_updated_at
  BEFORE UPDATE ON public.agent_apis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_farms_owner_id ON public.farms(owner_id);
CREATE INDEX idx_farm_wallets_farm_id ON public.farm_wallets(farm_id);
CREATE INDEX idx_farm_agents_farm_id ON public.farm_agents(farm_id);
CREATE INDEX idx_agent_wallets_agent_id ON public.agent_wallets(agent_id);
CREATE INDEX idx_agent_wallets_farm_wallet_id ON public.agent_wallets(farm_wallet_id);
CREATE INDEX idx_agent_tools_agent_id ON public.agent_tools(agent_id);
CREATE INDEX idx_agent_apis_agent_id ON public.agent_apis(agent_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_apis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own farms"
  ON public.farms FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own farms"
  ON public.farms FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own farms"
  ON public.farms FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own farms"
  ON public.farms FOR DELETE
  USING (auth.uid() = owner_id);

-- Farm wallets policies
CREATE POLICY "Users can view wallets of their farms"
  ON public.farm_wallets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = farm_wallets.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage wallets of their farms"
  ON public.farm_wallets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = farm_wallets.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- Farm agents policies
CREATE POLICY "Users can view agents of their farms"
  ON public.farm_agents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = farm_agents.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage agents of their farms"
  ON public.farm_agents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = farm_agents.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- Agent wallets policies
CREATE POLICY "Users can view agent wallets of their farms"
  ON public.agent_wallets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farm_agents
    JOIN public.farms ON farms.id = farm_agents.farm_id
    WHERE farm_agents.id = agent_wallets.agent_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage agent wallets of their farms"
  ON public.agent_wallets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.farm_agents
    JOIN public.farms ON farms.id = farm_agents.farm_id
    WHERE farm_agents.id = agent_wallets.agent_id
    AND farms.owner_id = auth.uid()
  ));

-- Agent tools policies
CREATE POLICY "Users can view agent tools of their farms"
  ON public.agent_tools FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farm_agents
    JOIN public.farms ON farms.id = farm_agents.farm_id
    WHERE farm_agents.id = agent_tools.agent_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage agent tools of their farms"
  ON public.agent_tools FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.farm_agents
    JOIN public.farms ON farms.id = farm_agents.farm_id
    WHERE farm_agents.id = agent_tools.agent_id
    AND farms.owner_id = auth.uid()
  ));

-- Agent APIs policies
CREATE POLICY "Users can view agent APIs of their farms"
  ON public.agent_apis FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farm_agents
    JOIN public.farms ON farms.id = farm_agents.farm_id
    WHERE farm_agents.id = agent_apis.agent_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage agent APIs of their farms"
  ON public.agent_apis FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.farm_agents
    JOIN public.farms ON farms.id = farm_agents.farm_id
    WHERE farm_agents.id = agent_apis.agent_id
    AND farms.owner_id = auth.uid()
  )); 