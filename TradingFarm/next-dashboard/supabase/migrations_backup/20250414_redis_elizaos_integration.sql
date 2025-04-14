-- Migration: 20250414_redis_elizaos_integration.sql
-- Purpose: Add Redis-backed ElizaOS integration tables and functions
-- Date: 2025-04-14

-- Set search path
SET search_path = public;

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- ElizaOS Agent Knowledge Persistence
-- ===========================================

-- Table to store persistent agent knowledge (synced from Redis)
CREATE TABLE IF NOT EXISTS elizaos_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    source_agent UUID NOT NULL REFERENCES elizaos_agents(id) ON DELETE CASCADE,
    target_agents UUID[] NULL,
    access_level VARCHAR(50) NOT NULL DEFAULT 'private',
    ttl_ms BIGINT NOT NULL DEFAULT 3600000, -- 1 hour default
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Add index for knowledge queries
    CONSTRAINT valid_access_level CHECK (access_level IN ('private', 'shared', 'public'))
);

-- Index for knowledge topic search
CREATE INDEX IF NOT EXISTS idx_elizaos_knowledge_topic ON elizaos_knowledge(topic);

-- Index for knowledge expiration
CREATE INDEX IF NOT EXISTS idx_elizaos_knowledge_expires_at ON elizaos_knowledge(expires_at);

-- Index for source agent
CREATE INDEX IF NOT EXISTS idx_elizaos_knowledge_source_agent ON elizaos_knowledge(source_agent);

-- ===========================================
-- ElizaOS Agent Command History
-- ===========================================

-- Table to store agent command history
CREATE TABLE IF NOT EXISTS elizaos_command_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES elizaos_agents(id) ON DELETE CASCADE,
    command_type VARCHAR(100) NOT NULL,
    parameters JSONB NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    result JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    execution_time_ms INTEGER NULL
);

-- Index for command history by agent
CREATE INDEX IF NOT EXISTS idx_elizaos_command_history_agent ON elizaos_command_history(agent_id);

-- Index for command history by type
CREATE INDEX IF NOT EXISTS idx_elizaos_command_history_type ON elizaos_command_history(command_type);

-- Index for command history by status
CREATE INDEX IF NOT EXISTS idx_elizaos_command_history_status ON elizaos_command_history(status);

-- ===========================================
-- ElizaOS Agent Coordination
-- ===========================================

-- Table to store agent coordination records
CREATE TABLE IF NOT EXISTS elizaos_coordination (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordinator_id UUID NOT NULL REFERENCES elizaos_agents(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_agents UUID[] NOT NULL,
    parameters JSONB NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    results JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Add constraint for action type
    CONSTRAINT valid_coordination_action CHECK (
        action IN (
            'assign_task',
            'share_knowledge',
            'request_analysis',
            'sync_state',
            'delegate_control'
        )
    )
);

-- Index for coordination by coordinator
CREATE INDEX IF NOT EXISTS idx_elizaos_coordination_coordinator ON elizaos_coordination(coordinator_id);

-- Index for coordination by status
CREATE INDEX IF NOT EXISTS idx_elizaos_coordination_status ON elizaos_coordination(status);

-- ===========================================
-- ElizaOS Agent Performance Metrics
-- ===========================================

-- Table to store agent performance metrics
CREATE TABLE IF NOT EXISTS elizaos_agent_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES elizaos_agents(id) ON DELETE CASCADE,
    commands_processed INTEGER NOT NULL DEFAULT 0,
    success_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    avg_response_time_ms INTEGER NOT NULL DEFAULT 0,
    uptime_seconds INTEGER NOT NULL DEFAULT 0,
    memory_utilization JSONB NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Enforce reasonable bounds on metrics
    CONSTRAINT valid_success_rate CHECK (success_rate >= 0 AND success_rate <= 1),
    CONSTRAINT valid_response_time CHECK (avg_response_time_ms >= 0)
);

-- Index for agent metrics by agent
CREATE INDEX IF NOT EXISTS idx_elizaos_agent_metrics_agent ON elizaos_agent_metrics(agent_id);

-- Index for agent metrics by timestamp
CREATE INDEX IF NOT EXISTS idx_elizaos_agent_metrics_timestamp ON elizaos_agent_metrics(timestamp);

-- ===========================================
-- ElizaOS Functions
-- ===========================================

-- Function to clean up expired knowledge
CREATE OR REPLACE FUNCTION cleanup_expired_elizaos_knowledge()
RETURNS INTEGER
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired knowledge
    DELETE FROM elizaos_knowledge
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Function to sync knowledge from Redis
CREATE OR REPLACE FUNCTION sync_elizaos_knowledge_from_redis(
    p_topic VARCHAR,
    p_content JSONB,
    p_source_agent UUID,
    p_target_agents UUID[],
    p_access_level VARCHAR,
    p_ttl_ms BIGINT,
    p_redis_id VARCHAR
)
RETURNS UUID
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
DECLARE
    new_id UUID;
    expire_time TIMESTAMPTZ;
BEGIN
    -- Calculate expiration time
    expire_time := NOW() + (p_ttl_ms * INTERVAL '1 millisecond');
    
    -- Insert knowledge
    INSERT INTO elizaos_knowledge(
        topic,
        content,
        source_agent,
        target_agents,
        access_level,
        ttl_ms,
        expires_at
    )
    VALUES (
        p_topic,
        p_content,
        p_source_agent,
        p_target_agents,
        p_access_level,
        p_ttl_ms,
        expire_time
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;

-- Function to record agent command execution
CREATE OR REPLACE FUNCTION record_elizaos_command(
    p_agent_id UUID,
    p_command_type VARCHAR,
    p_parameters JSONB,
    p_status VARCHAR,
    p_result JSONB,
    p_execution_time_ms INTEGER
)
RETURNS UUID
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
DECLARE
    new_id UUID;
BEGIN
    -- Insert command record
    INSERT INTO elizaos_command_history(
        agent_id,
        command_type,
        parameters,
        status,
        result,
        execution_time_ms
    )
    VALUES (
        p_agent_id,
        p_command_type,
        p_parameters,
        p_status,
        p_result,
        p_execution_time_ms
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;

-- Function to record agent coordination
CREATE OR REPLACE FUNCTION record_elizaos_coordination(
    p_coordinator_id UUID,
    p_action VARCHAR,
    p_target_agents UUID[],
    p_parameters JSONB,
    p_status VARCHAR,
    p_results JSONB
)
RETURNS UUID
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
DECLARE
    new_id UUID;
BEGIN
    -- Insert coordination record
    INSERT INTO elizaos_coordination(
        coordinator_id,
        action,
        target_agents,
        parameters,
        status,
        results
    )
    VALUES (
        p_coordinator_id,
        p_action,
        p_target_agents,
        p_parameters,
        p_status,
        p_results
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;

-- Function to update agent metrics
CREATE OR REPLACE FUNCTION update_elizaos_agent_metrics(
    p_agent_id UUID,
    p_commands_processed INTEGER,
    p_success_rate NUMERIC,
    p_avg_response_time_ms INTEGER,
    p_uptime_seconds INTEGER,
    p_memory_utilization JSONB,
    p_error_count INTEGER
)
RETURNS VOID
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert new metrics record
    INSERT INTO elizaos_agent_metrics(
        agent_id,
        commands_processed,
        success_rate,
        avg_response_time_ms,
        uptime_seconds,
        memory_utilization,
        error_count
    )
    VALUES (
        p_agent_id,
        p_commands_processed,
        p_success_rate,
        p_avg_response_time_ms,
        p_uptime_seconds,
        p_memory_utilization,
        p_error_count
    );
END;
$$;

-- ===========================================
-- Enable Row Level Security
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE elizaos_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE elizaos_command_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE elizaos_coordination ENABLE ROW LEVEL SECURITY;
ALTER TABLE elizaos_agent_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for elizaos_knowledge
CREATE POLICY elizaos_knowledge_select
ON elizaos_knowledge
FOR SELECT
TO authenticated
USING (
    auth.uid() IN (SELECT user_id FROM elizaos_agents WHERE id = source_agent)
    OR access_level = 'public'
    OR (
        access_level = 'shared'
        AND EXISTS (
            SELECT 1 FROM elizaos_agents 
            WHERE user_id = auth.uid() 
            AND id = ANY(target_agents)
        )
    )
);

-- Create policies for elizaos_command_history
CREATE POLICY elizaos_command_history_select
ON elizaos_command_history
FOR SELECT
TO authenticated
USING (
    auth.uid() IN (SELECT user_id FROM elizaos_agents WHERE id = agent_id)
);

-- Create policies for elizaos_coordination
CREATE POLICY elizaos_coordination_select
ON elizaos_coordination
FOR SELECT
TO authenticated
USING (
    auth.uid() IN (SELECT user_id FROM elizaos_agents WHERE id = coordinator_id)
    OR auth.uid() IN (
        SELECT user_id FROM elizaos_agents 
        WHERE id = ANY(target_agents)
    )
);

-- Create policies for elizaos_agent_metrics
CREATE POLICY elizaos_agent_metrics_select
ON elizaos_agent_metrics
FOR SELECT
TO authenticated
USING (
    auth.uid() IN (SELECT user_id FROM elizaos_agents WHERE id = agent_id)
);

-- ===========================================
-- Create Scheduled Job for Cleanup
-- ===========================================

-- Create a scheduled job to clean up expired knowledge
SELECT cron.schedule(
    'cleanup-elizaos-knowledge',
    '0 * * * *', -- Run hourly
    $$
    SELECT cleanup_expired_elizaos_knowledge();
    $$
);

-- ===========================================
-- Add Triggers for Updatable Views
-- ===========================================

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Add trigger for coordination table
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON elizaos_coordination
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Add trigger for command history table
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON elizaos_command_history
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
