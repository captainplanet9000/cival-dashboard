-- Migration: Brain & Knowledge Management for Trading Farm
-- Description: Set up tables for brains, documents, and document chunks with vector embeddings

-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create brains table
CREATE TABLE IF NOT EXISTS public.brains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'general', -- 'general', 'trading', 'research', etc.
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, name)
);

-- Create brain_documents table
CREATE TABLE IF NOT EXISTS public.brain_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id UUID NOT NULL REFERENCES public.brains(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  file_path TEXT,
  content_type TEXT NOT NULL, -- 'pdf', 'text', 'html', 'markdown', etc.
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create document_chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.brain_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add brain_id to strategies table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'strategies') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'strategies' AND column_name = 'brain_id') THEN
      ALTER TABLE public.strategies ADD COLUMN brain_id UUID REFERENCES public.brains(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create triggers for automatic timestamps
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'brains_created_at_trigger') THEN
    CREATE TRIGGER brains_created_at_trigger
    BEFORE INSERT ON public.brains
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'brains_updated_at_trigger') THEN
    CREATE TRIGGER brains_updated_at_trigger
    BEFORE UPDATE ON public.brains
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'brain_documents_created_at_trigger') THEN
    CREATE TRIGGER brain_documents_created_at_trigger
    BEFORE INSERT ON public.brain_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'brain_documents_updated_at_trigger') THEN
    CREATE TRIGGER brain_documents_updated_at_trigger
    BEFORE UPDATE ON public.brain_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'document_chunks_created_at_trigger') THEN
    CREATE TRIGGER document_chunks_created_at_trigger
    BEFORE INSERT ON public.document_chunks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'document_chunks_updated_at_trigger') THEN
    CREATE TRIGGER document_chunks_updated_at_trigger
    BEFORE UPDATE ON public.document_chunks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.brains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for brains
CREATE POLICY "Users can view brains in their farms" 
ON public.brains FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.farms
  WHERE farms.id = brains.farm_id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can insert brains in their farms" 
ON public.brains FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.farms
  WHERE farms.id = NEW.farm_id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can update brains in their farms" 
ON public.brains FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.farms
  WHERE farms.id = brains.farm_id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can delete brains in their farms" 
ON public.brains FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.farms
  WHERE farms.id = brains.farm_id AND farms.owner_id = auth.uid()
));

-- RLS policies for brain_documents
CREATE POLICY "Users can view brain_documents in their farms" 
ON public.brain_documents FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brains
  JOIN public.farms ON brains.farm_id = farms.id
  WHERE brain_documents.brain_id = brains.id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can insert brain_documents in their farms" 
ON public.brain_documents FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brains
  JOIN public.farms ON brains.farm_id = farms.id
  WHERE NEW.brain_id = brains.id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can update brain_documents in their farms" 
ON public.brain_documents FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.brains
  JOIN public.farms ON brains.farm_id = farms.id
  WHERE brain_documents.brain_id = brains.id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can delete brain_documents in their farms" 
ON public.brain_documents FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.brains
  JOIN public.farms ON brains.farm_id = farms.id
  WHERE brain_documents.brain_id = brains.id AND farms.owner_id = auth.uid()
));

-- RLS policies for document_chunks
CREATE POLICY "Users can view document_chunks in their farms" 
ON public.document_chunks FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.brain_documents
  JOIN public.brains ON brain_documents.brain_id = brains.id
  JOIN public.farms ON brains.farm_id = farms.id
  WHERE document_chunks.document_id = brain_documents.id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can insert document_chunks in their farms" 
ON public.document_chunks FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.brain_documents
  JOIN public.brains ON brain_documents.brain_id = brains.id
  JOIN public.farms ON brains.farm_id = farms.id
  WHERE NEW.document_id = brain_documents.id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can update document_chunks in their farms" 
ON public.document_chunks FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.brain_documents
  JOIN public.brains ON brain_documents.brain_id = brains.id
  JOIN public.farms ON brains.farm_id = farms.id
  WHERE document_chunks.document_id = brain_documents.id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can delete document_chunks in their farms" 
ON public.document_chunks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.brain_documents
  JOIN public.brains ON brain_documents.brain_id = brains.id
  JOIN public.farms ON brains.farm_id = farms.id
  WHERE document_chunks.document_id = brain_documents.id AND farms.owner_id = auth.uid()
));

-- Function to query brain documents by similarity
CREATE OR REPLACE FUNCTION public.query_brain(
  p_brain_id UUID,
  p_query TEXT,
  p_embedding vector(1536),
  p_limit INT DEFAULT 5,
  p_threshold FLOAT DEFAULT 0.7
) RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title TEXT,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    dc.document_id,
    bd.title AS document_title,
    dc.content,
    1 - (dc.embedding <=> p_embedding) AS similarity
  FROM
    public.document_chunks dc
  JOIN
    public.brain_documents bd ON dc.document_id = bd.id
  WHERE
    bd.brain_id = p_brain_id
    AND (1 - (dc.embedding <=> p_embedding)) > p_threshold
  ORDER BY
    similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 