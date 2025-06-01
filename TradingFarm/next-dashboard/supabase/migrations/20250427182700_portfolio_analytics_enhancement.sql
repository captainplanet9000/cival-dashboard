-- Migration for Advanced Portfolio Analytics & Reporting
-- This migration adds tables and functions for enhanced portfolio analytics,
-- performance tracking, and customizable reporting features.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Portfolio Snapshot table (for storing historical portfolio states)
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL,
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_value DECIMAL(24, 8) NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'USD',
    spot_value DECIMAL(24, 8) NOT NULL DEFAULT 0,
    futures_value DECIMAL(24, 8) NOT NULL DEFAULT 0,
    margin_value DECIMAL(24, 8) NOT NULL DEFAULT 0,
    staking_value DECIMAL(24, 8) NOT NULL DEFAULT 0,
    unrealized_pnl DECIMAL(24, 8) NOT NULL DEFAULT 0,
    assets JSONB NOT NULL,
    allocation JSONB NOT NULL,
    exchange_distribution JSONB NOT NULL,
    risk_metrics JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Convert portfolio_snapshots to hypertable for time-series optimization
SELECT create_hypertable('public.portfolio_snapshots', 'snapshot_time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Add created_at and updated_at triggers
CREATE TRIGGER handle_portfolio_snapshots_created_at
BEFORE INSERT ON public.portfolio_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_portfolio_snapshots_updated_at
BEFORE UPDATE ON public.portfolio_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policy for portfolio snapshots
CREATE POLICY "Users can view their own portfolio snapshots"
ON public.portfolio_snapshots
USING (auth.uid() = user_id);

-- Performance Metrics table (for aggregated performance data)
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL,
    metric_date DATE NOT NULL,
    time_frame TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all-time'
    total_return DECIMAL(24, 8) NOT NULL DEFAULT 0,
    daily_return DECIMAL(24, 8),
    weekly_return DECIMAL(24, 8),
    monthly_return DECIMAL(24, 8),
    yearly_return DECIMAL(24, 8),
    sharpe_ratio DECIMAL(12, 6),
    sortino_ratio DECIMAL(12, 6),
    max_drawdown DECIMAL(12, 6),
    volatility DECIMAL(12, 6),
    win_rate DECIMAL(12, 6),
    profit_factor DECIMAL(12, 6),
    average_win DECIMAL(24, 8),
    average_loss DECIMAL(24, 8),
    risk_adjusted_return DECIMAL(12, 6),
    benchmark_correlation DECIMAL(12, 6),
    benchmark_alpha DECIMAL(12, 6),
    benchmark_beta DECIMAL(12, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, farm_id, metric_date, time_frame)
);

-- Add created_at and updated_at triggers
CREATE TRIGGER handle_performance_metrics_created_at
BEFORE INSERT ON public.performance_metrics
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_performance_metrics_updated_at
BEFORE UPDATE ON public.performance_metrics
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policy for performance metrics
CREATE POLICY "Users can view their own performance metrics"
ON public.performance_metrics
USING (auth.uid() = user_id);

-- Custom Reports table (for user-defined report templates)
CREATE TABLE IF NOT EXISTS public.custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    report_name TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL, -- 'portfolio', 'performance', 'tax', 'custom'
    time_frame TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'
    included_metrics JSONB NOT NULL,
    visualization_config JSONB,
    filters JSONB,
    export_format TEXT[] DEFAULT ARRAY['PDF', 'CSV'],
    is_scheduled BOOLEAN NOT NULL DEFAULT false,
    schedule_config JSONB,
    is_public BOOLEAN NOT NULL DEFAULT false,
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, report_name)
);

-- Add created_at and updated_at triggers
CREATE TRIGGER handle_custom_reports_created_at
BEFORE INSERT ON public.custom_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_custom_reports_updated_at
BEFORE UPDATE ON public.custom_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;

-- RLS policy for custom reports
CREATE POLICY "Users can manage their own custom reports"
ON public.custom_reports
USING (auth.uid() = user_id);

-- Generated Reports table (for storing rendered report results)
CREATE TABLE IF NOT EXISTS public.generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_report_id UUID REFERENCES public.custom_reports(id) ON DELETE SET NULL,
    report_name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    time_frame TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    data_snapshot JSONB NOT NULL,
    file_format TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add created_at and updated_at triggers
CREATE TRIGGER handle_generated_reports_created_at
BEFORE INSERT ON public.generated_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_generated_reports_updated_at
BEFORE UPDATE ON public.generated_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- RLS policy for generated reports
CREATE POLICY "Users can view their own generated reports"
ON public.generated_reports
USING (auth.uid() = user_id);

-- Benchmark data table
CREATE TABLE IF NOT EXISTS public.benchmark_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_symbol TEXT NOT NULL,
    date DATE NOT NULL,
    open_price DECIMAL(24, 8) NOT NULL,
    high_price DECIMAL(24, 8) NOT NULL,
    low_price DECIMAL(24, 8) NOT NULL,
    close_price DECIMAL(24, 8) NOT NULL,
    volume DECIMAL(24, 8) NOT NULL,
    market_cap DECIMAL(24, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(benchmark_symbol, date)
);

-- Add created_at and updated_at triggers
CREATE TRIGGER handle_benchmark_data_created_at
BEFORE INSERT ON public.benchmark_data
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_benchmark_data_updated_at
BEFORE UPDATE ON public.benchmark_data
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Functions for portfolio analytics

-- Function to calculate portfolio allocation
CREATE OR REPLACE FUNCTION public.calculate_portfolio_allocation(
    p_user_id UUID,
    p_farm_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_allocation JSONB;
BEGIN
    -- Check if the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure the user matches
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- This is a placeholder for the actual implementation
    -- In a real scenario, this would query positions, balances, etc.
    -- For now, return sample data
    v_allocation := jsonb_build_object(
        'BTC', 25.5,
        'ETH', 18.2,
        'SOL', 10.8,
        'USDT', 45.5
    );

    RETURN v_allocation;
END;
$$;

-- Function to calculate performance metrics
CREATE OR REPLACE FUNCTION public.calculate_performance_metrics(
    p_user_id UUID,
    p_farm_id UUID,
    p_time_frame TEXT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_metrics JSONB;
BEGIN
    -- Check if the user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Ensure the user matches
    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- This would calculate performance metrics based on portfolio history
    -- For the example, return placeholder data
    v_metrics := jsonb_build_object(
        'total_return', 18.75,
        'sharpe_ratio', 1.28,
        'sortino_ratio', 1.65,
        'max_drawdown', 12.4,
        'volatility', 22.8,
        'win_rate', 68.5,
        'profit_factor', 2.35
    );

    RETURN v_metrics;
END;
$$;

-- Function to generate a portfolio snapshot
CREATE OR REPLACE FUNCTION public.create_portfolio_snapshot(
    p_user_id UUID,
    p_farm_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_snapshot_id UUID;
    v_allocation JSONB;
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

    -- Get current allocation (would be calculated from actual positions in production)
    v_allocation := public.calculate_portfolio_allocation(p_user_id, p_farm_id);

    -- Create a new portfolio snapshot
    INSERT INTO public.portfolio_snapshots (
        user_id,
        farm_id,
        total_value,
        base_currency,
        spot_value,
        futures_value,
        margin_value,
        assets,
        allocation,
        exchange_distribution
    )
    VALUES (
        p_user_id,
        p_farm_id,
        100000.00, -- Placeholder value
        'USD',
        75000.00,  -- Placeholder value
        25000.00,  -- Placeholder value
        0.00,      -- Placeholder value
        '{"BTC": 1.25, "ETH": 10.5, "SOL": 100.0, "USDT": 45000.0}'::jsonb, -- Placeholder
        v_allocation,
        '{"Bybit": 60, "Coinbase": 40}'::jsonb -- Placeholder
    )
    RETURNING id INTO v_snapshot_id;

    v_result := jsonb_build_object(
        'id', v_snapshot_id,
        'success', true,
        'message', 'Portfolio snapshot created successfully'
    );

    RETURN v_result;
END;
$$;

-- Function to generate a custom report
CREATE OR REPLACE FUNCTION public.generate_report(
    p_user_id UUID,
    p_report_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_format TEXT DEFAULT 'PDF'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_report_record public.custom_reports%ROWTYPE;
    v_generated_id UUID;
    v_file_path TEXT;
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

    -- Get the report template
    SELECT * INTO v_report_record
    FROM public.custom_reports
    WHERE id = p_report_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report template not found';
    END IF;

    -- In a real implementation, this would generate the actual report
    -- For now, create a placeholder entry

    -- Generate a fake file path
    v_file_path := '/reports/' || p_user_id || '/' || p_report_id || '_' || now()::text || '.' || lower(p_format);

    -- Insert the generated report
    INSERT INTO public.generated_reports (
        user_id,
        custom_report_id,
        report_name,
        report_type,
        time_frame,
        start_date,
        end_date,
        data_snapshot,
        file_format,
        file_path,
        file_size_bytes
    )
    VALUES (
        p_user_id,
        p_report_id,
        v_report_record.report_name,
        v_report_record.report_type,
        v_report_record.time_frame,
        p_start_date,
        p_end_date,
        '{}'::jsonb, -- Placeholder for actual data
        p_format,
        v_file_path,
        1024 * 1024 -- 1MB placeholder
    )
    RETURNING id INTO v_generated_id;

    -- Update the last generated timestamp on the template
    UPDATE public.custom_reports
    SET last_generated_at = now()
    WHERE id = p_report_id;

    v_result := jsonb_build_object(
        'id', v_generated_id,
        'success', true,
        'file_path', v_file_path,
        'message', 'Report generated successfully'
    );

    RETURN v_result;
END;
$$;
