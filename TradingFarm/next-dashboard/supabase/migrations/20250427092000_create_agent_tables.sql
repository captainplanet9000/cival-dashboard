-- Migration: Create Agent Tables
-- Description: Creates tables for trading agents before the agent_health table

-- =============================================================================
-- SECTION: Create functions for timestamp handling
-- =============================================================================

-- Create the function for handling updated_at timestamp if it doesn't exist yet
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION: Agent table - Part 1: Create the table
-- =============================================================================
-- This table defines trading agents/bots

CREATE TABLE IF NOT EXISTS public.agents (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::JSONB,
    permissions JSONB DEFAULT '{}'::JSONB,
    supported_exchanges VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    supported_symbols VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    metadata JSONB,
    version VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_agents_user ON public.agents(user_id);
CREATE INDEX idx_agents_type ON public.agents(type);

-- Trigger to update the updated_at column
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON public.agents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SECTION: Agent table - Part 2: Add RLS policies
-- =============================================================================

-- Add RLS to the agents table
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Users can only view their own agents
CREATE POLICY "Users can view their own agents"
    ON public.agents
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Users can only insert their own agents
CREATE POLICY "Users can insert their own agents"
    ON public.agents
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Users can only update their own agents
CREATE POLICY "Users can update their own agents"
    ON public.agents
    FOR UPDATE
    USING (auth.uid()::text = user_id::text);

-- Users can only delete their own agents
CREATE POLICY "Users can delete their own agents"
    ON public.agents
    FOR DELETE
    USING (auth.uid()::text = user_id::text);
