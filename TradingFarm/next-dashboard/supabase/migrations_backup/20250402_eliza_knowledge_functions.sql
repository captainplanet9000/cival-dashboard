-- Create ElizaOS Knowledge Base Tables and Functions
-- This migration sets up the infrastructure for the knowledge management system

-- Document Storage Table
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding VECTOR(1536),  -- For OpenAI embeddings
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document Chunks Table (for RAG implementation)
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- For OpenAI embeddings
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

-- Function to store a knowledge document and create chunks
CREATE OR REPLACE FUNCTION store_knowledge_document(
  p_title TEXT,
  p_content TEXT,
  p_metadata JSONB,
  p_farm_id UUID,
  p_agent_id UUID DEFAULT NULL,
  p_chunk_size INTEGER DEFAULT 1000
)
RETURNS UUID
SECURITY INVOKER
AS $$
DECLARE
  doc_id UUID;
  chunk_text TEXT;
  chunk_start INTEGER;
  chunk_end INTEGER;
  chunk_index INTEGER := 0;
  content_length INTEGER;
BEGIN
  -- Set search path for security
  SET search_path = '';
  
  -- Create the document
  INSERT INTO public.knowledge_documents (
    title, 
    content, 
    metadata, 
    farm_id, 
    agent_id
  )
  VALUES (
    p_title,
    p_content,
    p_metadata,
    p_farm_id,
    p_agent_id
  )
  RETURNING id INTO doc_id;
  
  -- Create chunks for RAG
  content_length := length(p_content);
  chunk_start := 1;
  
  WHILE chunk_start <= content_length LOOP
    -- Calculate end position, ensuring we don't exceed content length
    chunk_end := LEAST(chunk_start + p_chunk_size - 1, content_length);
    
    -- Extract chunk
    chunk_text := substring(p_content from chunk_start for (chunk_end - chunk_start + 1));
    
    -- Create chunk
    INSERT INTO public.knowledge_chunks (
      document_id,
      chunk_index,
      content,
      metadata
    )
    VALUES (
      doc_id,
      chunk_index,
      chunk_text,
      jsonb_build_object(
        'title', p_title,
        'start_position', chunk_start,
        'end_position', chunk_end
      ) || p_metadata
    );
    
    -- Move to next chunk
    chunk_start := chunk_end + 1;
    chunk_index := chunk_index + 1;
  END LOOP;
  
  RETURN doc_id;
END;
$$ LANGUAGE plpgsql;

-- Function to retrieve similar chunks using cosine similarity
CREATE OR REPLACE FUNCTION find_similar_chunks(
  p_query_embedding VECTOR(1536),
  p_farm_id UUID,
  p_limit INTEGER DEFAULT 5,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title TEXT,
  chunk_content TEXT,
  similarity FLOAT,
  metadata JSONB
)
SECURITY INVOKER
AS $$
BEGIN
  -- Set search path for security
  SET search_path = '';
  
  RETURN QUERY
  SELECT 
    c.id AS chunk_id,
    c.document_id,
    d.title AS document_title,
    c.content AS chunk_content,
    (c.embedding <=> p_query_embedding) AS similarity,
    c.metadata
  FROM 
    public.knowledge_chunks c
  JOIN
    public.knowledge_documents d ON c.document_id = d.id
  WHERE
    d.farm_id = p_farm_id
    AND (c.embedding <=> p_query_embedding) <= p_similarity_threshold
  ORDER BY
    similarity ASC  -- Lower distance means higher similarity
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get knowledge for a specific agent
CREATE OR REPLACE FUNCTION get_agent_knowledge(
  p_agent_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  summary TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
SECURITY INVOKER
AS $$
BEGIN
  -- Set search path for security
  SET search_path = '';
  
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    substring(d.content from 1 for 200) || '...' AS summary,
    d.metadata,
    d.created_at
  FROM 
    public.knowledge_documents d
  WHERE
    d.agent_id = p_agent_id
    OR (
      d.agent_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.agents a
        WHERE a.id = p_agent_id
        AND a.farm_id = d.farm_id
      )
    )
  ORDER BY
    d.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Timestamps triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on knowledge tables
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for knowledge_documents
CREATE POLICY "Users can view knowledge for their farms" ON public.knowledge_documents
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = knowledge_documents.farm_id
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert knowledge for their farms" ON public.knowledge_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = knowledge_documents.farm_id
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update knowledge for their farms" ON public.knowledge_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = knowledge_documents.farm_id
      AND f.user_id = auth.uid()
    )
  );

-- Add RLS policies for knowledge_chunks
CREATE POLICY "Users can access chunks for their farms" ON public.knowledge_chunks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_documents d
      JOIN public.farms f ON d.farm_id = f.id
      WHERE d.id = knowledge_chunks.document_id
      AND f.user_id = auth.uid()
    )
  );
