-- Create ElizaOS Agents table
CREATE TABLE IF NOT EXISTS public.elizaos_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'initializing',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance JSONB DEFAULT '{}'::jsonb,
  commands_processed INTEGER DEFAULT 0,
  knowledge_base JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create a function to handle the created_at column
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to handle the updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to set created_at on insert
CREATE TRIGGER set_elizaos_agents_created_at
BEFORE INSERT ON public.elizaos_agents
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

-- Create a trigger to set updated_at on update
CREATE TRIGGER set_elizaos_agents_updated_at
BEFORE UPDATE ON public.elizaos_agents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.elizaos_agents ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can see all agents
CREATE POLICY "Users can view all agents" ON public.elizaos_agents
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only create agents for themselves
CREATE POLICY "Users can create their own agents" ON public.elizaos_agents
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can only update their own agents
CREATE POLICY "Users can update their own agents" ON public.elizaos_agents
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can only delete their own agents
CREATE POLICY "Users can delete their own agents" ON public.elizaos_agents
  FOR DELETE USING (auth.uid() = created_by);
