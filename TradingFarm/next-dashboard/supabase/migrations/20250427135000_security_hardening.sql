-- Migration for security hardening features
-- Implements credential rotation, IP allowlisting, and enhanced security controls

-- Create table for credential rotation settings
CREATE TABLE public.credential_rotation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  automatic_rotation BOOLEAN NOT NULL DEFAULT false,
  rotation_interval_days INTEGER NOT NULL DEFAULT 90,
  notify_before_expiry BOOLEAN NOT NULL DEFAULT true,
  notification_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable Row Level Security for credential_rotation_settings
ALTER TABLE public.credential_rotation_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for credential_rotation_settings
CREATE POLICY "Users can view their own credential rotation settings"
  ON public.credential_rotation_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credential rotation settings"
  ON public.credential_rotation_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credential rotation settings"
  ON public.credential_rotation_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on credential_rotation_settings
CREATE TRIGGER handle_updated_at_credential_rotation_settings
  BEFORE UPDATE ON public.credential_rotation_settings
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create table for credential rotation history
CREATE TABLE public.credential_rotation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange_id TEXT NOT NULL,
  previous_key_hash TEXT NOT NULL,
  rotation_reason TEXT NOT NULL,
  rotation_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, exchange_id) REFERENCES public.exchange_credentials(user_id, exchange_id) ON DELETE CASCADE
);

-- Enable Row Level Security for credential_rotation_history
ALTER TABLE public.credential_rotation_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for credential_rotation_history
CREATE POLICY "Users can view their own credential rotation history"
  ON public.credential_rotation_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert credential rotation history"
  ON public.credential_rotation_history
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    (SELECT auth.role() = 'service_role')
  );

-- Add last_rotated_at column to exchange_credentials if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'exchange_credentials' 
    AND column_name = 'last_rotated_at'
  ) THEN
    ALTER TABLE public.exchange_credentials 
    ADD COLUMN last_rotated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
  END IF;
END
$$;

-- Create table for IP allowlisting
CREATE TABLE public.security_ip_allowlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, ip_address)
);

-- Enable Row Level Security for security_ip_allowlist
ALTER TABLE public.security_ip_allowlist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security_ip_allowlist
CREATE POLICY "Users can view their own IP allowlist"
  ON public.security_ip_allowlist
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own IP allowlist"
  ON public.security_ip_allowlist
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own IP allowlist"
  ON public.security_ip_allowlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own IP allowlist"
  ON public.security_ip_allowlist
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on security_ip_allowlist
CREATE TRIGGER handle_updated_at_security_ip_allowlist
  BEFORE UPDATE ON public.security_ip_allowlist
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create table for API keys
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}',
  expiry_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, key_name)
);

-- Enable Row Level Security for api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for api_keys
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on api_keys
CREATE TRIGGER handle_updated_at_api_keys
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create security risk scoring function
CREATE OR REPLACE FUNCTION public.calculate_security_risk_score(
  event_type TEXT,
  ip_address TEXT,
  user_id UUID,
  endpoint TEXT
) RETURNS INTEGER
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  base_score INTEGER := 10;
  ip_history INTEGER;
  suspicious_activity INTEGER;
BEGIN
  -- Check if this IP has been associated with suspicious activity
  SELECT COUNT(*) INTO suspicious_activity
  FROM public.security_access_logs
  WHERE 
    public.security_access_logs.ip_address = ip_address
    AND public.security_access_logs.risk_score >= 80
    AND public.security_access_logs.created_at > NOW() - INTERVAL '7 days';
  
  -- Add risk for suspicious IPs
  IF suspicious_activity > 0 THEN
    base_score := base_score + 20;
  END IF;
  
  -- Add risk for new IPs
  SELECT COUNT(*) INTO ip_history
  FROM public.security_access_logs
  WHERE 
    public.security_access_logs.ip_address = ip_address
    AND public.security_access_logs.user_id = user_id
    AND public.security_access_logs.created_at > NOW() - INTERVAL '30 days';
  
  IF ip_history = 0 THEN
    base_score := base_score + 15;
  END IF;
  
  -- Add risk based on event type
  IF event_type = 'unauthorized_access' THEN
    base_score := base_score + 40;
  ELSIF event_type = 'ip_restriction_violation' THEN
    base_score := base_score + 50;
  ELSIF event_type = 'rate_limit_exceeded' THEN
    base_score := base_score + 30;
  ELSIF event_type = 'invalid_api_key' THEN
    base_score := base_score + 35;
  ELSIF event_type = 'credential_update' THEN
    base_score := base_score + 25;
  ELSIF event_type LIKE '%_failed' THEN
    base_score := base_score + 20;
  END IF;
  
  -- Add risk for sensitive endpoints
  IF endpoint LIKE '%/credentials%' OR endpoint LIKE '%/keys%' OR endpoint LIKE '%/auth%' THEN
    base_score := base_score + 15;
  END IF;
  
  -- Ensure score is within range 0-100
  RETURN LEAST(GREATEST(base_score, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- Create functions for testing IP address access
CREATE OR REPLACE FUNCTION public.is_ip_allowed(
  p_user_id UUID,
  p_ip_address TEXT
) RETURNS BOOLEAN
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  allowed_ip RECORD;
  is_allowed BOOLEAN := FALSE;
BEGIN
  -- Check if user has any IP restrictions
  IF NOT EXISTS (
    SELECT 1 FROM public.security_ip_allowlist
    WHERE user_id = p_user_id AND is_active = true
  ) THEN
    -- No restrictions means all IPs are allowed
    RETURN TRUE;
  END IF;
  
  -- Check if IP is in allowlist
  FOR allowed_ip IN
    SELECT ip_address FROM public.security_ip_allowlist
    WHERE user_id = p_user_id AND is_active = true
  LOOP
    -- Check for exact match
    IF allowed_ip.ip_address = p_ip_address THEN
      is_allowed := TRUE;
      EXIT;
    END IF;
    
    -- Check for wildcard match (e.g., 192.168.1.*)
    IF position('*' in allowed_ip.ip_address) > 0 THEN
      DECLARE
        pattern TEXT;
        parts TEXT[];
        ip_parts TEXT[];
        match BOOLEAN := TRUE;
        i INTEGER;
      BEGIN
        pattern := replace(allowed_ip.ip_address, '*', '');
        parts := string_to_array(pattern, '.');
        ip_parts := string_to_array(p_ip_address, '.');
        
        -- Check each non-wildcard part
        FOR i IN 1..array_length(parts, 1) LOOP
          IF parts[i] != '' AND parts[i] != ip_parts[i] THEN
            match := FALSE;
            EXIT;
          END IF;
        END LOOP;
        
        IF match THEN
          is_allowed := TRUE;
          EXIT;
        END IF;
      END;
    END IF;
  END LOOP;
  
  RETURN is_allowed;
END;
$$ LANGUAGE plpgsql;

-- Update the security access log triggers to use the risk scoring function
-- This assumes we already have a security_access_logs table from previous migrations
CREATE OR REPLACE FUNCTION public.before_insert_security_access_log()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- If no risk score is provided, calculate it
  IF NEW.risk_score IS NULL THEN
    NEW.risk_score := public.calculate_security_risk_score(
      NEW.event_type,
      NEW.ip_address,
      NEW.user_id,
      NEW.endpoint
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'before_insert_security_access_log_trigger'
  ) THEN
    CREATE TRIGGER before_insert_security_access_log_trigger
    BEFORE INSERT ON public.security_access_logs
    FOR EACH ROW
    EXECUTE PROCEDURE public.before_insert_security_access_log();
  END IF;
END
$$;
