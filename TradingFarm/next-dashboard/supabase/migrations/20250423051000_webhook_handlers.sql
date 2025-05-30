-- Migration: Webhook Handler System
-- This migration adds tables and functions for handling external webhooks and notifications

-- Create enums for webhook types and statuses
DO $$ BEGIN
    CREATE TYPE webhook_event_type_enum AS ENUM (
        'exchange', 'market', 'price_alert', 'agent_event', 
        'system', 'security', 'payment', 'integration'
    );
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE webhook_status_enum AS ENUM (
        'active', 'paused', 'disabled', 'failed'
    );
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create table for webhook configurations
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    event_types webhook_event_type_enum[] NOT NULL,
    headers JSONB,
    status webhook_status_enum NOT NULL DEFAULT 'active',
    secret_key TEXT,
    retry_count INTEGER DEFAULT 3,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT webhook_configs_url_check CHECK (url ~ '^https?://.*')
);

-- Create table for webhook events history
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
    event_type webhook_event_type_enum NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create table for external webhook endpoints to receive events
CREATE TABLE IF NOT EXISTS public.external_webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    endpoint_path VARCHAR(255) NOT NULL UNIQUE,
    secret_key TEXT NOT NULL,
    allowed_ips TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limit_per_minute INTEGER DEFAULT 60,
    event_types TEXT[] DEFAULT ARRAY['all'],
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for external webhook events log
CREATE TABLE IF NOT EXISTS public.external_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES public.external_webhook_endpoints(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    source_ip TEXT,
    headers JSONB,
    payload JSONB,
    is_verified BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on the new tables
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_webhook_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for webhook_configs
CREATE POLICY "Users can view their own webhook configs" 
    ON public.webhook_configs FOR SELECT 
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = webhook_configs.farm_id
        )
    );

CREATE POLICY "Users can create webhook configs" 
    ON public.webhook_configs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook configs" 
    ON public.webhook_configs FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhook configs" 
    ON public.webhook_configs FOR DELETE 
    USING (auth.uid() = user_id);

-- Create RLS policies for webhook_events
CREATE POLICY "Users can view their webhook events" 
    ON public.webhook_events FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.webhook_configs 
            WHERE id = webhook_events.webhook_id AND (
                user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.farm_members 
                    WHERE user_id = auth.uid() AND farm_id = webhook_configs.farm_id
                )
            )
        )
    );

-- Create RLS policies for external_webhook_endpoints
CREATE POLICY "Users can view external webhook endpoints they created or in their farms" 
    ON public.external_webhook_endpoints FOR SELECT 
    USING (
        created_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = external_webhook_endpoints.farm_id
        )
    );

CREATE POLICY "Users can create external webhook endpoints in their farms" 
    ON public.external_webhook_endpoints FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = external_webhook_endpoints.farm_id AND role = 'admin'
        )
    );

CREATE POLICY "Users can update external webhook endpoints they created or as farm admin" 
    ON public.external_webhook_endpoints FOR UPDATE 
    USING (
        created_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = external_webhook_endpoints.farm_id AND role = 'admin'
        )
    );

CREATE POLICY "Users can delete external webhook endpoints they created or as farm admin" 
    ON public.external_webhook_endpoints FOR DELETE 
    USING (
        created_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.farm_members 
            WHERE user_id = auth.uid() AND farm_id = external_webhook_endpoints.farm_id AND role = 'admin'
        )
    );

-- Create RLS policies for external_webhook_events
CREATE POLICY "Users can view external webhook events for their endpoints" 
    ON public.external_webhook_events FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.external_webhook_endpoints 
            WHERE id = external_webhook_events.endpoint_id AND (
                created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.farm_members 
                    WHERE user_id = auth.uid() AND farm_id = external_webhook_endpoints.farm_id
                )
            )
        )
    );

-- Create webhook processing function
CREATE OR REPLACE FUNCTION public.process_webhook_event(
    p_webhook_id UUID,
    p_event_type webhook_event_type_enum,
    p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_webhook_config RECORD;
    v_event_id UUID;
    v_http_response RECORD;
    v_result JSONB;
    v_status TEXT;
    v_error TEXT;
BEGIN
    -- Get webhook configuration
    SELECT * INTO v_webhook_config
    FROM public.webhook_configs
    WHERE id = p_webhook_id;
    
    IF v_webhook_config IS NULL THEN
        RAISE EXCEPTION 'Webhook configuration not found: %', p_webhook_id;
    END IF;
    
    -- Check webhook status
    IF v_webhook_config.status != 'active' THEN
        RAISE EXCEPTION 'Webhook is not active: %', p_webhook_id;
    END IF;
    
    -- Check if event type is allowed for this webhook
    IF NOT (p_event_type = ANY(v_webhook_config.event_types)) THEN
        RAISE EXCEPTION 'Event type % is not allowed for webhook %', p_event_type, p_webhook_id;
    END IF;
    
    -- Record the webhook event
    INSERT INTO public.webhook_events (
        webhook_id,
        event_type,
        payload,
        status,
        attempt_count
    ) VALUES (
        p_webhook_id,
        p_event_type,
        p_payload,
        'pending',
        0
    ) RETURNING id INTO v_event_id;

    -- In a real implementation, this would call an external HTTP endpoint
    -- Here we're simulating it for development purposes
    v_status := 'success';
    
    -- In production, you'd make an HTTP request to the webhook URL
    -- This is a simplified simulation:
    IF random() < 0.9 THEN -- 90% success rate for simulation
        -- Successful webhook delivery
        UPDATE public.webhook_events
        SET 
            status = 'delivered',
            response_status = 200,
            response_body = '{"status":"success"}',
            attempt_count = 1,
            completed_at = NOW()
        WHERE id = v_event_id;
    ELSE
        -- Failed webhook delivery
        v_status := 'failed';
        v_error := 'Simulated webhook delivery failure';
        
        UPDATE public.webhook_events
        SET 
            status = 'failed',
            error_message = v_error,
            attempt_count = 1,
            next_retry_at = NOW() + interval '5 minutes'
        WHERE id = v_event_id;
    END IF;
    
    -- Return status
    v_result := jsonb_build_object(
        'webhook_id', p_webhook_id,
        'event_id', v_event_id,
        'status', v_status,
        'error', v_error
    );
    
    RETURN v_result;
END;
$$;

-- Create function to verify webhook signatures
CREATE OR REPLACE FUNCTION public.verify_webhook_signature(
    p_endpoint_id UUID,
    p_payload TEXT,
    p_signature TEXT,
    p_timestamp TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_endpoint RECORD;
    v_expected_signature TEXT;
BEGIN
    -- Get endpoint details
    SELECT * INTO v_endpoint
    FROM public.external_webhook_endpoints
    WHERE id = p_endpoint_id;
    
    IF v_endpoint IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- In a real implementation, you would:
    -- 1. Create a string combining the timestamp, a period, and the payload
    -- 2. Generate an HMAC using the secret key
    -- 3. Compare with the provided signature
    
    -- This is a simplified version for development
    -- Replace with actual HMAC verification in production
    v_expected_signature := encode(
        hmac(
            p_timestamp || '.' || p_payload, 
            v_endpoint.secret_key, 
            'sha256'
        ),
        'hex'
    );
    
    RETURN v_expected_signature = p_signature;
END;
$$;

-- Create function to handle incoming webhooks
CREATE OR REPLACE FUNCTION public.handle_external_webhook(
    p_endpoint_path TEXT,
    p_event_type TEXT,
    p_source_ip TEXT,
    p_headers JSONB,
    p_payload JSONB,
    p_signature TEXT,
    p_timestamp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Using security definer to allow public access
SET search_path = ''
AS $$
DECLARE
    v_endpoint RECORD;
    v_is_verified BOOLEAN;
    v_event_id UUID;
    v_result JSONB;
    v_alert_id UUID;
BEGIN
    -- Find the endpoint
    SELECT * INTO v_endpoint
    FROM public.external_webhook_endpoints
    WHERE endpoint_path = p_endpoint_path AND is_active = TRUE;
    
    IF v_endpoint IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Webhook endpoint not found');
    END IF;
    
    -- Check IP allowlist if configured
    IF v_endpoint.allowed_ips IS NOT NULL AND array_length(v_endpoint.allowed_ips, 1) > 0 THEN
        IF NOT (p_source_ip = ANY(v_endpoint.allowed_ips)) THEN
            RETURN jsonb_build_object('status', 'error', 'message', 'IP address not allowed');
        END IF;
    END IF;
    
    -- Verify webhook signature
    v_is_verified := public.verify_webhook_signature(
        v_endpoint.id,
        p_payload::TEXT,
        p_signature,
        p_timestamp
    );
    
    -- Log the incoming webhook
    INSERT INTO public.external_webhook_events (
        endpoint_id,
        event_type,
        source_ip,
        headers,
        payload,
        is_verified
    ) VALUES (
        v_endpoint.id,
        p_event_type,
        p_source_ip,
        p_headers,
        p_payload,
        v_is_verified
    ) RETURNING id INTO v_event_id;
    
    -- Only process verified webhooks
    IF NOT v_is_verified THEN
        RETURN jsonb_build_object(
            'status', 'error', 
            'message', 'Invalid signature',
            'event_id', v_event_id
        );
    END IF;
    
    -- Process based on event type
    -- This is where you would add custom logic for different event types
    -- For example, create alerts, update agent status, trigger strategies, etc.
    
    -- Example: Create an alert for important events
    IF p_event_type IN ('exchange_error', 'security_alert', 'price_alert', 'market_event') THEN
        INSERT INTO public.alerts (
            user_id,
            title,
            message,
            severity,
            category,
            source,
            metadata
        ) VALUES (
            (SELECT created_by FROM public.external_webhook_endpoints WHERE id = v_endpoint.id),
            COALESCE(p_payload->>'title', 'External webhook alert: ' || p_event_type),
            COALESCE(p_payload->>'message', 'Received ' || p_event_type || ' webhook event'),
            CASE 
                WHEN p_event_type = 'security_alert' THEN 'critical'
                WHEN p_event_type = 'exchange_error' THEN 'error'
                ELSE 'warning'
            END,
            CASE 
                WHEN p_event_type = 'security_alert' THEN 'security'
                WHEN p_event_type LIKE '%exchange%' THEN 'trading'
                WHEN p_event_type LIKE '%price%' THEN 'trading'
                WHEN p_event_type LIKE '%market%' THEN 'trading'
                ELSE 'system'
            END,
            'exchange',
            jsonb_build_object(
                'webhook_event_id', v_event_id,
                'webhook_endpoint_id', v_endpoint.id,
                'event_payload', p_payload
            )
        ) RETURNING id INTO v_alert_id;
    END IF;
    
    -- Return success response
    v_result := jsonb_build_object(
        'status', 'success',
        'event_id', v_event_id,
        'message', 'Webhook processed successfully',
        'alert_id', v_alert_id
    );
    
    RETURN v_result;
END;
$$;

-- Create function to retry failed webhooks
CREATE OR REPLACE FUNCTION public.retry_failed_webhooks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_retried INTEGER := 0;
    v_succeeded INTEGER := 0;
    v_failed INTEGER := 0;
    v_event RECORD;
    v_webhook_config RECORD;
    v_result JSONB;
BEGIN
    -- Find webhook events that need to be retried
    FOR v_event IN
        SELECT * FROM public.webhook_events
        WHERE 
            status = 'failed'
            AND attempt_count < (
                SELECT retry_count 
                FROM public.webhook_configs 
                WHERE id = webhook_events.webhook_id
            )
            AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY created_at
        LIMIT 50 -- Process in batches
    LOOP
        v_retried := v_retried + 1;
        
        -- Get webhook configuration
        SELECT * INTO v_webhook_config
        FROM public.webhook_configs
        WHERE id = v_event.webhook_id;
        
        -- Skip if webhook is not active
        IF v_webhook_config.status != 'active' THEN
            CONTINUE;
        END IF;
        
        -- In a real implementation, this would call an external HTTP endpoint
        -- Here we're simulating it for development purposes
        
        -- Simulate webhook retry success/failure (higher success rate than initial attempt)
        IF random() < 0.95 THEN -- 95% success rate for retries in simulation
            -- Successful webhook delivery
            UPDATE public.webhook_events
            SET 
                status = 'delivered',
                response_status = 200,
                response_body = '{"status":"success","retry":true}',
                attempt_count = attempt_count + 1,
                completed_at = NOW()
            WHERE id = v_event.id;
            
            v_succeeded := v_succeeded + 1;
        ELSE
            -- Failed webhook delivery
            UPDATE public.webhook_events
            SET 
                status = 'failed',
                error_message = 'Simulated webhook retry failure',
                attempt_count = attempt_count + 1,
                next_retry_at = NOW() + (interval '5 minutes' * attempt_count) -- Exponential backoff
            WHERE id = v_event.id;
            
            v_failed := v_failed + 1;
        END IF;
    END LOOP;
    
    -- Return summary
    v_result := jsonb_build_object(
        'retried', v_retried,
        'succeeded', v_succeeded,
        'failed', v_failed,
        'timestamp', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- Add timestamp triggers
DROP TRIGGER IF EXISTS webhook_configs_created_at ON public.webhook_configs;
CREATE TRIGGER webhook_configs_created_at BEFORE INSERT ON public.webhook_configs FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS webhook_configs_updated_at ON public.webhook_configs;
CREATE TRIGGER webhook_configs_updated_at BEFORE UPDATE ON public.webhook_configs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS external_webhook_endpoints_created_at ON public.external_webhook_endpoints;
CREATE TRIGGER external_webhook_endpoints_created_at BEFORE INSERT ON public.external_webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS external_webhook_endpoints_updated_at ON public.external_webhook_endpoints;
CREATE TRIGGER external_webhook_endpoints_updated_at BEFORE UPDATE ON public.external_webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
