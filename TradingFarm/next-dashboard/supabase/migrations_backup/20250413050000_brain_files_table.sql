-- Create Brain Files Table and Associated Functions
-- This table tracks the metadata of files uploaded to the farm_brain_assets bucket
-- and enables categorization, tagging, and integration with ElizaOS

-- Create brain file visibility type
CREATE TYPE public.brain_file_visibility AS ENUM (
  'private',
  'farm',
  'public'
);

-- Create brain file classification type
CREATE TYPE public.brain_file_classification AS ENUM (
  'strategy',
  'indicator',
  'learning',
  'documentation',
  'market_analysis',
  'research',
  'data_feed',
  'other'
);

-- Create brain_files table
CREATE TABLE IF NOT EXISTS public.brain_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  classification public.brain_file_classification NOT NULL DEFAULT 'documentation',
  visibility public.brain_file_visibility NOT NULL DEFAULT 'private',
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  embedding vector(1536),
  has_embedding BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::JSONB,
  auto_process BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(storage_path)
);

-- Add RLS policies
ALTER TABLE public.brain_files ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing brain files
CREATE POLICY "Users can view their own files" ON public.brain_files
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    (visibility = 'farm' AND farm_id IN (
      SELECT farm_id FROM public.farm_members
      WHERE user_id = auth.uid()
    )) OR
    visibility = 'public'
  );

-- Create policy for inserting brain files
CREATE POLICY "Users can insert their own files" ON public.brain_files
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Create policy for updating brain files
CREATE POLICY "Users can update their own files" ON public.brain_files
  FOR UPDATE
  USING (
    auth.uid() = user_id
  );

-- Create policy for deleting brain files (soft delete)
CREATE POLICY "Users can delete their own files" ON public.brain_files
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    is_deleted = TRUE
  );

-- Create index for farm_id
CREATE INDEX IF NOT EXISTS brain_files_farm_id_idx
  ON public.brain_files (farm_id);

-- Create index on visibility
CREATE INDEX IF NOT EXISTS brain_files_visibility_idx
  ON public.brain_files (visibility);

-- Create index on classification
CREATE INDEX IF NOT EXISTS brain_files_classification_idx
  ON public.brain_files (classification);

-- Create index on tags using GIN for array search
CREATE INDEX IF NOT EXISTS brain_files_tags_idx
  ON public.brain_files USING GIN (tags);

-- Create function to handle created_at
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS brain_files_updated_at ON public.brain_files;
CREATE TRIGGER brain_files_updated_at
  BEFORE UPDATE ON public.brain_files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to search brain files by text
CREATE OR REPLACE FUNCTION public.search_brain_files(
  search_term TEXT,
  user_id_param UUID,
  farm_id_param UUID DEFAULT NULL,
  classification_param public.brain_file_classification DEFAULT NULL,
  limit_param INTEGER DEFAULT 50
)
RETURNS SETOF public.brain_files AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.brain_files
  WHERE (
    -- Match against title, description, or file_name
    to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || file_name) @@ plainto_tsquery('english', search_term)
    -- Match against tags array
    OR search_term = ANY(tags)
  )
  AND is_deleted = FALSE
  AND (
    -- Filter by user_id
    brain_files.user_id = user_id_param
    -- Or by farm visibility if farm_id is provided
    OR (
      visibility = 'farm' 
      AND farm_id = farm_id_param
      AND farm_id_param IS NOT NULL
    )
    -- Or public files
    OR visibility = 'public'
  )
  -- Filter by classification if provided
  AND (classification_param IS NULL OR classification = classification_param)
  -- Order by relevance and recency
  ORDER BY 
    ts_rank(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || file_name), plainto_tsquery('english', search_term)) DESC,
    created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to get related brain files by embedding similarity
CREATE OR REPLACE FUNCTION public.get_related_brain_files(
  file_id_param UUID,
  similarity_threshold FLOAT DEFAULT 0.7,
  limit_param INTEGER DEFAULT 5
)
RETURNS SETOF public.brain_files AS $$
DECLARE
  file_embedding vector(1536);
BEGIN
  -- Get embedding of the reference file
  SELECT embedding INTO file_embedding
  FROM public.brain_files
  WHERE id = file_id_param AND has_embedding = TRUE;
  
  -- Return if no embedding found
  IF file_embedding IS NULL THEN
    RETURN;
  END IF;
  
  -- Query similar files by embedding
  RETURN QUERY
  SELECT *
  FROM public.brain_files
  WHERE id != file_id_param
    AND has_embedding = TRUE
    AND is_deleted = FALSE
    AND (embedding <=> file_embedding) < (1 - similarity_threshold)
  ORDER BY (embedding <=> file_embedding) ASC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create brain file processing queue
CREATE TABLE IF NOT EXISTS public.brain_file_processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brain_file_id UUID NOT NULL REFERENCES public.brain_files(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  process_type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.brain_file_processing_queue ENABLE ROW LEVEL SECURITY;

-- Create policy for system services
CREATE POLICY "System services can access processing queue" ON public.brain_file_processing_queue
  FOR ALL
  USING (
    auth.role() = 'service_role'
  );

-- Create policy for users to view their own queued files
CREATE POLICY "Users can view their own queued files" ON public.brain_file_processing_queue
  FOR SELECT
  USING (
    brain_file_id IN (
      SELECT id FROM public.brain_files
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS brain_file_processing_queue_updated_at ON public.brain_file_processing_queue;
CREATE TRIGGER brain_file_processing_queue_updated_at
  BEFORE UPDATE ON public.brain_file_processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add trigger to automatically create processing tasks for new brain files
CREATE OR REPLACE FUNCTION public.add_brain_file_to_processing_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.auto_process THEN
    -- Add embedding generation task
    INSERT INTO public.brain_file_processing_queue
      (brain_file_id, process_type, priority)
    VALUES
      (NEW.id, 'generate_embedding', 10);
      
    -- Add content extraction task
    INSERT INTO public.brain_file_processing_queue
      (brain_file_id, process_type, priority)
    VALUES
      (NEW.id, 'extract_content', 5);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create trigger for adding files to processing queue
DROP TRIGGER IF EXISTS brain_files_add_to_processing_queue ON public.brain_files;
CREATE TRIGGER brain_files_add_to_processing_queue
  AFTER INSERT ON public.brain_files
  FOR EACH ROW
  EXECUTE FUNCTION public.add_brain_file_to_processing_queue();
