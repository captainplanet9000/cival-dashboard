-- Migration script for creating the agent_memory table

CREATE TABLE public.agent_memory (
    agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE, -- Memory should be deleted if agent is deleted
    key text NOT NULL,
    value jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    -- Composite primary key
    PRIMARY KEY (agent_id, key)
);

COMMENT ON TABLE public.agent_memory IS 'Stores key-value memory pairs associated with specific agents.';
COMMENT ON COLUMN public.agent_memory.agent_id IS 'The ID of the agent this memory belongs to.';
COMMENT ON COLUMN public.agent_memory.key IS 'The unique key for the memory item within the agent''s scope.';
COMMENT ON COLUMN public.agent_memory.value IS 'The JSONB value associated with the key.';

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS handle_agent_memory_created_at ON public.agent_memory;
CREATE TRIGGER handle_agent_memory_created_at BEFORE INSERT ON public.agent_memory
  FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

DROP TRIGGER IF EXISTS handle_agent_memory_updated_at ON public.agent_memory;
CREATE TRIGGER handle_agent_memory_updated_at BEFORE UPDATE ON public.agent_memory
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Adjust based on needs)
-- Example: Allow an agent to access/modify its OWN memory.
-- This requires identifying the agent via auth context, which is complex.
-- Placeholder concept:
-- CREATE POLICY "Allow agent access to own memory" ON public.agent_memory
--  FOR ALL USING (auth.uid() = agent_id) -- Assumes agent authenticates with its UUID
--  WITH CHECK (auth.uid() = agent_id);

-- Example: Allow a manager agent to access memory of its workers.
-- Placeholder concept:
-- CREATE POLICY "Allow manager access to worker memory" ON public.agent_memory
--  FOR ALL USING (is_manager_of(auth.uid(), agent_id)) -- Requires helper function
--  WITH CHECK (is_manager_of(auth.uid(), agent_id));

-- For now, permissive policy for development
-- *** Replace with stricter policies later ***
DROP POLICY IF EXISTS "Allow authenticated users full memory access for dev" ON public.agent_memory;
CREATE POLICY "Allow authenticated users full memory access for dev" ON public.agent_memory
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
