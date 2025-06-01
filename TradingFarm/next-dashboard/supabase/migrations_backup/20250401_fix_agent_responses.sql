-- Migration: 20250401_fix_agent_responses
-- Description: Add missing columns to agent_responses table

-- Check if the context column exists, and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'agent_responses'
        AND column_name = 'context'
    ) THEN
        ALTER TABLE public.agent_responses
        ADD COLUMN context JSONB DEFAULT '{}'::jsonb NOT NULL;
    END IF;
END $$;

-- Check if the metadata column exists, and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'agent_responses'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.agent_responses
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Ensure we have the status column (in case it's missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'agent_responses'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.agent_responses
        ADD COLUMN status TEXT DEFAULT 'pending' NOT NULL;
    END IF;
END $$;

-- Add a created_at timestamp column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'agent_responses'
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.agent_responses
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
        
        -- Create a trigger for created_at if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'set_agent_responses_created_at'
        ) THEN
            CREATE TRIGGER set_agent_responses_created_at
            BEFORE INSERT ON public.agent_responses
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_created_at();
        END IF;
    END IF;
END $$;

-- Add an updated_at timestamp column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'agent_responses'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.agent_responses
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
        
        -- Create a trigger for updated_at if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'set_agent_responses_updated_at'
        ) THEN
            CREATE TRIGGER set_agent_responses_updated_at
            BEFORE UPDATE ON public.agent_responses
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
        END IF;
    END IF;
END $$;
