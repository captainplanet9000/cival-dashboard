-- Initial Schema Migration for Trading Farm + ElizaOS Integration
-- Creates the foundational tables for farms, wallets, agents, and transactions

-- First, create the timestamp handling functions if they don't exist
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Master Wallets Table (Vault)
CREATE TABLE IF NOT EXISTS public.master_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  total_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  allocated_to_farms DECIMAL(20, 8) NOT NULL DEFAULT 0, 
  reserve_funds DECIMAL(20, 8) NOT NULL DEFAULT 0,
  high_risk_exposure DECIMAL(20, 8) NOT NULL DEFAULT 0,
  security_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.master_wallets ENABLE ROW LEVEL SECURITY;

-- Create timestamps triggers for master_wallets
CREATE TRIGGER handle_master_wallets_created_at
BEFORE INSERT ON public.master_wallets
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_master_wallets_updated_at
BEFORE UPDATE ON public.master_wallets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for master_wallets
CREATE POLICY "Allow read access to authenticated users" ON public.master_wallets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert to authenticated users" ON public.master_wallets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update to authenticated users" ON public.master_wallets
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Farm Wallets Table
CREATE TABLE IF NOT EXISTS public.farm_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  allocated_funds DECIMAL(20, 8) NOT NULL DEFAULT 0,
  available_funds DECIMAL(20, 8) NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  master_wallet_id UUID REFERENCES public.master_wallets(id),
  strategy_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.farm_wallets ENABLE ROW LEVEL SECURITY;

-- Create timestamps triggers for farm_wallets
CREATE TRIGGER handle_farm_wallets_created_at
BEFORE INSERT ON public.farm_wallets
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_farm_wallets_updated_at
BEFORE UPDATE ON public.farm_wallets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for farm_wallets
CREATE POLICY "Allow read access to authenticated users" ON public.farm_wallets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert to authenticated users" ON public.farm_wallets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update to authenticated users" ON public.farm_wallets
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Agent Wallets Table
CREATE TABLE IF NOT EXISTS public.agent_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  farm_id UUID REFERENCES public.farm_wallets(id),
  farm_name TEXT NOT NULL,
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  performance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'trading',
  agent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;

-- Create timestamps triggers for agent_wallets
CREATE TRIGGER handle_agent_wallets_created_at
BEFORE INSERT ON public.agent_wallets
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_agent_wallets_updated_at
BEFORE UPDATE ON public.agent_wallets
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for agent_wallets
CREATE POLICY "Allow read access to authenticated users" ON public.agent_wallets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert to authenticated users" ON public.agent_wallets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update to authenticated users" ON public.agent_wallets
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  source_id UUID NOT NULL,
  source_name TEXT NOT NULL,
  destination_id UUID NOT NULL,
  destination_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  fee DECIMAL(20, 8) NOT NULL DEFAULT 0,
  network TEXT,
  confirmations INTEGER DEFAULT 0,
  approvals_required INTEGER DEFAULT 1,
  approvals_current INTEGER DEFAULT 0,
  approver_ids JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create timestamps triggers for transactions
CREATE TRIGGER handle_transactions_created_at
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for transactions
CREATE POLICY "Allow read access to authenticated users" ON public.transactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert to authenticated users" ON public.transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update to authenticated users" ON public.transactions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Agents Table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  farm_id UUID REFERENCES public.farm_wallets(id),
  model TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  strategy_id UUID,
  wallet_id UUID REFERENCES public.agent_wallets(id),
  exchange_configs JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{}',
  last_active TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create timestamps triggers for agents
CREATE TRIGGER handle_agents_created_at
BEFORE INSERT ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for agents
CREATE POLICY "Allow read access to authenticated users" ON public.agents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert to authenticated users" ON public.agents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update to authenticated users" ON public.agents
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Trading Strategies Table
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  parameters JSONB DEFAULT '{}',
  performance JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

-- Create timestamps triggers for strategies
CREATE TRIGGER handle_strategies_created_at
BEFORE INSERT ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_strategies_updated_at
BEFORE UPDATE ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for strategies
CREATE POLICY "Allow read access to authenticated users" ON public.strategies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert to authenticated users" ON public.strategies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update to authenticated users" ON public.strategies
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Knowledge Base Documents Table
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Create timestamps triggers for knowledge_documents
CREATE TRIGGER handle_knowledge_documents_created_at
BEFORE INSERT ON public.knowledge_documents
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_knowledge_documents_updated_at
BEFORE UPDATE ON public.knowledge_documents
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for knowledge_documents
CREATE POLICY "Allow read access to authenticated users" ON public.knowledge_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert to authenticated users" ON public.knowledge_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update to authenticated users" ON public.knowledge_documents
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Command History Table
CREATE TABLE IF NOT EXISTS public.command_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  command TEXT NOT NULL,
  args JSONB DEFAULT '{}',
  source TEXT NOT NULL,
  target_id UUID,
  target_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.command_history ENABLE ROW LEVEL SECURITY;

-- Create timestamps triggers for command_history
CREATE TRIGGER handle_command_history_created_at
BEFORE INSERT ON public.command_history
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_command_history_updated_at
BEFORE UPDATE ON public.command_history
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for command_history
CREATE POLICY "Allow read access to authenticated users" ON public.command_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert to authenticated users" ON public.command_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update to authenticated users" ON public.command_history
  FOR UPDATE USING (auth.role() = 'authenticated');
