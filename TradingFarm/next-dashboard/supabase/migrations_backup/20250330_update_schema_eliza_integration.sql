-- Migration to update Trading Farm schema for ElizaOS integration
-- This adds necessary columns and tables for ElizaOS integration

-- Update farms table to add status column
ALTER TABLE IF EXISTS farms
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update agents table to add configuration column for ElizaOS integration
ALTER TABLE IF EXISTS agents
ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}';

-- Create eliza_connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS eliza_connections (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  eliza_id TEXT NOT NULL,
  connection_type TEXT DEFAULT 'read-only',
  capabilities TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  last_connected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS knowledge_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_access table if it doesn't exist
CREATE TABLE IF NOT EXISTS knowledge_access (
  id SERIAL PRIMARY KEY,
  knowledge_id INTEGER NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  access_level TEXT DEFAULT 'read-only',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(knowledge_id, agent_id)
);

-- Add Row-Level Security policies for the new tables
ALTER TABLE IF EXISTS eliza_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS eliza_connections_select_policy ON eliza_connections FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS eliza_connections_insert_policy ON eliza_connections FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS eliza_connections_update_policy ON eliza_connections FOR UPDATE USING (true);

ALTER TABLE IF EXISTS knowledge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS knowledge_items_select_policy ON knowledge_items FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS knowledge_items_insert_policy ON knowledge_items FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS knowledge_items_update_policy ON knowledge_items FOR UPDATE USING (true);

ALTER TABLE IF EXISTS knowledge_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS knowledge_access_select_policy ON knowledge_access FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS knowledge_access_insert_policy ON knowledge_access FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS knowledge_access_update_policy ON knowledge_access FOR UPDATE USING (true);

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at column
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
    AND table_name IN ('farms', 'agents', 'eliza_connections', 'knowledge_items', 'knowledge_access')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS %I_updated_at ON %I;
      CREATE TRIGGER %I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
