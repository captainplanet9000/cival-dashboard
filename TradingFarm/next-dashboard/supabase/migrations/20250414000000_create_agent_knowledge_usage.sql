-- Create table for tracking agent knowledge usage
-- This table connects agents, their runs, and the knowledge chunks they've used

-- Create agent knowledge usage table
CREATE TABLE IF NOT EXISTS public.agent_knowledge_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.brain_documents(id) ON DELETE CASCADE,
    chunk_id TEXT NOT NULL,
    relevance_score FLOAT NOT NULL DEFAULT 1.0,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Created and updated timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add triggers for timestamp handling
CREATE TRIGGER handle_agent_knowledge_usage_created_at BEFORE INSERT ON public.agent_knowledge_usage
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_agent_knowledge_usage_updated_at BEFORE UPDATE ON public.agent_knowledge_usage
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_usage_agent_id ON public.agent_knowledge_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_usage_run_id ON public.agent_knowledge_usage(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_usage_document_id ON public.agent_knowledge_usage(document_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_usage_used_at ON public.agent_knowledge_usage(used_at);

-- Add Row Level Security (RLS) policies
ALTER TABLE public.agent_knowledge_usage ENABLE ROW LEVEL SECURITY;

-- Policy for select: users can only see knowledge usage for their own agents
CREATE POLICY agent_knowledge_usage_select_policy ON public.agent_knowledge_usage
    FOR SELECT
    USING (
        agent_id IN (
            SELECT id FROM public.agents
            WHERE user_id = auth.uid()
        )
    );

-- Policy for insert: users can only insert knowledge usage for their own agents
CREATE POLICY agent_knowledge_usage_insert_policy ON public.agent_knowledge_usage
    FOR INSERT
    WITH CHECK (
        agent_id IN (
            SELECT id FROM public.agents
            WHERE user_id = auth.uid()
        )
    );

-- Policy for update: users can only update knowledge usage for their own agents
CREATE POLICY agent_knowledge_usage_update_policy ON public.agent_knowledge_usage
    FOR UPDATE
    USING (
        agent_id IN (
            SELECT id FROM public.agents
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        agent_id IN (
            SELECT id FROM public.agents
            WHERE user_id = auth.uid()
        )
    );

-- Policy for delete: users can only delete knowledge usage for their own agents
CREATE POLICY agent_knowledge_usage_delete_policy ON public.agent_knowledge_usage
    FOR DELETE
    USING (
        agent_id IN (
            SELECT id FROM public.agents
            WHERE user_id = auth.uid()
        )
    );

-- Comments
COMMENT ON TABLE public.agent_knowledge_usage IS 'Tracks which knowledge chunks are used by agents during runs';
COMMENT ON COLUMN public.agent_knowledge_usage.agent_id IS 'Reference to the agent';
COMMENT ON COLUMN public.agent_knowledge_usage.run_id IS 'Reference to the agent run';
COMMENT ON COLUMN public.agent_knowledge_usage.document_id IS 'Reference to the brain document';
COMMENT ON COLUMN public.agent_knowledge_usage.chunk_id IS 'ID of the specific chunk within the document';
COMMENT ON COLUMN public.agent_knowledge_usage.relevance_score IS 'How relevant the chunk was for the agent (0.0 to 1.0)';
COMMENT ON COLUMN public.agent_knowledge_usage.used_at IS 'When the knowledge was used';
