-- Create agents table for Trading Farm Dashboard

-- Check if the timestamp trigger functions exist, create if not
-- First, create timestamp handling functions if they don't exist
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at = NOW();
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the agents table initially without the user_id foreign key
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  strategy VARCHAR(50) NOT NULL,
  budget DECIMAL(16, 2) NOT NULL DEFAULT 1000.00,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'inactive',
  metrics JSONB DEFAULT '{}'::jsonb,
  last_active TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Then add the user_id column
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS user_id UUID;

-- Now add the foreign key constraint
ALTER TABLE public.agents ADD CONSTRAINT agents_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance (after all columns are defined)
CREATE INDEX IF NOT EXISTS agents_user_id_idx ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS agents_strategy_idx ON public.agents(strategy);
CREATE INDEX IF NOT EXISTS agents_status_idx ON public.agents(status);

-- Create the timestamp triggers
DROP TRIGGER IF EXISTS set_agents_created_at ON public.agents;
CREATE TRIGGER set_agents_created_at
  BEFORE INSERT ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS set_agents_updated_at ON public.agents;
CREATE TRIGGER set_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for viewing agents (with fallback for null user_id for development)
DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;
CREATE POLICY "Users can view their own agents"
  ON public.agents
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy for inserting agents (with default value setting)
DROP POLICY IF EXISTS "Users can insert their own agents" ON public.agents;
CREATE POLICY "Users can insert their own agents"
  ON public.agents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy for updating agents (with fallback for null user_id for development)
DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
CREATE POLICY "Users can update their own agents"
  ON public.agents
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy for deleting agents (with fallback for null user_id for development)
DROP POLICY IF EXISTS "Users can delete their own agents" ON public.agents;
CREATE POLICY "Users can delete their own agents"
  ON public.agents
  FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);
