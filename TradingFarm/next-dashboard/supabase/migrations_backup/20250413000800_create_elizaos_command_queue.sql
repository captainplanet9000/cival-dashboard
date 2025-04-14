-- Create command queue table
CREATE TABLE IF NOT EXISTS public.elizaos_command_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.elizaos_agents(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  result JSONB
);

-- Enable RLS
ALTER TABLE public.elizaos_command_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" 
ON public.elizaos_command_queue
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.elizaos_command_queue
FOR INSERT
TO authenticated
WITH CHECK (true);
