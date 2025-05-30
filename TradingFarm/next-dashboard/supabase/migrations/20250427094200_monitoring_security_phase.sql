-- Migration: Monitoring and Security Phase
-- Description: Creates tables for connection health monitoring and enhanced audit logging

-- =============================================================================
-- SECTION: Create functions for timestamp handling if they don't exist
-- =============================================================================

-- Function for handling created_at timestamp
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for handling updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION: Connection Health Monitoring
-- =============================================================================

-- Table to store connection health status for exchanges
CREATE TABLE IF NOT EXISTS public.connection_health (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    credential_id BIGINT REFERENCES public.exchange_credentials(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL, -- 'online', 'offline', 'degraded', 'throttled'
    latency INTEGER, -- in milliseconds
    last_heartbeat TIMESTAMPTZ,
    error_count INTEGER DEFAULT 0,
    error_details JSONB,
    metadata JSONB,
    last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Enforce unique constraint on user + exchange + credential
    CONSTRAINT unique_user_exchange_credential UNIQUE (user_id, exchange, credential_id)
);

-- Create indexes
CREATE INDEX idx_connection_health_user ON public.connection_health(user_id);
CREATE INDEX idx_connection_health_exchange ON public.connection_health(exchange);
CREATE INDEX idx_connection_health_status ON public.connection_health(status);
CREATE INDEX idx_connection_health_last_heartbeat ON public.connection_health(last_heartbeat);

-- Trigger to update the updated_at column
CREATE TRIGGER update_connection_health_updated_at
    BEFORE UPDATE ON public.connection_health
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add RLS to the connection_health table
ALTER TABLE public.connection_health ENABLE ROW LEVEL SECURITY;

-- Users can only view their own connection health records
CREATE POLICY "Users can view their own connection health"
    ON public.connection_health
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Users can only insert their own connection health records
CREATE POLICY "Users can insert their own connection health"
    ON public.connection_health
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Users can only update their own connection health records
CREATE POLICY "Users can update their own connection health"
    ON public.connection_health
    FOR UPDATE
    USING (auth.uid()::text = user_id::text);

-- Users can only delete their own connection health records
CREATE POLICY "Users can delete their own connection health"
    ON public.connection_health
    FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- =============================================================================
-- SECTION: Enhanced Trading Audit System
-- =============================================================================

-- Table to track all trading activities with detailed audit information
CREATE TABLE IF NOT EXISTS public.trading_audit_log (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id BIGINT REFERENCES public.farms(id) ON DELETE SET NULL,
    agent_id BIGINT REFERENCES public.agents(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- 'order_place', 'order_cancel', 'position_close', 'credential_use', etc.
    status VARCHAR(20) NOT NULL, -- 'success', 'failure', 'pending'
    exchange VARCHAR(50) NOT NULL,
    credential_id BIGINT REFERENCES public.exchange_credentials(id) ON DELETE SET NULL,
    symbol VARCHAR(20),
    details JSONB NOT NULL, -- Stores all relevant details about the action
    ip_address VARCHAR(50),
    user_agent TEXT,
    request_id VARCHAR(100), -- For tracking related operations
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_trading_audit_user ON public.trading_audit_log(user_id);
CREATE INDEX idx_trading_audit_farm ON public.trading_audit_log(farm_id);
CREATE INDEX idx_trading_audit_agent ON public.trading_audit_log(agent_id);
CREATE INDEX idx_trading_audit_action ON public.trading_audit_log(action_type);
CREATE INDEX idx_trading_audit_status ON public.trading_audit_log(status);
CREATE INDEX idx_trading_audit_exchange ON public.trading_audit_log(exchange);
CREATE INDEX idx_trading_audit_credential ON public.trading_audit_log(credential_id);
CREATE INDEX idx_trading_audit_created ON public.trading_audit_log(created_at);

-- Trigger to update the updated_at column
CREATE TRIGGER update_trading_audit_updated_at
    BEFORE UPDATE ON public.trading_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add RLS to the trading_audit_log table
ALTER TABLE public.trading_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs"
    ON public.trading_audit_log
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Users can only insert their own audit logs
CREATE POLICY "Users can insert their own audit logs"
    ON public.trading_audit_log
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Users can only update their own audit logs
CREATE POLICY "Users can update their own audit logs"
    ON public.trading_audit_log
    FOR UPDATE
    USING (auth.uid()::text = user_id::text);

-- No delete policy - audit logs should not be deleted

-- =============================================================================
-- SECTION: Security Access Log
-- =============================================================================

-- Table to track API usage and potential security issues
CREATE TABLE IF NOT EXISTS public.security_access_log (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    credential_id BIGINT REFERENCES public.exchange_credentials(id) ON DELETE SET NULL,
    access_type VARCHAR(50) NOT NULL, -- 'api_access', 'login', 'credential_view', etc.
    ip_address VARCHAR(50) NOT NULL,
    location JSONB, -- Geolocation data
    user_agent TEXT,
    device_fingerprint TEXT,
    status VARCHAR(20) NOT NULL, -- 'allowed', 'blocked', 'suspicious'
    risk_score INTEGER, -- 0-100 risk assessment
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_security_access_user ON public.security_access_log(user_id);
CREATE INDEX idx_security_access_credential ON public.security_access_log(credential_id);
CREATE INDEX idx_security_access_type ON public.security_access_log(access_type);
CREATE INDEX idx_security_access_ip ON public.security_access_log(ip_address);
CREATE INDEX idx_security_access_status ON public.security_access_log(status);
CREATE INDEX idx_security_access_created ON public.security_access_log(created_at);

-- Add RLS to the security_access_log table
ALTER TABLE public.security_access_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own security logs
CREATE POLICY "Users can view their own security logs"
    ON public.security_access_log
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Service role can insert security logs
CREATE POLICY "Service role can insert security logs"
    ON public.security_access_log
    FOR INSERT
    WITH CHECK (true);

-- No update or delete policies - security logs should be immutable
