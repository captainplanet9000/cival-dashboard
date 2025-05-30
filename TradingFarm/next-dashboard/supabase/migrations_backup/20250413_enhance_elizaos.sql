-- Add new columns to elizaos_agents
ALTER TABLE elizaos_agents
ADD COLUMN IF NOT EXISTS status_details text,
ADD COLUMN IF NOT EXISTS status_metadata jsonb,
ADD COLUMN IF NOT EXISTS health_check_timestamp timestamptz,
ADD COLUMN IF NOT EXISTS resource_utilization jsonb,
ADD COLUMN IF NOT EXISTS error_count integer DEFAULT 0;

-- Create elizaos_knowledge table
CREATE TABLE IF NOT EXISTS elizaos_knowledge (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    topic text NOT NULL,
    content jsonb NOT NULL,
    source_agent uuid REFERENCES elizaos_agents(id) ON DELETE CASCADE,
    access_level text NOT NULL DEFAULT 'shared',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    metadata jsonb
);

-- Create elizaos_command_history table
CREATE TABLE IF NOT EXISTS elizaos_command_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id uuid REFERENCES elizaos_agents(id) ON DELETE CASCADE,
    command_type text NOT NULL,
    parameters jsonb,
    status text NOT NULL,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    processing_time_ms integer,
    error text,
    metadata jsonb
);

-- Create elizaos_audit_log table
CREATE TABLE IF NOT EXISTS elizaos_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id uuid REFERENCES elizaos_agents(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    event_data jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    metadata jsonb
);

-- Create elizaos_agent_relationships table
CREATE TABLE IF NOT EXISTS elizaos_agent_relationships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source_agent_id uuid REFERENCES elizaos_agents(id) ON DELETE CASCADE,
    target_agent_id uuid REFERENCES elizaos_agents(id) ON DELETE CASCADE,
    relationship_type text NOT NULL,
    permissions jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(source_agent_id, target_agent_id)
);

-- Create elizaos_agent_templates table
CREATE TABLE IF NOT EXISTS elizaos_agent_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    config jsonb NOT NULL,
    tags text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER handle_elizaos_knowledge_updated_at
    BEFORE UPDATE ON elizaos_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_elizaos_agent_relationships_updated_at
    BEFORE UPDATE ON elizaos_agent_relationships
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_elizaos_agent_templates_updated_at
    BEFORE UPDATE ON elizaos_agent_templates
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_elizaos_knowledge_topic ON elizaos_knowledge(topic);
CREATE INDEX IF NOT EXISTS idx_elizaos_knowledge_source_agent ON elizaos_knowledge(source_agent);
CREATE INDEX IF NOT EXISTS idx_elizaos_command_history_agent ON elizaos_command_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_elizaos_audit_log_agent ON elizaos_audit_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_elizaos_audit_log_event_type ON elizaos_audit_log(event_type);

-- Enable Row Level Security
ALTER TABLE elizaos_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE elizaos_command_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE elizaos_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE elizaos_agent_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE elizaos_agent_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON elizaos_knowledge
    FOR SELECT
    USING (access_level = 'public' OR auth.uid() = source_agent);

CREATE POLICY "Enable write access for authenticated users" ON elizaos_knowledge
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON elizaos_command_history
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users" ON elizaos_command_history
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON elizaos_audit_log
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users" ON elizaos_audit_log
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
