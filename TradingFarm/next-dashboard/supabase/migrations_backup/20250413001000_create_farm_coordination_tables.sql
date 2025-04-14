-- Create Farm Coordination Tables for ElizaOS Integration
-- This migration adds tables necessary for multi-agent coordination within farms

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "vector" SCHEMA "extensions";

-- Create farms table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.farms (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  settings JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Create agent_farm_assignments table to link agents to farms
CREATE TABLE IF NOT EXISTS public.agent_farm_assignments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (agent_id, farm_id)
);

-- Create farm_objectives table for goal tracking
CREATE TABLE IF NOT EXISTS public.farm_objectives (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create agent_coordination table for communications between agents
CREATE TABLE IF NOT EXISTS public.agent_coordination (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  initiator_agent_id BIGINT NOT NULL REFERENCES public.agents(id),
  receiver_agent_id BIGINT REFERENCES public.agents(id),
  message_type TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create orchestration_dashboard table for visualization controls
CREATE TABLE IF NOT EXISTS public.orchestration_dashboard (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  layout JSONB DEFAULT '{}'::jsonb,
  metrics_config JSONB DEFAULT '{}'::jsonb,
  visualization_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (farm_id)
);

-- Create farm_performance table for tracking performance metrics
CREATE TABLE IF NOT EXISTS public.farm_performance (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  farm_id BIGINT NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add trigger functions for timestamp management
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers for all tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('farms', 'agent_farm_assignments', 'farm_objectives', 'agent_coordination', 'orchestration_dashboard')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.%I
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
    ', t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_farm_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_coordination ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestration_dashboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Farms: users can see their own farms
CREATE POLICY "Users can view their own farms" ON public.farms
  FOR SELECT USING (auth.uid() = owner_id);

-- Farms: users can insert their own farms
CREATE POLICY "Users can insert their own farms" ON public.farms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Farms: users can update their own farms
CREATE POLICY "Users can update their own farms" ON public.farms
  FOR UPDATE USING (auth.uid() = owner_id);

-- Agent Farm Assignments: users can see assignments for their farms
CREATE POLICY "Users can view assignments for their farms" ON public.agent_farm_assignments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT owner_id FROM public.farms WHERE id = farm_id
    )
  );

-- Farm Objectives: users can see objectives for their farms
CREATE POLICY "Users can view objectives for their farms" ON public.farm_objectives
  FOR SELECT USING (
    auth.uid() IN (
      SELECT owner_id FROM public.farms WHERE id = farm_id
    )
  );

-- Farm Objectives: users can insert objectives for their farms
CREATE POLICY "Users can insert objectives for their farms" ON public.farm_objectives
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT owner_id FROM public.farms WHERE id = farm_id
    )
  );

-- Farm Objectives: users can update objectives for their farms
CREATE POLICY "Users can update objectives for their farms" ON public.farm_objectives
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT owner_id FROM public.farms WHERE id = farm_id
    )
  );

-- Agent Coordination: users can see coordination for their farms
CREATE POLICY "Users can view coordination for their farms" ON public.agent_coordination
  FOR SELECT USING (
    auth.uid() IN (
      SELECT owner_id FROM public.farms WHERE id = farm_id
    )
  );

-- Orchestration Dashboard: users can see dashboard for their farms
CREATE POLICY "Users can view dashboard for their farms" ON public.orchestration_dashboard
  FOR SELECT USING (
    auth.uid() IN (
      SELECT owner_id FROM public.farms WHERE id = farm_id
    )
  );

-- Farm Performance: users can see performance for their farms
CREATE POLICY "Users can view performance for their farms" ON public.farm_performance
  FOR SELECT USING (
    auth.uid() IN (
      SELECT owner_id FROM public.farms WHERE id = farm_id
    )
  );
