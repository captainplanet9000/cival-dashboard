-- Migration: Consolidated Monitoring and Security Phase
-- Description: Implements all tables needed for connection health monitoring and security auditing

-- =============================================================================
-- SECTION: Create functions for timestamp handling
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
-- SECTION: Agents Table (dependency for health monitoring)
-- =============================================================================

-- This table defines trading agents/bots
CREATE TABLE IF NOT EXISTS public.agents (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::JSONB,
    permissions JSONB DEFAULT '{}'::JSONB,
    supported_exchanges VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    supported_symbols VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    metadata JSONB,
    version VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agents_user ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_type ON public.agents(type);

-- Add Row Level Security
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own agents
CREATE POLICY view_own_agents 
    ON public.agents 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Create policy to allow users to create their own agents
CREATE POLICY create_own_agents 
    ON public.agents 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own agents
CREATE POLICY update_own_agents 
    ON public.agents 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own agents
CREATE POLICY delete_own_agents 
    ON public.agents 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Trigger to update the updated_at column
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON public.agents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

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
CREATE INDEX IF NOT EXISTS idx_connection_health_user ON public.connection_health(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_health_exchange ON public.connection_health(exchange);
CREATE INDEX IF NOT EXISTS idx_connection_health_status ON public.connection_health(status);

-- Row Level Security
ALTER TABLE public.connection_health ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own connection health records
CREATE POLICY view_own_connection_health 
    ON public.connection_health 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Create policy to allow users to create their own connection health records
CREATE POLICY create_own_connection_health 
    ON public.connection_health 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own connection health records
CREATE POLICY update_own_connection_health 
    ON public.connection_health 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own connection health records
CREATE POLICY delete_own_connection_health 
    ON public.connection_health 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Trigger to update the updated_at column
CREATE TRIGGER update_connection_health_updated_at
    BEFORE UPDATE ON public.connection_health
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SECTION: Trading Audit Log
-- =============================================================================

-- Table to store detailed audit trails for all trading activities
CREATE TABLE IF NOT EXISTS public.trading_audit_log (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id BIGINT, -- Optional reference to a trading farm
    agent_id BIGINT REFERENCES public.agents(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    action_type VARCHAR(50) NOT NULL, -- 'order_place', 'order_cancel', 'order_update', 'position_open', 'position_close', etc.
    status VARCHAR(20) NOT NULL, -- 'success', 'failure', 'pending'
    exchange VARCHAR(50) NOT NULL,
    credential_id BIGINT REFERENCES public.exchange_credentials(id) ON DELETE SET NULL,
    symbol VARCHAR(50), -- Trading pair or asset
    details JSONB NOT NULL, -- Full details of the action including parameters
    request_data JSONB, -- Raw request sent to the exchange
    response_data JSONB, -- Raw response from the exchange
    order_id VARCHAR(100), -- Exchange order ID if applicable
    position_id VARCHAR(100), -- Position ID if applicable
    amount DECIMAL(24, 8), -- Trade amount if applicable
    price DECIMAL(24, 8), -- Trade price if applicable
    error_message TEXT, -- If status is 'failure'
    ip_address VARCHAR(50), -- IP address that initiated the action
    user_agent TEXT, -- User agent information
    metadata JSONB, -- Additional metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trading_audit_user ON public.trading_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_audit_farm ON public.trading_audit_log(farm_id);
CREATE INDEX IF NOT EXISTS idx_trading_audit_timestamp ON public.trading_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_trading_audit_agent ON public.trading_audit_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_trading_audit_action ON public.trading_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_trading_audit_status ON public.trading_audit_log(status);
CREATE INDEX IF NOT EXISTS idx_trading_audit_exchange ON public.trading_audit_log(exchange);
CREATE INDEX IF NOT EXISTS idx_trading_audit_credential ON public.trading_audit_log(credential_id);

-- Row Level Security
ALTER TABLE public.trading_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own audit logs
CREATE POLICY view_own_trading_audit 
    ON public.trading_audit_log 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Create policy to allow users to create entries in their own audit logs
CREATE POLICY create_own_trading_audit 
    ON public.trading_audit_log 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
-- No update policy - audit logs should not be modified
-- No delete policy - audit logs should not be deleted

-- =============================================================================
-- SECTION: Security Access Log
-- =============================================================================

-- Table to track API usage and potential security issues
CREATE TABLE IF NOT EXISTS public.security_access_log (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    access_type VARCHAR(50) NOT NULL, -- 'api_key_use', 'login', 'credential_access', 'config_change', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'exchange_api', 'trading_farm', 'agent', 'system_settings', etc.
    resource_id VARCHAR(100), -- ID of the accessed resource
    access_level VARCHAR(20) NOT NULL, -- 'read', 'write', 'execute', 'admin'
    ip_address VARCHAR(50) NOT NULL,
    user_agent TEXT,
    geolocation JSONB, -- Country, city, etc. derived from IP
    request_details JSONB, -- Headers, parameters, etc.
    status VARCHAR(20) NOT NULL, -- 'allowed', 'denied', 'suspicious'
    risk_score INTEGER, -- 0-100, higher means more suspicious
    security_notes TEXT, -- Notes on why something was flagged as suspicious
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_security_access_user ON public.security_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_access_timestamp ON public.security_access_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_access_type ON public.security_access_log(access_type);
CREATE INDEX IF NOT EXISTS idx_security_access_ip ON public.security_access_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_access_status ON public.security_access_log(status);
CREATE INDEX IF NOT EXISTS idx_security_access_risk ON public.security_access_log(risk_score);

-- Row Level Security
ALTER TABLE public.security_access_log ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own security logs
CREATE POLICY view_own_security_access 
    ON public.security_access_log 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Create policy to allow users to create entries in their own security logs
CREATE POLICY create_own_security_access 
    ON public.security_access_log 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
-- No update policy - security logs should not be modified
-- No delete policy - security logs should not be deleted

-- Trigger to update the updated_at column
CREATE TRIGGER update_security_access_updated_at
    BEFORE UPDATE ON public.security_access_log
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
