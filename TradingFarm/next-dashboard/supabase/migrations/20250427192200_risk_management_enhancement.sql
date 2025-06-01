-- Migration for Advanced Risk Management System
-- This migration adds tables and functions for comprehensive risk management,
-- position monitoring, and automated safeguards

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Risk Profile table
CREATE TABLE IF NOT EXISTS public.risk_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL,
    profile_name TEXT NOT NULL,
    description TEXT,
    risk_level TEXT NOT NULL, -- 'conservative', 'moderate', 'aggressive', 'custom'
    max_drawdown_percent DECIMAL(5, 2) NOT NULL,
    position_size_limit_percent DECIMAL(5, 2) NOT NULL,
    max_leverage DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    correlation_threshold DECIMAL(5, 2),
    volatility_threshold DECIMAL(5, 2),
    daily_loss_limit_percent DECIMAL(5, 2),
    weekly_loss_limit_percent DECIMAL(5, 2),
    monthly_loss_limit_percent DECIMAL(5, 2),
    max_positions_per_market INTEGER,
    auto_close_triggers JSONB,
    diversification_rules JSONB,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, farm_id, profile_name)
);

-- Add timestamp triggers
CREATE TRIGGER handle_risk_profiles_created_at
BEFORE INSERT ON public.risk_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_risk_profiles_updated_at
BEFORE UPDATE ON public.risk_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policy for risk profiles
CREATE POLICY "Users can manage their own risk profiles"
ON public.risk_profiles
USING (auth.uid() = user_id);

-- Risk Events table for tracking and auditing
CREATE TABLE IF NOT EXISTS public.risk_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL,
    profile_id UUID REFERENCES public.risk_profiles(id),
    event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_type TEXT NOT NULL, -- 'warning', 'violation', 'auto_action', 'manual_override'
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    event_description TEXT NOT NULL,
    metric_name TEXT NOT NULL, -- 'drawdown', 'position_size', 'daily_loss', etc.
    threshold_value DECIMAL(10, 2),
    actual_value DECIMAL(10, 2),
    action_taken TEXT,
    market TEXT,
    position_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Convert risk_events to hypertable for time-series optimization
SELECT create_hypertable('public.risk_events', 'event_time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Add timestamp triggers
CREATE TRIGGER handle_risk_events_created_at
BEFORE INSERT ON public.risk_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_risk_events_updated_at
BEFORE UPDATE ON public.risk_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

-- RLS policy for risk events
CREATE POLICY "Users can view their own risk events"
ON public.risk_events
USING (auth.uid() = user_id);

-- Risk Monitors table for active monitors
CREATE TABLE IF NOT EXISTS public.risk_monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL,
    profile_id UUID REFERENCES public.risk_profiles(id),
    monitor_name TEXT NOT NULL,
    monitor_type TEXT NOT NULL, -- 'drawdown', 'volatility', 'correlation', 'exposure', 'concentration'
    monitored_markets TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    check_interval_seconds INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notification_channels TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    auto_actions JSONB,
    last_checked_at TIMESTAMPTZ,
    configuration JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, farm_id, monitor_name)
);

-- Add timestamp triggers
CREATE TRIGGER handle_risk_monitors_created_at
BEFORE INSERT ON public.risk_monitors
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_risk_monitors_updated_at
BEFORE UPDATE ON public.risk_monitors
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.risk_monitors ENABLE ROW LEVEL SECURITY;

-- RLS policy for risk monitors
CREATE POLICY "Users can manage their own risk monitors"
ON public.risk_monitors
USING (auth.uid() = user_id);

-- Scenario Analysis table for stress testing
CREATE TABLE IF NOT EXISTS public.risk_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL,
    scenario_name TEXT NOT NULL,
    description TEXT,
    scenario_type TEXT NOT NULL, -- 'historical', 'custom', 'monte_carlo'
    market_conditions JSONB NOT NULL,
    position_adjustments JSONB,
    duration_days INTEGER,
    impact_summary JSONB,
    max_drawdown_percent DECIMAL(5, 2),
    probability_percent DECIMAL(5, 2),
    recommendations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, farm_id, scenario_name)
);

-- Add timestamp triggers
CREATE TRIGGER handle_risk_scenarios_created_at
BEFORE INSERT ON public.risk_scenarios
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_risk_scenarios_updated_at
BEFORE UPDATE ON public.risk_scenarios
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.risk_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS policy for risk scenarios
CREATE POLICY "Users can manage their own risk scenarios"
ON public.risk_scenarios
USING (auth.uid() = user_id);

-- Asset Correlations table
CREATE TABLE IF NOT EXISTS public.asset_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    time_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    calculation_date DATE NOT NULL,
    correlation_coefficient DECIMAL(5, 4) NOT NULL,
    sample_size INTEGER NOT NULL,
    confidence_level DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(base_asset, quote_asset, time_period, calculation_date)
);

-- Add timestamp triggers
CREATE TRIGGER handle_asset_correlations_created_at
BEFORE INSERT ON public.asset_correlations
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_asset_correlations_updated_at
BEFORE UPDATE ON public.asset_correlations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Position Sizing Recommendations table
CREATE TABLE IF NOT EXISTS public.position_size_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL,
    market TEXT NOT NULL,
    risk_profile_id UUID REFERENCES public.risk_profiles(id),
    calculation_date DATE NOT NULL,
    portfolio_value DECIMAL(24, 8) NOT NULL,
    recommended_size_percent DECIMAL(5, 2) NOT NULL,
    recommended_size_base DECIMAL(24, 8) NOT NULL,
    recommended_size_quote DECIMAL(24, 8) NOT NULL,
    max_leverage DECIMAL(5, 2) NOT NULL,
    volatility_factor DECIMAL(5, 2) NOT NULL,
    correlation_factor DECIMAL(5, 2),
    rationale TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, farm_id, market, calculation_date)
);

-- Add timestamp triggers
CREATE TRIGGER handle_position_size_recommendations_created_at
BEFORE INSERT ON public.position_size_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_position_size_recommendations_updated_at
BEFORE UPDATE ON public.position_size_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.position_size_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policy for position size recommendations
CREATE POLICY "Users can view their own position size recommendations"
ON public.position_size_recommendations
USING (auth.uid() = user_id);

-- Risk Management API Functions

-- Function to create or update a risk profile
CREATE OR REPLACE FUNCTION public.create_risk_profile(
    p_user_id UUID,
    p_farm_id UUID,
    p_profile_name TEXT,
    p_description TEXT,
    p_risk_level TEXT,
    p_max_drawdown_percent DECIMAL,
    p_position_size_limit_percent DECIMAL,
    p_max_leverage DECIMAL,
    p_daily_loss_limit_percent DECIMAL,
    p_weekly_loss_limit_percent DECIMAL,
    p_monthly_loss_limit_percent DECIMAL,
    p_auto_close_triggers JSONB DEFAULT NULL,
    p_diversification_rules JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_profile_id UUID;
    v_result JSONB;
BEGIN
    -- Check if the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure the user matches
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- Validate risk level
    IF p_risk_level NOT IN ('conservative', 'moderate', 'aggressive', 'custom') THEN
        RAISE EXCEPTION 'Invalid risk level. Must be one of: conservative, moderate, aggressive, custom';
    END IF;

    -- Insert or update the risk profile
    INSERT INTO public.risk_profiles (
        user_id,
        farm_id,
        profile_name,
        description,
        risk_level,
        max_drawdown_percent,
        position_size_limit_percent,
        max_leverage,
        daily_loss_limit_percent,
        weekly_loss_limit_percent,
        monthly_loss_limit_percent,
        auto_close_triggers,
        diversification_rules
    )
    VALUES (
        p_user_id,
        p_farm_id,
        p_profile_name,
        p_description,
        p_risk_level,
        p_max_drawdown_percent,
        p_position_size_limit_percent,
        p_max_leverage,
        p_daily_loss_limit_percent,
        p_weekly_loss_limit_percent,
        p_monthly_loss_limit_percent,
        COALESCE(p_auto_close_triggers, '{}'::jsonb),
        COALESCE(p_diversification_rules, '{}'::jsonb)
    )
    ON CONFLICT (user_id, farm_id, profile_name)
    DO UPDATE SET
        description = EXCLUDED.description,
        risk_level = EXCLUDED.risk_level,
        max_drawdown_percent = EXCLUDED.max_drawdown_percent,
        position_size_limit_percent = EXCLUDED.position_size_limit_percent,
        max_leverage = EXCLUDED.max_leverage,
        daily_loss_limit_percent = EXCLUDED.daily_loss_limit_percent,
        weekly_loss_limit_percent = EXCLUDED.weekly_loss_limit_percent,
        monthly_loss_limit_percent = EXCLUDED.monthly_loss_limit_percent,
        auto_close_triggers = EXCLUDED.auto_close_triggers,
        diversification_rules = EXCLUDED.diversification_rules,
        updated_at = now()
    RETURNING id INTO v_profile_id;

    -- Create result
    v_result := jsonb_build_object(
        'id', v_profile_id,
        'success', true,
        'message', 'Risk profile created/updated successfully'
    );

    RETURN v_result;
END;
$$;

-- Function to activate a risk profile
CREATE OR REPLACE FUNCTION public.activate_risk_profile(
    p_user_id UUID,
    p_farm_id UUID,
    p_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check if the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure the user matches
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- Deactivate all profiles for this farm
    UPDATE public.risk_profiles
    SET is_active = false
    WHERE user_id = p_user_id AND farm_id = p_farm_id;

    -- Activate the specified profile
    UPDATE public.risk_profiles
    SET is_active = true, updated_at = now()
    WHERE id = p_profile_id AND user_id = p_user_id AND farm_id = p_farm_id;

    -- Check if the profile was found
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Risk profile not found';
    END IF;

    -- Create result
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Risk profile activated successfully'
    );

    RETURN v_result;
END;
$$;

-- Function to log a risk event
CREATE OR REPLACE FUNCTION public.log_risk_event(
    p_user_id UUID,
    p_farm_id UUID,
    p_profile_id UUID,
    p_event_type TEXT,
    p_severity TEXT,
    p_event_description TEXT,
    p_metric_name TEXT,
    p_threshold_value DECIMAL DEFAULT NULL,
    p_actual_value DECIMAL DEFAULT NULL,
    p_action_taken TEXT DEFAULT NULL,
    p_market TEXT DEFAULT NULL,
    p_position_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_event_id UUID;
    v_result JSONB;
BEGIN
    -- Check if the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure the user matches
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- Validate event type
    IF p_event_type NOT IN ('warning', 'violation', 'auto_action', 'manual_override') THEN
        RAISE EXCEPTION 'Invalid event type. Must be one of: warning, violation, auto_action, manual_override';
    END IF;

    -- Validate severity
    IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
        RAISE EXCEPTION 'Invalid severity. Must be one of: low, medium, high, critical';
    END IF;

    -- Insert the risk event
    INSERT INTO public.risk_events (
        user_id,
        farm_id,
        profile_id,
        event_type,
        severity,
        event_description,
        metric_name,
        threshold_value,
        actual_value,
        action_taken,
        market,
        position_id,
        metadata
    )
    VALUES (
        p_user_id,
        p_farm_id,
        p_profile_id,
        p_event_type,
        p_severity,
        p_event_description,
        p_metric_name,
        p_threshold_value,
        p_actual_value,
        p_action_taken,
        p_market,
        p_position_id,
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_event_id;

    -- Create result
    v_result := jsonb_build_object(
        'id', v_event_id,
        'success', true,
        'message', 'Risk event logged successfully'
    );

    RETURN v_result;
END;
$$;

-- Function to create a risk monitor
CREATE OR REPLACE FUNCTION public.create_risk_monitor(
    p_user_id UUID,
    p_farm_id UUID,
    p_profile_id UUID,
    p_monitor_name TEXT,
    p_monitor_type TEXT,
    p_monitored_markets TEXT[],
    p_check_interval_seconds INTEGER,
    p_notification_channels TEXT[],
    p_auto_actions JSONB,
    p_configuration JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_monitor_id UUID;
    v_result JSONB;
BEGIN
    -- Check if the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure the user matches
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- Validate monitor type
    IF p_monitor_type NOT IN ('drawdown', 'volatility', 'correlation', 'exposure', 'concentration') THEN
        RAISE EXCEPTION 'Invalid monitor type. Must be one of: drawdown, volatility, correlation, exposure, concentration';
    END IF;

    -- Insert or update the risk monitor
    INSERT INTO public.risk_monitors (
        user_id,
        farm_id,
        profile_id,
        monitor_name,
        monitor_type,
        monitored_markets,
        check_interval_seconds,
        notification_channels,
        auto_actions,
        configuration
    )
    VALUES (
        p_user_id,
        p_farm_id,
        p_profile_id,
        p_monitor_name,
        p_monitor_type,
        p_monitored_markets,
        p_check_interval_seconds,
        p_notification_channels,
        COALESCE(p_auto_actions, '{}'::jsonb),
        p_configuration
    )
    ON CONFLICT (user_id, farm_id, monitor_name)
    DO UPDATE SET
        profile_id = EXCLUDED.profile_id,
        monitor_type = EXCLUDED.monitor_type,
        monitored_markets = EXCLUDED.monitored_markets,
        check_interval_seconds = EXCLUDED.check_interval_seconds,
        notification_channels = EXCLUDED.notification_channels,
        auto_actions = EXCLUDED.auto_actions,
        configuration = EXCLUDED.configuration,
        updated_at = now()
    RETURNING id INTO v_monitor_id;

    -- Create result
    v_result := jsonb_build_object(
        'id', v_monitor_id,
        'success', true,
        'message', 'Risk monitor created/updated successfully'
    );

    RETURN v_result;
END;
$$;

-- Function to calculate recommended position size
CREATE OR REPLACE FUNCTION public.calculate_position_size(
    p_user_id UUID,
    p_farm_id UUID,
    p_market TEXT,
    p_risk_profile_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_profile_record public.risk_profiles%ROWTYPE;
    v_portfolio_value DECIMAL;
    v_volatility_factor DECIMAL;
    v_correlation_factor DECIMAL;
    v_max_position_size DECIMAL;
    v_max_leverage DECIMAL;
    v_recommended_size_percent DECIMAL;
    v_recommended_size_base DECIMAL;
    v_recommended_size_quote DECIMAL;
    v_recommendation_id UUID;
    v_result JSONB;
BEGIN
    -- Check if the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure the user matches
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- Get the active risk profile if not specified
    IF p_risk_profile_id IS NULL THEN
        SELECT * INTO v_profile_record
        FROM public.risk_profiles
        WHERE user_id = p_user_id AND farm_id = p_farm_id AND is_active = true;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'No active risk profile found';
        END IF;
    ELSE
        SELECT * INTO v_profile_record
        FROM public.risk_profiles
        WHERE id = p_risk_profile_id AND user_id = p_user_id AND farm_id = p_farm_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Risk profile not found';
        END IF;
    END IF;

    -- Get total portfolio value (placeholder - would be calculated from actual positions)
    v_portfolio_value := 100000.00; -- Placeholder value

    -- Calculate volatility factor (placeholder - would be based on actual market data)
    v_volatility_factor := 0.8; -- Placeholder value

    -- Calculate correlation factor (placeholder - would be based on actual correlations)
    v_correlation_factor := 0.9; -- Placeholder value

    -- Get max position size from the risk profile
    v_max_position_size := v_profile_record.position_size_limit_percent;
    v_max_leverage := v_profile_record.max_leverage;

    -- Calculate recommended position size
    v_recommended_size_percent := v_max_position_size * v_volatility_factor * v_correlation_factor;
    v_recommended_size_quote := (v_portfolio_value * v_recommended_size_percent / 100);
    v_recommended_size_base := v_recommended_size_quote / 50000; -- Placeholder price of asset

    -- Insert the recommendation
    INSERT INTO public.position_size_recommendations (
        user_id,
        farm_id,
        market,
        risk_profile_id,
        calculation_date,
        portfolio_value,
        recommended_size_percent,
        recommended_size_base,
        recommended_size_quote,
        max_leverage,
        volatility_factor,
        correlation_factor,
        rationale
    )
    VALUES (
        p_user_id,
        p_farm_id,
        p_market,
        v_profile_record.id,
        CURRENT_DATE,
        v_portfolio_value,
        v_recommended_size_percent,
        v_recommended_size_base,
        v_recommended_size_quote,
        v_max_leverage,
        v_volatility_factor,
        v_correlation_factor,
        'Based on current market volatility and portfolio correlation'
    )
    RETURNING id INTO v_recommendation_id;

    -- Create result
    v_result := jsonb_build_object(
        'id', v_recommendation_id,
        'market', p_market,
        'portfolio_value', v_portfolio_value,
        'recommended_size_percent', v_recommended_size_percent,
        'recommended_size_base', v_recommended_size_base,
        'recommended_size_quote', v_recommended_size_quote,
        'max_leverage', v_max_leverage,
        'success', true,
        'message', 'Position size calculated successfully'
    );

    RETURN v_result;
END;
$$;
