-- Create ElizaOS integration tables for agents
-- This migration adds tables for agent instructions, command history, messages, and knowledge base

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agent instructions table - stores the instructions given to ElizaOS agents
CREATE TABLE IF NOT EXISTS public.agent_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  instructions TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_agent
    FOREIGN KEY (agent_id)
    REFERENCES public.agents(id)
    ON DELETE CASCADE
);

-- Add timestamp triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.agent_instructions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create index on agent_id
CREATE INDEX IF NOT EXISTS idx_agent_instructions_agent_id ON public.agent_instructions(agent_id);

-- Agent command history - stores the history of commands sent to ElizaOS and their responses
CREATE TABLE IF NOT EXISTS public.agent_command_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  command TEXT NOT NULL,
  response TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('strategy', 'market', 'risk', 'system')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_agent
    FOREIGN KEY (agent_id)
    REFERENCES public.agents(id)
    ON DELETE CASCADE
);

-- Create index on agent_id
CREATE INDEX IF NOT EXISTS idx_agent_command_history_agent_id ON public.agent_command_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_command_history_type ON public.agent_command_history(type);

-- Agent messages - stores messages sent by the agent to the user
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'alert', 'error', 'success')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_agent
    FOREIGN KEY (agent_id)
    REFERENCES public.agents(id)
    ON DELETE CASCADE
);

-- Create index on agent_id and read status
CREATE INDEX IF NOT EXISTS idx_agent_messages_agent_id ON public.agent_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_read ON public.agent_messages(read);
CREATE INDEX IF NOT EXISTS idx_agent_messages_type ON public.agent_messages(type);

-- Agent knowledge - stores knowledge entries for use by ElizaOS
CREATE TABLE IF NOT EXISTS public.agent_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_agent
    FOREIGN KEY (agent_id)
    REFERENCES public.agents(id)
    ON DELETE CASCADE
);

-- Add timestamp triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.agent_knowledge
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create index on agent_id and topic
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_id ON public.agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_topic ON public.agent_knowledge(topic);

-- Add RLS policies
ALTER TABLE public.agent_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_command_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge ENABLE ROW LEVEL SECURITY;

-- Create policy that users can only access their own agent data
-- First, create policies for agent_instructions
CREATE POLICY agent_instructions_select_policy
  ON public.agent_instructions
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_instructions_insert_policy
  ON public.agent_instructions
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_instructions_update_policy
  ON public.agent_instructions
  FOR UPDATE
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_instructions_delete_policy
  ON public.agent_instructions
  FOR DELETE
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

-- Create policies for agent_command_history
CREATE POLICY agent_command_history_select_policy
  ON public.agent_command_history
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_command_history_insert_policy
  ON public.agent_command_history
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

-- Create policies for agent_messages
CREATE POLICY agent_messages_select_policy
  ON public.agent_messages
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_messages_insert_policy
  ON public.agent_messages
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_messages_update_policy
  ON public.agent_messages
  FOR UPDATE
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

-- Create policies for agent_knowledge
CREATE POLICY agent_knowledge_select_policy
  ON public.agent_knowledge
  FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_knowledge_insert_policy
  ON public.agent_knowledge
  FOR INSERT
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_knowledge_update_policy
  ON public.agent_knowledge
  FOR UPDATE
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY agent_knowledge_delete_policy
  ON public.agent_knowledge
  FOR DELETE
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
  );
