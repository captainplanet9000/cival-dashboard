-- ElizaOS Trading Agent Integration Migration
-- This migration adds the necessary tables and functions for the ElizaOS trading agent system,
-- including agent coordination, strategy optimization, and exchange connections

-- Create public.handle_created_at() function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_created_at') THEN
    CREATE OR REPLACE FUNCTION public.handle_created_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.created_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create public.handle_updated_at() function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create elizaos_agent_tasks table for task coordination
CREATE TABLE IF NOT EXISTS public.elizaos_agent_tasks (
  id UUID PRIMARY KEY,
  coordinator_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  target_agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger for handling created_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_elizaos_agent_tasks_created_at'
  ) THEN
    CREATE TRIGGER handle_elizaos_agent_tasks_created_at
    BEFORE INSERT ON public.elizaos_agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
END $$;

-- Create trigger for handling updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_elizaos_agent_tasks_updated_at'
  ) THEN
    CREATE TRIGGER handle_elizaos_agent_tasks_updated_at
    BEFORE UPDATE ON public.elizaos_agent_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create Row Level Security for elizaos_agent_tasks
ALTER TABLE public.elizaos_agent_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tasks (either as coordinator or target)
CREATE POLICY "Users can view their own tasks"
  ON public.elizaos_agent_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE (elizaos_agents.id = elizaos_agent_tasks.coordinator_id OR 
             elizaos_agents.id = elizaos_agent_tasks.target_agent_id)
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can create tasks for their own agents
CREATE POLICY "Users can create tasks for their own agents"
  ON public.elizaos_agent_tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = elizaos_agent_tasks.coordinator_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can update tasks for their own agents
CREATE POLICY "Users can update tasks for their own agents"
  ON public.elizaos_agent_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE (elizaos_agents.id = elizaos_agent_tasks.coordinator_id OR 
             elizaos_agents.id = elizaos_agent_tasks.target_agent_id)
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can delete tasks for their own agents
CREATE POLICY "Users can delete tasks for their own agents"
  ON public.elizaos_agent_tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = elizaos_agent_tasks.coordinator_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Create elizaos_agent_capabilities table
CREATE TABLE IF NOT EXISTS public.elizaos_agent_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  description TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, capability)
);

-- Create trigger for handling created_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_elizaos_agent_capabilities_created_at'
  ) THEN
    CREATE TRIGGER handle_elizaos_agent_capabilities_created_at
    BEFORE INSERT ON public.elizaos_agent_capabilities
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
END $$;

-- Create trigger for handling updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_elizaos_agent_capabilities_updated_at'
  ) THEN
    CREATE TRIGGER handle_elizaos_agent_capabilities_updated_at
    BEFORE UPDATE ON public.elizaos_agent_capabilities
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create Row Level Security for elizaos_agent_capabilities
ALTER TABLE public.elizaos_agent_capabilities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view capabilities of any agent
CREATE POLICY "Users can view capabilities of any agent"
  ON public.elizaos_agent_capabilities
  FOR SELECT
  USING (TRUE);

-- Policy: Users can add capabilities to their own agents
CREATE POLICY "Users can add capabilities to their own agents"
  ON public.elizaos_agent_capabilities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = elizaos_agent_capabilities.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can update capabilities of their own agents
CREATE POLICY "Users can update capabilities of their own agents"
  ON public.elizaos_agent_capabilities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = elizaos_agent_capabilities.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can delete capabilities of their own agents
CREATE POLICY "Users can delete capabilities of their own agents"
  ON public.elizaos_agent_capabilities
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = elizaos_agent_capabilities.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Create exchange_credentials table for secure storage of API keys
CREATE TABLE IF NOT EXISTS public.exchange_credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create trigger for handling created_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_exchange_credentials_created_at'
  ) THEN
    CREATE TRIGGER handle_exchange_credentials_created_at
    BEFORE INSERT ON public.exchange_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
END $$;

-- Create trigger for handling updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_exchange_credentials_updated_at'
  ) THEN
    CREATE TRIGGER handle_exchange_credentials_updated_at
    BEFORE UPDATE ON public.exchange_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create Row Level Security for exchange_credentials
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own credentials
CREATE POLICY "Users can view only their own credentials"
  ON public.exchange_credentials
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert only their own credentials
CREATE POLICY "Users can insert only their own credentials"
  ON public.exchange_credentials
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update only their own credentials
CREATE POLICY "Users can update only their own credentials"
  ON public.exchange_credentials
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete only their own credentials
CREATE POLICY "Users can delete only their own credentials"
  ON public.exchange_credentials
  FOR DELETE
  USING (user_id = auth.uid());

-- Create exchange_connections table
CREATE TABLE IF NOT EXISTS public.exchange_connections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_id TEXT NOT NULL,
  exchange_name TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_testnet BOOLEAN NOT NULL DEFAULT FALSE,
  credentials_id UUID NOT NULL REFERENCES public.exchange_credentials(id) ON DELETE CASCADE,
  markets TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  permissions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger for handling created_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_exchange_connections_created_at'
  ) THEN
    CREATE TRIGGER handle_exchange_connections_created_at
    BEFORE INSERT ON public.exchange_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
END $$;

-- Create trigger for handling updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_exchange_connections_updated_at'
  ) THEN
    CREATE TRIGGER handle_exchange_connections_updated_at
    BEFORE UPDATE ON public.exchange_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create Row Level Security for exchange_connections
ALTER TABLE public.exchange_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own exchange connections
CREATE POLICY "Users can view only their own exchange connections"
  ON public.exchange_connections
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert only their own exchange connections
CREATE POLICY "Users can insert only their own exchange connections"
  ON public.exchange_connections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update only their own exchange connections
CREATE POLICY "Users can update only their own exchange connections"
  ON public.exchange_connections
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete only their own exchange connections
CREATE POLICY "Users can delete only their own exchange connections"
  ON public.exchange_connections
  FOR DELETE
  USING (user_id = auth.uid());

-- Create trading_strategies table
CREATE TABLE IF NOT EXISTS public.trading_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  strategy_type TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  farm_id INTEGER REFERENCES public.farms(id) ON DELETE SET NULL,
  last_optimized_at TIMESTAMP WITH TIME ZONE,
  optimization_result_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger for handling created_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_trading_strategies_created_at'
  ) THEN
    CREATE TRIGGER handle_trading_strategies_created_at
    BEFORE INSERT ON public.trading_strategies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
END $$;

-- Create trigger for handling updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_trading_strategies_updated_at'
  ) THEN
    CREATE TRIGGER handle_trading_strategies_updated_at
    BEFORE UPDATE ON public.trading_strategies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create Row Level Security for trading_strategies
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own strategies and public strategies
CREATE POLICY "Users can view their own strategies and public strategies"
  ON public.trading_strategies
  FOR SELECT
  USING (user_id = auth.uid() OR is_public = TRUE);

-- Policy: Users can insert only their own strategies
CREATE POLICY "Users can insert only their own strategies"
  ON public.trading_strategies
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update only their own strategies
CREATE POLICY "Users can update only their own strategies"
  ON public.trading_strategies
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete only their own strategies
CREATE POLICY "Users can delete only their own strategies"
  ON public.trading_strategies
  FOR DELETE
  USING (user_id = auth.uid());

-- Create strategy_optimization_results table
CREATE TABLE IF NOT EXISTS public.strategy_optimization_results (
  id UUID PRIMARY KEY,
  strategy_id UUID NOT NULL REFERENCES public.trading_strategies(id) ON DELETE CASCADE,
  parameters JSONB NOT NULL,
  metrics JSONB NOT NULL,
  backtest_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger for handling created_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_strategy_optimization_results_created_at'
  ) THEN
    CREATE TRIGGER handle_strategy_optimization_results_created_at
    BEFORE INSERT ON public.strategy_optimization_results
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
END $$;

-- Create Row Level Security for strategy_optimization_results
ALTER TABLE public.strategy_optimization_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view optimization results for their own strategies
CREATE POLICY "Users can view optimization results for their own strategies"
  ON public.strategy_optimization_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_strategies
      WHERE trading_strategies.id = strategy_optimization_results.strategy_id
      AND trading_strategies.user_id = auth.uid()
    )
  );

-- Policy: Users can insert optimization results for their own strategies
CREATE POLICY "Users can insert optimization results for their own strategies"
  ON public.strategy_optimization_results
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trading_strategies
      WHERE trading_strategies.id = strategy_optimization_results.strategy_id
      AND trading_strategies.user_id = auth.uid()
    )
  );

-- Policy: Users can delete optimization results for their own strategies
CREATE POLICY "Users can delete optimization results for their own strategies"
  ON public.strategy_optimization_results
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_strategies
      WHERE trading_strategies.id = strategy_optimization_results.strategy_id
      AND trading_strategies.user_id = auth.uid()
    )
  );

-- Create trading_agent_performance table for storing performance metrics
CREATE TABLE IF NOT EXISTS public.trading_agent_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  time_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
  metrics JSONB NOT NULL,
  date DATE,  -- NULL for 'all_time'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, time_period, date)
);

-- Create trigger for handling created_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_trading_agent_performance_created_at'
  ) THEN
    CREATE TRIGGER handle_trading_agent_performance_created_at
    BEFORE INSERT ON public.trading_agent_performance
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
END $$;

-- Create trigger for handling updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_trading_agent_performance_updated_at'
  ) THEN
    CREATE TRIGGER handle_trading_agent_performance_updated_at
    BEFORE UPDATE ON public.trading_agent_performance
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create Row Level Security for trading_agent_performance
ALTER TABLE public.trading_agent_performance ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view performance for their own agents
CREATE POLICY "Users can view performance for their own agents"
  ON public.trading_agent_performance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = trading_agent_performance.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can insert performance for their own agents
CREATE POLICY "Users can insert performance for their own agents"
  ON public.trading_agent_performance
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = trading_agent_performance.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can update performance for their own agents
CREATE POLICY "Users can update performance for their own agents"
  ON public.trading_agent_performance
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = trading_agent_performance.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can delete performance for their own agents
CREATE POLICY "Users can delete performance for their own agents"
  ON public.trading_agent_performance
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = trading_agent_performance.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Create trading_agent_trades table for storing trade history
CREATE TABLE IF NOT EXISTS public.trading_agent_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  exchange_connection_id UUID REFERENCES public.exchange_connections(id) ON DELETE SET NULL,
  exchange_order_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL, -- 'BUY' or 'SELL'
  order_type TEXT NOT NULL, -- 'MARKET', 'LIMIT', etc.
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  executed_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'FILLED', 'CANCELLED', etc.
  profit_loss NUMERIC,
  profit_loss_percent NUMERIC,
  fees NUMERIC,
  fee_currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  filled_at TIMESTAMP WITH TIME ZONE
);

-- Create trigger for handling created_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_trading_agent_trades_created_at'
  ) THEN
    CREATE TRIGGER handle_trading_agent_trades_created_at
    BEFORE INSERT ON public.trading_agent_trades
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
END $$;

-- Create trigger for handling updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_trading_agent_trades_updated_at'
  ) THEN
    CREATE TRIGGER handle_trading_agent_trades_updated_at
    BEFORE UPDATE ON public.trading_agent_trades
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Create Row Level Security for trading_agent_trades
ALTER TABLE public.trading_agent_trades ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view trades for their own agents
CREATE POLICY "Users can view trades for their own agents"
  ON public.trading_agent_trades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = trading_agent_trades.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can insert trades for their own agents
CREATE POLICY "Users can insert trades for their own agents"
  ON public.trading_agent_trades
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = trading_agent_trades.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can update trades for their own agents
CREATE POLICY "Users can update trades for their own agents"
  ON public.trading_agent_trades
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = trading_agent_trades.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Policy: Users can delete trades for their own agents
CREATE POLICY "Users can delete trades for their own agents"
  ON public.trading_agent_trades
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.elizaos_agents
      WHERE elizaos_agents.id = trading_agent_trades.agent_id
      AND elizaos_agents.user_id = auth.uid()
    )
  );

-- Add trading_agent type to elizaos_agents.agent_type check constraint if it doesn't exist
DO $$
BEGIN
  -- Check if the constraint exists and includes 'trading_agent'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'elizaos_agents'
    AND column_name = 'agent_type'
    AND constraint_name = 'elizaos_agents_agent_type_check'
  ) THEN
    -- If the constraint doesn't exist, create it with the new type
    ALTER TABLE public.elizaos_agents
    ADD CONSTRAINT elizaos_agents_agent_type_check
    CHECK (agent_type IN ('general', 'research', 'code', 'trading_agent'));
  ELSE
    -- If the constraint exists but doesn't include 'trading_agent'
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.conname = 'elizaos_agents_agent_type_check'
      AND n.nspname = 'public'
      AND c.consrc LIKE '%trading_agent%'
    ) THEN
      -- Drop the existing constraint and recreate it with 'trading_agent'
      ALTER TABLE public.elizaos_agents
      DROP CONSTRAINT IF EXISTS elizaos_agents_agent_type_check;
      
      ALTER TABLE public.elizaos_agents
      ADD CONSTRAINT elizaos_agents_agent_type_check
      CHECK (agent_type IN ('general', 'research', 'code', 'trading_agent'));
    END IF;
  END IF;
END $$;
