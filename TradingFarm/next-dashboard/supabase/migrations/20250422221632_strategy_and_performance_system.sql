-- Strategy Engine and Performance Monitoring System Migration
-- This migration adds the necessary tables for the strategy engine, 
-- backtesting system, and performance monitoring

-- Create types
DO $$ BEGIN
    CREATE TYPE strategy_status_enum AS ENUM ('active', 'inactive', 'error');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE backtest_status_enum AS ENUM ('pending', 'running', 'completed', 'failed');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE timeframe_enum AS ENUM ('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w');
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create functions for historical data management
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 1. Strategy Registry - For managing strategy templates/types
CREATE TABLE IF NOT EXISTS public.strategy_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    author VARCHAR(255),
    parameters JSONB NOT NULL DEFAULT '{}',
    required_data_feeds VARCHAR(255)[],
    default_timeframe timeframe_enum DEFAULT '1d',
    tags VARCHAR(255)[],
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Strategy Instances - For user created strategies
CREATE TABLE IF NOT EXISTS public.strategy_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL DEFAULT '{}',
    symbols VARCHAR(255)[] NOT NULL,
    timeframes timeframe_enum[] NOT NULL,
    is_active BOOLEAN DEFAULT false,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_executed_at TIMESTAMPTZ,
    last_signal JSONB,
    execution_frequency INTEGER DEFAULT 60, -- in minutes
    tags VARCHAR(255)[],
    status strategy_status_enum DEFAULT 'inactive',
    error_message TEXT
);

-- 3. Strategy Signals - For storing strategy generated signals
CREATE TABLE IF NOT EXISTS public.strategy_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_instance_id UUID NOT NULL REFERENCES public.strategy_instances(id) ON DELETE CASCADE,
    symbol VARCHAR(255) NOT NULL,
    timeframe timeframe_enum NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    strength INTEGER, -- 0-100 confidence level
    metadata JSONB,
    is_executed BOOLEAN DEFAULT false,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Backtest Results - For storing strategy backtest results
CREATE TABLE IF NOT EXISTS public.backtest_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_id VARCHAR(255) NOT NULL,
    parameters JSONB NOT NULL,
    symbols VARCHAR(255)[] NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    initial_capital DECIMAL(18, 2) NOT NULL,
    timeframe timeframe_enum NOT NULL,
    result JSONB NOT NULL DEFAULT '{}',
    status backtest_status_enum DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Historical Data - For storing time series data for backtesting
CREATE TABLE IF NOT EXISTS public.historical_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(255) NOT NULL,
    exchange VARCHAR(255) NOT NULL,
    timeframe timeframe_enum NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    open DECIMAL(18, 8) NOT NULL,
    high DECIMAL(18, 8) NOT NULL,
    low DECIMAL(18, 8) NOT NULL,
    close DECIMAL(18, 8) NOT NULL,
    volume DECIMAL(18, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (symbol, exchange, timeframe, timestamp)
);

-- 6. Performance Metrics - For storing strategy performance metrics
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_instance_id UUID NOT NULL REFERENCES public.strategy_instances(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Strategy Execution Logs - For tracking strategy execution
CREATE TABLE IF NOT EXISTS public.strategy_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_instance_id UUID NOT NULL REFERENCES public.strategy_instances(id) ON DELETE CASCADE,
    execution_start TIMESTAMPTZ NOT NULL,
    execution_end TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    signals_generated INTEGER DEFAULT 0,
    error_message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_strategy_instances_user_id ON public.strategy_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_signals_strategy_instance_id ON public.strategy_signals(strategy_instance_id);
CREATE INDEX IF NOT EXISTS idx_backtest_results_user_id ON public.backtest_results(user_id);
CREATE INDEX IF NOT EXISTS idx_historical_data_symbol_timeframe ON public.historical_data(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_historical_data_timestamp ON public.historical_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_strategy_instance_id ON public.performance_metrics(strategy_instance_id);
CREATE INDEX IF NOT EXISTS idx_strategy_execution_logs_strategy_instance_id ON public.strategy_execution_logs(strategy_instance_id);

-- Set up triggers for created_at and updated_at columns
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.strategy_registry
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.strategy_instances
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.backtest_results
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.performance_metrics
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.strategy_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for strategy_registry
CREATE POLICY "Public strategies are viewable by everyone"
ON public.strategy_registry
FOR SELECT
USING (is_public = TRUE);

CREATE POLICY "Users can view their own strategies"
ON public.strategy_registry
FOR SELECT
USING (author = auth.uid()::TEXT);

CREATE POLICY "Users can insert their own strategies"
ON public.strategy_registry
FOR INSERT
WITH CHECK (author = auth.uid()::TEXT);

CREATE POLICY "Users can update their own strategies"
ON public.strategy_registry
FOR UPDATE
USING (author = auth.uid()::TEXT);

CREATE POLICY "Users can delete their own strategies"
ON public.strategy_registry
FOR DELETE
USING (author = auth.uid()::TEXT);

-- Create RLS policies for strategy_instances
CREATE POLICY "Users can view their own strategy instances"
ON public.strategy_instances
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own strategy instances"
ON public.strategy_instances
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own strategy instances"
ON public.strategy_instances
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own strategy instances"
ON public.strategy_instances
FOR DELETE
USING (user_id = auth.uid());

-- Create RLS policies for strategy_signals
CREATE POLICY "Users can view signals from their own strategies"
ON public.strategy_signals
FOR SELECT
USING (
    strategy_instance_id IN (
        SELECT id FROM public.strategy_instances WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert signals for their own strategies"
ON public.strategy_signals
FOR INSERT
WITH CHECK (
    strategy_instance_id IN (
        SELECT id FROM public.strategy_instances WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update signals from their own strategies"
ON public.strategy_signals
FOR UPDATE
USING (
    strategy_instance_id IN (
        SELECT id FROM public.strategy_instances WHERE user_id = auth.uid()
    )
);

-- Create RLS policies for backtest_results
CREATE POLICY "Users can view their own backtest results"
ON public.backtest_results
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own backtest results"
ON public.backtest_results
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own backtest results"
ON public.backtest_results
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own backtest results"
ON public.backtest_results
FOR DELETE
USING (user_id = auth.uid());

-- Create RLS policies for historical_data
CREATE POLICY "Historical data is viewable by authenticated users"
ON public.historical_data
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Only administrators can insert historical data"
ON public.historical_data
FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');

-- Create RLS policies for performance_metrics
CREATE POLICY "Users can view performance metrics for their strategies"
ON public.performance_metrics
FOR SELECT
USING (
    strategy_instance_id IN (
        SELECT id FROM public.strategy_instances WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert performance metrics for their strategies"
ON public.performance_metrics
FOR INSERT
WITH CHECK (
    strategy_instance_id IN (
        SELECT id FROM public.strategy_instances WHERE user_id = auth.uid()
    )
);

-- Create RLS policies for strategy_execution_logs
CREATE POLICY "Users can view execution logs for their strategies"
ON public.strategy_execution_logs
FOR SELECT
USING (
    strategy_instance_id IN (
        SELECT id FROM public.strategy_instances WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert execution logs for their strategies"
ON public.strategy_execution_logs
FOR INSERT
WITH CHECK (
    strategy_instance_id IN (
        SELECT id FROM public.strategy_instances WHERE user_id = auth.uid()
    )
);

-- Create a stored procedure to run backtest
CREATE OR REPLACE FUNCTION public.run_backtest(
    p_strategy_id TEXT,
    p_parameters JSONB,
    p_symbols TEXT[],
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_initial_capital NUMERIC,
    p_timeframe TEXT,
    p_risk_profile_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_backtest_id UUID;
    v_user_id UUID;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Create a new backtest record
    INSERT INTO public.backtest_results (
        id,
        user_id,
        strategy_id,
        parameters,
        symbols,
        start_date,
        end_date,
        initial_capital,
        timeframe,
        status
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        p_strategy_id,
        p_parameters,
        p_symbols,
        p_start_date,
        p_end_date,
        p_initial_capital,
        p_timeframe::timeframe_enum,
        'pending'
    )
    RETURNING id INTO v_backtest_id;
    
    -- Return the backtest ID
    RETURN v_backtest_id;
END;
$$;