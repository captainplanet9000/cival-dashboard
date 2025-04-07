-- Migration: Farm & Agent Integration for Trading Farm
-- Description: Set up core tables for farms and agents with ElizaOS configuration

-- Create or replace trigger functions for timestamps if they don't exist
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = NOW();
  NEW.updated_at = NOW();
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

-- Create farms table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create agents table with eliza_config
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'inactive',
  type TEXT NOT NULL DEFAULT 'standard',
  eliza_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  capabilities TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create triggers for automatic timestamps
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'farms_created_at_trigger') THEN
    CREATE TRIGGER farms_created_at_trigger
    BEFORE INSERT ON public.farms
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'farms_updated_at_trigger') THEN
    CREATE TRIGGER farms_updated_at_trigger
    BEFORE UPDATE ON public.farms
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'agents_created_at_trigger') THEN
    CREATE TRIGGER agents_created_at_trigger
    BEFORE INSERT ON public.agents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'agents_updated_at_trigger') THEN
    CREATE TRIGGER agents_updated_at_trigger
    BEFORE UPDATE ON public.agents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Farm RLS policies
CREATE POLICY "Users can view their own farms" 
ON public.farms FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own farms" 
ON public.farms FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own farms" 
ON public.farms FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own farms" 
ON public.farms FOR DELETE
USING (auth.uid() = owner_id);

-- Agent RLS policies
CREATE POLICY "Users can view agents in their farms" 
ON public.agents FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.farms
  WHERE farms.id = agents.farm_id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can insert agents in their farms" 
ON public.agents FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.farms
  WHERE farms.id = NEW.farm_id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can update agents in their farms" 
ON public.agents FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.farms
  WHERE farms.id = agents.farm_id AND farms.owner_id = auth.uid()
));

CREATE POLICY "Users can delete agents in their farms" 
ON public.agents FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.farms
  WHERE farms.id = agents.farm_id AND farms.owner_id = auth.uid()
)); 