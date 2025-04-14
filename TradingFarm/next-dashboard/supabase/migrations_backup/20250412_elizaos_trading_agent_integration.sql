-- Migration for ElizaOS Trading Agent Integration
-- Create tables and functions for ElizaOS trading agents

-- Set search_path to empty to avoid unexpected behavior
set search_path = '';

-- Enable Row-Level Security on elizaos_agents
ALTER TABLE public.elizaos_agents ENABLE ROW LEVEL SECURITY;

-- Create table for agent trading activities
CREATE TABLE IF NOT EXISTS public.elizaos_agent_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  details TEXT,
  symbol VARCHAR(50),
  timeframe VARCHAR(10),
  order_id UUID,
  result_id UUID,
  profit_percent NUMERIC,
  trades INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries on agent_id
CREATE INDEX IF NOT EXISTS idx_agent_activities_agent_id ON public.elizaos_agent_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_activities_action ON public.elizaos_agent_activities(action);
CREATE INDEX IF NOT EXISTS idx_agent_activities_created_at ON public.elizaos_agent_activities(created_at);

-- Enable Row-Level Security
ALTER TABLE public.elizaos_agent_activities ENABLE ROW LEVEL SECURITY;

-- Add performance metrics to agents table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'elizaos_agents' 
    AND column_name = 'performance_metrics'
  ) THEN
    ALTER TABLE public.elizaos_agents ADD COLUMN performance_metrics JSONB;
  END IF;
END
$$;

-- Add configuration column to agents table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'elizaos_agents' 
    AND column_name = 'configuration'
  ) THEN
    ALTER TABLE public.elizaos_agents ADD COLUMN configuration JSONB;
  END IF;
END
$$;

-- Add agent_type column to elizaos_agents table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'elizaos_agents' 
    AND column_name = 'agent_type'
  ) THEN
    ALTER TABLE public.elizaos_agents ADD COLUMN agent_type VARCHAR(50);
  END IF;
END
$$;

-- Add permissions column to elizaos_agents table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'elizaos_agents' 
    AND column_name = 'permissions'
  ) THEN
    ALTER TABLE public.elizaos_agents ADD COLUMN permissions TEXT[];
  END IF;
END
$$;

-- Add messages table for agent communication
CREATE TABLE IF NOT EXISTS public.elizaos_agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_messages_agent_id ON public.elizaos_agent_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_type ON public.elizaos_agent_messages(type);
CREATE INDEX IF NOT EXISTS idx_agent_messages_timestamp ON public.elizaos_agent_messages(timestamp);

-- Enable Row-Level Security
ALTER TABLE public.elizaos_agent_messages ENABLE ROW LEVEL SECURITY;

-- Function to update agent configuration
CREATE OR REPLACE FUNCTION public.update_agent_configuration(
  p_agent_id UUID,
  p_configuration JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_updated_id UUID;
BEGIN
  -- Update the configuration
  UPDATE public.elizaos_agents
  SET 
    configuration = p_configuration,
    updated_at = now()
  WHERE id = p_agent_id
  RETURNING id INTO v_updated_id;
  
  RETURN v_updated_id;
END;
$$;

-- Function to log agent activity
CREATE OR REPLACE FUNCTION public.log_agent_activity(
  p_agent_id UUID,
  p_action VARCHAR(50),
  p_details TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  -- Insert the activity
  INSERT INTO public.elizaos_agent_activities(
    agent_id, 
    action, 
    details,
    metadata
  )
  VALUES (
    p_agent_id,
    p_action,
    p_details,
    p_metadata
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

-- Function to get agent's recent trading activities
CREATE OR REPLACE FUNCTION public.get_agent_trading_activities(
  p_agent_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.elizaos_agent_activities
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM public.elizaos_agent_activities
  WHERE agent_id = p_agent_id
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Function to get agent's trading performance summary
CREATE OR REPLACE FUNCTION public.get_agent_trading_performance(
  p_agent_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_total_trades INTEGER;
  v_winning_trades INTEGER;
  v_total_profit NUMERIC;
  v_avg_profit_per_trade NUMERIC;
  v_max_profit NUMERIC;
  v_max_loss NUMERIC;
  v_success_rate NUMERIC;
BEGIN
  -- Get total trades
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE profit_percent > 0),
    COALESCE(SUM(profit_percent), 0),
    COALESCE(AVG(profit_percent), 0),
    COALESCE(MAX(profit_percent), 0),
    COALESCE(MIN(profit_percent), 0)
  INTO 
    v_total_trades,
    v_winning_trades,
    v_total_profit,
    v_avg_profit_per_trade,
    v_max_profit,
    v_max_loss
  FROM public.elizaos_agent_activities
  WHERE 
    agent_id = p_agent_id AND
    action = 'trade_execution';
    
  -- Calculate success rate
  IF v_total_trades > 0 THEN
    v_success_rate := (v_winning_trades::NUMERIC / v_total_trades) * 100;
  ELSE
    v_success_rate := 0;
  END IF;
  
  -- Build result JSON
  v_result := jsonb_build_object(
    'total_trades', v_total_trades,
    'winning_trades', v_winning_trades,
    'total_profit_percent', v_total_profit,
    'avg_profit_per_trade', v_avg_profit_per_trade,
    'max_profit', v_max_profit,
    'max_loss', v_max_loss,
    'success_rate', v_success_rate
  );
  
  RETURN v_result;
END;
$$;

-- Function to handle created_at trigger
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$;

-- Function to handle updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for agent activities table
CREATE TRIGGER set_elizaos_agent_activities_timestamps
BEFORE INSERT ON public.elizaos_agent_activities
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER update_elizaos_agent_activities_timestamps
BEFORE UPDATE ON public.elizaos_agent_activities
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add RLS policies for agent activities
CREATE POLICY "Allow users to view their own agent activities" ON public.elizaos_agent_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents a
      WHERE a.id = elizaos_agent_activities.agent_id
      AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to create activities for their own agents" ON public.elizaos_agent_activities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents a
      WHERE a.id = elizaos_agent_activities.agent_id
      AND a.user_id = auth.uid()
    )
  );

-- Add RLS policies for agent messages
CREATE POLICY "Allow users to view their own agent messages" ON public.elizaos_agent_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents a
      WHERE a.id = elizaos_agent_messages.agent_id
      AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to create messages for their own agents" ON public.elizaos_agent_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents a
      WHERE a.id = elizaos_agent_messages.agent_id
      AND a.user_id = auth.uid()
    )
  );

-- Add RLS policies for elizaos_agents table
CREATE POLICY "Allow users to view their own agents" ON public.elizaos_agents
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Allow users to create their own agents" ON public.elizaos_agents
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Allow users to update their own agents" ON public.elizaos_agents
  FOR UPDATE
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Allow users to delete their own agents" ON public.elizaos_agents
  FOR DELETE
  USING (
    user_id = auth.uid()
  );

-- Update types file with new types
COMMENT ON TABLE public.elizaos_agent_activities IS 'Tracks all activities performed by ElizaOS trading agents';
COMMENT ON TABLE public.elizaos_agent_messages IS 'Stores messages and communication history for ElizaOS agents';
COMMENT ON COLUMN public.elizaos_agents.configuration IS 'Specialized configuration for different agent types';
COMMENT ON COLUMN public.elizaos_agents.agent_type IS 'Type of the agent (trading, research, monitoring, etc)';
COMMENT ON COLUMN public.elizaos_agents.permissions IS 'List of permissions granted to the agent';
