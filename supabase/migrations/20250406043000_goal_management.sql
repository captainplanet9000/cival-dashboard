-- Goal Management System
-- This extends the initial goal fields added to farms

-- Create goal templates table
CREATE TABLE goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL, -- 'profit', 'dca', 'rebalance', 'risk_management', etc.
  parameters JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE goal_templates IS 'Pre-defined templates for common trading goals';

-- Create trigger to handle updated_at
CREATE TRIGGER handle_goal_templates_updated_at BEFORE UPDATE ON goal_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  template_id UUID REFERENCES goal_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL, -- 'profit', 'dca', 'rebalance', 'risk_management', etc.
  target_value NUMERIC,
  target_asset TEXT,
  parameters JSONB DEFAULT '{}'::JSONB,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed', 'failed'
  priority INTEGER DEFAULT 0,
  progress NUMERIC DEFAULT 0, -- 0-100 percentage
  last_evaluated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE goals IS 'Trading and investment goals for farms';

-- Create index for farm_id
CREATE INDEX idx_goals_farm_id ON goals(farm_id);

-- Create index for goal_type
CREATE INDEX idx_goals_goal_type ON goals(goal_type);

-- Create index for status
CREATE INDEX idx_goals_status ON goals(status);

-- Create trigger to handle updated_at
CREATE TRIGGER handle_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create goal metrics table to track goal performance over time
CREATE TABLE goal_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_value NUMERIC,
  progress NUMERIC, -- 0-100 percentage
  metrics JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE goal_metrics IS 'Historical metrics tracking for goals';

-- Create index for goal_id
CREATE INDEX idx_goal_metrics_goal_id ON goal_metrics(goal_id);

-- Create time-based index for timestamp
CREATE INDEX idx_goal_metrics_timestamp ON goal_metrics(timestamp);

-- Create goal dependencies table
CREATE TABLE goal_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  depends_on_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'blocker', -- 'blocker', 'prerequisite', 'related'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, depends_on_goal_id)
);

-- Add table comment
COMMENT ON TABLE goal_dependencies IS 'Dependencies between goals';

-- Create indexes for both goal IDs
CREATE INDEX idx_goal_dependencies_goal_id ON goal_dependencies(goal_id);
CREATE INDEX idx_goal_dependencies_depends_on_goal_id ON goal_dependencies(depends_on_goal_id);

-- Create goal actions table to track actions taken for goals
CREATE TABLE goal_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  action_type TEXT NOT NULL, -- 'buy', 'sell', 'rebalance', 'alert', etc.
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  parameters JSONB DEFAULT '{}'::JSONB,
  result JSONB DEFAULT '{}'::JSONB,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE goal_actions IS 'Actions taken to achieve goals';

-- Create indexes
CREATE INDEX idx_goal_actions_goal_id ON goal_actions(goal_id);
CREATE INDEX idx_goal_actions_agent_id ON goal_actions(agent_id);
CREATE INDEX idx_goal_actions_status ON goal_actions(status);

-- Create trigger to handle updated_at
CREATE TRIGGER handle_goal_actions_updated_at BEFORE UPDATE ON goal_actions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for accessing goal templates (visible to everyone)
CREATE POLICY "Goal templates are viewable by everyone" ON goal_templates
  FOR SELECT USING (true);

-- Create policies for accessing goals
CREATE POLICY "Goals are viewable by farm owner" ON goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = goals.farm_id 
      AND farms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Goals are editable by farm owner" ON goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = goals.farm_id 
      AND farms.owner_id = auth.uid()
    )
  );

-- Create policies for accessing goal metrics
CREATE POLICY "Goal metrics are viewable by farm owner" ON goal_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goals
      JOIN farms ON farms.id = goals.farm_id
      WHERE goals.id = goal_metrics.goal_id
      AND farms.owner_id = auth.uid()
    )
  );

-- Create policies for accessing goal dependencies
CREATE POLICY "Goal dependencies are viewable by farm owner" ON goal_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goals
      JOIN farms ON farms.id = goals.farm_id
      WHERE goals.id = goal_dependencies.goal_id
      AND farms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Goal dependencies are editable by farm owner" ON goal_dependencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals
      JOIN farms ON farms.id = goals.farm_id
      WHERE goals.id = goal_dependencies.goal_id
      AND farms.owner_id = auth.uid()
    )
  );

-- Create policies for accessing goal actions
CREATE POLICY "Goal actions are viewable by farm owner" ON goal_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goals
      JOIN farms ON farms.id = goals.farm_id
      WHERE goals.id = goal_actions.goal_id
      AND farms.owner_id = auth.uid()
    )
  );

-- Create some initial goal templates
INSERT INTO goal_templates (name, description, goal_type, parameters) VALUES
(
  'Profit Target', 
  'Achieve a specific profit target with your portfolio', 
  'profit',
  '{
    "target_percentage": 10,
    "timeframe": "3 months",
    "risk_level": "medium"
  }'::JSONB
),
(
  'Dollar Cost Average', 
  'Regularly purchase a specific asset over time', 
  'dca',
  '{
    "asset": "BTC",
    "amount_per_period": 100,
    "period": "weekly",
    "duration": "12 months"
  }'::JSONB
),
(
  'Portfolio Rebalance', 
  'Maintain a target asset allocation', 
  'rebalance',
  '{
    "allocation": {
      "BTC": 40,
      "ETH": 30,
      "SOL": 15,
      "USDC": 15
    },
    "rebalance_threshold": 5,
    "rebalance_frequency": "monthly"
  }'::JSONB
),
(
  'Risk Management', 
  'Manage portfolio risk by setting stop-loss levels', 
  'risk_management',
  '{
    "max_drawdown": 15,
    "stop_loss_percentage": 5,
    "take_profit_percentage": 20
  }'::JSONB
);

-- Create stored procedure to update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress(
  p_goal_id UUID,
  p_current_value NUMERIC,
  p_progress NUMERIC,
  p_metrics JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
DECLARE
  v_goal_record RECORD;
BEGIN
  -- Get goal information
  SELECT * INTO v_goal_record FROM goals WHERE id = p_goal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal with ID % not found', p_goal_id;
  END IF;
  
  -- Update the goal progress
  UPDATE goals
  SET 
    progress = p_progress,
    last_evaluated_at = NOW(),
    status = CASE 
      WHEN p_progress >= 100 THEN 'completed'
      ELSE status
    END
  WHERE id = p_goal_id;
  
  -- Create a metric record
  INSERT INTO goal_metrics (
    goal_id,
    current_value,
    progress,
    metrics
  ) VALUES (
    p_goal_id,
    p_current_value,
    p_progress,
    p_metrics
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 