-- Migration script for creating agents and agent_tasks tables

-- Drop existing tables first to ensure a clean state
DROP TABLE IF EXISTS public.agent_tasks;
DROP TABLE IF EXISTS public.agents CASCADE;

-- 1. Agents Table (Recreate without IF NOT EXISTS)
CREATE TABLE public.agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type text NOT NULL,
    status text NOT NULL DEFAULT 'idle',
    manager_id uuid REFERENCES public.agents(id) ON DELETE SET NULL, -- Allow managers to be deleted without deleting workers
    last_heartbeat_at timestamptz,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comments can be applied even if the table exists
COMMENT ON TABLE public.agents IS 'Stores information about individual autonomous agents.';
COMMENT ON COLUMN public.agents.agent_type IS 'Type of the agent (e.g., manager, worker, eliza_manager).';
COMMENT ON COLUMN public.agents.status IS 'Current operational status of the agent.';
COMMENT ON COLUMN public.agents.manager_id IS 'The ID of the manager agent overseeing this agent, if applicable.';
COMMENT ON COLUMN public.agents.last_heartbeat_at IS 'Timestamp of the last heartbeat received from the agent.';
COMMENT ON COLUMN public.agents.metadata IS 'Flexible JSONB field for storing agent-specific configuration or state.';

-- Triggers
-- Drop existing triggers first (using IF EXISTS is safer)
DROP TRIGGER IF EXISTS handle_agents_created_at ON public.agents;
CREATE TRIGGER handle_agents_created_at BEFORE INSERT ON public.agents
  FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS handle_agents_updated_at ON public.agents;
CREATE TRIGGER handle_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  
-- Enable RLS (safe to run multiple times)
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Policies might error if they already exist. Use DROP POLICY IF EXISTS first.
DROP POLICY IF EXISTS "Allow authenticated read access to agents" ON public.agents;
CREATE POLICY "Allow authenticated read access to agents" ON public.agents
  FOR SELECT USING (auth.role() = 'authenticated');
  
DROP POLICY IF EXISTS "Allow authenticated users full access for development" ON public.agents;
CREATE POLICY "Allow authenticated users full access for development" ON public.agents
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 2. Agent Tasks Table (Recreate without IF NOT EXISTS)
CREATE TABLE public.agent_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type text NOT NULL,
    payload jsonb,
    status text NOT NULL DEFAULT 'pending', -- e.g., pending, assigned, running, completed, failed
    result jsonb, -- Store successful task output
    error_message text, -- Store error details if failed
    priority integer DEFAULT 5, -- Example priority, lower is higher
    assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL, -- Agent currently working on it
    metadata jsonb, -- Source, correlationId, etc.
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comments
COMMENT ON TABLE public.agent_tasks IS 'Stores tasks to be executed by agents.';
COMMENT ON COLUMN public.agent_tasks.status IS 'Current status of the task.';
COMMENT ON COLUMN public.agent_tasks.result IS 'Output/result of a successfully completed task.';
COMMENT ON COLUMN public.agent_tasks.error_message IS 'Details of the error if the task failed.';
COMMENT ON COLUMN public.agent_tasks.priority IS 'Priority of the task (e.g., 1-10).';
COMMENT ON COLUMN public.agent_tasks.assigned_agent_id IS 'The ID of the agent currently assigned to this task.';
COMMENT ON COLUMN public.agent_tasks.metadata IS 'Flexible JSONB field for task metadata (source, correlation ID, etc.).';

-- Triggers
DROP TRIGGER IF EXISTS handle_agent_tasks_created_at ON public.agent_tasks;
CREATE TRIGGER handle_agent_tasks_created_at BEFORE INSERT ON public.agent_tasks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS handle_agent_tasks_updated_at ON public.agent_tasks;
CREATE TRIGGER handle_agent_tasks_updated_at BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow authenticated users full task access for development" ON public.agent_tasks;
CREATE POLICY "Allow authenticated users full task access for development" ON public.agent_tasks
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
