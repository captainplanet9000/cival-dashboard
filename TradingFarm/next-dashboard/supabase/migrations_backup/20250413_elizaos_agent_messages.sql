-- Create ElizaOS Agent Messages table
CREATE TABLE IF NOT EXISTS public.elizaos_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create triggers for timestamp management
-- Set created_at trigger
CREATE TRIGGER set_elizaos_agent_messages_created_at
BEFORE INSERT ON public.elizaos_agent_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

-- Set updated_at trigger
CREATE TRIGGER set_elizaos_agent_messages_updated_at
BEFORE UPDATE ON public.elizaos_agent_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.elizaos_agent_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view messages for agents they created
CREATE POLICY "Users can view their agents' messages" ON public.elizaos_agent_messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT created_by FROM public.elizaos_agents WHERE id = agent_id
    )
  );

-- Users can insert messages for agents they created
CREATE POLICY "Users can insert messages for their agents" ON public.elizaos_agent_messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM public.elizaos_agents WHERE id = agent_id
    )
  );

-- Users can update messages for agents they created
CREATE POLICY "Users can update messages for their agents" ON public.elizaos_agent_messages
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT created_by FROM public.elizaos_agents WHERE id = agent_id
    )
  );

-- Users can delete messages for agents they created
CREATE POLICY "Users can delete messages for their agents" ON public.elizaos_agent_messages
  FOR DELETE USING (
    auth.uid() IN (
      SELECT created_by FROM public.elizaos_agents WHERE id = agent_id
    )
  );

-- Create index on agent_id for faster lookups
CREATE INDEX IF NOT EXISTS elizaos_agent_messages_agent_id_idx ON public.elizaos_agent_messages(agent_id);

-- Create index on created_at for time-based searches and ordering
CREATE INDEX IF NOT EXISTS elizaos_agent_messages_created_at_idx ON public.elizaos_agent_messages(created_at);
