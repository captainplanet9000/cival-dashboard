-- Migration: Strategy Execution Engine
-- Creates tables and functions for strategy execution, backtest visualization,
-- and natural language strategy creation

-- Create enum for strategy execution status
CREATE TYPE public.strategy_execution_status AS ENUM (
  'idle', 'running', 'paused', 'error', 'completed', 'backtesting'
);

-- Create enum for strategy signal types
CREATE TYPE public.strategy_signal_type AS ENUM (
  'entry', 'exit', 'adjust', 'alert'
);

-- Create table for strategy executions
CREATE TABLE IF NOT EXISTS public.strategy_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  exchange VARCHAR(50) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  status strategy_execution_status NOT NULL DEFAULT 'idle',
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  last_run TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  parameters JSONB DEFAULT '{}'::JSONB,
  performance_metrics JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_strategy_executions
BEFORE UPDATE ON public.strategy_executions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.strategy_executions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own strategy executions"
ON public.strategy_executions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own strategy executions"
ON public.strategy_executions
FOR ALL
USING (auth.uid() = user_id);

-- Create table for strategy signals
CREATE TABLE IF NOT EXISTS public.strategy_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES public.strategy_executions(id) ON DELETE CASCADE,
  signal_type strategy_signal_type NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  price NUMERIC,
  quantity NUMERIC,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  confidence NUMERIC, -- 0 to 1 confidence level
  reasons JSONB, -- Array of reasons for the signal
  parameters JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.strategy_signals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own strategy signals"
ON public.strategy_signals
FOR SELECT
USING (auth.uid() = user_id);

-- Create table for strategy_templates
CREATE TABLE IF NOT EXISTS public.strategy_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  strategy_type VARCHAR(50) NOT NULL,
  base_code TEXT NOT NULL,
  parameters_schema JSONB NOT NULL, -- JSON Schema defining required parameters
  default_parameters JSONB DEFAULT '{}'::JSONB,
  version VARCHAR(20) NOT NULL,
  author UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_strategy_templates
BEFORE UPDATE ON public.strategy_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.strategy_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view public strategy templates"
ON public.strategy_templates
FOR SELECT
USING (is_public = TRUE);

CREATE POLICY "Users can view their own strategy templates"
ON public.strategy_templates
FOR SELECT
USING (auth.uid() = author);

CREATE POLICY "Users can manage their own strategy templates"
ON public.strategy_templates
FOR ALL
USING (auth.uid() = author);

-- Create table for backtest visualizations
CREATE TABLE IF NOT EXISTS public.backtest_visualizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backtest_id UUID NOT NULL REFERENCES public.backtest_results(id) ON DELETE CASCADE,
  visualization_type VARCHAR(50) NOT NULL, -- equity_curve, drawdown, etc.
  chart_data JSONB NOT NULL,
  settings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_backtest_visualizations
BEFORE UPDATE ON public.backtest_visualizations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.backtest_visualizations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own backtest visualizations"
ON public.backtest_visualizations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own backtest visualizations"
ON public.backtest_visualizations
FOR ALL
USING (auth.uid() = user_id);

-- Create table for natural language strategy definitions
CREATE TABLE IF NOT EXISTS public.nl_strategy_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  model_used VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_nl_strategy_definitions
BEFORE UPDATE ON public.nl_strategy_definitions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.nl_strategy_definitions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own NL strategy definitions"
ON public.nl_strategy_definitions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own NL strategy definitions"
ON public.nl_strategy_definitions
FOR ALL
USING (auth.uid() = user_id);

-- Create function to start strategy execution
CREATE OR REPLACE FUNCTION public.start_strategy_execution(
  p_farm_id UUID,
  p_strategy_id UUID,
  p_exchange VARCHAR(50),
  p_symbol VARCHAR(20),
  p_timeframe VARCHAR(10),
  p_parameters JSONB DEFAULT '{}'::JSONB,
  p_agent_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Ensure the farm belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.farms
    WHERE id = p_farm_id AND owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Farm not found or does not belong to user';
  END IF;
  
  -- Ensure the strategy exists
  IF NOT EXISTS (
    SELECT 1 FROM public.strategies
    WHERE id = p_strategy_id
  ) THEN
    RAISE EXCEPTION 'Strategy not found';
  END IF;
  
  -- If agent_id is provided, ensure it belongs to the user's farm
  IF p_agent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.agents
    WHERE id = p_agent_id AND farm_id = p_farm_id
  ) THEN
    RAISE EXCEPTION 'Agent not found or does not belong to this farm';
  END IF;
  
  -- Insert or update the strategy execution
  INSERT INTO public.strategy_executions (
    farm_id,
    agent_id,
    strategy_id,
    exchange,
    symbol,
    timeframe,
    status,
    start_time,
    last_run,
    parameters,
    user_id
  ) VALUES (
    p_farm_id,
    p_agent_id,
    p_strategy_id,
    p_exchange,
    p_symbol,
    p_timeframe,
    'running'::strategy_execution_status,
    NOW(),
    NOW(),
    p_parameters,
    v_user_id
  )
  RETURNING id INTO v_execution_id;
  
  RETURN v_execution_id;
END;
$$;

-- Function to stop strategy execution
CREATE OR REPLACE FUNCTION public.stop_strategy_execution(
  p_execution_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.strategy_executions
  SET
    status = 'idle'::strategy_execution_status,
    end_time = NOW(),
    updated_at = NOW()
  WHERE
    id = p_execution_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to pause strategy execution
CREATE OR REPLACE FUNCTION public.pause_strategy_execution(
  p_execution_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.strategy_executions
  SET
    status = 'paused'::strategy_execution_status,
    updated_at = NOW()
  WHERE
    id = p_execution_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to resume strategy execution
CREATE OR REPLACE FUNCTION public.resume_strategy_execution(
  p_execution_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.strategy_executions
  SET
    status = 'running'::strategy_execution_status,
    last_run = NOW(),
    updated_at = NOW()
  WHERE
    id = p_execution_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to create a strategy signal
CREATE OR REPLACE FUNCTION public.create_strategy_signal(
  p_execution_id UUID,
  p_signal_type strategy_signal_type,
  p_symbol VARCHAR(20),
  p_price NUMERIC,
  p_quantity NUMERIC,
  p_confidence NUMERIC DEFAULT NULL,
  p_reasons JSONB DEFAULT NULL,
  p_parameters JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signal_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Ensure the execution belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM public.strategy_executions
    WHERE id = p_execution_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Strategy execution not found or does not belong to user';
  END IF;
  
  -- Insert the strategy signal
  INSERT INTO public.strategy_signals (
    execution_id,
    signal_type,
    symbol,
    price,
    quantity,
    timestamp,
    confidence,
    reasons,
    parameters,
    user_id
  ) VALUES (
    p_execution_id,
    p_signal_type,
    p_symbol,
    p_price,
    p_quantity,
    NOW(),
    p_confidence,
    p_reasons,
    p_parameters,
    v_user_id
  )
  RETURNING id INTO v_signal_id;
  
  RETURN v_signal_id;
END;
$$;

-- Function to create strategy from natural language
CREATE OR REPLACE FUNCTION public.create_strategy_from_nl(
  p_prompt TEXT,
  p_model_used VARCHAR(100) DEFAULT 'gpt-4'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nl_strategy_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Insert the NL strategy definition
  INSERT INTO public.nl_strategy_definitions (
    user_id,
    prompt,
    model_used,
    status
  ) VALUES (
    v_user_id,
    p_prompt,
    p_model_used,
    'pending'
  )
  RETURNING id INTO v_nl_strategy_id;
  
  RETURN v_nl_strategy_id;
END;
$$;

-- Insert initial strategy templates
INSERT INTO public.strategy_templates (
  name,
  description,
  strategy_type,
  base_code,
  parameters_schema,
  default_parameters,
  version,
  is_public,
  tags
) VALUES 
(
  'Simple Moving Average Crossover',
  'A basic strategy that generates buy signals when a fast moving average crosses above a slow moving average, and sell signals when it crosses below.',
  'trend_following',
  '// Simple Moving Average Crossover Strategy
function initialize() {
  this.fastPeriod = this.params.fastPeriod || 10;
  this.slowPeriod = this.params.slowPeriod || 50;
}

function onTick(tick) {
  const fastMA = calculateSMA(this.priceHistory, this.fastPeriod);
  const slowMA = calculateSMA(this.priceHistory, this.slowPeriod);
  
  const prevFastMA = calculateSMA(this.priceHistory.slice(0, -1), this.fastPeriod);
  const prevSlowMA = calculateSMA(this.priceHistory.slice(0, -1), this.slowPeriod);
  
  // Check for crossover (buy signal)
  if (prevFastMA < prevSlowMA && fastMA > slowMA) {
    this.signal("entry", tick.symbol, tick.price, this.params.positionSize || 1);
  }
  
  // Check for crossunder (sell signal)
  if (prevFastMA > prevSlowMA && fastMA < slowMA) {
    this.signal("exit", tick.symbol, tick.price, this.params.positionSize || 1);
  }
}

function calculateSMA(prices, period) {
  if (prices.length < period) return 0;
  return prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
}',
  '{
    "type": "object",
    "properties": {
      "fastPeriod": {
        "type": "integer",
        "minimum": 1,
        "maximum": 200,
        "default": 10
      },
      "slowPeriod": {
        "type": "integer",
        "minimum": 2,
        "maximum": 500,
        "default": 50
      },
      "positionSize": {
        "type": "number",
        "minimum": 0.1,
        "default": 1
      }
    },
    "required": ["fastPeriod", "slowPeriod"]
  }',
  '{"fastPeriod": 10, "slowPeriod": 50, "positionSize": 1}',
  '1.0.0',
  TRUE,
  ARRAY['trend_following', 'moving_average', 'beginner']
),
(
  'RSI Mean Reversion',
  'A mean reversion strategy that uses the Relative Strength Index (RSI) to identify overbought and oversold conditions.',
  'mean_reversion',
  '// RSI Mean Reversion Strategy
function initialize() {
  this.rsiPeriod = this.params.rsiPeriod || 14;
  this.oversoldThreshold = this.params.oversoldThreshold || 30;
  this.overboughtThreshold = this.params.overboughtThreshold || 70;
}

function onTick(tick) {
  const rsi = calculateRSI(this.priceHistory, this.rsiPeriod);
  
  // Check for oversold condition (buy signal)
  if (rsi < this.oversoldThreshold) {
    this.signal("entry", tick.symbol, tick.price, this.params.positionSize || 1);
  }
  
  // Check for overbought condition (sell signal)
  if (rsi > this.overboughtThreshold) {
    this.signal("exit", tick.symbol, tick.price, this.params.positionSize || 1);
  }
}

function calculateRSI(prices, period) {
  if (prices.length <= period) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }
  
  const averageGain = gains / period;
  const averageLoss = losses / period;
  
  if (averageLoss === 0) return 100;
  const rs = averageGain / averageLoss;
  return 100 - (100 / (1 + rs));
}',
  '{
    "type": "object",
    "properties": {
      "rsiPeriod": {
        "type": "integer",
        "minimum": 2,
        "maximum": 50,
        "default": 14
      },
      "oversoldThreshold": {
        "type": "integer",
        "minimum": 1,
        "maximum": 40,
        "default": 30
      },
      "overboughtThreshold": {
        "type": "integer",
        "minimum": 60,
        "maximum": 99,
        "default": 70
      },
      "positionSize": {
        "type": "number",
        "minimum": 0.1,
        "default": 1
      }
    },
    "required": ["rsiPeriod", "oversoldThreshold", "overboughtThreshold"]
  }',
  '{"rsiPeriod": 14, "oversoldThreshold": 30, "overboughtThreshold": 70, "positionSize": 1}',
  '1.0.0',
  TRUE,
  ARRAY['mean_reversion', 'rsi', 'oscillator', 'intermediate']
),
(
  'MACD with Signal Line',
  'Uses the Moving Average Convergence Divergence (MACD) indicator with signal line crossovers to generate trading signals.',
  'trend_following',
  '// MACD with Signal Line Strategy
function initialize() {
  this.fastEMA = this.params.fastEMA || 12;
  this.slowEMA = this.params.slowEMA || 26;
  this.signalPeriod = this.params.signalPeriod || 9;
}

function onTick(tick) {
  const macd = calculateMACD(this.priceHistory, this.fastEMA, this.slowEMA, this.signalPeriod);
  const prevMacd = calculateMACD(this.priceHistory.slice(0, -1), this.fastEMA, this.slowEMA, this.signalPeriod);
  
  // Check for MACD crossing above signal line (buy)
  if (prevMacd.macdLine < prevMacd.signalLine && macd.macdLine > macd.signalLine) {
    this.signal("entry", tick.symbol, tick.price, this.params.positionSize || 1);
  }
  
  // Check for MACD crossing below signal line (sell)
  if (prevMacd.macdLine > prevMacd.signalLine && macd.macdLine < macd.signalLine) {
    this.signal("exit", tick.symbol, tick.price, this.params.positionSize || 1);
  }
}

function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod) {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macdLine = fastEMA - slowEMA;
  
  // Calculate signal line (EMA of MACD line)
  const macdHistory = [];
  for (let i = 0; i < prices.length; i++) {
    const fastEMA = calculateEMA(prices.slice(0, i + 1), fastPeriod);
    const slowEMA = calculateEMA(prices.slice(0, i + 1), slowPeriod);
    macdHistory.push(fastEMA - slowEMA);
  }
  
  const signalLine = calculateEMA(macdHistory, signalPeriod);
  
  return {
    macdLine,
    signalLine,
    histogram: macdLine - signalLine
  };
}',
  '{
    "type": "object",
    "properties": {
      "fastEMA": {
        "type": "integer",
        "minimum": 2,
        "maximum": 50,
        "default": 12
      },
      "slowEMA": {
        "type": "integer",
        "minimum": 10,
        "maximum": 100,
        "default": 26
      },
      "signalPeriod": {
        "type": "integer",
        "minimum": 2,
        "maximum": 50,
        "default": 9
      },
      "positionSize": {
        "type": "number",
        "minimum": 0.1,
        "default": 1
      }
    },
    "required": ["fastEMA", "slowEMA", "signalPeriod"]
  }',
  '{"fastEMA": 12, "slowEMA": 26, "signalPeriod": 9, "positionSize": 1}',
  '1.0.0',
  TRUE,
  ARRAY['trend_following', 'macd', 'oscillator', 'intermediate']
)
ON CONFLICT DO NOTHING;
