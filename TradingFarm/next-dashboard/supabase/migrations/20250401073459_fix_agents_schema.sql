-- Fix agents table schema
-- This migration ensures the agents table has the correct schema with the configuration column

-- Check if configuration column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'configuration'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN configuration JSONB DEFAULT '{}'::jsonb NOT NULL;
    END IF;
END
$$;

-- Make sure we have the right types for all columns
ALTER TABLE public.agents 
  ALTER COLUMN name TYPE VARCHAR,
  ALTER COLUMN status TYPE VARCHAR,
  ALTER COLUMN type TYPE VARCHAR,
  ALTER COLUMN configuration TYPE JSONB USING configuration::jsonb;

-- Ensure we have created_at and updated_at columns with the proper triggers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;
    END IF;
END
$$;

-- Add updated_at trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'set_agents_updated_at'
    ) THEN
        CREATE TRIGGER set_agents_updated_at
        BEFORE UPDATE ON public.agents
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END
$$;

-- Ensure row level security is enabled
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'agents' 
        AND policyname = 'agents_select_policy'
    ) THEN
        CREATE POLICY agents_select_policy ON public.agents
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.farms
                    WHERE farms.id = agents.farm_id
                    AND farms.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'agents' 
        AND policyname = 'agents_insert_policy'
    ) THEN
        CREATE POLICY agents_insert_policy ON public.agents
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.farms
                    WHERE farms.id = agents.farm_id
                    AND farms.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'agents' 
        AND policyname = 'agents_update_policy'
    ) THEN
        CREATE POLICY agents_update_policy ON public.agents
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.farms
                    WHERE farms.id = agents.farm_id
                    AND farms.user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'agents' 
        AND policyname = 'agents_delete_policy'
    ) THEN
        CREATE POLICY agents_delete_policy ON public.agents
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.farms
                    WHERE farms.id = agents.farm_id
                    AND farms.user_id = auth.uid()
                )
            );
    END IF;
END
$$;