-- Add execution_mode to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(10) NOT NULL DEFAULT 'dry-run';
COMMENT ON COLUMN agents.execution_mode IS 'Trading execution mode - either live or dry-run';

-- Create a table for simulation configuration models
CREATE TABLE IF NOT EXISTS simulation_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- e.g., 'slippage', 'fee', 'latency', 'error', 'fill'
  parameters JSONB NOT NULL,  -- Model-specific parameters (e.g., percentage, feeBps, latencyMs)
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_default BOOLEAN DEFAULT FALSE -- Flag for default system models
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_simulation_models_user_id ON simulation_models(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_models_type ON simulation_models(type);

-- Add comments
COMMENT ON TABLE simulation_models IS 'Stores different simulation model configurations (slippage, fees, latency, errors, fills).';
COMMENT ON COLUMN simulation_models.type IS 'The type of simulation model (e.g., slippage, fee).';
COMMENT ON COLUMN simulation_models.parameters IS 'JSONB field containing the specific parameters for the model.';
COMMENT ON COLUMN simulation_models.is_default IS 'Indicates if this is a system-provided default model.';

-- Add triggers for timestamps
CREATE TRIGGER handle_simulation_models_created_at BEFORE INSERT ON simulation_models
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_simulation_models_updated_at BEFORE UPDATE ON simulation_models
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE simulation_models ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for simulation_models
CREATE POLICY "Users can manage their own simulation models"
  ON simulation_models FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow read access to default simulation models"
  ON simulation_models FOR SELECT
  USING (is_default = TRUE);

-- Create a table for agent simulation configurations
CREATE TABLE IF NOT EXISTS agent_simulation_configs (
  agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange VARCHAR(50) NOT NULL,
  symbols TEXT[] NOT NULL,
  slippage_model_id UUID REFERENCES simulation_models(id) ON DELETE SET NULL,
  fee_model_id UUID REFERENCES simulation_models(id) ON DELETE SET NULL,
  latency_model_id UUID REFERENCES simulation_models(id) ON DELETE SET NULL,
  fill_model_id UUID REFERENCES simulation_models(id) ON DELETE SET NULL,
  error_model_id UUID REFERENCES simulation_models(id) ON DELETE SET NULL,
  initial_balances JSONB NOT NULL DEFAULT '{"USDT": 10000, "BTC": 0.5, "ETH": 5}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Handle created_at and updated_at
CREATE TRIGGER handle_agent_simulation_configs_created_at BEFORE INSERT ON agent_simulation_configs
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_agent_simulation_configs_updated_at BEFORE UPDATE ON agent_simulation_configs
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE agent_simulation_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agent_simulation_configs
CREATE POLICY "Users can view their own agent simulation configs"
  ON agent_simulation_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent simulation configs"
  ON agent_simulation_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent simulation configs"
  ON agent_simulation_configs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent simulation configs"
  ON agent_simulation_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Create a table for simulation runs
CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- running, completed, failed
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Handle created_at and updated_at
CREATE TRIGGER handle_simulation_runs_created_at BEFORE INSERT ON simulation_runs
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_simulation_runs_updated_at BEFORE UPDATE ON simulation_runs
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for simulation_runs
CREATE POLICY "Users can view their own simulation runs"
  ON simulation_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own simulation runs"
  ON simulation_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulation runs"
  ON simulation_runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulation runs"
  ON simulation_runs FOR DELETE
  USING (auth.uid() = user_id);

-- Create a table for simulation trades
CREATE TABLE IF NOT EXISTS simulation_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  simulation_run_id UUID REFERENCES simulation_runs(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL, -- buy or sell
  type VARCHAR(10) NOT NULL, -- market or limit
  status VARCHAR(10) NOT NULL, -- open, closed, canceled
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  average NUMERIC, -- average fill price
  cost NUMERIC, -- total cost including fees
  fee NUMERIC, -- fee amount
  fee_currency VARCHAR(10), -- fee currency
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  slippage NUMERIC, -- calculated slippage if any
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Handle created_at and updated_at
CREATE TRIGGER handle_simulation_trades_created_at BEFORE INSERT ON simulation_trades
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_simulation_trades_updated_at BEFORE UPDATE ON simulation_trades
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE simulation_trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for simulation_trades
CREATE POLICY "Users can view their own simulation trades"
  ON simulation_trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own simulation trades"
  ON simulation_trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulation trades"
  ON simulation_trades FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulation trades"
  ON simulation_trades FOR DELETE
  USING (auth.uid() = user_id);

-- Create a table for virtual balances
CREATE TABLE IF NOT EXISTS virtual_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  asset VARCHAR(10) NOT NULL,
  free NUMERIC NOT NULL DEFAULT 0,
  locked NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, asset)
);

-- Handle created_at and updated_at
CREATE TRIGGER handle_virtual_balances_created_at BEFORE INSERT ON virtual_balances
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_virtual_balances_updated_at BEFORE UPDATE ON virtual_balances
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE virtual_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for virtual_balances
CREATE POLICY "Users can view their own virtual balances"
  ON virtual_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own virtual balances"
  ON virtual_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own virtual balances"
  ON virtual_balances FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own virtual balances"
  ON virtual_balances FOR DELETE
  USING (auth.uid() = user_id);

-- Create a table for simulation metrics
CREATE TABLE IF NOT EXISTS simulation_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
  metric_name VARCHAR(50) NOT NULL,
  metric_label VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(simulation_run_id, metric_name)
);

-- Handle created_at and updated_at
CREATE TRIGGER handle_simulation_metrics_created_at BEFORE INSERT ON simulation_metrics
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_simulation_metrics_updated_at BEFORE UPDATE ON simulation_metrics
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE simulation_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for simulation_metrics
CREATE POLICY "Users can view their own simulation metrics"
  ON simulation_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own simulation metrics"
  ON simulation_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulation metrics"
  ON simulation_metrics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulation metrics"
  ON simulation_metrics FOR DELETE
  USING (auth.uid() = user_id);
