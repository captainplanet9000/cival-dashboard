-- Migration: Agent Health Monitoring and Events
-- This migration adds tables and functions for monitoring agent health and events

-- Create enum for agent health status
DO $$ BEGIN
    CREATE TYPE agent_health_status_enum AS ENUM (
        'active', 'warning', 'critical', 'inactive', 'unknown'
    );
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for agent event types
DO $$ BEGIN
    CREATE TYPE agent_event_type_enum AS ENUM (
        'start', 'stop', 'error', 'warning', 'info', 'success',
        'trade', 'signal', 'heartbeat', 'config_change', 'status_change'
    );
    EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create table for tracking agent health
CREATE TABLE IF NOT EXISTS public.agent_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    status agent_health_status_enum NOT NULL DEFAULT 'unknown',
    last_active TIMESTAMPTZ,
    cpu_usage FLOAT,
    memory_usage FLOAT,
    active_tasks INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    uptime_seconds INTEGER DEFAULT 0,
    last_error_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Create a unique constraint on agent_id to ensure one health record per agent
    CONSTRAINT unique_agent_health UNIQUE (agent_id)
);

-- Create table for agent events
CREATE TABLE IF NOT EXISTS public.agent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    event_type agent_event_type_enum NOT NULL,
    event_data JSONB,
    source VARCHAR(255),
    severity VARCHAR(50) DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on the tables
ALTER TABLE public.agent_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agent_health
CREATE POLICY "Users can view agent health for agents in their farms" 
    ON public.agent_health FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.agents a
            LEFT JOIN public.farm_members fm ON a.farm_id = fm.farm_id
            WHERE a.id = agent_health.agent_id AND 
            (fm.user_id = auth.uid() OR a.created_by = auth.uid())
        )
    );

CREATE POLICY "Users can create agent health records for agents in their farms" 
    ON public.agent_health FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agents a
            LEFT JOIN public.farm_members fm ON a.farm_id = fm.farm_id
            WHERE a.id = agent_health.agent_id AND 
            (fm.user_id = auth.uid() OR a.created_by = auth.uid())
        )
    );

CREATE POLICY "Users can update agent health records for agents in their farms" 
    ON public.agent_health FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.agents a
            LEFT JOIN public.farm_members fm ON a.farm_id = fm.farm_id
            WHERE a.id = agent_health.agent_id AND 
            (fm.user_id = auth.uid() OR a.created_by = auth.uid())
        )
    );

-- Create RLS policies for agent_events
CREATE POLICY "Users can view agent events for agents in their farms" 
    ON public.agent_events FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.agents a
            LEFT JOIN public.farm_members fm ON a.farm_id = fm.farm_id
            WHERE a.id = agent_events.agent_id AND 
            (fm.user_id = auth.uid() OR a.created_by = auth.uid())
        )
    );

CREATE POLICY "Users can create agent events for agents in their farms" 
    ON public.agent_events FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agents a
            LEFT JOIN public.farm_members fm ON a.farm_id = fm.farm_id
            WHERE a.id = agent_events.agent_id AND 
            (fm.user_id = auth.uid() OR a.created_by = auth.uid())
        )
    );

-- Create function to update agent health status based on metrics
CREATE OR REPLACE FUNCTION public.update_agent_health_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_status public.agent_health_status_enum;
BEGIN
    -- Determine status based on metrics
    IF NEW.last_active IS NULL THEN
        v_status := 'unknown';
    ELSIF NEW.last_active < NOW() - INTERVAL '15 minutes' THEN
        v_status := 'inactive';
    ELSIF NEW.error_count > 10 OR NEW.cpu_usage > 90 OR NEW.memory_usage > 90 THEN
        v_status := 'critical';
    ELSIF NEW.error_count > 3 OR NEW.cpu_usage > 70 OR NEW.memory_usage > 70 THEN
        v_status := 'warning';
    ELSE
        v_status := 'active';
    END IF;
    
    -- Update status only if it changed
    IF NEW.status != v_status THEN
        NEW.status := v_status;
        
        -- If the status changed, create an agent event
        INSERT INTO public.agent_events (
            agent_id,
            event_type,
            event_data,
            severity
        ) VALUES (
            NEW.agent_id,
            'status_change',
            jsonb_build_object(
                'from', OLD.status::TEXT,
                'to', v_status::TEXT,
                'reason', CASE
                    WHEN v_status = 'inactive' THEN 'Agent inactive for more than 15 minutes'
                    WHEN v_status = 'critical' AND NEW.cpu_usage > 90 THEN 'CPU usage critical'
                    WHEN v_status = 'critical' AND NEW.memory_usage > 90 THEN 'Memory usage critical'
                    WHEN v_status = 'critical' AND NEW.error_count > 10 THEN 'Too many errors'
                    WHEN v_status = 'warning' AND NEW.cpu_usage > 70 THEN 'CPU usage high'
                    WHEN v_status = 'warning' AND NEW.memory_usage > 70 THEN 'Memory usage high'
                    WHEN v_status = 'warning' AND NEW.error_count > 3 THEN 'Multiple errors'
                    WHEN v_status = 'active' THEN 'Agent is healthy'
                    ELSE 'Status changed'
                END
            ),
            CASE
                WHEN v_status = 'critical' THEN 'error'
                WHEN v_status = 'warning' THEN 'warning'
                WHEN v_status = 'active' THEN 'info'
                ELSE 'info'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for agent health status updates
DROP TRIGGER IF EXISTS agent_health_status_trigger ON public.agent_health;
CREATE TRIGGER agent_health_status_trigger
BEFORE UPDATE ON public.agent_health
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR 
      OLD.error_count IS DISTINCT FROM NEW.error_count OR
      OLD.cpu_usage IS DISTINCT FROM NEW.cpu_usage OR
      OLD.memory_usage IS DISTINCT FROM NEW.memory_usage OR
      OLD.last_active IS DISTINCT FROM NEW.last_active)
EXECUTE FUNCTION public.update_agent_health_status();

-- Create function to log agent errors
CREATE OR REPLACE FUNCTION public.log_agent_error(
    p_agent_id UUID,
    p_message TEXT,
    p_error_data JSONB DEFAULT NULL,
    p_source TEXT DEFAULT 'system'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_event_id UUID;
    v_health_record public.agent_health;
BEGIN
    -- Insert error event
    INSERT INTO public.agent_events (
        agent_id,
        event_type,
        event_data,
        source,
        severity
    ) VALUES (
        p_agent_id,
        'error',
        COALESCE(p_error_data, jsonb_build_object('message', p_message)),
        p_source,
        'error'
    ) RETURNING id INTO v_event_id;
    
    -- Update agent health error count
    SELECT * INTO v_health_record
    FROM public.agent_health
    WHERE agent_id = p_agent_id;
    
    IF v_health_record IS NULL THEN
        -- Create new health record if one doesn't exist
        INSERT INTO public.agent_health (
            agent_id,
            status,
            error_count,
            last_error_at
        ) VALUES (
            p_agent_id,
            'warning',
            1,
            NOW()
        );
    ELSE
        -- Update existing health record
        UPDATE public.agent_health
        SET 
            error_count = COALESCE(error_count, 0) + 1,
            last_error_at = NOW()
        WHERE agent_id = p_agent_id;
    END IF;
    
    RETURN v_event_id;
END;
$$;

-- Create function to log agent events
CREATE OR REPLACE FUNCTION public.log_agent_event(
    p_agent_id UUID,
    p_event_type agent_event_type_enum,
    p_event_data JSONB DEFAULT NULL,
    p_source TEXT DEFAULT 'system',
    p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_event_id UUID;
BEGIN
    -- Insert event
    INSERT INTO public.agent_events (
        agent_id,
        event_type,
        event_data,
        source,
        severity
    ) VALUES (
        p_agent_id,
        p_event_type,
        p_event_data,
        p_source,
        p_severity
    ) RETURNING id INTO v_event_id;
    
    -- Special handling for certain event types
    IF p_event_type = 'heartbeat' THEN
        -- Update last_active on health record
        UPDATE public.agent_health
        SET 
            last_active = NOW(),
            updated_at = NOW()
        WHERE agent_id = p_agent_id;
        
        -- Create health record if it doesn't exist
        IF NOT FOUND THEN
            INSERT INTO public.agent_health (
                agent_id,
                status,
                last_active
            ) VALUES (
                p_agent_id,
                'active',
                NOW()
            );
        END IF;
    END IF;
    
    RETURN v_event_id;
END;
$$;

-- Create a view for agent health status that includes farm information
CREATE OR REPLACE VIEW public.view_agent_health_status AS
SELECT 
    a.id AS agent_id,
    a.name AS agent_name,
    a.farm_id,
    f.name AS farm_name,
    COALESCE(ah.status, 'unknown') AS health_status,
    ah.last_active,
    ah.cpu_usage,
    ah.memory_usage,
    ah.active_tasks,
    ah.error_count,
    (NOW() - COALESCE(ah.last_active, a.created_at)) AS time_since_last_active,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(ah.last_active, a.created_at)))/60 AS minutes_since_last_active
FROM 
    public.agents a
LEFT JOIN 
    public.agent_health ah ON a.id = ah.agent_id
LEFT JOIN
    public.farms f ON a.farm_id = f.id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_health_agent_id ON public.agent_health (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_agent_id ON public.agent_events (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON public.agent_events (created_at);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON public.agent_events (event_type);

-- Add timestamp triggers
DROP TRIGGER IF EXISTS agent_health_created_at ON public.agent_health;
CREATE TRIGGER agent_health_created_at BEFORE INSERT ON public.agent_health FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS agent_health_updated_at ON public.agent_health;
CREATE TRIGGER agent_health_updated_at BEFORE UPDATE ON public.agent_health FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
