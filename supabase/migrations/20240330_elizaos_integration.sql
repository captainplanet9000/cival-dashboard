-- Migration: ElizaOS Integration for Trading Farm
-- Description: Creates tables for ElizaOS commands and memory items

-- Check if pgvector extension exists and create it if not
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension is not available - creating memory_items without embedding vector field';
END $$;

-- ElizaOS Commands Table
CREATE TABLE IF NOT EXISTS public.eliza_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('user', 'agent', 'system', 'farm')),
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  farm_id UUID,
  context JSONB DEFAULT '{}'::JSONB,
  response JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Dynamic creation of memory_items table based on pgvector availability
DO $$
BEGIN
  -- Check if vector extension exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    -- Create memory_items with vector embedding
    EXECUTE '
      CREATE TABLE IF NOT EXISTS public.memory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN (''fact'', ''observation'', ''insight'', ''decision'', ''feedback'')),
        importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 10),
        embedding vector(1536),
        metadata JSONB DEFAULT ''{}'',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        last_accessed_at TIMESTAMP WITH TIME ZONE
      )
    ';
  ELSE
    -- Create memory_items without vector embedding
    EXECUTE '
      CREATE TABLE IF NOT EXISTS public.memory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN (''fact'', ''observation'', ''insight'', ''decision'', ''feedback'')),
        importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 10),
        metadata JSONB DEFAULT ''{}'',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        last_accessed_at TIMESTAMP WITH TIME ZONE,
        keywords TEXT[] DEFAULT ARRAY[]::TEXT[]
      )
    ';
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eliza_commands_agent ON public.eliza_commands(agent_id);
CREATE INDEX IF NOT EXISTS idx_eliza_commands_status ON public.eliza_commands(status);
CREATE INDEX IF NOT EXISTS idx_eliza_commands_created ON public.eliza_commands(created_at);
CREATE INDEX IF NOT EXISTS idx_memory_items_agent ON public.memory_items(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_items_type ON public.memory_items(type);
CREATE INDEX IF NOT EXISTS idx_memory_items_importance ON public.memory_items(importance);
CREATE INDEX IF NOT EXISTS idx_memory_items_created ON public.memory_items(created_at);

-- Add full text search for memory items if pgvector is not available
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    EXECUTE '
      CREATE INDEX idx_memory_items_content_gin ON public.memory_items USING gin(to_tsvector(''english'', content));
      CREATE INDEX idx_memory_items_keywords ON public.memory_items USING gin(keywords);
    ';
  END IF;
END $$;

-- Function to manage memory items retrieval with recency and importance (non-vector version)
CREATE OR REPLACE FUNCTION public.get_relevant_memories(
  p_agent_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  id UUID,
  content TEXT,
  type TEXT,
  importance INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  relevance_score DOUBLE PRECISION
) AS $$
DECLARE
  has_vector BOOLEAN;
BEGIN
  -- Check if vector extension exists
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) INTO has_vector;
  
  -- If vector extension exists but function for vector similarity not implemented yet
  -- Fall back to text search
  IF has_vector THEN
    -- Update last_accessed timestamp for retrieved memories
    RETURN QUERY
    WITH retrieved_memories AS (
      SELECT 
        id, 
        content, 
        type, 
        importance, 
        created_at,
        -- Simplified relevance score based on importance and recency
        importance * 0.6 + (1.0 - EXTRACT(EPOCH FROM (NOW() - created_at))/86400.0/30.0) * 0.4 AS relevance_score
      FROM 
        public.memory_items
      WHERE 
        agent_id = p_agent_id
        AND (expires_at IS NULL OR expires_at > NOW())
        -- Basic text search
        AND (content ILIKE '%' || p_query || '%' OR p_query IS NULL)
      ORDER BY
        relevance_score DESC
      LIMIT p_limit
    )
    SELECT 
      rm.id, 
      rm.content, 
      rm.type, 
      rm.importance, 
      rm.created_at,
      rm.relevance_score
    FROM retrieved_memories rm;
  ELSE
    -- Use full text search for non-vector version
    RETURN QUERY
    WITH retrieved_memories AS (
      SELECT 
        id, 
        content, 
        type, 
        importance, 
        created_at,
        -- Relevance based on text search, importance and recency
        (
          CASE 
            WHEN p_query IS NULL THEN 1.0
            WHEN content ILIKE '%' || p_query || '%' THEN 
              GREATEST(0.5, GREATEST(
                -- Check if exact phrase is found
                CASE WHEN position(lower(p_query) in lower(content)) > 0 THEN 1.0 ELSE 0.3 END,
                -- Check if all words are found (basic tokenization)
                CASE 
                  WHEN array_length(regexp_split_to_array(lower(p_query), '\s+'), 1) = 
                       array_length(array_remove(regexp_split_to_array(lower(p_query), '\s+'), NULL), 1) 
                  THEN 0.8
                  ELSE 0.2
                END
              ))
            ELSE 0.2
          END * 0.5 +
          importance * 0.3 + 
          (1.0 - EXTRACT(EPOCH FROM (NOW() - created_at))/86400.0/30.0) * 0.2
        ) AS relevance_score
      FROM 
        public.memory_items
      WHERE 
        agent_id = p_agent_id
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (
          p_query IS NULL OR
          content ILIKE '%' || p_query || '%' OR
          EXISTS (
            SELECT 1
            FROM unnest(keywords) keyword
            WHERE keyword ILIKE '%' || p_query || '%'
          )
        )
      ORDER BY
        relevance_score DESC
      LIMIT p_limit
    )
    SELECT 
      rm.id, 
      rm.content, 
      rm.type, 
      rm.importance, 
      rm.created_at,
      rm.relevance_score
    FROM retrieved_memories rm;
  END IF;
  
  -- Update last_accessed_at for retrieved memories
  UPDATE public.memory_items
  SET last_accessed_at = NOW(),
      updated_at = NOW()
  WHERE id IN (SELECT id FROM retrieved_memories);
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_eliza_commands_updated_at
BEFORE UPDATE ON public.eliza_commands
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_memory_items_updated_at
BEFORE UPDATE ON public.memory_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE public.eliza_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for eliza_commands
CREATE POLICY "Users can view their own commands" 
ON public.eliza_commands FOR SELECT 
USING (agent_id = auth.uid());

CREATE POLICY "Authenticated users can insert commands" 
ON public.eliza_commands FOR INSERT 
WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- RLS policies for memory_items
CREATE POLICY "Users can view their own memory items" 
ON public.memory_items FOR SELECT 
USING (agent_id = auth.uid());

CREATE POLICY "Users can insert their own memory items" 
ON public.memory_items FOR INSERT 
WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Users can update their own memory items" 
ON public.memory_items FOR UPDATE
USING (agent_id = auth.uid()); 