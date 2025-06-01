
-- Migration: create_agents_and_strategies_tables
-- Description: Creates the strategies and agents tables with necessary columns, constraints, RLS, and timestamp triggers.

-- Ensure necessary functions exist (handle_created_at, handle_updated_at should be defined in previous migrations or Supabase setup)

-- Create the strategies table
CREATE TABLE public.strategies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (char_length(name) > 0),
    description text,
    type text CHECK (char_length(type) > 0),
    parameters jsonb,
    script_content text, -- For custom script-based strategies
    is_active boolean NOT NULL DEFAULT true,
    backtest_results jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for strategies table
CREATE INDEX idx_strategies_user_id ON public.strategies(user_id);
CREATE INDEX idx_strategies_type ON public.strategies(type);

-- Enable Row Level Security (RLS) for strategies
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

-- Policies for strategies (Users can manage their own strategies)
CREATE POLICY "Allow user SELECT own strategies" ON public.strategies
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow user INSERT own strategies" ON public.strategies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user UPDATE own strategies" ON public.strategies
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user DELETE own strategies" ON public.strategies
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at timestamp on strategies
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add trigger for created_at timestamp on strategies (if handle_created_at exists and is needed, otherwise DEFAULT now() suffices)
-- CREATE TRIGGER handle_created_at BEFORE INSERT ON public.strategies
--   FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();


-- Create the agents table
CREATE TABLE public.agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Denormalized for RLS convenience
    name text NOT NULL CHECK (char_length(name) > 0),
    description text,
    type text CHECK (char_length(type) > 0),
    status text NOT NULL DEFAULT 'Initializing',
    configuration jsonb,
    strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL, -- Agent can exist without a strategy initially
    performance_metrics jsonb,
    last_heartbeat timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for agents table
CREATE INDEX idx_agents_farm_id ON public.agents(farm_id);
CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agents_strategy_id ON public.agents(strategy_id);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_agents_type ON public.agents(type);

-- Enable Row Level Security (RLS) for agents
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Policies for agents (Users can manage agents belonging to their farms)
-- Note: Assumes user_id is correctly populated based on farm ownership during agent creation
CREATE POLICY "Allow user SELECT own agents" ON public.agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow user INSERT own agents" ON public.agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user UPDATE own agents" ON public.agents
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user DELETE own agents" ON public.agents
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at timestamp on agents
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add trigger for created_at timestamp on agents (if handle_created_at exists and is needed)
-- CREATE TRIGGER handle_created_at BEFORE INSERT ON public.agents
--   FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();