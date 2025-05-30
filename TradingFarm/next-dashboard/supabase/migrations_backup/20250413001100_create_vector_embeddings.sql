-- Create Vector Embeddings for Knowledge Management System
-- This migration creates the vector extension and tables needed for semantic search

-- Enable the vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS "vector" SCHEMA "public";

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create documents table to store knowledge assets
CREATE TABLE IF NOT EXISTS public.brain_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  source_type TEXT NOT NULL, -- 'pdf', 'txt', 'pinescript', 'url', 'user_input'
  source_url TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archived BOOLEAN DEFAULT FALSE
);

-- Add RLS policies
ALTER TABLE public.brain_documents ENABLE ROW LEVEL SECURITY;

-- Documents are only visible to the user who created them
CREATE POLICY "Users can view their own documents" ON public.brain_documents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "Users can insert their own documents" ON public.brain_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update their own documents" ON public.brain_documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "Users can delete their own documents" ON public.brain_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create table for vector embeddings
CREATE TABLE IF NOT EXISTS public.brain_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.brain_documents(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL, -- OpenAI embeddings are 1536 dimensions
  content TEXT NOT NULL, -- The chunk of text that was embedded
  chunk_index INTEGER NOT NULL, -- Index of chunk within document
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.brain_embeddings ENABLE ROW LEVEL SECURITY;

-- Embeddings are only visible to the user who created the document
CREATE POLICY "Users can view their own embeddings" ON public.brain_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.brain_documents
      WHERE brain_documents.id = brain_embeddings.document_id
      AND brain_documents.user_id = auth.uid()
    )
  );
  
-- Create a function to handle the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_brain_documents_updated_at
BEFORE UPDATE ON public.brain_documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create a similarity search function
CREATE OR REPLACE FUNCTION search_brain_embeddings(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  user_id_input UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  title TEXT,
  source_type TEXT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.document_id,
    e.content,
    1 - (e.embedding <=> query_embedding) AS similarity,
    d.title,
    d.source_type,
    d.metadata
  FROM
    public.brain_embeddings e
  JOIN
    public.brain_documents d ON e.document_id = d.id
  WHERE
    d.user_id = user_id_input
    AND d.is_archived = FALSE
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$;
