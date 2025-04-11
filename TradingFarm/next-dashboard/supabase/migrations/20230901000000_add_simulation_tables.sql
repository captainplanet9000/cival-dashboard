-- Add execution_mode to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(10) NOT NULL DEFAULT 'dry-run';
COMMENT ON COLUMN agents.execution_mode IS 'Trading execution mode - either live or dry-run';

-- Create a table for simulation configuration models
CREATE TABLE IF NOT EXISTS simulation_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- slippage, fee, latency, error, or fill
  parameters JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Handle created_at and updated_at
CREATE TRIGGER handle_simulation_models_created_at BEFORE INSERT ON simulation_models
FOR EACH ROW EXECUTE PROCEDURE public.handle_created_at();

CREATE TRIGGER handle_simulation_models_updated_at BEFORE UPDATE ON simulation_models
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE simulation_models ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for simulation_models
CREATE POLICY "Users can view their own simulation models"
  ON simulation_models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own simulation models"
  ON simulation_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulation models"
  ON simulation_models FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulation models"
  ON simulation_models FOR DELETE
  USING (auth.uid() = user_id);

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

-- Insert default simulation models
INSERT INTO simulation_models (user_id, name, type, parameters, description)
VALUES 
-- Slippage models
(
  '00000000-0000-0000-0000-000000000000',
  'No Slippage', 
  'slippage', 
  '{"model": "none", "description": "No price slippage applied"}',
  'Simulates perfect order execution with no difference between quoted and executed price'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Conservative Slippage', 
  'slippage', 
  '{"model": "percentage", "percentage": 0.001, "description": "0.1% slippage on market orders"}',
  'Simulates slight slippage of 0.1% for market orders, typical for normal market conditions'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Realistic Slippage', 
  'slippage', 
  '{"model": "percentage", "percentage": 0.003, "description": "0.3% slippage on market orders"}',
  'Simulates moderate slippage of 0.3% for market orders, common during moderately volatile conditions'
),
(
  '00000000-0000-0000-0000-000000000000',
  'High Volatility Slippage', 
  'slippage', 
  '{"model": "percentage", "percentage": 0.01, "description": "1% slippage on market orders"}',
  'Simulates high slippage of 1% for market orders, common during highly volatile market conditions'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Volume-Based Slippage', 
  'slippage', 
  '{"model": "volume", "base": 0.001, "exponent": 1.5, "description": "Slippage increases with order size"}',
  'Simulates slippage that increases exponentially with order size, more realistic for large orders'
),

-- Fee models
(
  '00000000-0000-0000-0000-000000000000',
  'No Fees', 
  'fee', 
  '{"model": "fixed", "makerFeeBps": 0, "takerFeeBps": 0, "description": "Zero trading fees"}',
  'Simulates trading with no fees applied'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Bybit Standard', 
  'fee', 
  '{"model": "fixed", "makerFeeBps": 1, "takerFeeBps": 6, "description": "Bybit standard fee tier (0.01% maker, 0.06% taker)"}',
  'Simulates Bybit standard fee structure for regular users'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Bybit VIP', 
  'fee', 
  '{"model": "fixed", "makerFeeBps": 0, "takerFeeBps": 3, "description": "Bybit VIP tier (0.00% maker, 0.03% taker)"}',
  'Simulates Bybit VIP fee structure for high-volume traders'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Coinbase Standard', 
  'fee', 
  '{"model": "fixed", "makerFeeBps": 40, "takerFeeBps": 60, "description": "Coinbase standard fee tier (0.4% maker, 0.6% taker)"}',
  'Simulates Coinbase standard fee structure for regular users'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Binance Standard', 
  'fee', 
  '{"model": "fixed", "makerFeeBps": 10, "takerFeeBps": 10, "description": "Binance standard fee tier (0.1% maker, 0.1% taker)"}',
  'Simulates Binance standard fee structure for regular users'
),

-- Latency models
(
  '00000000-0000-0000-0000-000000000000',
  'No Latency', 
  'latency', 
  '{"model": "fixed", "latencyMs": 0, "description": "Zero network latency"}',
  'Simulates instant order execution with no network delay'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Low Latency', 
  'latency', 
  '{"model": "fixed", "latencyMs": 50, "description": "50ms fixed network latency"}',
  'Simulates low latency environment with 50ms response time'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Moderate Latency', 
  'latency', 
  '{"model": "normal", "meanMs": 100, "stdDevMs": 30, "description": "~100ms average network latency with variation"}',
  'Simulates moderate latency with normal distribution around 100ms'
),
(
  '00000000-0000-0000-0000-000000000000',
  'High Latency', 
  'latency', 
  '{"model": "normal", "meanMs": 250, "stdDevMs": 100, "description": "~250ms average network latency with high variation"}',
  'Simulates high latency conditions such as poor connection or high traffic'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Variable Latency', 
  'latency', 
  '{"model": "spiky", "baseMs": 75, "spikeMs": 500, "spikeFrequency": 0.05, "description": "Variable latency with occasional spikes"}',
  'Simulates realistic network conditions with occasional latency spikes'
),

-- Error models
(
  '00000000-0000-0000-0000-000000000000',
  'No Errors', 
  'error', 
  '{"model": "none", "type": "none", "description": "No simulated errors"}',
  'Does not inject any simulated errors into the trading system'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Mild Errors', 
  'error', 
  '{"model": "random", "type": "random", "networkErrorRate": 0.01, "rateLimitErrorRate": 0.005, "insufficientFundsRate": 0.002, "description": "Occasional random errors"}',
  'Simulates occasional errors such as network timeouts and rate limits'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Moderate Errors', 
  'error', 
  '{"model": "random", "type": "random", "networkErrorRate": 0.03, "rateLimitErrorRate": 0.02, "insufficientFundsRate": 0.01, "description": "Frequent random errors"}',
  'Simulates frequent errors of various types to test robustness'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Heavy Rate Limiting', 
  'error', 
  '{"model": "specific", "type": "rateLimit", "errorRate": 0.1, "description": "Frequent rate limit errors"}',
  'Simulates heavy rate limiting from the exchange API'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Intermittent Connection', 
  'error', 
  '{"model": "specific", "type": "network", "errorRate": 0.1, "description": "Frequent network errors"}',
  'Simulates intermittent network connectivity issues'
),

-- Fill models
(
  '00000000-0000-0000-0000-000000000000',
  'Instant Fills', 
  'fill', 
  '{"model": "instant", "description": "Instant order fills"}',
  'All limit orders are filled instantly at the specified price'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Realistic Fills', 
  'fill', 
  '{"model": "price_based", "description": "Fills based on price movement"}',
  'Limit orders fill when the market price crosses the limit price with realistic timing'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Partial Fills', 
  'fill', 
  '{"model": "partial", "fillProbability": 0.7, "description": "Orders may fill partially"}',
  'Simulates partial order fills where the full order amount may not be executed'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Time-Decay Fills', 
  'fill', 
  '{"model": "time_decay", "description": "Fill probability decreases with time"}',
  'The longer a limit order sits, the less likely it is to be filled completely'
),
(
  '00000000-0000-0000-0000-000000000000',
  'Market Dependent Fills', 
  'fill', 
  '{"model": "market_dependent", "description": "Fills depend on market volatility"}',
  'Order fill behavior changes based on simulated market volatility conditions'
);
