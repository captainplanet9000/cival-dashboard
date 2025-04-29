-- Migration for Responsive Design and Cross-Platform Settings
-- This migration adds tables for storing user preferences related to responsive layouts
-- and cross-platform synchronization settings

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to handle created_at timestamps
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- User interface settings table to store preferences for different devices
CREATE TABLE IF NOT EXISTS public.user_interface_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL, -- 'mobile', 'tablet', 'desktop'
  device_id TEXT NOT NULL, -- Unique identifier for the specific device
  theme TEXT NOT NULL DEFAULT 'system', -- 'light', 'dark', 'system'
  layout_preference TEXT NOT NULL DEFAULT 'standard', -- 'compact', 'standard', 'advanced'
  font_size TEXT NOT NULL DEFAULT 'medium', -- 'small', 'medium', 'large'
  touch_mode BOOLEAN NOT NULL DEFAULT true, -- Whether to optimize for touch screens
  chart_detail_level TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  sidebar_visible BOOLEAN NOT NULL DEFAULT true, -- Whether sidebar is visible
  sidebar_compact BOOLEAN NOT NULL DEFAULT false, -- Whether sidebar is in compact mode
  widgets_order JSONB, -- Custom ordering of dashboard widgets
  trading_layout_config JSONB, -- Specific trading interface layout configuration
  analytics_layout_config JSONB, -- Specific analytics interface layout configuration
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each user can have only one settings profile per device
  UNIQUE(user_id, device_id)
);

-- Add timestamp triggers
CREATE TRIGGER handle_user_interface_settings_created_at
  BEFORE INSERT ON public.user_interface_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_user_interface_settings_updated_at
  BEFORE UPDATE ON public.user_interface_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on the table
ALTER TABLE public.user_interface_settings ENABLE ROW LEVEL SECURITY;

-- RLS policy to allow users to manage their own settings
CREATE POLICY "Users can manage their own UI settings"
  ON public.user_interface_settings
  USING (auth.uid() = user_id);

-- Offline data sync table to track queued changes for synchronization
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL, -- Device that created the sync entry
  operation_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  table_name TEXT NOT NULL, -- Table affected
  record_id TEXT NOT NULL, -- Primary key of the affected record
  payload JSONB NOT NULL, -- Data payload for the operation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ, -- When this was successfully synced
  sync_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  error_message TEXT, -- Error message if sync failed
  retry_count INTEGER NOT NULL DEFAULT 0, -- Number of sync attempts
  priority INTEGER NOT NULL DEFAULT 1 -- Sync priority (1 = highest)
);

-- Add timestamp triggers
CREATE TRIGGER handle_offline_sync_queue_created_at
  BEFORE INSERT ON public.offline_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

-- Enable RLS on the table
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS policy to allow users to manage their own sync queue
CREATE POLICY "Users can manage their own sync queue"
  ON public.offline_sync_queue
  USING (auth.uid() = user_id);

-- Device registration table to track user devices
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL, -- Unique identifier for the device
  device_name TEXT NOT NULL, -- User-friendly name ("John's iPhone")
  device_type TEXT NOT NULL, -- 'mobile', 'tablet', 'desktop'
  device_os TEXT NOT NULL, -- 'ios', 'android', 'windows', 'macos', 'linux', 'web'
  app_version TEXT NOT NULL, -- Version of the app installed
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_primary BOOLEAN NOT NULL DEFAULT false, -- Whether this is the user's primary device
  push_token TEXT, -- Token for push notifications
  offline_data_size_bytes BIGINT NOT NULL DEFAULT 0, -- Size of offline data stored
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each device_id can only be registered once per user
  UNIQUE(user_id, device_id)
);

-- Add timestamp triggers
CREATE TRIGGER handle_user_devices_created_at
  BEFORE INSERT ON public.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_user_devices_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on the table
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- RLS policy to allow users to manage their own devices
CREATE POLICY "Users can manage their own devices"
  ON public.user_devices
  USING (auth.uid() = user_id);

-- Function to check device last_active status and update it
CREATE OR REPLACE FUNCTION public.update_device_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_devices
  SET last_active_at = now(), updated_at = now()
  WHERE user_id = auth.uid() AND device_id = NEW.device_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- API function to get user's interface settings for current device
CREATE OR REPLACE FUNCTION public.get_user_interface_settings(p_device_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_settings JSONB;
BEGIN
  -- Check if the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the user's interface settings for the specified device
  SELECT 
    jsonb_build_object(
      'id', id,
      'device_type', device_type,
      'device_id', device_id,
      'theme', theme,
      'layout_preference', layout_preference,
      'font_size', font_size,
      'touch_mode', touch_mode,
      'chart_detail_level', chart_detail_level,
      'sidebar_visible', sidebar_visible,
      'sidebar_compact', sidebar_compact,
      'widgets_order', widgets_order,
      'trading_layout_config', trading_layout_config,
      'analytics_layout_config', analytics_layout_config
    )
  INTO v_settings
  FROM public.user_interface_settings
  WHERE user_id = auth.uid() AND device_id = p_device_id;

  -- If no settings exist for this device, return default values
  IF v_settings IS NULL THEN
    v_settings := jsonb_build_object(
      'device_id', p_device_id,
      'theme', 'system',
      'layout_preference', 'standard',
      'font_size', 'medium',
      'touch_mode', true,
      'chart_detail_level', 'medium',
      'sidebar_visible', true,
      'sidebar_compact', false
    );
  END IF;

  RETURN v_settings;
END;
$$;

-- API function to save user's interface settings
CREATE OR REPLACE FUNCTION public.save_user_interface_settings(
  p_device_id TEXT,
  p_device_type TEXT,
  p_settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_settings_id UUID;
  v_result JSONB;
BEGIN
  -- Check if the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert or update the user's interface settings
  INSERT INTO public.user_interface_settings (
    user_id,
    device_id,
    device_type,
    theme,
    layout_preference,
    font_size,
    touch_mode,
    chart_detail_level,
    sidebar_visible,
    sidebar_compact,
    widgets_order,
    trading_layout_config,
    analytics_layout_config
  )
  VALUES (
    auth.uid(),
    p_device_id,
    p_device_type,
    p_settings->>'theme',
    p_settings->>'layout_preference',
    p_settings->>'font_size',
    (p_settings->>'touch_mode')::boolean,
    p_settings->>'chart_detail_level',
    (p_settings->>'sidebar_visible')::boolean,
    (p_settings->>'sidebar_compact')::boolean,
    p_settings->'widgets_order',
    p_settings->'trading_layout_config',
    p_settings->'analytics_layout_config'
  )
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET
    device_type = EXCLUDED.device_type,
    theme = EXCLUDED.theme,
    layout_preference = EXCLUDED.layout_preference,
    font_size = EXCLUDED.font_size,
    touch_mode = EXCLUDED.touch_mode,
    chart_detail_level = EXCLUDED.chart_detail_level,
    sidebar_visible = EXCLUDED.sidebar_visible,
    sidebar_compact = EXCLUDED.sidebar_compact,
    widgets_order = EXCLUDED.widgets_order,
    trading_layout_config = EXCLUDED.trading_layout_config,
    analytics_layout_config = EXCLUDED.analytics_layout_config,
    updated_at = now()
  RETURNING id INTO v_settings_id;

  -- Create result
  v_result := jsonb_build_object(
    'id', v_settings_id,
    'success', true,
    'message', 'Settings saved successfully'
  );

  RETURN v_result;
END;
$$;

-- API function to register a new device
CREATE OR REPLACE FUNCTION public.register_device(
  p_device_id TEXT,
  p_device_name TEXT,
  p_device_type TEXT,
  p_device_os TEXT,
  p_app_version TEXT,
  p_push_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_device_id UUID;
  v_result JSONB;
BEGIN
  -- Check if the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert or update the device
  INSERT INTO public.user_devices (
    user_id,
    device_id,
    device_name,
    device_type,
    device_os,
    app_version,
    push_token,
    is_primary
  )
  VALUES (
    auth.uid(),
    p_device_id,
    p_device_name,
    p_device_type,
    p_device_os,
    p_app_version,
    p_push_token,
    NOT EXISTS (SELECT 1 FROM public.user_devices WHERE user_id = auth.uid()) -- First device is primary
  )
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET
    device_name = EXCLUDED.device_name,
    device_os = EXCLUDED.device_os,
    app_version = EXCLUDED.app_version,
    push_token = EXCLUDED.push_token,
    last_active_at = now(),
    updated_at = now()
  RETURNING id INTO v_device_id;

  -- Create result
  v_result := jsonb_build_object(
    'id', v_device_id,
    'success', true,
    'message', 'Device registered successfully'
  );

  RETURN v_result;
END;
$$;

-- API function to queue an offline operation for sync
CREATE OR REPLACE FUNCTION public.queue_offline_operation(
  p_device_id TEXT,
  p_operation_type TEXT,
  p_table_name TEXT,
  p_record_id TEXT,
  p_payload JSONB,
  p_priority INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_queue_id UUID;
  v_result JSONB;
BEGIN
  -- Check if the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the operation into the queue
  INSERT INTO public.offline_sync_queue (
    user_id,
    device_id,
    operation_type,
    table_name,
    record_id,
    payload,
    priority
  )
  VALUES (
    auth.uid(),
    p_device_id,
    p_operation_type,
    p_table_name,
    p_record_id,
    p_payload,
    p_priority
  )
  RETURNING id INTO v_queue_id;

  -- Create result
  v_result := jsonb_build_object(
    'id', v_queue_id,
    'success', true,
    'message', 'Operation queued for sync'
  );

  RETURN v_result;
END;
$$;

-- API function to get pending sync operations for a device
CREATE OR REPLACE FUNCTION public.get_pending_sync_operations(p_device_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_operations JSONB;
BEGIN
  -- Check if the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get pending operations
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'operation_type', operation_type,
      'table_name', table_name,
      'record_id', record_id,
      'payload', payload,
      'created_at', created_at,
      'priority', priority
    )
    ORDER BY priority, created_at
  )
  INTO v_operations
  FROM public.offline_sync_queue
  WHERE 
    user_id = auth.uid() AND 
    device_id = p_device_id AND 
    sync_status = 'pending';

  -- If no operations, return empty array
  IF v_operations IS NULL THEN
    v_operations := '[]'::jsonb;
  END IF;

  RETURN v_operations;
END;
$$;
