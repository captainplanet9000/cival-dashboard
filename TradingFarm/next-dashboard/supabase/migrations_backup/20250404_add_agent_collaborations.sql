-- Create agent_collaborations table
CREATE TABLE IF NOT EXISTS public.agent_collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}'::JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at_agent_collaborations BEFORE UPDATE ON public.agent_collaborations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create agent_collaboration_members table
CREATE TABLE IF NOT EXISTS public.agent_collaboration_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaboration_id UUID NOT NULL REFERENCES public.agent_collaborations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'member', 'observer')),
  permissions JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (collaboration_id, agent_id)
);

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at_agent_collaboration_members BEFORE UPDATE ON public.agent_collaboration_members
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Add index for faster lookups
CREATE INDEX idx_agent_collab_members_collaboration_id ON public.agent_collaboration_members(collaboration_id);
CREATE INDEX idx_agent_collab_members_agent_id ON public.agent_collaboration_members(agent_id);

-- Enable RLS for both tables
ALTER TABLE public.agent_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_collaboration_members ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for agent_collaborations
CREATE POLICY "Users can view their own collaborations" 
  ON public.agent_collaborations 
  FOR SELECT 
  USING (
    auth.uid() = user_id
    OR 
    farm_id IN (
      SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create collaborations" 
  ON public.agent_collaborations 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    OR 
    farm_id IN (
      SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own collaborations" 
  ON public.agent_collaborations 
  FOR UPDATE 
  USING (
    auth.uid() = user_id
    OR 
    farm_id IN (
      SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete their own collaborations" 
  ON public.agent_collaborations 
  FOR DELETE 
  USING (
    auth.uid() = user_id
    OR 
    farm_id IN (
      SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Add RLS policies for agent_collaboration_members
CREATE POLICY "Users can view collaboration members of their farms" 
  ON public.agent_collaboration_members 
  FOR SELECT 
  USING (
    collaboration_id IN (
      SELECT id FROM public.agent_collaborations 
      WHERE user_id = auth.uid()
      OR 
      farm_id IN (
        SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage collaboration members of their farms" 
  ON public.agent_collaboration_members 
  FOR ALL 
  USING (
    collaboration_id IN (
      SELECT id FROM public.agent_collaborations 
      WHERE user_id = auth.uid()
      OR 
      farm_id IN (
        SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Add column to agent_communications for collaboration metadata
ALTER TABLE IF EXISTS public.agent_communications
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

-- Create indexes for agent communications to support collaboration queries
CREATE INDEX IF NOT EXISTS idx_agent_communications_metadata_collaboration 
ON public.agent_communications USING gin ((metadata -> 'collaboration_id'));
