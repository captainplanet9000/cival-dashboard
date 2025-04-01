-- Migration: Add vector embedding support to memory_items
-- Description: Adds pgvector support for semantic search of memory items

-- Check if the vector extension is available and create it
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension is not available. Memory items will work without vector search capabilities.';
END
$$;

-- Add embedding column to memory_items if pgvector is available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    -- Add vector embedding column (1536 dimensions for OpenAI embeddings)
    ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS embedding vector(1536);
    
    -- Create an IVFFlat index for faster vector similarity search
    -- This index improves performance for nearest neighbor search
    CREATE INDEX IF NOT EXISTS idx_memory_items_embedding ON memory_items 
      USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
    
    RAISE NOTICE 'Vector embedding column and index successfully added to memory_items table.';
  END IF;
END
$$;

-- Create a function for semantic search of memory items
CREATE OR REPLACE FUNCTION search_memory_items(
  p_query_embedding vector(1536),
  p_agent_id UUID,
  p_match_threshold FLOAT DEFAULT 0.5,
  p_match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  content TEXT,
  type TEXT,
  importance INT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  relevance_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    RETURN QUERY
    SELECT 
      m.id,
      m.agent_id,
      m.content,
      m.type,
      m.importance,
      m.metadata,
      m.created_at,
      m.updated_at,
      1 - (m.embedding <=> p_query_embedding) AS relevance_score
    FROM 
      memory_items m
    WHERE 
      m.agent_id = p_agent_id AND
      (m.embedding <=> p_query_embedding) < (1 - p_match_threshold)
    ORDER BY 
      relevance_score DESC
    LIMIT p_match_count;
  ELSE
    -- Fallback to keyword search if vector extension is not available
    RETURN QUERY
    SELECT 
      m.id,
      m.agent_id,
      m.content,
      m.type,
      m.importance,
      m.metadata,
      m.created_at,
      m.updated_at,
      CAST(0.0 AS FLOAT) AS relevance_score
    FROM 
      memory_items m
    WHERE 
      m.agent_id = p_agent_id AND
      m.content ILIKE '%' || p_query_embedding::TEXT || '%'
    ORDER BY 
      m.importance DESC,
      m.created_at DESC
    LIMIT p_match_count;
  END IF;
END;
$$;

-- Create a function to add keywords column to memory_items if vector is not available
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    -- Add keywords column for basic text search fallback
    ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS keywords TEXT[];
    
    -- Create GIN index on keywords for faster text search
    CREATE INDEX IF NOT EXISTS idx_memory_items_keywords ON memory_items USING GIN (keywords);
    
    RAISE NOTICE 'Keywords column and index added as fallback for vector search.';
  END IF;
END
$$;

-- Create trigger function to automatically update keywords when vector is not available
CREATE OR REPLACE FUNCTION update_memory_keywords()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    -- Extract keywords from content
    NEW.keywords = (
      SELECT array_agg(DISTINCT word)
      FROM regexp_split_to_table(
        lower(NEW.content), E'\\s+|[,\\.;:!?\\-\\"]+'
      ) AS word
      WHERE length(word) > 2
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update keywords on insert or update
DROP TRIGGER IF EXISTS memory_items_update_keywords ON memory_items;
CREATE TRIGGER memory_items_update_keywords
BEFORE INSERT OR UPDATE ON memory_items
FOR EACH ROW
EXECUTE FUNCTION update_memory_keywords(); 