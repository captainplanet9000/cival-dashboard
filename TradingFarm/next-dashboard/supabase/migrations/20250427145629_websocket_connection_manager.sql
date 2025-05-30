-- WebSocket Connection Manager Schema
-- This migration creates tables and functions for managing WebSocket connections
-- to various exchanges, tracking their status, and collecting metrics.

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, channel, symbols)
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
$$ LANGUAGE plpgsql SECURITY INVOKER;

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
$$ LANGUAGE plpgsql SECURITY INVOKER;

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
$$ LANGUAGE plpgsql SECURITY INVOKER;

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

-- Enable Row Level Security
ALTER TABLE public.websocket_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websocket_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websocket_metrics ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Users can only view their own connections
CREATE POLICY "Users can view their own websocket connections"
  ON public.websocket_connections
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own connections
CREATE POLICY "Users can insert their own websocket connections"
  ON public.websocket_connections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own connections
CREATE POLICY "Users can update their own websocket connections"
  ON public.websocket_connections
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can only delete their own connections
CREATE POLICY "Users can delete their own websocket connections"
  ON public.websocket_connections
  FOR DELETE
  USING (user_id = auth.uid());

-- Users can only view subscriptions for their own connections
CREATE POLICY "Users can view their own websocket subscriptions"
  ON public.websocket_subscriptions
  FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only insert subscriptions for their own connections
CREATE POLICY "Users can insert their own websocket subscriptions"
  ON public.websocket_subscriptions
  FOR INSERT
  WITH CHECK (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only update subscriptions for their own connections
CREATE POLICY "Users can update their own websocket subscriptions"
  ON public.websocket_subscriptions
  FOR UPDATE
  USING (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only delete subscriptions for their own connections
CREATE POLICY "Users can delete their own websocket subscriptions"
  ON public.websocket_subscriptions
  FOR DELETE
  USING (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only view metrics for their own connections
CREATE POLICY "Users can view their own websocket metrics"
  ON public.websocket_metrics
  FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only insert metrics for their own connections
CREATE POLICY "Users can insert metrics for their own websocket connections"
  ON public.websocket_metrics
  FOR INSERT
  WITH CHECK (
    connection_id IN (
      SELECT id FROM public.websocket_connections 
      WHERE user_id = auth.uid()
    )
  );
