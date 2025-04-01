-- Create eliza_conversations table
CREATE TABLE IF NOT EXISTS public.eliza_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  context TEXT,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create eliza_messages table
CREATE TABLE IF NOT EXISTS public.eliza_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.eliza_conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create knowledge_base table
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source_url TEXT,
  document TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at triggers
CREATE TRIGGER update_eliza_conversations_updated_at
  BEFORE UPDATE ON public.eliza_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_eliza_conversations_user_id ON public.eliza_conversations(user_id);
CREATE INDEX idx_eliza_messages_conversation_id ON public.eliza_messages(conversation_id);
CREATE INDEX idx_knowledge_base_category ON public.knowledge_base(category);
CREATE INDEX idx_knowledge_base_document ON public.knowledge_base USING GIN(document);
CREATE INDEX idx_knowledge_base_tags ON public.knowledge_base USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE public.eliza_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eliza_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for eliza_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.eliza_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own conversations"
  ON public.eliza_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversations"
  ON public.eliza_conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
  ON public.eliza_conversations FOR DELETE
  USING (user_id = auth.uid());

-- Create RLS policies for eliza_messages
CREATE POLICY "Users can view messages from their conversations"
  ON public.eliza_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.eliza_conversations
    WHERE eliza_conversations.id = eliza_messages.conversation_id
    AND eliza_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in their conversations"
  ON public.eliza_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.eliza_conversations
    WHERE eliza_conversations.id = eliza_messages.conversation_id
    AND eliza_conversations.user_id = auth.uid()
  ));

-- Create RLS policies for knowledge_base
CREATE POLICY "Anyone can view knowledge base"
  ON public.knowledge_base FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage knowledge base"
  ON public.knowledge_base FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.admin_users WHERE is_knowledge_editor = true
    )
  );

-- Create ElizaOS AI functions
CREATE OR REPLACE FUNCTION public.eliza_ai_response(
  conversation_id UUID,
  user_message TEXT,
  farm_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  response JSONB;
  conversation_context TEXT;
  prev_messages JSONB;
  farm_data JSONB;
BEGIN
  -- Get conversation context
  SELECT context INTO conversation_context
  FROM public.eliza_conversations
  WHERE id = conversation_id;
  
  -- Get previous messages (limited to last 10)
  SELECT json_agg(json_build_object(
    'role', role,
    'content', content
  ) ORDER BY created_at ASC)
  INTO prev_messages
  FROM (
    SELECT role, content, created_at
    FROM public.eliza_messages
    WHERE conversation_id = conversation_id
    ORDER BY created_at DESC
    LIMIT 10
  ) messages;
  
  -- If farm_id provided, get farm data for context
  IF farm_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', id,
      'name', name,
      'description', description,
      'goal', goal,
      'risk_level', risk_level,
      'performance_metrics', performance_metrics
    ) INTO farm_data
    FROM public.farms
    WHERE id = farm_id;
  END IF;
  
  -- In a real implementation, this would call an external AI service
  -- For demo purposes, return a simple response
  response := json_build_object(
    'content', 'This is a sample response from ElizaOS. In a real implementation, this would be generated by an AI model.',
    'metadata', json_build_object(
      'source', 'knowledge-base',
      'confidence', 0.92,
      'tokens_used', 256
    )
  );
  
  RETURN response;
END;
$$; 