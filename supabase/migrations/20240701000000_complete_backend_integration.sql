-- Migration: Complete Backend Integration
-- Description: Adds webhooks, realtime subscriptions, edge functions, scheduled jobs, and storage integration

-- Create webhooks table for external service integration
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  secret_key TEXT,
  headers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notification settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'app')),
  event_type VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, channel, event_type)
);

-- Create user notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  event_type VARCHAR(100) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit logs for tracking important events
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user API keys for external API access
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for farm-specific settings
CREATE TABLE IF NOT EXISTS public.farm_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  setting_key VARCHAR(255) NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, setting_key)
);

-- Create scheduled jobs table
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  job_type VARCHAR(100) NOT NULL,
  cron_expression VARCHAR(100) NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create file storage references for strategy backtest results, reports, etc.
CREATE TABLE IF NOT EXISTS public.storage_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cache for market data to improve performance
CREATE TABLE IF NOT EXISTS public.market_data_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market VARCHAR(50) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(market, timeframe, start_time, end_time)
);

-- Create integration settings for external services (exchanges, data providers)
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  integration_type VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auth_status VARCHAR(50) DEFAULT 'pending' CHECK (auth_status IN ('pending', 'connected', 'failed', 'expired')),
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table to store AI model configurations for ElizaOS
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  model_id VARCHAR(255) NOT NULL,
  model_type VARCHAR(100) NOT NULL CHECK (model_type IN ('text', 'embeddings', 'image', 'audio', 'multimodal')),
  capabilities TEXT[] NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, model_id)
);

-- Create user preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key VARCHAR(255) NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Create realtime table for farm status updates
CREATE TABLE IF NOT EXISTS public.farm_status_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable realtime for specific tables
-- Note: This would be done via Supabase dashboard or CLI, simulated here as comments
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.farm_status_updates;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Create updated_at triggers
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farm_settings_updated_at
  BEFORE UPDATE ON public.farm_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_jobs_updated_at
  BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storage_files_updated_at
  BEFORE UPDATE ON public.storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_data_cache_updated_at
  BEFORE UPDATE ON public.market_data_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_models_updated_at
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_webhooks_farm_id ON public.webhooks(farm_id);
CREATE INDEX idx_notification_settings_user_id ON public.notification_settings(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_farm_id ON public.audit_logs(farm_id);
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_farm_settings_farm_id ON public.farm_settings(farm_id);
CREATE INDEX idx_scheduled_jobs_farm_id ON public.scheduled_jobs(farm_id);
CREATE INDEX idx_scheduled_jobs_is_active ON public.scheduled_jobs(is_active);
CREATE INDEX idx_storage_files_user_id ON public.storage_files(user_id);
CREATE INDEX idx_storage_files_farm_id ON public.storage_files(farm_id);
CREATE INDEX idx_market_data_cache_market ON public.market_data_cache(market);
CREATE INDEX idx_market_data_cache_expires_at ON public.market_data_cache(expires_at);
CREATE INDEX idx_integrations_farm_id ON public.integrations(farm_id);
CREATE INDEX idx_integrations_integration_type ON public.integrations(integration_type);
CREATE INDEX idx_ai_models_provider ON public.ai_models(provider);
CREATE INDEX idx_ai_models_model_type ON public.ai_models(model_type);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_farm_status_updates_farm_id ON public.farm_status_updates(farm_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_status_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhooks
CREATE POLICY "Users can view webhooks for their farms"
  ON public.webhooks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = webhooks.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage webhooks for their farms"
  ON public.webhooks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = webhooks.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- RLS Policies for notification_settings
CREATE POLICY "Users can view their own notification settings"
  ON public.notification_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own notification settings"
  ON public.notification_settings FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs for their farms"
  ON public.audit_logs FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = audit_logs.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own API keys"
  ON public.api_keys FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for farm_settings
CREATE POLICY "Users can view settings for their farms"
  ON public.farm_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = farm_settings.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage settings for their farms"
  ON public.farm_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = farm_settings.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- RLS Policies for scheduled_jobs
CREATE POLICY "Users can view scheduled jobs for their farms"
  ON public.scheduled_jobs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = scheduled_jobs.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage scheduled jobs for their farms"
  ON public.scheduled_jobs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = scheduled_jobs.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- RLS Policies for storage_files
CREATE POLICY "Users can view their own files"
  ON public.storage_files FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = storage_files.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own files"
  ON public.storage_files FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for market_data_cache
CREATE POLICY "Anyone can view market data cache"
  ON public.market_data_cache FOR SELECT
  USING (true);

-- RLS Policies for integrations
CREATE POLICY "Users can view integrations for their farms"
  ON public.integrations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = integrations.farm_id
    AND farms.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage integrations for their farms"
  ON public.integrations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = integrations.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- RLS Policies for ai_models
CREATE POLICY "Anyone can view active AI models"
  ON public.ai_models FOR SELECT
  USING (is_active = true);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences"
  ON public.user_preferences FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for farm_status_updates
CREATE POLICY "Users can view status updates for their farms"
  ON public.farm_status_updates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.farms
    WHERE farms.id = farm_status_updates.farm_id
    AND farms.owner_id = auth.uid()
  ));

-- Function to generate a secure webhook signature
CREATE OR REPLACE FUNCTION public.generate_webhook_signature(
  payload JSONB,
  secret_key TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  signature TEXT;
BEGIN
  -- In a real implementation, this would use HMAC-SHA256
  -- For simulation purposes, this returns a placeholder
  signature := encode(
    hmac(
      payload::text::bytea, 
      secret_key::bytea, 
      'sha256'
    ),
    'hex'
  );
  
  RETURN signature;
END;
$$;

-- Function to check if a job needs to be run
CREATE OR REPLACE FUNCTION public.check_scheduled_job(
  job_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  job public.scheduled_jobs%ROWTYPE;
BEGIN
  SELECT * INTO job
  FROM public.scheduled_jobs
  WHERE id = job_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF job.is_active = false THEN
    RETURN false;
  END IF;
  
  IF job.next_run_at IS NULL OR job.next_run_at <= NOW() THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    action,
    resource_type,
    resource_id,
    details,
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  user_id UUID,
  title TEXT,
  message TEXT,
  event_type TEXT,
  link TEXT DEFAULT NULL,
  data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  notification_id UUID;
  is_enabled BOOLEAN;
BEGIN
  -- Check if the user has enabled this notification type
  SELECT EXISTS (
    SELECT 1 FROM public.notification_settings
    WHERE notification_settings.user_id = create_notification.user_id
    AND notification_settings.event_type = create_notification.event_type
    AND notification_settings.is_enabled = true
  ) INTO is_enabled;
  
  -- If notifications are disabled for this event type, don't create one
  IF NOT is_enabled THEN
    RETURN NULL;
  END IF;
  
  -- Create the notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    event_type,
    link,
    data
  ) VALUES (
    user_id,
    title,
    message,
    event_type,
    link,
    data
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to update farm status
CREATE OR REPLACE FUNCTION public.update_farm_status(
  farm_id UUID,
  status TEXT,
  message TEXT DEFAULT NULL,
  metrics JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  update_id UUID;
BEGIN
  -- Update the farm status
  UPDATE public.farms
  SET status = update_farm_status.status,
      updated_at = NOW()
  WHERE id = farm_id;
  
  -- Create a status update record
  INSERT INTO public.farm_status_updates (
    farm_id,
    status,
    updated_by,
    message,
    metrics
  ) VALUES (
    farm_id,
    status,
    auth.uid(),
    message,
    metrics
  ) RETURNING id INTO update_id;
  
  -- Log the status change
  PERFORM public.log_audit_event(
    'status_change',
    'farm',
    farm_id,
    jsonb_build_object(
      'status', status,
      'message', message
    )
  );
  
  -- Create a notification for the farm owner
  PERFORM public.create_notification(
    (SELECT owner_id FROM public.farms WHERE id = farm_id),
    'Farm Status Changed',
    COALESCE(message, 'Farm status changed to ' || status),
    'farm_status_change',
    '/farms/' || farm_id,
    jsonb_build_object(
      'farm_id', farm_id,
      'status', status,
      'previous_status', (SELECT status FROM public.farms WHERE id = farm_id)
    )
  );
  
  RETURN update_id;
END;
$$;

-- Function to validate API key
CREATE OR REPLACE FUNCTION public.validate_api_key(
  key_hash TEXT,
  required_permission TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  api_key public.api_keys%ROWTYPE;
  user_id UUID;
BEGIN
  -- Find the API key
  SELECT * INTO api_key
  FROM public.api_keys
  WHERE api_keys.key_hash = validate_api_key.key_hash;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check if the key has expired
  IF api_key.expires_at IS NOT NULL AND api_key.expires_at <= NOW() THEN
    RETURN NULL;
  END IF;
  
  -- Check if the key has the required permission
  IF required_permission IS NOT NULL AND NOT (required_permission = ANY(api_key.permissions)) THEN
    RETURN NULL;
  END IF;
  
  -- Update the last used timestamp
  UPDATE public.api_keys
  SET last_used_at = NOW()
  WHERE id = api_key.id;
  
  -- Return the user ID
  RETURN api_key.user_id;
END;
$$;

-- Sample data for AI models
INSERT INTO public.ai_models (name, provider, model_id, model_type, capabilities)
VALUES 
  ('GPT-4', 'openai', 'gpt-4', 'text', ARRAY['completion', 'chat', 'reasoning']),
  ('Claude 3 Opus', 'anthropic', 'claude-3-opus', 'text', ARRAY['completion', 'chat', 'reasoning']),
  ('Text Embedding', 'openai', 'text-embedding-ada-002', 'embeddings', ARRAY['embeddings']),
  ('DALL-E 3', 'openai', 'dall-e-3', 'image', ARRAY['generation']),
  ('Whisper', 'openai', 'whisper-1', 'audio', ARRAY['transcription', 'translation']),
  ('GPT-4 Vision', 'openai', 'gpt-4-vision', 'multimodal', ARRAY['completion', 'chat', 'image_understanding']); 