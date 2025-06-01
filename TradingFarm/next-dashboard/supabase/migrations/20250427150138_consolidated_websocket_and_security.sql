-- Consolidated WebSocket Manager and Security Infrastructure
-- This migration implements a complete WebSocket connection manager
-- and security enhancements for Trading Farm Phase 1 implementation

-- PREREQUISITES: Create updated_at handler function if it doesn't exist

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- ========================
-- WebSocket Connection Manager Tables
-- ========================

-- Table for tracking WebSocket connections
CREATE TABLE IF NOT EXISTS public.websocket_connections (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('connecting', 'connected', 'disconnected', 'error')),
  connection_url TEXT,
  last_heartbeat TIMESTAMPTZ,
  error_message TEXT,
  reconnect_attempts INTEGER NOT NULL DEFAULT 0,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exchange, connection_id)
);

-- Table for WebSocket subscriptions
CREATE TABLE IF NOT EXISTS public.websocket_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  connection_id BIGINT NOT NULL REFERENCES public.websocket_connections(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  symbols TEXT[] NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'subscribed', 'unsubscribed', 'error')),
  error_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for WebSocket connection metrics
CREATE TABLE IF NOT EXISTS public.websocket_metrics (
  id BIGSERIAL PRIMARY KEY,
  connection_id BIGINT NOT NULL REFERENCES public.websocket_connections(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  message_size_bytes INTEGER,
  reconnect_count INTEGER NOT NULL DEFAULT 0
);

-- ========================
-- Security Infrastructure Tables
-- ========================

-- Table for IP address whitelisting
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, ip_address)
);

-- Table for audit logs
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Table for API key versions (for rotation)
-- We're creating this independently without foreign keys to exchange_credentials
-- to avoid dependencies. Foreign keys can be added later
CREATE TABLE IF NOT EXISTS public.api_key_versions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  exchange TEXT NOT NULL, -- Store exchange name to avoid dependency
  credential_reference TEXT NOT NULL, -- This will be used to connect to creds later
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  rotation_reason TEXT
);

-- ========================
-- WebSocket Connection Manager Functions
-- ========================

-- Function to update connection status
CREATE OR REPLACE FUNCTION public.update_websocket_connection_status(
  p_connection_id BIGINT,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
) RETURNS public.websocket_connections AS $$
DECLARE
  v_connection public.websocket_connections;
BEGIN
  -- Validate status
  IF p_status NOT IN ('connecting', 'connected', 'disconnected', 'error') THEN
    RAISE EXCEPTION 'Invalid connection status: %', p_status;
  END IF;
  
  UPDATE public.websocket_connections
  SET 
    status = p_status,
    error_message = CASE WHEN p_status = 'error' THEN p_error_message ELSE error_message END,
    last_heartbeat = CASE WHEN p_status = 'connected' THEN now() ELSE last_heartbeat END,
    connected_at = CASE WHEN p_status = 'connected' AND connected_at IS NULL THEN now() ELSE connected_at END,
    disconnected_at = CASE WHEN p_status = 'disconnected' THEN now() ELSE disconnected_at END,
    reconnect_attempts = CASE WHEN p_status = 'connecting' AND status = 'disconnected' THEN reconnect_attempts + 1 ELSE reconnect_attempts END,
    updated_at = now()
  WHERE id = p_connection_id
  RETURNING * INTO v_connection;
  
  RETURN v_connection;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

-- Function to record WebSocket metrics
CREATE OR REPLACE FUNCTION public.record_websocket_metrics(
  p_connection_id BIGINT,
  p_message_count INTEGER DEFAULT 0,
  p_error_count INTEGER DEFAULT 0,
  p_latency_ms INTEGER DEFAULT NULL,
  p_message_size_bytes INTEGER DEFAULT NULL,
  p_reconnect_count INTEGER DEFAULT 0
) RETURNS public.websocket_metrics AS $$
DECLARE
  v_metrics public.websocket_metrics;
BEGIN
  INSERT INTO public.websocket_metrics(
    connection_id,
    message_count,
    error_count,
    latency_ms,
    message_size_bytes,
    reconnect_count
  ) VALUES (
    p_connection_id,
    p_message_count,
    p_error_count,
    p_latency_ms,
    p_message_size_bytes,
    p_reconnect_count
  )
  RETURNING * INTO v_metrics;
  
  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

-- Function to update subscription status
CREATE OR REPLACE FUNCTION public.update_websocket_subscription_status(
  p_subscription_id BIGINT,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
) RETURNS public.websocket_subscriptions AS $$
DECLARE
  v_subscription public.websocket_subscriptions;
BEGIN
  -- Validate status
  IF p_status NOT IN ('pending', 'subscribed', 'unsubscribed', 'error') THEN
    RAISE EXCEPTION 'Invalid subscription status: %', p_status;
  END IF;
  
  UPDATE public.websocket_subscriptions
  SET 
    status = p_status,
    error_message = CASE WHEN p_status = 'error' THEN p_error_message ELSE error_message END,
    last_message_at = CASE WHEN p_status = 'subscribed' THEN now() ELSE last_message_at END,
    updated_at = now()
  WHERE id = p_subscription_id
  RETURNING * INTO v_subscription;
  
  RETURN v_subscription;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

-- ========================
-- Security Infrastructure Functions
-- ========================

-- Function to manage IP whitelist
CREATE OR REPLACE FUNCTION public.manage_ip_whitelist(
  p_action TEXT,
  p_ip_address TEXT,
  p_description TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS public.ip_whitelist AS $$
DECLARE
  v_result public.ip_whitelist;
BEGIN
  IF p_action NOT IN ('add', 'update', 'remove') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;
  
  IF p_action = 'add' THEN
    -- Check if IP already exists
    IF EXISTS (SELECT 1 FROM public.ip_whitelist WHERE user_id = auth.uid() AND ip_address = p_ip_address) THEN
      RAISE EXCEPTION 'IP address already whitelisted';
    END IF;
    
    -- Add new IP to whitelist
    INSERT INTO public.ip_whitelist(
      user_id,
      ip_address,
      description,
      is_active,
      created_by,
      expires_at
    ) VALUES (
      auth.uid(),
      p_ip_address,
      p_description,
      p_is_active,
      auth.uid(),
      p_expires_at
    )
    RETURNING * INTO v_result;
    
  ELSIF p_action = 'update' THEN
    -- Update existing IP
    UPDATE public.ip_whitelist
    SET 
      description = COALESCE(p_description, description),
      is_active = p_is_active,
      updated_at = now(),
      expires_at = p_expires_at
    WHERE 
      user_id = auth.uid() AND 
      ip_address = p_ip_address
    RETURNING * INTO v_result;
    
    IF v_result IS NULL THEN
      RAISE EXCEPTION 'IP address not found in whitelist';
    END IF;
    
  ELSIF p_action = 'remove' THEN
    -- Remove IP from whitelist
    DELETE FROM public.ip_whitelist
    WHERE user_id = auth.uid() AND ip_address = p_ip_address
    RETURNING * INTO v_result;
    
    IF v_result IS NULL THEN
      RAISE EXCEPTION 'IP address not found in whitelist';
    END IF;
  END IF;
  
  -- Log the action
  INSERT INTO public.security_audit_logs(
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    severity
  ) VALUES (
    auth.uid(),
    'ip_whitelist_' || p_action,
    'ip_whitelist',
    COALESCE(v_result.id::text, 'unknown'),
    jsonb_build_object(
      'ip_address', p_ip_address,
      'description', p_description,
      'is_active', p_is_active,
      'expires_at', p_expires_at
    ),
    'info'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to manage API key versions
CREATE OR REPLACE FUNCTION public.rotate_api_key(
  p_exchange TEXT,
  p_credential_reference TEXT,
  p_new_api_key_encrypted TEXT,
  p_new_api_secret_encrypted TEXT,
  p_rotation_reason TEXT DEFAULT 'manual',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS public.api_key_versions AS $$
DECLARE
  v_new_version public.api_key_versions;
BEGIN
  -- Deactivate all existing versions
  UPDATE public.api_key_versions
  SET is_active = false, updated_at = now()
  WHERE 
    user_id = auth.uid() AND 
    exchange = p_exchange AND 
    credential_reference = p_credential_reference AND 
    is_active = true;
  
  -- Insert new version
  INSERT INTO public.api_key_versions(
    user_id,
    exchange,
    credential_reference,
    api_key_encrypted,
    api_secret_encrypted,
    is_active,
    expires_at,
    created_by,
    rotation_reason
  ) VALUES (
    auth.uid(),
    p_exchange,
    p_credential_reference,
    p_new_api_key_encrypted,
    p_new_api_secret_encrypted,
    true,
    p_expires_at,
    auth.uid(),
    p_rotation_reason
  )
  RETURNING * INTO v_new_version;
  
  -- Log the key rotation
  INSERT INTO public.security_audit_logs(
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    severity
  ) VALUES (
    auth.uid(),
    'api_key_rotation',
    'exchange_credentials',
    p_credential_reference,
    jsonb_build_object(
      'exchange', p_exchange,
      'reason', p_rotation_reason,
      'expires_at', p_expires_at
    ),
    'info'
  );
  
  RETURN v_new_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_details JSONB,
  p_severity TEXT DEFAULT 'info',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS public.security_audit_logs AS $$
DECLARE
  v_log public.security_audit_logs;
BEGIN
  -- Validate severity
  IF p_severity NOT IN ('info', 'warning', 'error', 'critical') THEN
    RAISE WARNING 'Invalid severity: %, defaulting to info', p_severity;
    p_severity := 'info';
  END IF;
  
  -- Insert log entry
  INSERT INTO public.security_audit_logs(
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    severity,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_severity,
    p_ip_address,
    p_user_agent
  )
  RETURNING * INTO v_log;
  
  RETURN v_log;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ========================
-- Triggers
-- ========================

-- Trigger for updated_at on websocket_connections
CREATE TRIGGER handle_websocket_connections_updated_at
  BEFORE UPDATE ON public.websocket_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on websocket_subscriptions
CREATE TRIGGER handle_websocket_subscriptions_updated_at
  BEFORE UPDATE ON public.websocket_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on ip_whitelist
CREATE TRIGGER handle_ip_whitelist_updated_at
  BEFORE UPDATE ON public.ip_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on api_key_versions
CREATE TRIGGER handle_api_key_versions_updated_at
  BEFORE UPDATE ON public.api_key_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ========================
-- Row Level Security
-- ========================

-- Enable Row Level Security
ALTER TABLE public.websocket_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websocket_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websocket_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for websocket_connections
CREATE POLICY "Users can view their own websocket connections"
  ON public.websocket_connections
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own websocket connections"
  ON public.websocket_connections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own websocket connections"
  ON public.websocket_connections
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own websocket connections"
  ON public.websocket_connections
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for websocket_subscriptions
CREATE POLICY "Users can view their own websocket subscriptions"
  ON public.websocket_subscriptions
  FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own websocket subscriptions"
  ON public.websocket_subscriptions
  FOR INSERT
  WITH CHECK (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own websocket subscriptions"
  ON public.websocket_subscriptions
  FOR UPDATE
  USING (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own websocket subscriptions"
  ON public.websocket_subscriptions
  FOR DELETE
  USING (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for websocket_metrics
CREATE POLICY "Users can view their own websocket metrics"
  ON public.websocket_metrics
  FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for their own websocket connections"
  ON public.websocket_metrics
  FOR INSERT
  WITH CHECK (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for ip_whitelist
CREATE POLICY "Users can view their own IP whitelist"
  ON public.ip_whitelist
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert to their own IP whitelist"
  ON public.ip_whitelist
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own IP whitelist"
  ON public.ip_whitelist
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete from their own IP whitelist"
  ON public.ip_whitelist
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for security_audit_logs
CREATE POLICY "Users can view their own security audit logs"
  ON public.security_audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for api_key_versions
CREATE POLICY "Users can view their own API key versions"
  ON public.api_key_versions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own API key versions"
  ON public.api_key_versions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API key versions"
  ON public.api_key_versions
  FOR UPDATE
  USING (user_id = auth.uid());
