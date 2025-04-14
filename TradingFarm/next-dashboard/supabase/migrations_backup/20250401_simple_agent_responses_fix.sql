-- Migration: 20250401_simple_agent_responses_fix.sql
-- Description: Simple direct approach to fix agent_responses table

-- Add missing columns directly without complex blocks
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL;
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Create the timestamp handler functions if they don't exist
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS set_agent_responses_created_at ON public.agent_responses;
DROP TRIGGER IF EXISTS set_agent_responses_updated_at ON public.agent_responses;

-- Create the triggers
CREATE TRIGGER set_agent_responses_created_at
BEFORE INSERT ON public.agent_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_agent_responses_updated_at
BEFORE UPDATE ON public.agent_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.agent_responses ENABLE ROW LEVEL SECURITY;

-- Create a simple policy
DROP POLICY IF EXISTS agent_responses_admin_all ON public.agent_responses;
CREATE POLICY agent_responses_admin_all ON public.agent_responses USING (true);

-- Simple test function without nested blocks
CREATE OR REPLACE FUNCTION public.test_agent_response_insert()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    response_id UUID;
    test_agent_id BIGINT;
    test_command_id UUID;
BEGIN
    -- Get test data
    SELECT id INTO test_agent_id FROM public.agents LIMIT 1;
    SELECT id INTO test_command_id FROM public.agent_commands LIMIT 1;
    
    -- Exit early if no test data
    IF test_agent_id IS NULL OR test_command_id IS NULL THEN
        RETURN 'No test data available - need at least one agent and one command';
    END IF;
    
    -- Insert test response
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
        '{"test": "value"}'::jsonb,
        '{"test_metadata": "value"}'::jsonb
    )
    RETURNING id INTO response_id;
    
    RETURN 'Test response created with ID: ' || response_id;
END;
$$;
