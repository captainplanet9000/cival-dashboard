-- Migration: 20250401_comprehensive_agent_responses_fix.sql
-- Description: Ensure agent_responses table exists with all required columns

-- First, check if the table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'agent_responses'
    ) THEN
        CREATE TABLE public.agent_responses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
            command_id UUID REFERENCES public.agent_commands(id) ON DELETE SET NULL,
            response_type TEXT NOT NULL,
            response_content TEXT NOT NULL,
            status TEXT DEFAULT 'pending' NOT NULL,
            context JSONB DEFAULT '{}'::jsonb NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
        );

        -- Enable RLS
        ALTER TABLE public.agent_responses ENABLE ROW LEVEL SECURITY;

        -- Set up comments
        COMMENT ON TABLE public.agent_responses IS 'Table storing responses from agents to commands';
        COMMENT ON COLUMN public.agent_responses.id IS 'Unique identifier for the response';
        COMMENT ON COLUMN public.agent_responses.agent_id IS 'Reference to the agent that generated the response';
        COMMENT ON COLUMN public.agent_responses.command_id IS 'Reference to the command this is a response to';
        COMMENT ON COLUMN public.agent_responses.response_type IS 'Type of response (e.g. order_execution, analysis)';
        COMMENT ON COLUMN public.agent_responses.response_content IS 'Main content of the response';
        COMMENT ON COLUMN public.agent_responses.status IS 'Status of the response (pending, completed, failed)';
        COMMENT ON COLUMN public.agent_responses.context IS 'JSON context and details for the response';
        COMMENT ON COLUMN public.agent_responses.metadata IS 'Additional metadata for the response';
        COMMENT ON COLUMN public.agent_responses.created_at IS 'Timestamp when the response was created';
        COMMENT ON COLUMN public.agent_responses.updated_at IS 'Timestamp when the response was last updated';

        RAISE NOTICE 'Created agent_responses table from scratch';
    ELSE
        RAISE NOTICE 'agent_responses table already exists';
    END IF;
END $$;

-- Now, for an existing table, ensure all columns exist with proper types
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Check and add context column if missing
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_responses' 
        AND column_name = 'context'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE public.agent_responses ADD COLUMN context JSONB DEFAULT '{}'::jsonb NOT NULL;
        RAISE NOTICE 'Added context column';
    END IF;

    -- Check and add metadata column if missing
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_responses' 
        AND column_name = 'metadata'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE public.agent_responses ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added metadata column';
    END IF;

    -- Check and add status column if missing
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_responses' 
        AND column_name = 'status'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE public.agent_responses ADD COLUMN status TEXT DEFAULT 'pending' NOT NULL;
        RAISE NOTICE 'Added status column';
    END IF;

    -- Check and add created_at column if missing
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_responses' 
        AND column_name = 'created_at'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE public.agent_responses ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
        RAISE NOTICE 'Added created_at column';
    END IF;

    -- Check and add updated_at column if missing
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_responses' 
        AND column_name = 'updated_at'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        ALTER TABLE public.agent_responses ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- Ensure timestamp triggers exist
DO $$
BEGIN
    -- Create created_at trigger if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_agent_responses_created_at'
        AND tgrelid = 'public.agent_responses'::regclass
    ) THEN
        CREATE TRIGGER set_agent_responses_created_at
        BEFORE INSERT ON public.agent_responses
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_created_at();
        
        RAISE NOTICE 'Created created_at trigger';
    END IF;

    -- Create updated_at trigger if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_agent_responses_updated_at'
        AND tgrelid = 'public.agent_responses'::regclass
    ) THEN
        CREATE TRIGGER set_agent_responses_updated_at
        BEFORE UPDATE ON public.agent_responses
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
        
        RAISE NOTICE 'Created updated_at trigger';
    END IF;
END $$;

-- Create or update handle_created_at and handle_updated_at functions if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_created_at'
    ) THEN
        CREATE OR REPLACE FUNCTION public.handle_created_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.created_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        RAISE NOTICE 'Created handle_created_at function';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_updated_at'
    ) THEN
        CREATE OR REPLACE FUNCTION public.handle_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        RAISE NOTICE 'Created handle_updated_at function';
    END IF;
END $$;

-- Create basic RLS policies if they don't exist
DO $$
BEGIN
    -- Create admin access policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_responses' 
        AND policyname = 'agent_responses_admin_all'
    ) THEN
        CREATE POLICY agent_responses_admin_all
        ON public.agent_responses
        USING (true);
        
        RAISE NOTICE 'Created admin policy for agent_responses';
    END IF;
END $$;

-- Create simplified test function to verify agent_responses functionality
CREATE OR REPLACE FUNCTION public.test_agent_response_insert()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    response_id UUID;
    test_agent_id BIGINT;
    test_command_id UUID;
BEGIN
    -- Get the first agent as test agent
    SELECT id INTO test_agent_id FROM public.agents LIMIT 1;
    SELECT id INTO test_command_id FROM public.agent_commands LIMIT 1;
    
    -- Insert a test response
    INSERT INTO public.agent_responses (
        agent_id,
        command_id,
        response_type,
        response_content,
        status,
        context,
        metadata
    ) VALUES (
        test_agent_id,
        test_command_id,
        'test_response',
        'This is a test response',
        'completed',
        jsonb_build_object('test', 'value'),
        jsonb_build_object('test_metadata', 'value')
    )
    RETURNING id INTO response_id;
    
    RETURN response_id;
END;
$$;

-- Output a success message
DO $$
BEGIN
    RAISE NOTICE 'agent_responses table setup complete. Run SELECT * FROM public.test_agent_response_insert(); to verify functionality.';
END $$;
