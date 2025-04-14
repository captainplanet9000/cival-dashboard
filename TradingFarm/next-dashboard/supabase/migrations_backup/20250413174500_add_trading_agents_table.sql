-- Migration to add trading agents table for ElizaOS integration
-- This defines the structure for storing and managing trading agents

-- Create trading agents table
CREATE TABLE IF NOT EXISTS public.trading_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL,
  exchanges TEXT[] NOT NULL,
  trading_pairs TEXT[] NOT NULL,
  risk_parameters JSONB NOT NULL DEFAULT '{}',
  trading_parameters JSONB NOT NULL DEFAULT '{}',
  model_provider TEXT NOT NULL DEFAULT 'openai',
  model_id TEXT NOT NULL DEFAULT 'gpt-4o',
  is_paper_trading BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'created',
  capabilities TEXT[] DEFAULT '{}',
  metrics JSONB DEFAULT '{"totalTrades": 0, "winRate": 0, "pnl": 0}',
  elizaos_agent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.trading_agents
FOR EACH ROW
EXECUTE PROCEDURE public.handle_updated_at();

-- Create index on user_id for faster queries
CREATE INDEX trading_agents_user_id_idx ON public.trading_agents(user_id);

-- Create index on status for filtering active agents
CREATE INDEX trading_agents_status_idx ON public.trading_agents(status);

-- Create an agent logs table to track agent activities
CREATE TABLE IF NOT EXISTS public.trading_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.trading_agents(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on agent_id for faster log queries
CREATE INDEX trading_agent_logs_agent_id_idx ON public.trading_agent_logs(agent_id);

-- Enable Row Level Security on both tables
ALTER TABLE public.trading_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_agent_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access only their own agents
CREATE POLICY user_agents_policy ON public.trading_agents
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy for users to access only logs from their own agents
CREATE POLICY user_agent_logs_policy ON public.trading_agent_logs
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.trading_agents
    WHERE trading_agents.id = trading_agent_logs.agent_id
    AND trading_agents.user_id = auth.uid()
  ));

-- Create agent sessions table for tracking active agent sessions
CREATE TABLE IF NOT EXISTS public.trading_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.trading_agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  session_data JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security on sessions table
ALTER TABLE public.trading_agent_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access only sessions from their own agents
CREATE POLICY user_agent_sessions_policy ON public.trading_agent_sessions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.trading_agents
    WHERE trading_agents.id = trading_agent_sessions.agent_id
    AND trading_agents.user_id = auth.uid()
  ));

-- Create index on agent_id and status for faster session queries
CREATE INDEX trading_agent_sessions_agent_id_status_idx ON public.trading_agent_sessions(agent_id, status);

-- Add function to log agent activity
CREATE OR REPLACE FUNCTION log_agent_activity(
  p_agent_id UUID,
  p_log_type TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.trading_agent_logs (agent_id, log_type, message, metadata)
  VALUES (p_agent_id, p_log_type, p_message, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
