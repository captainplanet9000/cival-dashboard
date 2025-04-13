-- Migration for Knowledge Management vector search functionality
-- Creates functions for vector similarity search on elizaos_knowledge_chunks

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Function to match knowledge chunks by vector similarity
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  metadata jsonb,
  similarity float,
  document jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'title', d.title,
      'description', d.description,
      'document_type', d.document_type,
      'source', d.source
    ) as document
  FROM
    public.elizaos_knowledge_chunks c
  JOIN
    public.elizaos_knowledge_documents d ON c.document_id = d.id
  WHERE
    1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY
    c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to handle reindexing document chunks when content changes
CREATE OR REPLACE FUNCTION public.update_document_embeddings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete existing chunks for the document
  DELETE FROM public.elizaos_knowledge_chunks
  WHERE document_id = NEW.id;
  
  -- A trigger will initiate the async process to create new chunks and embeddings
  
  RETURN NEW;
END;
$$;

-- Trigger to update embeddings when document content changes
CREATE TRIGGER tr_update_document_embeddings
AFTER UPDATE OF content ON public.elizaos_knowledge_documents
FOR EACH ROW
WHEN (OLD.content IS DISTINCT FROM NEW.content)
EXECUTE FUNCTION public.update_document_embeddings();

-- Function to perform similarity search across documents for specific agents
CREATE OR REPLACE FUNCTION public.agent_knowledge_search(
  agent_id uuid,
  query_embedding vector,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  metadata jsonb,
  similarity float,
  document jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'title', d.title,
      'description', d.description,
      'document_type', d.document_type,
      'source', d.source
    ) as document
  FROM
    public.elizaos_knowledge_chunks c
  JOIN
    public.elizaos_knowledge_documents d ON c.document_id = d.id
  LEFT JOIN
    public.elizaos_knowledge_permissions p ON d.id = p.document_id AND p.agent_id = agent_id
  WHERE
    (d.is_public = true OR p.agent_id IS NOT NULL) AND
    1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY
    c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to perform similarity search across documents for specific farms
CREATE OR REPLACE FUNCTION public.farm_knowledge_search(
  farm_id int,
  query_embedding vector,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  metadata jsonb,
  similarity float,
  document jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'title', d.title,
      'description', d.description,
      'document_type', d.document_type,
      'source', d.source
    ) as document
  FROM
    public.elizaos_knowledge_chunks c
  JOIN
    public.elizaos_knowledge_documents d ON c.document_id = d.id
  LEFT JOIN
    public.elizaos_knowledge_permissions p ON d.id = p.document_id AND p.farm_id = farm_id
  WHERE
    (d.is_public = true OR d.farm_id = farm_id OR p.farm_id IS NOT NULL) AND
    1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY
    c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
