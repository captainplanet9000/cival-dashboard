-- supabase/migrations/20250529171559_create_agent_tasks_table.sql
CREATE TABLE IF NOT EXISTS public.agent_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.trading_agents(agent_id) ON DELETE SET NULL, -- Or CASCADE if tasks are tightly coupled
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_name TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    input_parameters JSONB,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.agent_tasks IS 'Stores state and results for asynchronous agent tasks or crew runs.';
COMMENT ON COLUMN public.agent_tasks.agent_id IS 'Optional reference to a specific trading_agent primarily involved.';

-- Trigger for updated_at
-- Ensure public.trigger_set_timestamp() function exists (created in vault migration)
CREATE TRIGGER set_agent_tasks_updated_at
BEFORE UPDATE ON public.agent_tasks
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- RLS Policies (basic for now, to be refined)
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agent tasks"
ON public.agent_tasks FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Service role can access all agent tasks"
ON public.agent_tasks FOR ALL
TO service_role
USING (true);
