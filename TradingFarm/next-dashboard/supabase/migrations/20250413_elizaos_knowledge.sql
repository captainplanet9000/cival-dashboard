-- Create ElizaOS Knowledge tables
-- First, enable the vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge document table
CREATE TABLE IF NOT EXISTS public.elizaos_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  source TEXT,
  document_type TEXT NOT NULL, -- 'strategy', 'market_analysis', 'trading_rule', etc.
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  farm_id INTEGER REFERENCES public.farms(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create knowledge chunks table for RAG
CREATE TABLE IF NOT EXISTS public.elizaos_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.elizaos_knowledge_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embeddings are 1536 dimensions
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create knowledge permissions table
CREATE TABLE IF NOT EXISTS public.elizaos_knowledge_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.elizaos_knowledge_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  farm_id INTEGER REFERENCES public.farms(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'read', -- 'read', 'write', 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Either user_id, agent_id, or farm_id must be specified
  CONSTRAINT one_permission_target CHECK (
    (user_id IS NOT NULL)::integer + 
    (agent_id IS NOT NULL)::integer + 
    (farm_id IS NOT NULL)::integer = 1
  )
);

-- Create triggers for timestamp management
-- Document timestamps
CREATE TRIGGER set_elizaos_knowledge_documents_created_at
BEFORE INSERT ON public.elizaos_knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_elizaos_knowledge_documents_updated_at
BEFORE UPDATE ON public.elizaos_knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Chunk timestamps
CREATE TRIGGER set_elizaos_knowledge_chunks_created_at
BEFORE INSERT ON public.elizaos_knowledge_chunks
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_elizaos_knowledge_chunks_updated_at
BEFORE UPDATE ON public.elizaos_knowledge_chunks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Permission timestamps
CREATE TRIGGER set_elizaos_knowledge_permissions_created_at
BEFORE INSERT ON public.elizaos_knowledge_permissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_elizaos_knowledge_permissions_updated_at
BEFORE UPDATE ON public.elizaos_knowledge_permissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on all tables
ALTER TABLE public.elizaos_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elizaos_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elizaos_knowledge_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for knowledge documents
-- Admins can do everything
CREATE POLICY "Admins can do everything with knowledge documents"
  ON public.elizaos_knowledge_documents
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE auth.uid() = id));

-- Users can view their own documents or public documents
CREATE POLICY "Users can view their own knowledge documents or public ones"
  ON public.elizaos_knowledge_documents
  FOR SELECT
  USING (
    created_by = auth.uid() OR 
    is_public = true OR 
    auth.uid() IN (
      SELECT user_id FROM public.elizaos_knowledge_permissions 
      WHERE document_id = id AND permission_level IN ('read', 'write', 'admin')
    )
  );

-- Users can insert their own documents
CREATE POLICY "Users can insert their own knowledge documents"
  ON public.elizaos_knowledge_documents
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update their own documents or documents they have write access to
CREATE POLICY "Users can update their own knowledge documents or with permission"
  ON public.elizaos_knowledge_documents
  FOR UPDATE
  USING (
    created_by = auth.uid() OR
    auth.uid() IN (
      SELECT user_id FROM public.elizaos_knowledge_permissions 
      WHERE document_id = id AND permission_level IN ('write', 'admin')
    )
  );

-- Users can delete their own documents or documents they have admin access to
CREATE POLICY "Users can delete their own knowledge documents or with permission"
  ON public.elizaos_knowledge_documents
  FOR DELETE
  USING (
    created_by = auth.uid() OR
    auth.uid() IN (
      SELECT user_id FROM public.elizaos_knowledge_permissions 
      WHERE document_id = id AND permission_level = 'admin'
    )
  );

-- Policies for knowledge chunks (inherit from document policies for simplicity)
CREATE POLICY "Users can view chunks of accessible documents"
  ON public.elizaos_knowledge_chunks
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.elizaos_knowledge_documents
      WHERE created_by = auth.uid() OR is_public = true OR
      auth.uid() IN (
        SELECT user_id FROM public.elizaos_knowledge_permissions 
        WHERE document_id = id AND permission_level IN ('read', 'write', 'admin')
      )
    )
  );

-- Users can insert chunks for their own documents
CREATE POLICY "Users can insert chunks for their own documents"
  ON public.elizaos_knowledge_chunks
  FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM public.elizaos_knowledge_documents
      WHERE created_by = auth.uid() OR
      auth.uid() IN (
        SELECT user_id FROM public.elizaos_knowledge_permissions 
        WHERE document_id = id AND permission_level IN ('write', 'admin')
      )
    )
  );

-- Users can update chunks for their own documents
CREATE POLICY "Users can update chunks for their own documents"
  ON public.elizaos_knowledge_chunks
  FOR UPDATE
  USING (
    document_id IN (
      SELECT id FROM public.elizaos_knowledge_documents
      WHERE created_by = auth.uid() OR
      auth.uid() IN (
        SELECT user_id FROM public.elizaos_knowledge_permissions 
        WHERE document_id = id AND permission_level IN ('write', 'admin')
      )
    )
  );

-- Users can delete chunks for their own documents
CREATE POLICY "Users can delete chunks for their own documents"
  ON public.elizaos_knowledge_chunks
  FOR DELETE
  USING (
    document_id IN (
      SELECT id FROM public.elizaos_knowledge_documents
      WHERE created_by = auth.uid() OR
      auth.uid() IN (
        SELECT user_id FROM public.elizaos_knowledge_permissions 
        WHERE document_id = id AND permission_level = 'admin'
      )
    )
  );

-- Create index on embedding for vector search
CREATE INDEX IF NOT EXISTS elizaos_knowledge_chunks_embedding_idx 
  ON public.elizaos_knowledge_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create functions for vector similarity search
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INTEGER,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.id,
    chunks.document_id,
    chunks.content,
    chunks.chunk_index,
    chunks.metadata,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM public.elizaos_knowledge_chunks chunks
  WHERE 1 - (chunks.embedding <=> query_embedding) > match_threshold
  -- Only include chunks from documents the user has access to
  AND EXISTS (
    SELECT 1 FROM public.elizaos_knowledge_documents docs
    WHERE docs.id = chunks.document_id AND (
      docs.created_by = auth.uid() OR
      docs.is_public = true OR
      EXISTS (
        SELECT 1 FROM public.elizaos_knowledge_permissions perms
        WHERE perms.document_id = docs.id
        AND perms.user_id = auth.uid()
        AND perms.permission_level IN ('read', 'write', 'admin')
      )
    )
  )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
