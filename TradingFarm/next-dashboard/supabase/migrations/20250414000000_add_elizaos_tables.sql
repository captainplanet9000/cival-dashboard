-- Migration: Add ElizaOS tables and related extensions
-- This migration adds the necessary tables for ElizaOS integration

-- Create ElizaOS agents table
CREATE TABLE IF NOT EXISTS public.elizaos_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'initializing',
    config JSONB DEFAULT '{}'::jsonb,
    performance_metrics JSONB DEFAULT '{
        "commands_processed": 0,
        "success_rate": 0,
        "average_response_time_ms": 0
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_elizaos_agents_farm_id ON public.elizaos_agents(farm_id);
CREATE INDEX IF NOT EXISTS idx_elizaos_agents_user_id ON public.elizaos_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_elizaos_agents_status ON public.elizaos_agents(status);

-- Create ElizaOS agent metrics history table
CREATE TABLE IF NOT EXISTS public.elizaos_agent_metrics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_elizaos_agent_metrics_history_agent_id ON public.elizaos_agent_metrics_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_elizaos_agent_metrics_history_timestamp ON public.elizaos_agent_metrics_history(timestamp);

-- Create ElizaOS command history table
CREATE TABLE IF NOT EXISTS public.elizaos_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    command_text TEXT NOT NULL,
    response_text TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_elizaos_commands_agent_id ON public.elizaos_commands(agent_id);
CREATE INDEX IF NOT EXISTS idx_elizaos_commands_farm_id ON public.elizaos_commands(farm_id);
CREATE INDEX IF NOT EXISTS idx_elizaos_commands_status ON public.elizaos_commands(status);

-- Create table for agent goals
CREATE TABLE IF NOT EXISTS public.elizaos_agent_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    priority INTEGER DEFAULT 1,
    progress NUMERIC(5, 2) DEFAULT 0,
    UNIQUE(agent_id, goal_id)
);

CREATE INDEX IF NOT EXISTS idx_elizaos_agent_goals_agent_id ON public.elizaos_agent_goals(agent_id);
CREATE INDEX IF NOT EXISTS idx_elizaos_agent_goals_goal_id ON public.elizaos_agent_goals(goal_id);

-- Add triggers for automatic timestamp handling
DROP TRIGGER IF EXISTS handle_elizaos_agents_created_at ON public.elizaos_agents;
CREATE TRIGGER handle_elizaos_agents_created_at
BEFORE INSERT ON public.elizaos_agents
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_elizaos_agents_updated_at ON public.elizaos_agents;
CREATE TRIGGER handle_elizaos_agents_updated_at
BEFORE UPDATE ON public.elizaos_agents
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_elizaos_agent_metrics_history_created_at ON public.elizaos_agent_metrics_history;
CREATE TRIGGER handle_elizaos_agent_metrics_history_created_at
BEFORE INSERT ON public.elizaos_agent_metrics_history
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_elizaos_commands_created_at ON public.elizaos_commands;
CREATE TRIGGER handle_elizaos_commands_created_at
BEFORE INSERT ON public.elizaos_commands
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_elizaos_commands_updated_at ON public.elizaos_commands;
CREATE TRIGGER handle_elizaos_commands_updated_at
BEFORE UPDATE ON public.elizaos_commands
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_elizaos_agent_goals_created_at ON public.elizaos_agent_goals;
CREATE TRIGGER handle_elizaos_agent_goals_created_at
BEFORE INSERT ON public.elizaos_agent_goals
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_elizaos_agent_goals_updated_at ON public.elizaos_agent_goals;
CREATE TRIGGER handle_elizaos_agent_goals_updated_at
BEFORE UPDATE ON public.elizaos_agent_goals
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add RLS policies
ALTER TABLE public.elizaos_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elizaos_agent_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elizaos_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elizaos_agent_goals ENABLE ROW LEVEL SECURITY;

-- Policies for ElizaOS agents
CREATE POLICY "Users can view ElizaOS agents they have access to"
ON public.elizaos_agents FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = elizaos_agents.farm_id
    AND farm_users.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create ElizaOS agents in their farms"
ON public.elizaos_agents FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = elizaos_agents.farm_id
    AND farm_users.user_id = auth.uid()
    AND farm_users.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can update their own ElizaOS agents"
ON public.elizaos_agents FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = elizaos_agents.farm_id
    AND farm_users.user_id = auth.uid()
    AND farm_users.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can delete their own ElizaOS agents"
ON public.elizaos_agents FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.farm_users
    WHERE farm_users.farm_id = elizaos_agents.farm_id
    AND farm_users.user_id = auth.uid()
    AND farm_users.role IN ('owner', 'admin')
  )
);

-- Policies for ElizaOS metrics history
CREATE POLICY "Users can view ElizaOS agent metrics they have access to"
ON public.elizaos_agent_metrics_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.elizaos_agents
    WHERE elizaos_agents.id = elizaos_agent_metrics_history.agent_id
    AND (
      elizaos_agents.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = elizaos_agents.farm_id
        AND farm_users.user_id = auth.uid()
      )
    )
  )
);

-- Policies for ElizaOS commands
CREATE POLICY "Users can view ElizaOS commands they have access to"
ON public.elizaos_commands FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.elizaos_agents
    WHERE elizaos_agents.id = elizaos_commands.agent_id
    AND (
      elizaos_agents.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = elizaos_commands.farm_id
        AND farm_users.user_id = auth.uid()
      )
    )
  )
);

-- Policies for ElizaOS agent goals
CREATE POLICY "Users can view ElizaOS agent goals they have access to"
ON public.elizaos_agent_goals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.elizaos_agents
    WHERE elizaos_agents.id = elizaos_agent_goals.agent_id
    AND (
      elizaos_agents.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = elizaos_agents.farm_id
        AND farm_users.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can manage ElizaOS agent goals they have access to"
ON public.elizaos_agent_goals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.elizaos_agents
    WHERE elizaos_agents.id = elizaos_agent_goals.agent_id
    AND (
      elizaos_agents.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = elizaos_agents.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin')
      )
    )
  )
);
