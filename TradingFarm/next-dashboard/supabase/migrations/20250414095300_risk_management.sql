-- Migration: Add risk management and strategy execution tables
-- This migration adds tables for risk parameters and strategy execution tracking

-- Create risk_parameters table
CREATE TABLE IF NOT EXISTS public.risk_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    max_position_size NUMERIC(24, 8),
    max_drawdown_percent NUMERIC(5, 2),
    max_daily_loss NUMERIC(24, 8),
    max_leverage NUMERIC(5, 2) DEFAULT 1,
    position_sizing_method VARCHAR(50) DEFAULT 'fixed',
    position_sizing_config JSONB DEFAULT '{}'::jsonb,
    stop_loss_config JSONB DEFAULT '{}'::jsonb,
    take_profit_config JSONB DEFAULT '{}'::jsonb,
    correlation_limits JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    applies_to JSONB DEFAULT '{"strategies": [], "symbols": [], "exchanges": []}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for risk_parameters
CREATE INDEX IF NOT EXISTS idx_risk_parameters_user_id ON public.risk_parameters(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_parameters_farm_id ON public.risk_parameters(farm_id);
CREATE INDEX IF NOT EXISTS idx_risk_parameters_is_active ON public.risk_parameters(is_active);

-- Create strategy_execution table
CREATE TABLE IF NOT EXISTS public.strategy_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
    exchange_connection_id UUID REFERENCES public.exchange_connections(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES public.elizaos_agents(id) ON DELETE SET NULL,
    risk_parameter_id UUID REFERENCES public.risk_parameters(id) ON DELETE SET NULL,
    start_timestamp TIMESTAMPTZ NOT NULL,
    end_timestamp TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'running',
    symbols JSONB NOT NULL,
    is_paper_trading BOOLEAN DEFAULT TRUE,
    execution_parameters JSONB DEFAULT '{}'::jsonb,
    performance_metrics JSONB DEFAULT '{
        "total_trades": 0,
        "win_rate": 0,
        "profit_factor": 0,
        "max_drawdown": 0,
        "total_pnl": 0
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_strategy_execution_status CHECK (status IN ('running', 'paused', 'completed', 'failed', 'stopped'))
);

-- Create indexes for strategy_executions
CREATE INDEX IF NOT EXISTS idx_strategy_executions_user_id ON public.strategy_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_executions_farm_id ON public.strategy_executions(farm_id);
CREATE INDEX IF NOT EXISTS idx_strategy_executions_strategy_id ON public.strategy_executions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_executions_exchange_connection_id ON public.strategy_executions(exchange_connection_id);
CREATE INDEX IF NOT EXISTS idx_strategy_executions_agent_id ON public.strategy_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_strategy_executions_status ON public.strategy_executions(status);
CREATE INDEX IF NOT EXISTS idx_strategy_executions_start_timestamp ON public.strategy_executions(start_timestamp);

-- Create strategy_signals table
CREATE TABLE IF NOT EXISTS public.strategy_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
    strategy_execution_id UUID REFERENCES public.strategy_executions(id) ON DELETE SET NULL,
    signal_timestamp TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    signal_type VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    strength NUMERIC(5, 2),
    price_target NUMERIC(24, 8),
    stop_loss NUMERIC(24, 8),
    timeframe VARCHAR(20),
    confidence NUMERIC(5, 2),
    execution_status VARCHAR(20) DEFAULT 'pending',
    execution_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_signal_direction CHECK (direction IN ('long', 'short', 'neutral', 'exit')),
    CONSTRAINT chk_signal_execution_status CHECK (execution_status IN ('pending', 'executed', 'ignored', 'failed', 'expired'))
);

-- Create indexes for strategy_signals
CREATE INDEX IF NOT EXISTS idx_strategy_signals_user_id ON public.strategy_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_signals_farm_id ON public.strategy_signals(farm_id);
CREATE INDEX IF NOT EXISTS idx_strategy_signals_strategy_id ON public.strategy_signals(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_signals_strategy_execution_id ON public.strategy_signals(strategy_execution_id);
CREATE INDEX IF NOT EXISTS idx_strategy_signals_symbol ON public.strategy_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_strategy_signals_signal_timestamp ON public.strategy_signals(signal_timestamp);
CREATE INDEX IF NOT EXISTS idx_strategy_signals_execution_status ON public.strategy_signals(execution_status);

-- Add triggers for automatic timestamp handling
CREATE TRIGGER handle_risk_parameters_created_at
BEFORE INSERT ON public.risk_parameters
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_risk_parameters_updated_at
BEFORE UPDATE ON public.risk_parameters
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_strategy_executions_created_at
BEFORE INSERT ON public.strategy_executions
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_strategy_executions_updated_at
BEFORE UPDATE ON public.strategy_executions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_strategy_signals_created_at
BEFORE INSERT ON public.strategy_signals
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_strategy_signals_updated_at
BEFORE UPDATE ON public.strategy_signals
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.risk_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_signals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for risk_parameters
CREATE POLICY "Users can view their own risk parameters"
ON public.risk_parameters FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = risk_parameters.farm_id
        AND farm_users.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create their own risk parameters"
ON public.risk_parameters FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = risk_parameters.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin', 'risk_manager')
    )
);

CREATE POLICY "Users can update their own risk parameters"
ON public.risk_parameters FOR UPDATE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = risk_parameters.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin', 'risk_manager')
    )
);

CREATE POLICY "Users can delete their own risk parameters"
ON public.risk_parameters FOR DELETE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = risk_parameters.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin')
    )
);

-- Create RLS policies for strategy_executions
CREATE POLICY "Users can view strategy executions they have access to"
ON public.strategy_executions FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = strategy_executions.farm_id
        AND farm_users.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create strategy executions"
ON public.strategy_executions FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = strategy_executions.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin', 'trader')
    )
);

CREATE POLICY "Users can update strategy executions"
ON public.strategy_executions FOR UPDATE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = strategy_executions.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin', 'trader')
    )
);

-- Create RLS policies for strategy_signals
CREATE POLICY "Users can view strategy signals they have access to"
ON public.strategy_signals FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = strategy_signals.farm_id
        AND farm_users.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create strategy signals"
ON public.strategy_signals FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = strategy_signals.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin', 'trader', 'analyst')
    )
);

CREATE POLICY "Users can update strategy signals"
ON public.strategy_signals FOR UPDATE
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.farm_users
        WHERE farm_users.farm_id = strategy_signals.farm_id
        AND farm_users.user_id = auth.uid()
        AND farm_users.role IN ('owner', 'admin', 'trader')
    )
);

-- Function to validate a risk check for a potential trade
CREATE OR REPLACE FUNCTION public.validate_risk_check(
    p_user_id UUID,
    p_farm_id UUID,
    p_strategy_id UUID,
    p_symbol VARCHAR(50),
    p_side VARCHAR(10),
    p_quantity NUMERIC(24, 8),
    p_price NUMERIC(24, 8),
    p_risk_parameter_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY INVOKER
SET search_path = '';
LANGUAGE plpgsql AS $$
DECLARE
    v_risk_param_id UUID;
    v_max_position_size NUMERIC(24, 8);
    v_max_drawdown NUMERIC(5, 2);
    v_current_position_size NUMERIC(24, 8);
    v_current_exposure NUMERIC(24, 8);
    v_position_count INTEGER;
    v_daily_pnl NUMERIC(24, 8);
    v_max_daily_loss NUMERIC(24, 8);
    v_check_passed BOOLEAN := TRUE;
    v_result JSONB;
    v_errors TEXT[] := '{}';
BEGIN
    -- Authorization check
    IF auth.uid() <> p_user_id AND 
       NOT EXISTS (
            SELECT 1 FROM public.farm_users
            WHERE farm_users.farm_id = p_farm_id
            AND farm_users.user_id = auth.uid()
            AND farm_users.role IN ('owner', 'admin', 'trader', 'risk_manager')
        ) THEN
        RAISE EXCEPTION 'Not authorized to perform risk check';
    END IF;
    
    -- Find applicable risk parameter if not provided
    IF p_risk_parameter_id IS NULL THEN
        SELECT id INTO v_risk_param_id
        FROM public.risk_parameters
        WHERE farm_id = p_farm_id
        AND is_active = TRUE
        AND (
            applies_to->'strategies' @> jsonb_build_array(p_strategy_id::TEXT)
            OR applies_to->'symbols' @> jsonb_build_array(p_symbol)
            OR jsonb_array_length(applies_to->'strategies') = 0 -- applies to all if empty
        )
        ORDER BY created_at DESC
        LIMIT 1;
    ELSE
        v_risk_param_id := p_risk_parameter_id;
    END IF;
    
    -- No risk parameters found, allow the trade but with warning
    IF v_risk_param_id IS NULL THEN
        RETURN jsonb_build_object(
            'passed', TRUE,
            'warnings', jsonb_build_array('No risk parameters found for this trade'),
            'errors', jsonb_build_array(),
            'details', jsonb_build_object()
        );
    END IF;
    
    -- Get risk parameters
    SELECT 
        max_position_size,
        max_drawdown_percent,
        max_daily_loss
    INTO 
        v_max_position_size,
        v_max_drawdown,
        v_max_daily_loss
    FROM public.risk_parameters
    WHERE id = v_risk_param_id;
    
    -- Get current position size for the symbol
    SELECT COALESCE(SUM(quantity * current_price), 0)
    INTO v_current_position_size
    FROM public.positions
    WHERE farm_id = p_farm_id
    AND symbol = p_symbol
    AND status = 'open';
    
    -- Calculate new position size
    v_current_position_size := v_current_position_size + (p_quantity * p_price);
    
    -- Check if exceeds max position size
    IF v_max_position_size IS NOT NULL AND v_current_position_size > v_max_position_size THEN
        v_check_passed := FALSE;
        v_errors := array_append(v_errors, 'Trade exceeds maximum position size');
    END IF;
    
    -- Get daily PNL
    SELECT COALESCE(SUM(realized_pnl), 0)
    INTO v_daily_pnl
    FROM public.trades
    WHERE farm_id = p_farm_id
    AND execution_timestamp >= CURRENT_DATE;
    
    -- Check if exceeds max daily loss
    IF v_max_daily_loss IS NOT NULL AND v_daily_pnl < -v_max_daily_loss THEN
        v_check_passed := FALSE;
        v_errors := array_append(v_errors, 'Maximum daily loss exceeded');
    END IF;
    
    -- Build result object
    v_result := jsonb_build_object(
        'passed', v_check_passed,
        'risk_parameter_id', v_risk_param_id,
        'errors', v_errors,
        'details', jsonb_build_object(
            'max_position_size', v_max_position_size,
            'current_position_size', v_current_position_size,
            'max_daily_loss', v_max_daily_loss,
            'current_daily_pnl', v_daily_pnl
        )
    );
    
    RETURN v_result;
END;
$$;
