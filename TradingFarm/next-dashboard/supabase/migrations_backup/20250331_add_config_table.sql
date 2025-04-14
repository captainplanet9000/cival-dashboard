-- Create necessary functions for automatically setting created_at and updated_at
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the config table
CREATE TABLE IF NOT EXISTS public.config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add timestamps triggers
CREATE TRIGGER set_config_created_at
BEFORE INSERT ON public.config
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_config_updated_at
BEFORE UPDATE ON public.config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to everyone" ON public.config
FOR SELECT USING (true);

CREATE POLICY "Allow insert to authenticated users" ON public.config
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update to authenticated users" ON public.config
FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- Insert default socket.io config
INSERT INTO public.config (key, value, category, description)
VALUES 
('socket_io_url', '"http://localhost:3002"', 'connectivity', 'URL for the Socket.io server'),
('api_base_url', '"http://localhost:3001/api"', 'connectivity', 'Base URL for API endpoints');

-- Create farms table if not exists (needed for many relations)
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add timestamps triggers
CREATE TRIGGER set_farms_created_at
BEFORE INSERT ON public.farms
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_farms_updated_at
BEFORE UPDATE ON public.farms
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to own farms" ON public.farms
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow insert to authenticated users" ON public.farms
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update to farm owners" ON public.farms
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create elizaos_interactions table for Command Console
CREATE TABLE IF NOT EXISTS public.elizaos_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id),
  command TEXT NOT NULL,
  response TEXT NOT NULL,
  category TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add timestamps triggers
CREATE TRIGGER set_elizaos_interactions_created_at
BEFORE INSERT ON public.elizaos_interactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_elizaos_interactions_updated_at
BEFORE UPDATE ON public.elizaos_interactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.elizaos_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to farm owners" ON public.elizaos_interactions
FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.farms WHERE id = farm_id));

CREATE POLICY "Allow insert to farm owners" ON public.elizaos_interactions
FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT user_id FROM public.farms WHERE id = farm_id));

-- Insert a test farm for development
INSERT INTO public.farms (name, description, user_id)
VALUES ('Test Farm', 'A farm for testing purposes', '00000000-0000-0000-0000-000000000000');
