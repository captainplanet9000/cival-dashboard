-- Migration: Trading System Enhancement
-- Description: Optimizes database schema for exchange trading operations, order management, and position tracking

-- Enable RLS (Row Level Security) by default
ALTER DATABASE postgres SET row_security = on;

-- =============================================================================
-- SECTION: Exchange Credentials Table
-- =============================================================================
-- This table stores API keys and other credentials needed to connect to exchanges

CREATE TABLE IF NOT EXISTS public.exchange_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    api_passphrase VARCHAR(255),
    is_testnet BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    permissions VARCHAR(255)[] DEFAULT ARRAY['read']::VARCHAR(255)[],
    ip_whitelist VARCHAR(100)[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Each user can only have one credential with the same name per exchange
    UNIQUE(user_id, exchange, name)
);

-- Add RLS policies for exchange_credentials
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Users can only view their own exchange credentials
CREATE POLICY "Users can view their own exchange credentials"
    ON public.exchange_credentials
    FOR SELECT
    USING (auth.uid()::uuid = user_id);

-- Users can only insert their own exchange credentials
CREATE POLICY "Users can insert their own exchange credentials"
    ON public.exchange_credentials
    FOR INSERT
    WITH CHECK (auth.uid()::uuid = user_id);

-- Users can only update their own exchange credentials
CREATE POLICY "Users can update their own exchange credentials"
    ON public.exchange_credentials
    FOR UPDATE
    USING (auth.uid()::uuid = user_id);

-- Users can only delete their own exchange credentials
CREATE POLICY "Users can delete their own exchange credentials"
    ON public.exchange_credentials
    FOR DELETE
    USING (auth.uid()::uuid = user_id);

-- Trigger to update the updated_at column
CREATE TRIGGER update_exchange_credentials_updated_at
    BEFORE UPDATE ON public.exchange_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SECTION: Exchange Orders Table
-- =============================================================================
-- This table tracks orders placed on various exchanges

CREATE TYPE public.order_side AS ENUM ('buy', 'sell');
CREATE TYPE public.order_type AS ENUM ('market', 'limit', 'stop', 'stop_limit');
CREATE TYPE public.order_status AS ENUM (
    'new',
    'partially_filled', 
    'filled', 
    'canceled', 
    'pending_cancel', 
    'rejected', 
    'expired'
);
CREATE TYPE public.order_time_in_force AS ENUM ('GTC', 'IOC', 'FOK');

CREATE TABLE IF NOT EXISTS public.exchange_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    exchange_order_id VARCHAR(100),
    client_order_id VARCHAR(100),
    symbol VARCHAR(50) NOT NULL,
    side order_side NOT NULL,
    type order_type NOT NULL,
    status order_status NOT NULL DEFAULT 'new',
    quantity DECIMAL(24, 8) NOT NULL,
    price DECIMAL(24, 8),
    stop_price DECIMAL(24, 8),
    executed_quantity DECIMAL(24, 8) DEFAULT 0,
    executed_price DECIMAL(24, 8),
    time_in_force order_time_in_force,
    strategy_id UUID REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
    risk_check_passed BOOLEAN DEFAULT FALSE,
    risk_check_details JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Indexes are created separately below
);

-- Add RLS policies for exchange_orders
ALTER TABLE public.exchange_orders ENABLE ROW LEVEL SECURITY;

-- Users can only view their own orders
CREATE POLICY "Users can view their own orders"
    ON public.exchange_orders
    FOR SELECT
    USING (auth.uid()::uuid = user_id);

-- Users can only insert their own orders
CREATE POLICY "Users can insert their own orders"
    ON public.exchange_orders
    FOR INSERT
    WITH CHECK (auth.uid()::uuid = user_id);

-- Users can only update their own orders
CREATE POLICY "Users can update their own orders"
    ON public.exchange_orders
    FOR UPDATE
    USING (auth.uid()::uuid = user_id);

-- Users can only delete their own orders
CREATE POLICY "Users can delete their own orders"
    ON public.exchange_orders
    FOR DELETE
    USING (auth.uid()::uuid = user_id);

-- Trigger to update the updated_at column
CREATE TRIGGER update_exchange_orders_updated_at
    BEFORE UPDATE ON public.exchange_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SECTION: Exchange Positions Table
-- =============================================================================
-- This table tracks user positions across exchanges

CREATE TABLE IF NOT EXISTS public.exchange_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    position_size DECIMAL(24, 8) NOT NULL, -- Positive for long, negative for short
    entry_price DECIMAL(24, 8) NOT NULL,
    liquidation_price DECIMAL(24, 8),
    unrealized_pnl DECIMAL(24, 8),
    realized_pnl DECIMAL(24, 8) DEFAULT 0,
    margin_used DECIMAL(24, 8),
    leverage DECIMAL(10, 2) DEFAULT 1,
    last_updated_price DECIMAL(24, 8),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Each user should have at most one position per symbol per exchange
    UNIQUE(user_id, exchange, symbol),
    
    -- Indexes are created separately below
);

-- Add RLS policies for exchange_positions
ALTER TABLE public.exchange_positions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own positions
CREATE POLICY "Users can view their own positions"
    ON public.exchange_positions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own positions
CREATE POLICY "Users can insert their own positions"
    ON public.exchange_positions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own positions
CREATE POLICY "Users can update their own positions"
    ON public.exchange_positions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can only delete their own positions
CREATE POLICY "Users can delete their own positions"
    ON public.exchange_positions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update the updated_at column
CREATE TRIGGER update_exchange_positions_updated_at
    BEFORE UPDATE ON public.exchange_positions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SECTION: Exchange Balances Table
-- =============================================================================
-- This table tracks user balances across exchanges

CREATE TABLE IF NOT EXISTS public.exchange_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    asset VARCHAR(50) NOT NULL,
    free DECIMAL(24, 8) NOT NULL DEFAULT 0,
    locked DECIMAL(24, 8) NOT NULL DEFAULT 0,
    total DECIMAL(24, 8) GENERATED ALWAYS AS (free + locked) STORED,
    usd_value DECIMAL(24, 8),
    last_updated_price DECIMAL(24, 8),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Each user should have at most one balance per asset per exchange
    UNIQUE(user_id, exchange, asset),
    
    -- Indexes are created separately below
);

-- Add RLS policies for exchange_balances
ALTER TABLE public.exchange_balances ENABLE ROW LEVEL SECURITY;

-- Users can only view their own balances
CREATE POLICY "Users can view their own balances"
    ON public.exchange_balances
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own balances
CREATE POLICY "Users can insert their own balances"
    ON public.exchange_balances
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own balances
CREATE POLICY "Users can update their own balances"
    ON public.exchange_balances
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can only delete their own balances
CREATE POLICY "Users can delete their own balances"
    ON public.exchange_balances
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update the updated_at column
CREATE TRIGGER update_exchange_balances_updated_at
    BEFORE UPDATE ON public.exchange_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SECTION: Market Data Table
-- =============================================================================
-- This table caches market data for symbols

CREATE TABLE IF NOT EXISTS public.market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    price DECIMAL(24, 8) NOT NULL,
    bid DECIMAL(24, 8),
    ask DECIMAL(24, 8),
    volume_24h DECIMAL(24, 8),
    change_24h DECIMAL(10, 2),
    high_24h DECIMAL(24, 8),
    low_24h DECIMAL(24, 8),
    last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Unique constraint for exchange and symbol
    UNIQUE(exchange, symbol)
);

-- Market data is publicly readable
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

-- All users can read market data
CREATE POLICY "All users can read market data"
    ON public.market_data
    FOR SELECT
    USING (true);

-- Only system services can modify market data
CREATE POLICY "Only system services can modify market data"
    ON public.market_data
    FOR ALL
    USING (
        -- Restrict to service role (replace with your service role check)
        auth.jwt() ? ('service_role')
    );

-- =============================================================================
-- SECTION: Trading Settings Table
-- =============================================================================
-- This table stores user-specific trading settings

CREATE TABLE IF NOT EXISTS public.trading_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange VARCHAR(50),
    default_risk_profile_id UUID,
    default_leverage DECIMAL(10, 2) DEFAULT 1,
    enable_auto_trading BOOLEAN DEFAULT FALSE,
    enable_notifications BOOLEAN DEFAULT TRUE,
    preferred_exchanges VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    preferred_assets VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    ui_settings JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Each user should have at most one settings record per exchange
    -- Null exchange means global settings
    UNIQUE(user_id, exchange)
);

-- Add RLS policies for trading_settings
ALTER TABLE public.trading_settings ENABLE ROW LEVEL SECURITY;

-- Users can only view their own trading settings
CREATE POLICY "Users can view their own trading settings"
    ON public.trading_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own trading settings
CREATE POLICY "Users can insert their own trading settings"
    ON public.trading_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own trading settings
CREATE POLICY "Users can update their own trading settings"
    ON public.trading_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can only delete their own trading settings
CREATE POLICY "Users can delete their own trading settings"
    ON public.trading_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update the updated_at column
CREATE TRIGGER update_trading_settings_updated_at
    BEFORE UPDATE ON public.trading_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SECTION: Trading Strategies Table
-- =============================================================================
-- This table defines user trading strategies

CREATE TABLE IF NOT EXISTS public.trading_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    exchange VARCHAR(50),
    symbols VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    risk_profile_id UUID,
    parameters JSONB DEFAULT '{}'::JSONB,
    logic TEXT,
    backtest_results JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies for trading_strategies
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;

-- Users can only view their own trading strategies
CREATE POLICY "Users can view their own trading strategies"
    ON public.trading_strategies
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can only insert their own trading strategies
CREATE POLICY "Users can insert their own trading strategies"
    ON public.trading_strategies
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own trading strategies
CREATE POLICY "Users can update their own trading strategies"
    ON public.trading_strategies
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can only delete their own trading strategies
CREATE POLICY "Users can delete their own trading strategies"
    ON public.trading_strategies
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update the updated_at column
CREATE TRIGGER update_trading_strategies_updated_at
    BEFORE UPDATE ON public.trading_strategies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SECTION: Trading Performance Table
-- =============================================================================
-- This table tracks trading performance metrics

CREATE TABLE IF NOT EXISTS public.trading_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange VARCHAR(50),
    symbol VARCHAR(50),
    strategy_id UUID REFERENCES public.trading_strategies(id) ON DELETE SET NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    period VARCHAR(20) NOT NULL, -- 'day', 'week', 'month', 'year'
    starting_balance DECIMAL(24, 8) NOT NULL,
    ending_balance DECIMAL(24, 8) NOT NULL,
    profit_loss DECIMAL(24, 8) GENERATED ALWAYS AS (ending_balance - starting_balance) STORED,
    profit_loss_percent DECIMAL(10, 2),
    total_trades INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    losing_trades INTEGER NOT NULL DEFAULT 0,
    win_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE WHEN total_trades > 0 THEN (winning_trades::DECIMAL / total_trades::DECIMAL) * 100 ELSE NULL END
    ) STORED,
    max_drawdown DECIMAL(10, 2),
    sharpe_ratio DECIMAL(10, 2),
    avg_trade_duration INTERVAL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Indexes are created separately below
);

-- Add RLS policies for trading_performance
ALTER TABLE public.trading_performance ENABLE ROW LEVEL SECURITY;

-- Users can only view their own trading performance
CREATE POLICY "Users can view their own trading performance"
    ON public.trading_performance
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only system services can insert trading performance
CREATE POLICY "Only system services can insert trading performance"
    ON public.trading_performance
    FOR INSERT
    WITH CHECK (
        -- Allow user to insert their own performance records
        auth.uid() = user_id OR
        -- Or system service (replace with your service role check)
        auth.jwt() ? ('service_role')
    );

-- =============================================================================
-- SECTION: Function to handle created_at timestamp
-- =============================================================================
-- Create the function if it doesn't exist yet

CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION: Function to handle updated_at timestamp
-- =============================================================================
-- Create the function if it doesn't exist yet

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION: Database Optimizations
-- =============================================================================

-- Create indexes for exchange_orders table
CREATE INDEX idx_exchange_orders_exchange_symbol_status ON public.exchange_orders(exchange, symbol, status);
CREATE INDEX idx_exchange_orders_user_exchange ON public.exchange_orders(user_id, exchange);
CREATE INDEX idx_exchange_orders_exchange_order_id ON public.exchange_orders(exchange_order_id);
CREATE INDEX idx_exchange_orders_client_order_id ON public.exchange_orders(client_order_id);

-- Create indexes for exchange_positions table
CREATE INDEX idx_exchange_positions_user_exchange ON public.exchange_positions(user_id, exchange);
CREATE INDEX idx_exchange_positions_symbol ON public.exchange_positions(symbol);

-- Create indexes for exchange_balances table
CREATE INDEX idx_exchange_balances_user_exchange ON public.exchange_balances(user_id, exchange);
CREATE INDEX idx_exchange_balances_asset ON public.exchange_balances(asset);

-- Create indexes for trading_performance table
CREATE INDEX idx_trading_performance_user_exchange_period ON public.trading_performance(user_id, exchange, period);
CREATE INDEX idx_trading_performance_strategy_period ON public.trading_performance(strategy_id, period);

-- Create a function to periodically purge old market data
CREATE OR REPLACE FUNCTION public.purge_old_market_data(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    DELETE FROM public.market_data
    WHERE last_update < NOW() - (retention_days * INTERVAL '1 day');
    
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Create a statement-level trigger function for order operations
CREATE OR REPLACE FUNCTION public.update_position_on_order_change()
RETURNS TRIGGER AS $$
BEGIN
    -- This is a placeholder for a position update function
    -- In a real implementation, this would update the user's position
    -- based on changes to their orders
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate trading performance
CREATE OR REPLACE FUNCTION public.calculate_trading_performance(
    p_user_id UUID,
    p_exchange VARCHAR DEFAULT NULL,
    p_symbol VARCHAR DEFAULT NULL,
    p_strategy_id UUID DEFAULT NULL,
    p_period VARCHAR DEFAULT 'day'
)
RETURNS VOID AS $$
BEGIN
    -- This is a placeholder for a performance calculation function
    -- In a real implementation, this would calculate trading performance
    -- metrics based on completed orders
    NULL;
END;
$$ LANGUAGE plpgsql;
