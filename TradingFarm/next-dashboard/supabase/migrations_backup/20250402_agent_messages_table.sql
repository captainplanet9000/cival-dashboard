-- Create agent_messages table for agent communication
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  recipient_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'broadcast', 'direct', 'command', 'status'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  parent_message_id UUID REFERENCES public.agent_messages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  requires_response BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create functions for agent message management
CREATE OR REPLACE FUNCTION insert_agent_message(message JSONB)
RETURNS JSONB
SECURITY INVOKER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Insert the message
  INSERT INTO public.agent_messages (
    id, 
    sender_id, 
    sender_name, 
    recipient_id, 
    content, 
    message_type, 
    priority, 
    timestamp, 
    read, 
    metadata, 
    parent_message_id, 
    status, 
    requires_response
  )
  VALUES (
    COALESCE(message->>'id', gen_random_uuid()::text)::uuid,
    (message->>'sender_id')::uuid,
    message->>'sender_name',
    NULLIF(message->>'recipient_id', '')::uuid,
    message->>'content',
    message->>'message_type',
    COALESCE(message->>'priority', 'medium'),
    COALESCE((message->>'timestamp')::timestamptz, now()),
    COALESCE((message->>'read')::boolean, false),
    COALESCE(message->'metadata', '{}'::jsonb),
    NULLIF(message->>'parent_message_id', '')::uuid,
    COALESCE(message->>'status', 'sent'),
    COALESCE((message->>'requires_response')::boolean, false)
  )
  RETURNING to_jsonb(*) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get messages for an agent
CREATE OR REPLACE FUNCTION get_agent_messages(
  p_agent_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_include_read BOOLEAN DEFAULT false
)
RETURNS SETOF public.agent_messages
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.agent_messages
  WHERE (recipient_id = p_agent_id OR recipient_id IS NULL OR sender_id = p_agent_id)
    AND (p_include_read OR NOT read)
  ORDER BY timestamp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to mark a message as read
CREATE OR REPLACE FUNCTION mark_message_read(p_message_id UUID)
RETURNS JSONB
SECURITY INVOKER
AS $$
DECLARE
  result JSONB;
BEGIN
  UPDATE public.agent_messages
  SET read = true
  WHERE id = p_message_id
  RETURNING to_jsonb(*) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Timestamps triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.agent_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on the agent_messages table
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can select their own agents' messages" ON public.agent_messages
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      JOIN public.farms f ON a.farm_id = f.id
      WHERE (a.id = agent_messages.sender_id OR a.id = agent_messages.recipient_id)
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages for their own agents" ON public.agent_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents a
      JOIN public.farms f ON a.farm_id = f.id
      WHERE a.id = agent_messages.sender_id
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update message read status" ON public.agent_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      JOIN public.farms f ON a.farm_id = f.id
      WHERE (a.id = agent_messages.sender_id OR a.id = agent_messages.recipient_id)
      AND f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents a
      JOIN public.farms f ON a.farm_id = f.id
      WHERE (a.id = agent_messages.sender_id OR a.id = agent_messages.recipient_id)
      AND f.user_id = auth.uid()
    )
  );
