# ElizaOS Integration Guide for Trading Farm Dashboard

This guide outlines the steps to integrate ElizaOS AI capabilities with your Trading Farm dashboard.

## Database Schema Migration

The ElizaOS integration requires several database schema changes. Due to security restrictions in the Supabase REST API, you'll need to apply these changes using one of the following methods:

### Option 1: Using Supabase Studio (Recommended)

1. Log in to your Supabase project dashboard at [app.supabase.io](https://app.supabase.io)
2. Navigate to the SQL Editor
3. Paste the following SQL script and execute it:

```sql
-- Migration to update Trading Farm schema for ElizaOS integration

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
```

### Option 2: Using Supabase CLI

1. Install Supabase CLI if you haven't already
2. Run `supabase login`
3. Use the migration command to apply the schema:
   ```
   supabase db push
   ```

## Integration Components

The ElizaOS integration consists of several key components:

### 1. Agent Configuration

In your agent creation or edit forms, add the following fields to configure ElizaOS capabilities:

- **ElizaOS Connection Type**: Options include read-only, command, or full
- **ElizaOS Capabilities**: Checkboxes for market_data, portfolio_query, trading_execution, knowledge_access
- **ElizaOS Agent ID**: Auto-generated or manually entered ID to identify this agent in ElizaOS

### 2. Knowledge Management

Create a knowledge management UI that allows:

- **Adding Knowledge**: Store trading strategies, market insights and research 
- **Querying Knowledge**: Allow agents to access and retrieve relevant information
- **Training Assets**: Guide agents to improve decision-making based on historical data

### 3. Command Console

Implement the ElizaOS command console as outlined in your agent management workflow:

- Real-time communication via socket events (COMMAND_RESPONSE, KNOWLEDGE_RESPONSE)
- Natural language processing for commands and queries 
- Message categorization (command, query, analysis, alert)
- Source tracking (knowledge-base, market-data, strategy, system)

## API Usage Guide

Once your database schema is updated, use the following API endpoints through the MCP interface:

### Connect an Agent to ElizaOS

```javascript
const connectAgentToEliza = async (agentId, elizaId, connectionType, capabilities) => {
  const response = await fetch('/api/mcp/supabase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tool: 'connect_eliza_agent',
      params: {
        agent_id: agentId,
        eliza_id: elizaId,
        connection_type: connectionType, // 'read-only', 'command', 'full'
        capabilities: capabilities // ['market_data', 'portfolio_query', 'trading_execution', 'knowledge_access']
      }
    })
  });
  
  return await response.json();
};
```

### Store Knowledge for Agents

```javascript
const storeKnowledge = async (title, content, tags, agentIds) => {
  const response = await fetch('/api/mcp/supabase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tool: 'store_knowledge',
      params: {
        title: title,
        content: content,
        tags: tags,
        agent_ids: agentIds
      }
    })
  });
  
  return await response.json();
};
```

### Query Knowledge

```javascript
const queryKnowledge = async (query, agentId) => {
  const response = await fetch('/api/mcp/supabase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tool: 'query_knowledge',
      params: {
        query: query,
        agent_id: agentId
      }
    })
  });
  
  return await response.json();
};
```

## ElizaOS Integration Features

The ElizaOS integration enables several important capabilities for your Trading Farm:

1. **Autonomous Trading Agents**: AI-powered agents with specific strategies and risk profiles
2. **Knowledge Management**: RAG-based knowledge retrieval and context-aware trading insights
3. **Multi-Agent Coordination**: Collaborative trading strategies between different agent types
4. **Natural Language Interaction**: Command-based interface for traders to interact with agents
5. **Real-time Analysis**: Continuous market monitoring and strategy adaptation

## Testing the Integration

After applying the database migrations, test your ElizaOS integration using:

```
npm run dev
```

Then navigate to `/examples/mcp` to test the MCP integration, or directly use the Agent Management workflows you've built to test the ElizaOS command console.
