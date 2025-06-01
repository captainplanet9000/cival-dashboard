-- supabase/migrations/20230831000000_create_agents_table.sql

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Add other essential columns based on known requirements if necessary
    -- For example: type, configuration, status etc.
    agent_type VARCHAR(50),
    configuration JSONB,
    status VARCHAR(20) DEFAULT 'idle'
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON public.agents(status);

-- Add comments
COMMENT ON TABLE public.agents IS 'Stores information about ElizaOS agents.';
COMMENT ON COLUMN public.agents.id IS 'Unique identifier for the agent.';
COMMENT ON COLUMN public.agents.user_id IS 'The user who owns this agent.';
COMMENT ON COLUMN public.agents.name IS 'The name of the agent.';
COMMENT ON COLUMN public.agents.description IS 'A brief description of the agent''s purpose.';
COMMENT ON COLUMN public.agents.created_at IS 'Timestamp when the agent was created.';
COMMENT ON COLUMN public.agents.updated_at IS 'Timestamp when the agent was last updated.';
COMMENT ON COLUMN public.agents.agent_type IS 'The type or category of the agent (e.g., trading, research).';
COMMENT ON COLUMN public.agents.configuration IS 'JSONB field to store agent-specific configuration.';
COMMENT ON COLUMN public.agents.status IS 'Current status of the agent (e.g., idle, running, stopped, error).';

-- Add created_at and updated_at triggers using existing functions
-- Ensure the trigger functions public.handle_created_at() and public.handle_updated_at() exist
-- CREATE TRIGGER handle_agents_created_at BEFORE INSERT ON public.agents
-- FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own agents"
  ON public.agents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow read access for specific service roles if needed"
  ON public.agents FOR SELECT
  USING (true); -- Adjust this policy based on actual requirements, e.g., check role
