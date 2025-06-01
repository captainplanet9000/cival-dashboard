-- Migration: Agent System Integration
-- Creates tables and functions for complete agent system integration, memory management,
-- collaboration, and task scheduling

-- Create enum for agent task status
CREATE TYPE public.agent_task_status AS ENUM (
  'pending', 'in_progress', 'completed', 'failed', 'canceled'
);

-- Create enum for agent collaboration types
CREATE TYPE public.agent_collaboration_type AS ENUM (
  'delegate', 'request_info', 'notify', 'consensus_vote', 'advisory', 'direct_command'
);

-- Table for agent memory storage
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  memory_type VARCHAR(50) NOT NULL, -- working, episodic, semantic, procedural
  importance INTEGER NOT NULL DEFAULT 5, -- 1-10 scale
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- For semantic search capability
  metadata JSONB DEFAULT '{}'::JSONB,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL means doesn't expire
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS agent_memories_embedding_idx ON public.agent_memories USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_agent_memories
BEFORE UPDATE ON public.agent_memories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own agent memories"
ON public.agent_memories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent memories"
ON public.agent_memories
FOR ALL
USING (auth.uid() = user_id);

-- Table for agent tasks
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  assigned_by_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL, -- analysis, execution, monitoring, etc.
  priority INTEGER NOT NULL DEFAULT 5, -- 1-10 scale
  status agent_task_status NOT NULL DEFAULT 'pending',
  due_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  parameters JSONB DEFAULT '{}'::JSONB,
  result JSONB,
  parent_task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_agent_tasks
BEFORE UPDATE ON public.agent_tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own agent tasks"
ON public.agent_tasks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent tasks"
ON public.agent_tasks
FOR ALL
USING (auth.uid() = user_id);

-- Table for agent collaborations
CREATE TABLE IF NOT EXISTS public.agent_collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  initiator_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  target_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  collaboration_type agent_collaboration_type NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}'::JSONB,
  response TEXT,
  response_at TIMESTAMP WITH TIME ZONE,
  task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Prevent self-collaboration
  CONSTRAINT no_self_collaboration CHECK (initiator_agent_id != target_agent_id)
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_agent_collaborations
BEFORE UPDATE ON public.agent_collaborations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.agent_collaborations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own agent collaborations"
ON public.agent_collaborations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent collaborations"
ON public.agent_collaborations
FOR ALL
USING (auth.uid() = user_id);

-- Table for knowledge base entries used by agents
CREATE TABLE IF NOT EXISTS public.agent_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- strategy, market, asset, risk, etc.
  tags TEXT[] DEFAULT '{}'::TEXT[],
  embedding VECTOR(1536), -- For semantic search capability
  source VARCHAR(255),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS agent_knowledge_base_embedding_idx ON public.agent_knowledge_base USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_agent_knowledge_base
BEFORE UPDATE ON public.agent_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.agent_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own agent knowledge base"
ON public.agent_knowledge_base
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent knowledge base"
ON public.agent_knowledge_base
FOR ALL
USING (auth.uid() = user_id);

-- Table for agent performance metrics
CREATE TABLE IF NOT EXISTS public.agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- trading_accuracy, task_completion, response_time, etc.
  time_period VARCHAR(20) NOT NULL, -- daily, weekly, monthly, etc.
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_agent_performance_metrics
BEFORE UPDATE ON public.agent_performance_metrics
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.agent_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own agent performance metrics"
ON public.agent_performance_metrics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own agent performance metrics"
ON public.agent_performance_metrics
FOR ALL
USING (auth.uid() = user_id);

-- Functions for agent memory management

-- Function to create an agent memory
CREATE OR REPLACE FUNCTION public.create_agent_memory(
  p_agent_id UUID,
  p_memory_type VARCHAR(50),
  p_content TEXT,
  p_importance INTEGER DEFAULT 5,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memory_id UUID;
  v_user_id UUID;
  v_embedding VECTOR(1536);
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Ensure the agent belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.agents a
    JOIN public.farms f ON a.farm_id = f.id
    WHERE a.id = p_agent_id AND f.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Agent not found or does not belong to user';
  END IF;
  
  -- Generate embedding using external function (to be implemented in application code)
  -- This is a placeholder - in real implementation, you'd compute this with an AI service
  -- v_embedding := generate_embedding(p_content);
  
  -- Insert the memory
  INSERT INTO public.agent_memories (
    agent_id,
    memory_type,
    importance,
    content,
    embedding,
    metadata,
    expires_at,
    user_id
  ) VALUES (
    p_agent_id,
    p_memory_type,
    p_importance,
    p_content,
    v_embedding,
    p_metadata,
    p_expires_at,
    v_user_id
  )
  RETURNING id INTO v_memory_id;
  
  RETURN v_memory_id;
END;
$$;

-- Function to retrieve agent memories by semantic search
CREATE OR REPLACE FUNCTION public.search_agent_memories(
  p_agent_id UUID,
  p_query TEXT,
  p_memory_type VARCHAR(50) DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  memory_type VARCHAR(50),
  importance INTEGER,
  content TEXT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_query_embedding VECTOR(1536);
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Ensure the agent belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.agents a
    JOIN public.farms f ON a.farm_id = f.id
    WHERE a.id = p_agent_id AND f.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Agent not found or does not belong to user';
  END IF;
  
  -- Generate embedding for the query (placeholder)
  -- This is a placeholder - in real implementation, you'd compute this with an AI service
  -- v_query_embedding := generate_embedding(p_query);
  
  -- If we don't have embedding capabilities yet, return based on text match
  IF v_query_embedding IS NULL THEN
    RETURN QUERY
    SELECT 
      m.id,
      m.memory_type,
      m.importance,
      m.content,
      0::FLOAT AS similarity,
      m.metadata,
      m.created_at
    FROM public.agent_memories m
    WHERE m.agent_id = p_agent_id
    AND (p_memory_type IS NULL OR m.memory_type = p_memory_type)
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
    AND (m.content ILIKE '%' || p_query || '%')
    ORDER BY m.importance DESC, m.created_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;
  
  -- Return memories based on vector similarity
  RETURN QUERY
  SELECT 
    m.id,
    m.memory_type,
    m.importance,
    m.content,
    1 - (m.embedding <=> v_query_embedding) AS similarity,
    m.metadata,
    m.created_at
  FROM public.agent_memories m
  WHERE m.agent_id = p_agent_id
  AND (p_memory_type IS NULL OR m.memory_type = p_memory_type)
  AND (m.expires_at IS NULL OR m.expires_at > NOW())
  AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> v_query_embedding, m.importance DESC
  LIMIT p_limit;
END;
$$;

-- Functions for agent tasks

-- Function to create a task for an agent
CREATE OR REPLACE FUNCTION public.create_agent_task(
  p_farm_id UUID,
  p_agent_id UUID,
  p_title VARCHAR(255),
  p_description TEXT,
  p_task_type VARCHAR(50),
  p_priority INTEGER DEFAULT 5,
  p_due_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_parameters JSONB DEFAULT '{}'::JSONB,
  p_parent_task_id UUID DEFAULT NULL,
  p_assigned_by_agent_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Ensure the farm belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.farms
    WHERE id = p_farm_id AND owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Farm not found or does not belong to user';
  END IF;
  
  -- Ensure the agent belongs to the specified farm
  IF NOT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = p_agent_id AND farm_id = p_farm_id
  ) THEN
    RAISE EXCEPTION 'Agent not found or does not belong to this farm';
  END IF;
  
  -- If assigned by another agent, ensure that agent exists
  IF p_assigned_by_agent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = p_assigned_by_agent_id
  ) THEN
    RAISE EXCEPTION 'Assigning agent not found';
  END IF;
  
  -- If a parent task is specified, ensure it exists
  IF p_parent_task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.agent_tasks
    WHERE id = p_parent_task_id
  ) THEN
    RAISE EXCEPTION 'Parent task not found';
  END IF;
  
  -- Insert the task
  INSERT INTO public.agent_tasks (
    farm_id,
    agent_id,
    assigned_by_agent_id,
    title,
    description,
    task_type,
    priority,
    status,
    due_at,
    parameters,
    parent_task_id,
    user_id
  ) VALUES (
    p_farm_id,
    p_agent_id,
    p_assigned_by_agent_id,
    p_title,
    p_description,
    p_task_type,
    p_priority,
    'pending'::agent_task_status,
    p_due_at,
    p_parameters,
    p_parent_task_id,
    v_user_id
  )
  RETURNING id INTO v_task_id;
  
  RETURN v_task_id;
END;
$$;

-- Function to update task status
CREATE OR REPLACE FUNCTION public.update_agent_task_status(
  p_task_id UUID,
  p_status agent_task_status,
  p_result JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Update the task status
  UPDATE public.agent_tasks
  SET
    status = p_status,
    result = COALESCE(p_result, result),
    started_at = CASE 
                   WHEN p_status = 'in_progress' AND started_at IS NULL THEN NOW() 
                   ELSE started_at 
                 END,
    completed_at = CASE 
                     WHEN p_status IN ('completed', 'failed', 'canceled') THEN NOW() 
                     ELSE completed_at 
                   END,
    updated_at = NOW()
  WHERE
    id = p_task_id
    AND user_id = v_user_id;
  
  RETURN FOUND;
END;
$$;

-- Functions for agent collaboration

-- Function to initiate a collaboration between agents
CREATE OR REPLACE FUNCTION public.create_agent_collaboration(
  p_farm_id UUID,
  p_initiator_agent_id UUID,
  p_target_agent_id UUID,
  p_collaboration_type agent_collaboration_type,
  p_content TEXT,
  p_context JSONB DEFAULT '{}'::JSONB,
  p_task_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collaboration_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Ensure the farm belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.farms
    WHERE id = p_farm_id AND owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Farm not found or does not belong to user';
  END IF;
  
  -- Ensure the initiator agent belongs to the specified farm
  IF NOT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = p_initiator_agent_id AND farm_id = p_farm_id
  ) THEN
    RAISE EXCEPTION 'Initiator agent not found or does not belong to this farm';
  END IF;
  
  -- Ensure the target agent belongs to the specified farm
  IF NOT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = p_target_agent_id AND farm_id = p_farm_id
  ) THEN
    RAISE EXCEPTION 'Target agent not found or does not belong to this farm';
  END IF;
  
  -- Ensure the agents are not the same
  IF p_initiator_agent_id = p_target_agent_id THEN
    RAISE EXCEPTION 'Initiator agent and target agent cannot be the same';
  END IF;
  
  -- If a task is specified, ensure it exists
  IF p_task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.agent_tasks
    WHERE id = p_task_id
  ) THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Insert the collaboration
  INSERT INTO public.agent_collaborations (
    farm_id,
    initiator_agent_id,
    target_agent_id,
    collaboration_type,
    status,
    content,
    context,
    task_id,
    user_id
  ) VALUES (
    p_farm_id,
    p_initiator_agent_id,
    p_target_agent_id,
    p_collaboration_type,
    'pending',
    p_content,
    p_context,
    p_task_id,
    v_user_id
  )
  RETURNING id INTO v_collaboration_id;
  
  RETURN v_collaboration_id;
END;
$$;

-- Function to respond to a collaboration
CREATE OR REPLACE FUNCTION public.respond_to_collaboration(
  p_collaboration_id UUID,
  p_response TEXT,
  p_status VARCHAR(50) DEFAULT 'completed'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Update the collaboration
  UPDATE public.agent_collaborations
  SET
    response = p_response,
    response_at = NOW(),
    status = p_status,
    updated_at = NOW()
  WHERE
    id = p_collaboration_id
    AND user_id = v_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to add knowledge to the agent knowledge base
CREATE OR REPLACE FUNCTION public.add_agent_knowledge(
  p_farm_id UUID,
  p_title VARCHAR(255),
  p_content TEXT,
  p_content_type VARCHAR(50),
  p_tags TEXT[] DEFAULT '{}'::TEXT[],
  p_source VARCHAR(255) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_knowledge_id UUID;
  v_user_id UUID;
  v_embedding VECTOR(1536);
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Ensure the farm belongs to the user
  IF p_farm_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.farms
    WHERE id = p_farm_id AND owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Farm not found or does not belong to user';
  END IF;
  
  -- Generate embedding using external function (to be implemented in application code)
  -- This is a placeholder - in real implementation, you'd compute this with an AI service
  -- v_embedding := generate_embedding(p_content);
  
  -- Insert the knowledge
  INSERT INTO public.agent_knowledge_base (
    farm_id,
    title,
    content,
    content_type,
    tags,
    embedding,
    source,
    metadata,
    user_id
  ) VALUES (
    p_farm_id,
    p_title,
    p_content,
    p_content_type,
    p_tags,
    v_embedding,
    p_source,
    p_metadata,
    v_user_id
  )
  RETURNING id INTO v_knowledge_id;
  
  RETURN v_knowledge_id;
END;
$$;

-- Function to search the agent knowledge base
CREATE OR REPLACE FUNCTION public.search_agent_knowledge(
  p_query TEXT,
  p_farm_id UUID DEFAULT NULL,
  p_content_type VARCHAR(50) DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  content TEXT,
  content_type VARCHAR(50),
  similarity FLOAT,
  tags TEXT[],
  source VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_query_embedding VECTOR(1536);
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Generate embedding for the query (placeholder)
  -- This is a placeholder - in real implementation, you'd compute this with an AI service
  -- v_query_embedding := generate_embedding(p_query);
  
  -- If we don't have embedding capabilities yet, return based on text match
  IF v_query_embedding IS NULL THEN
    RETURN QUERY
    SELECT 
      k.id,
      k.title,
      k.content,
      k.content_type,
      0::FLOAT AS similarity,
      k.tags,
      k.source,
      k.metadata,
      k.created_at
    FROM public.agent_knowledge_base k
    WHERE (p_farm_id IS NULL OR k.farm_id = p_farm_id)
    AND (p_content_type IS NULL OR k.content_type = p_content_type)
    AND k.user_id = v_user_id
    AND (
      k.content ILIKE '%' || p_query || '%' OR
      k.title ILIKE '%' || p_query || '%' OR
      EXISTS (
        SELECT 1 FROM unnest(k.tags) tag
        WHERE tag ILIKE '%' || p_query || '%'
      )
    )
    ORDER BY k.created_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;
  
  -- Return knowledge based on vector similarity
  RETURN QUERY
  SELECT 
    k.id,
    k.title,
    k.content,
    k.content_type,
    1 - (k.embedding <=> v_query_embedding) AS similarity,
    k.tags,
    k.source,
    k.metadata,
    k.created_at
  FROM public.agent_knowledge_base k
  WHERE (p_farm_id IS NULL OR k.farm_id = p_farm_id)
  AND (p_content_type IS NULL OR k.content_type = p_content_type)
  AND k.user_id = v_user_id
  AND k.embedding IS NOT NULL
  ORDER BY k.embedding <=> v_query_embedding
  LIMIT p_limit;
END;
$$;

-- Function to record agent performance metric
CREATE OR REPLACE FUNCTION public.record_agent_performance(
  p_agent_id UUID,
  p_metric_type VARCHAR(50),
  p_time_period VARCHAR(20),
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_value NUMERIC,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Ensure the agent belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.agents a
    JOIN public.farms f ON a.farm_id = f.id
    WHERE a.id = p_agent_id AND f.owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Agent not found or does not belong to user';
  END IF;
  
  -- Insert the performance metric
  INSERT INTO public.agent_performance_metrics (
    agent_id,
    metric_type,
    time_period,
    start_time,
    end_time,
    value,
    metadata,
    user_id
  ) VALUES (
    p_agent_id,
    p_metric_type,
    p_time_period,
    p_start_time,
    p_end_time,
    p_value,
    p_metadata,
    v_user_id
  )
  RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$;
