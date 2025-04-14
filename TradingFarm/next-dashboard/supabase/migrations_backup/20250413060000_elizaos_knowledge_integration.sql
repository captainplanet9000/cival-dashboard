-- ElizaOS Knowledge Integration
-- This migration creates tables and functions to integrate ElizaOS knowledge management
-- with the Trading Farm system

-- Create knowledge chunk table to store segmented content from brain files
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brain_file_id UUID NOT NULL REFERENCES public.brain_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(brain_file_id, chunk_index)
);

-- Add RLS policies
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing knowledge chunks
CREATE POLICY "Users can view knowledge chunks" ON public.knowledge_chunks
  FOR SELECT
  USING (
    knowledge_chunks.user_id = auth.uid() OR
    knowledge_chunks.brain_file_id IN (
      SELECT id FROM public.brain_files
      WHERE (
        visibility = 'farm' AND 
        farm_id IN (
          SELECT farm_id FROM public.farm_members
          WHERE user_id = auth.uid()
        )
      ) OR
      visibility = 'public'
    )
  );

-- Create policy for inserting knowledge chunks
CREATE POLICY "System can insert knowledge chunks" ON public.knowledge_chunks
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS knowledge_chunks_updated_at ON public.knowledge_chunks;
CREATE TRIGGER knowledge_chunks_updated_at
  BEFORE UPDATE ON public.knowledge_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create knowledge_queries table to track user queries to the knowledge base
CREATE TABLE IF NOT EXISTS public.knowledge_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  embedding vector(1536),
  query_type TEXT NOT NULL DEFAULT 'general',
  context JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.knowledge_queries ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own queries
CREATE POLICY "Users can view their own queries" ON public.knowledge_queries
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Create policy for users to insert their own queries
CREATE POLICY "Users can insert their own queries" ON public.knowledge_queries
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Create knowledge_responses table to store responses to user queries
CREATE TABLE IF NOT EXISTS public.knowledge_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_id UUID NOT NULL REFERENCES public.knowledge_queries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB, 
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.knowledge_responses ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own responses
CREATE POLICY "Users can view their own responses" ON public.knowledge_responses
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Create policy for service role to insert responses
CREATE POLICY "System can insert responses" ON public.knowledge_responses
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Create function to search knowledge chunks by similarity
CREATE OR REPLACE FUNCTION public.search_knowledge_by_vector(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count INTEGER,
  user_id_param UUID,
  farm_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  brain_file_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  brain_file_name TEXT,
  brain_file_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.brain_file_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity,
    bf.file_name as brain_file_name,
    bf.title as brain_file_title
  FROM public.knowledge_chunks kc
  JOIN public.brain_files bf ON kc.brain_file_id = bf.id
  WHERE kc.embedding IS NOT NULL
    AND (1 - (kc.embedding <=> query_embedding)) > match_threshold
    AND (
      -- User's own knowledge
      kc.user_id = user_id_param
      -- Or farm knowledge if farm_id is provided
      OR (
        bf.visibility = 'farm'
        AND bf.farm_id = farm_id_param
        AND farm_id_param IS NOT NULL
      )
      -- Or public knowledge
      OR bf.visibility = 'public'
    )
    AND bf.is_deleted = FALSE
  ORDER BY (kc.embedding <=> query_embedding) ASC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create function to log a query and get knowledge matches
CREATE OR REPLACE FUNCTION public.log_query_and_get_knowledge(
  query_text TEXT,
  user_id_param UUID,
  farm_id_param UUID DEFAULT NULL,
  agent_id_param UUID DEFAULT NULL,
  query_type_param TEXT DEFAULT 'general',
  context_param JSONB DEFAULT '{}'::JSONB,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE(
  query_id UUID,
  knowledge_chunks JSONB
) AS $$
DECLARE
  query_embedding vector(1536);
  new_query_id UUID;
  results JSONB;
BEGIN
  -- In a real implementation, we'd call an external service to generate the embedding
  -- For this demo, we'll simulate the embedding generation
  query_embedding := public.generate_mock_embedding(); -- This function would be implemented elsewhere
  
  -- Log the query
  INSERT INTO public.knowledge_queries (
    user_id,
    farm_id,
    agent_id,
    query,
    embedding,
    query_type,
    context
  ) VALUES (
    user_id_param,
    farm_id_param,
    agent_id_param,
    query_text,
    query_embedding,
    query_type_param,
    context_param
  ) RETURNING id INTO new_query_id;
  
  -- Get knowledge chunks
  SELECT json_agg(result)
  FROM (
    SELECT 
      id,
      brain_file_id,
      content,
      metadata,
      similarity,
      brain_file_name,
      brain_file_title
    FROM public.search_knowledge_by_vector(
      query_embedding,
      match_threshold,
      match_count,
      user_id_param,
      farm_id_param
    )
  ) result INTO results;
  
  -- Return the query ID and knowledge chunks
  RETURN QUERY
  SELECT 
    new_query_id,
    COALESCE(results, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create agent knowledge preferences table
CREATE TABLE IF NOT EXISTS public.agent_knowledge_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  brain_file_id UUID REFERENCES public.brain_files(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 5,
  use_all_farm_knowledge BOOLEAN NOT NULL DEFAULT FALSE,
  use_public_knowledge BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, brain_file_id)
);

-- Add RLS policies
ALTER TABLE public.agent_knowledge_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their agent knowledge preferences
CREATE POLICY "Users can view their agent knowledge preferences" ON public.agent_knowledge_preferences
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Create policy for users to insert their agent knowledge preferences
CREATE POLICY "Users can insert their agent knowledge preferences" ON public.agent_knowledge_preferences
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Create policy for users to update their agent knowledge preferences
CREATE POLICY "Users can update their agent knowledge preferences" ON public.agent_knowledge_preferences
  FOR UPDATE
  USING (
    auth.uid() = user_id
  );

-- Create policy for users to delete their agent knowledge preferences
CREATE POLICY "Users can delete their agent knowledge preferences" ON public.agent_knowledge_preferences
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS agent_knowledge_preferences_updated_at ON public.agent_knowledge_preferences;
CREATE TRIGGER agent_knowledge_preferences_updated_at
  BEFORE UPDATE ON public.agent_knowledge_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to get agent knowledge context
CREATE OR REPLACE FUNCTION public.get_agent_knowledge_context(
  agent_id_param UUID
)
RETURNS TABLE(
  brain_file_id UUID,
  file_name TEXT,
  title TEXT,
  classification public.brain_file_classification,
  top_chunks JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH agent_prefs AS (
    SELECT 
      akp.brain_file_id,
      akp.priority,
      akp.use_all_farm_knowledge,
      akp.use_public_knowledge,
      a.farm_id
    FROM public.agent_knowledge_preferences akp
    JOIN public.agents a ON akp.agent_id = a.id
    WHERE akp.agent_id = agent_id_param
      AND akp.enabled = TRUE
  ),
  farm_files AS (
    SELECT bf.id
    FROM public.brain_files bf
    JOIN agent_prefs ap ON bf.farm_id = ap.farm_id
    WHERE ap.use_all_farm_knowledge = TRUE
      AND bf.visibility = 'farm'
      AND bf.is_deleted = FALSE
  ),
  public_files AS (
    SELECT bf.id
    FROM public.brain_files bf
    JOIN agent_prefs ap ON ap.use_public_knowledge = TRUE
    WHERE bf.visibility = 'public'
      AND bf.is_deleted = FALSE
    LIMIT 50 -- Reasonable limit for public knowledge
  ),
  relevant_files AS (
    -- Explicitly preferred files
    SELECT ap.brain_file_id as id, ap.priority
    FROM agent_prefs ap
    WHERE ap.brain_file_id IS NOT NULL
    
    UNION
    
    -- Farm files if enabled
    SELECT ff.id, 3 as priority -- Default lower priority for farm files
    FROM farm_files ff
    
    UNION
    
    -- Public files if enabled
    SELECT pf.id, 1 as priority -- Lowest priority for public files
    FROM public_files pf
  )
  SELECT 
    bf.id as brain_file_id,
    bf.file_name,
    bf.title,
    bf.classification,
    (
      SELECT json_agg(chunk)
      FROM (
        SELECT 
          kc.id,
          kc.content,
          kc.chunk_index
        FROM public.knowledge_chunks kc
        WHERE kc.brain_file_id = bf.id
        ORDER BY kc.chunk_index
        LIMIT 5 -- Just get top chunks per file
      ) chunk
    ) as top_chunks
  FROM public.brain_files bf
  JOIN relevant_files rf ON bf.id = rf.id
  WHERE bf.is_deleted = FALSE
  ORDER BY rf.priority DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function for mock embedding generation (for demo purposes)
CREATE OR REPLACE FUNCTION public.generate_mock_embedding()
RETURNS vector(1536) AS $$
DECLARE
  mock_embedding vector(1536);
  i INTEGER;
BEGIN
  -- Initialize empty array
  mock_embedding := '{0}';
  
  -- Fill with random values
  FOR i IN 1..1536 LOOP
    mock_embedding[i] := random();
  END LOOP;
  
  -- Normalize the vector
  mock_embedding := mock_embedding / sqrt(mock_embedding <*> mock_embedding);
  
  RETURN mock_embedding;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
