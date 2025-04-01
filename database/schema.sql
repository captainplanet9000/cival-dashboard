-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE agent_status AS ENUM ('initializing', 'running', 'paused', 'error', 'stopped');
CREATE TYPE agent_type AS ENUM ('market_maker', 'trend_follower', 'arbitrage', 'ml_predictor', 'grid_trader', 'custom');

-- Create users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create farms table
CREATE TABLE farms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  balance DECIMAL(18, 8) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  risk_profile JSONB DEFAULT '{
    "max_drawdown": 10,
    "risk_per_trade": 1,
    "max_trade_size": 5,
    "volatility_tolerance": "medium"
  }'::JSONB,
  performance_metrics JSONB DEFAULT '{
    "win_rate": 0,
    "profit_factor": 0,
    "trades_count": 0,
    "total_profit_loss": 0,
    "average_win": 0,
    "average_loss": 0
  }'::JSONB,
  settings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create agents table
CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  agent_type agent_type NOT NULL,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  eliza_agent_id TEXT,
  parameters JSONB DEFAULT '{}'::JSONB,
  metrics JSONB DEFAULT '{
    "trades_executed": 0,
    "win_rate": 0,
    "profit_loss": 0,
    "avg_trade_duration": 0
  }'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create agent metrics table
CREATE TABLE agent_metrics (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cpu_usage DECIMAL(5, 2) NOT NULL,
  memory_usage DECIMAL(5, 2) NOT NULL,
  trades_executed INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  profit_loss DECIMAL(18, 8) DEFAULT 0,
  avg_trade_duration INTEGER DEFAULT 0
);

-- Create agent commands table
CREATE TABLE agent_commands (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  command TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::JSONB,
  result JSONB DEFAULT '{}'::JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create farm performance table for historical data
CREATE TABLE farm_performance (
  id SERIAL PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  balance DECIMAL(18, 8) NOT NULL,
  profit_loss DECIMAL(18, 8) NOT NULL,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  active_positions INTEGER DEFAULT 0,
  drawdown_percentage DECIMAL(5, 2) DEFAULT 0
);

-- Create trades table
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price DECIMAL(18, 8) NOT NULL,
  exit_price DECIMAL(18, 8),
  quantity DECIMAL(18, 8) NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_time TIMESTAMPTZ,
  profit_loss DECIMAL(18, 8),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'cancelled')),
  stop_loss DECIMAL(18, 8),
  take_profit DECIMAL(18, 8),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Create dashboard summary view (updated regularly)
CREATE TABLE dashboard_summary (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_profit_loss DECIMAL(18, 8) DEFAULT 0,
  total_balance DECIMAL(18, 8) DEFAULT 0,
  total_active_agents INTEGER DEFAULT 0,
  total_trades_today INTEGER DEFAULT 0,
  total_trades_week INTEGER DEFAULT 0,
  total_trades_month INTEGER DEFAULT 0,
  win_rate_overall DECIMAL(5, 2) DEFAULT 0,
  metrics_by_agent_type JSONB DEFAULT '{}'::JSONB,
  metrics_by_farm JSONB DEFAULT '{}'::JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_farms_owner ON farms(owner_id);
CREATE INDEX idx_agents_farm ON agents(farm_id);
CREATE INDEX idx_agent_metrics_agent ON agent_metrics(agent_id);
CREATE INDEX idx_agent_metrics_timestamp ON agent_metrics(timestamp);
CREATE INDEX idx_farm_performance_farm ON farm_performance(farm_id);
CREATE INDEX idx_farm_performance_timestamp ON farm_performance(timestamp);
CREATE INDEX idx_trades_farm ON trades(farm_id);
CREATE INDEX idx_trades_agent ON trades(agent_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_entry_time ON trades(entry_time);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_users_modified
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_farms_modified
BEFORE UPDATE ON farms
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_agents_modified
BEFORE UPDATE ON agents
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Create real-time functions

-- Function to update farm metrics based on trade results
CREATE OR REPLACE FUNCTION update_farm_metrics()
RETURNS TRIGGER AS $$
DECLARE
  win_count INTEGER;
  loss_count INTEGER;
  total_trades INTEGER;
  total_win DECIMAL;
  total_loss DECIMAL;
BEGIN
  -- If a trade is closed, update farm metrics
  IF NEW.status = 'closed' AND OLD.status = 'open' THEN
    -- Get stats for the farm
    SELECT 
      COUNT(*) FILTER (WHERE profit_loss > 0), 
      COUNT(*) FILTER (WHERE profit_loss <= 0),
      COUNT(*),
      SUM(profit_loss) FILTER (WHERE profit_loss > 0),
      SUM(profit_loss) FILTER (WHERE profit_loss <= 0)
    INTO win_count, loss_count, total_trades, total_win, total_loss
    FROM trades 
    WHERE farm_id = NEW.farm_id AND status = 'closed';
    
    -- Update farm metrics
    UPDATE farms SET 
      performance_metrics = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  performance_metrics,
                  '{trades_count}', to_jsonb(total_trades)
                ),
                '{win_rate}', to_jsonb(CASE WHEN total_trades > 0 THEN win_count::float / total_trades ELSE 0 END)
              ),
              '{total_profit_loss}', to_jsonb(COALESCE(total_win, 0) + COALESCE(total_loss, 0))
            ),
            '{average_win}', to_jsonb(CASE WHEN win_count > 0 THEN total_win / win_count ELSE 0 END)
          ),
          '{average_loss}', to_jsonb(CASE WHEN loss_count > 0 THEN total_loss / loss_count ELSE 0 END)
        ),
        '{profit_factor}', to_jsonb(CASE WHEN ABS(COALESCE(total_loss, 0)) > 0 THEN ABS(COALESCE(total_win, 0)) / ABS(COALESCE(total_loss, 0)) ELSE 0 END)
      ),
      updated_at = NOW()
    WHERE id = NEW.farm_id;
    
    -- Update farm balance
    UPDATE farms SET
      balance = balance + NEW.profit_loss
    WHERE id = NEW.farm_id;
    
    -- Insert into farm performance history
    INSERT INTO farm_performance (
      farm_id, 
      timestamp, 
      balance, 
      profit_loss, 
      win_rate, 
      total_trades, 
      active_positions,
      drawdown_percentage
    )
    SELECT 
      NEW.farm_id, 
      NOW(), 
      f.balance, 
      NEW.profit_loss, 
      (f.performance_metrics->>'win_rate')::DECIMAL, 
      (f.performance_metrics->>'trades_count')::INTEGER,
      (SELECT COUNT(*) FROM trades WHERE farm_id = NEW.farm_id AND status = 'open'),
      COALESCE(
        (SELECT ABS(MIN(t.running_pnl) / f.balance * 100) 
         FROM (
           SELECT 
             SUM(profit_loss) OVER (ORDER BY exit_time) as running_pnl
           FROM trades 
           WHERE farm_id = NEW.farm_id AND status = 'closed'
           ORDER BY exit_time DESC
           LIMIT 100
         ) t
        ), 0)
    FROM farms f
    WHERE f.id = NEW.farm_id;
    
    -- If agent is specified, update agent metrics too
    IF NEW.agent_id IS NOT NULL THEN
      UPDATE agents SET
        metrics = jsonb_set(
          jsonb_set(
            jsonb_set(
              metrics,
              '{trades_executed}', to_jsonb((metrics->>'trades_executed')::INTEGER + 1)
            ),
            '{profit_loss}', to_jsonb((metrics->>'profit_loss')::DECIMAL + NEW.profit_loss)
          ),
          '{win_rate}', to_jsonb(
            (SELECT COUNT(*)::float / NULLIF(COUNT(*), 0) 
             FROM trades 
             WHERE agent_id = NEW.agent_id AND status = 'closed' AND profit_loss > 0)
          )
        ),
        updated_at = NOW()
      WHERE id = NEW.agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trades_after_update
AFTER UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION update_farm_metrics();

-- Row level security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Farm policies
CREATE POLICY "Users can read their own farms" ON farms
  FOR SELECT USING (auth.uid() = owner_id);
  
CREATE POLICY "Users can create farms" ON farms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
  
CREATE POLICY "Users can update their own farms" ON farms
  FOR UPDATE USING (auth.uid() = owner_id);
  
CREATE POLICY "Users can delete their own farms" ON farms
  FOR DELETE USING (auth.uid() = owner_id);

-- Agent policies
CREATE POLICY "Users can read agents for their farms" ON agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms 
      WHERE farms.id = agents.farm_id 
      AND farms.owner_id = auth.uid()
    )
  );
  
CREATE POLICY "Users can create agents for their farms" ON agents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM farms 
      WHERE farms.id = agents.farm_id 
      AND farms.owner_id = auth.uid()
    )
  );
  
CREATE POLICY "Users can update agents for their farms" ON agents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms 
      WHERE farms.id = agents.farm_id 
      AND farms.owner_id = auth.uid()
    )
  );
  
CREATE POLICY "Users can delete agents for their farms" ON agents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms 
      WHERE farms.id = agents.farm_id 
      AND farms.owner_id = auth.uid()
    )
  );

-- Agent metrics policies
CREATE POLICY "Users can read agent metrics for their farms" ON agent_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents
      JOIN farms ON farms.id = agents.farm_id
      WHERE agents.id = agent_metrics.agent_id 
      AND farms.owner_id = auth.uid()
    )
  );

-- Triggers for ElizaOS Integration
CREATE TRIGGER update_eliza_commands_modified
BEFORE UPDATE ON eliza_commands
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ElizaOS Integration Tables
CREATE TABLE eliza_commands (
  id SERIAL PRIMARY KEY,
  command TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('user', 'agent', 'system', 'farm')),
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  farm_id INTEGER REFERENCES farms(id) ON DELETE SET NULL,
  context JSONB DEFAULT '{}'::JSONB,
  response JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memory_items (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fact', 'observation', 'insight', 'decision', 'feedback')),
  importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 10),
  embedding VECTOR(1536), -- For semantic search if using pgvector extension
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ
);

-- Indexes for ElizaOS Integration
CREATE INDEX idx_eliza_commands_agent ON eliza_commands(agent_id);
CREATE INDEX idx_eliza_commands_farm ON eliza_commands(farm_id);
CREATE INDEX idx_eliza_commands_status ON eliza_commands(status);
CREATE INDEX idx_eliza_commands_created ON eliza_commands(created_at);
CREATE INDEX idx_memory_items_agent ON memory_items(agent_id);
CREATE INDEX idx_memory_items_type ON memory_items(type);
CREATE INDEX idx_memory_items_importance ON memory_items(importance);
CREATE INDEX idx_memory_items_created ON memory_items(created_at);

-- Function to manage memory items retrieval with recency and importance
CREATE OR REPLACE FUNCTION get_relevant_memories(
  p_agent_id INTEGER, 
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  id INTEGER,
  content TEXT,
  type TEXT,
  importance INTEGER,
  created_at TIMESTAMPTZ,
  relevance_score FLOAT
) AS $$
BEGIN
  -- Update last_accessed timestamp for retrieved memories
  RETURN QUERY
  WITH retrieved_memories AS (
    SELECT 
      id, 
      content, 
      type, 
      importance, 
      created_at,
      -- Simplified relevance score based on importance and recency
      -- In a real implementation, this would use vector similarity with pgvector
      importance * 0.6 + (1.0 - EXTRACT(EPOCH FROM (NOW() - created_at))/86400.0/30.0) * 0.4 AS relevance_score
    FROM 
      memory_items
    WHERE 
      agent_id = p_agent_id
      AND (expires_at IS NULL OR expires_at > NOW())
      -- Basic text search, would use vector similarity in production
      AND (content ILIKE '%' || p_query || '%' OR p_query IS NULL)
    ORDER BY
      relevance_score DESC
    LIMIT p_limit
  )
  SELECT 
    rm.id, 
    rm.content, 
    rm.type, 
    rm.importance, 
    rm.created_at,
    rm.relevance_score
  FROM retrieved_memories rm;
  
  -- Update last_accessed_at for retrieved memories
  UPDATE memory_items
  SET last_accessed_at = NOW()
  WHERE id IN (SELECT id FROM retrieved_memories);
  
  RETURN;
END;
$$ LANGUAGE plpgsql; 