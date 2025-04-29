-- Security Infrastructure Enhancements
-- This migration adds tables and functions for API key rotation and IP whitelisting

-- Table for API key versions (for rotation)
CREATE TABLE IF NOT EXISTS public.api_key_versions (
  id BIGSERIAL PRIMARY KEY,
  credential_id BIGINT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  rotation_reason TEXT
);

-- Add foreign key constraint with verification
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exchange_credentials') THEN
    ALTER TABLE public.api_key_versions
      ADD CONSTRAINT fk_api_key_versions_credential
      FOREIGN KEY (credential_id) 
      REFERENCES public.exchange_credentials(id) 
      ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Table exchange_credentials does not exist yet, skipping foreign key constraint';
  END IF;
END $$;

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

-- Function to rotate API keys
CREATE OR REPLACE FUNCTION public.rotate_api_key(
  p_credential_id BIGINT,
  p_new_api_key_encrypted TEXT,
  p_new_api_secret_encrypted TEXT,
  p_rotation_reason TEXT DEFAULT 'manual',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS public.api_key_versions AS $$
DECLARE
  v_user_id UUID;
  v_new_version public.api_key_versions;
BEGIN
  -- Get the user_id from the credentials
  SELECT user_id INTO v_user_id
  FROM public.exchange_credentials
  WHERE id = p_credential_id;
  
  -- Check if the user owns this credential
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to rotate this API key';
  END IF;
  
  -- Deactivate all existing versions
  UPDATE public.api_key_versions
  SET is_active = false, updated_at = now()
  WHERE credential_id = p_credential_id AND is_active = true;
  
  -- Insert new version
  INSERT INTO public.api_key_versions(
    credential_id,
    api_key_encrypted,
    api_secret_encrypted,
    is_active,
    expires_at,
    created_by,
    rotation_reason
  ) VALUES (
    p_credential_id,
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
    p_credential_id::text,
    jsonb_build_object(
      'credential_id', p_credential_id,
      'reason', p_rotation_reason,
      'expires_at', p_expires_at
    ),
    'info'
  );
  
  RETURN v_new_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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

-- Triggers for updated_at
CREATE TRIGGER handle_api_key_versions_updated_at
  BEFORE UPDATE ON public.api_key_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_ip_whitelist_updated_at
  BEFORE UPDATE ON public.ip_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.api_key_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_key_versions
CREATE POLICY "Users can view their own API key versions"
  ON public.api_key_versions
  FOR SELECT
  USING (
    credential_id IN (
      SELECT id FROM public.exchange_credentials 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own API key versions"
  ON public.api_key_versions
  FOR INSERT
  WITH CHECK (
    credential_id IN (
      SELECT id FROM public.exchange_credentials 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own API key versions"
  ON public.api_key_versions
  FOR UPDATE
  USING (
    credential_id IN (
      SELECT id FROM public.exchange_credentials 
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

-- Admins can view all audit logs (requires adding a role-based system)
-- TO BE IMPLEMENTED WITH RBAC
