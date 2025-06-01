-- supabase/migrations/20240615000200_create_shared_knowledge_items.sql

-- Ensure vector and pgcrypto extensions are enabled (idempotent checks)
-- These should ideally be in a very early migration, but checking again doesn't hurt.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- For gen_random_uuid() if not using default uuid_generate_v4 from pgcrypto

CREATE TABLE IF NOT EXISTS public.shared_knowledge_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Uses pgcrypto's gen_random_uuid()
    source_agent_id UUID REFERENCES public.trading_agents(agent_id) ON DELETE SET NULL, 
    -- Consider if source_agent_id should be TEXT if it can come from non-DB agents or external sources.
    -- For now, linking to trading_agents if it's an internal agent.
    
    content_text TEXT NOT NULL,
    -- Embedding dimension: 1536 for OpenAI's text-embedding-ada-002
    -- This should match the model used to generate embeddings.
    embedding vector(1536), 
    
    tags TEXT[], -- Array of text tags
    symbols_referenced TEXT[], -- Array of referenced symbols, e.g., "BTC/USD"
    knowledge_type TEXT, -- e.g., "market_insight", "trade_outcome", "risk_assessment", "learning_summary"
    
    importance_score REAL DEFAULT 0.5 CHECK (importance_score >= 0.0 AND importance_score <= 1.0),
    confidence_score REAL DEFAULT 0.5 CHECK (confidence_score IS NULL OR (confidence_score >= 0.0 AND confidence_score <= 1.0)), -- Allow NULL
    
    metadata JSONB DEFAULT '{}'::jsonb, -- Default to empty JSON object
    
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.shared_knowledge_items IS 'Stores shared knowledge items contributed by agents or derived from processes, for inter-agent learning and context enrichment.';
COMMENT ON COLUMN public.shared_knowledge_items.embedding IS 'Vector embedding of content_text for similarity search. Dimension e.g., 1536 for OpenAI ada-002.';
COMMENT ON COLUMN public.shared_knowledge_items.source_agent_id IS 'The trading_agent (if internal) that originated this knowledge item.';
COMMENT ON COLUMN public.shared_knowledge_items.tags IS 'Keywords or tags for categorization.';
COMMENT ON COLUMN public.shared_knowledge_items.symbols_referenced IS 'Financial symbols relevant to this knowledge item.';
COMMENT ON COLUMN public.shared_knowledge_items.knowledge_type IS 'Classification of the knowledge (e.g., market_insight, trade_analysis, risk_alert).';
COMMENT ON COLUMN public.shared_knowledge_items.importance_score IS 'A score from 0.0 to 1.0 indicating the perceived importance of the item.';
COMMENT ON COLUMN public.shared_knowledge_items.confidence_score IS 'A score from 0.0 to 1.0 indicating confidence in the accuracy of the item, if applicable.';

-- Ensure the trigger function exists (idempotent) - it should from previous migrations
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create
DROP TRIGGER IF EXISTS set_shared_knowledge_items_updated_at ON public.shared_knowledge_items;
CREATE TRIGGER set_shared_knowledge_items_updated_at
BEFORE UPDATE ON public.shared_knowledge_items
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_source_agent ON public.shared_knowledge_items(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_tags ON public.shared_knowledge_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_symbols ON public.shared_knowledge_items USING GIN(symbols_referenced);
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_type ON public.shared_knowledge_items(knowledge_type);
-- IVFFlat index for pgvector. lists should be tuned based on table size.
-- For small tables (e.g., < 1M rows), lists = N_rows / 1000. For larger, lists = sqrt(N_rows).
-- Defaulting to 100 lists is a common starting point.
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_embedding ON public.shared_knowledge_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS Policies
ALTER TABLE public.shared_knowledge_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access to shared knowledge" ON public.shared_knowledge_items;
CREATE POLICY "Allow authenticated read access to shared knowledge"
  ON public.shared_knowledge_items FOR SELECT TO authenticated USING (true);

-- For now, allow service_role to do all operations.
-- More granular CUD policies might be needed later (e.g., agents can only insert, not update/delete broadly).
DROP POLICY IF EXISTS "Allow service_role full access to shared knowledge" ON public.shared_knowledge_items;
CREATE POLICY "Allow service_role full access to shared knowledge"
  ON public.shared_knowledge_items FOR ALL TO service_role USING (true) WITH CHECK (true);
