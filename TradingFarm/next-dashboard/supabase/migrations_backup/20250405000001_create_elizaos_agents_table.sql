-- Create elizaos_agents table
CREATE TABLE IF NOT EXISTS public.elizaos_agents (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  farm_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  performance_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add reference to farms table
ALTER TABLE public.elizaos_agents
  ADD CONSTRAINT elizaos_agents_farm_id_fkey
  FOREIGN KEY (farm_id)
  REFERENCES public.farms(id)
  ON DELETE CASCADE;

-- Set up triggers for automatic timestamp updates
CREATE TRIGGER handle_elizaos_agents_created_at BEFORE INSERT ON public.elizaos_agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_elizaos_agents_updated_at BEFORE UPDATE ON public.elizaos_agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.elizaos_agents ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow read access for authenticated users
CREATE POLICY "Users can view all elizaos_agents"
  ON public.elizaos_agents FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow insert for authenticated users
CREATE POLICY "Users can insert elizaos_agents"
  ON public.elizaos_agents FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow update for authenticated users who own the farm
CREATE POLICY "Users can update their own farm's elizaos_agents"
  ON public.elizaos_agents FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT farms.user_id
      FROM public.farms
      WHERE farms.id = elizaos_agents.farm_id
    )
  );

-- Allow delete for authenticated users who own the farm
CREATE POLICY "Users can delete their own farm's elizaos_agents"
  ON public.elizaos_agents FOR DELETE
  USING (
    auth.uid() IN (
      SELECT farms.user_id
      FROM public.farms
      WHERE farms.id = elizaos_agents.farm_id
    )
  );

-- Create index for faster lookups
CREATE INDEX elizaos_agents_farm_id_idx ON public.elizaos_agents(farm_id);
