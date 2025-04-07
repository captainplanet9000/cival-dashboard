-- Create autonomy_config table
CREATE TABLE public.autonomy_config (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    warning_threshold DECIMAL,
    critical_threshold DECIMAL,
    check_interval_seconds INTEGER DEFAULT 60,
    alert_config JSONB, -- e.g., { "type": "webhook", "url": "...", "level": "critical" }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.autonomy_config IS 'Configuration for monitoring autonomous system metrics and alert thresholds.';
COMMENT ON COLUMN public.autonomy_config.metric_name IS 'Unique name of the metric being monitored (e.g., agent_response_time).';
COMMENT ON COLUMN public.autonomy_config.warning_threshold IS 'Threshold at which a warning state is triggered.';
COMMENT ON COLUMN public.autonomy_config.critical_threshold IS 'Threshold at which a critical state is triggered.';
COMMENT ON COLUMN public.autonomy_config.check_interval_seconds IS 'How often this metric should be checked.';
COMMENT ON COLUMN public.autonomy_config.alert_config IS 'Configuration for sending alerts when thresholds are breached.';
COMMENT ON COLUMN public.autonomy_config.is_active IS 'Whether this monitoring configuration is active.';

-- Enable Row Level Security
ALTER TABLE public.autonomy_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Example: Allow admins/system to manage, allow authenticated to read)
CREATE POLICY select_autonomy_config ON public.autonomy_config
    FOR SELECT
    USING (auth.role() = 'authenticated'); -- Or more specific roles

CREATE POLICY manage_autonomy_config_for_admins ON public.autonomy_config
    FOR ALL
    USING (auth.role() = 'service_role') -- Or check for specific admin user role
    WITH CHECK (auth.role() = 'service_role');

-- Setup automatic timestamp updates
CREATE TRIGGER handle_autonomy_config_updated_at
BEFORE UPDATE ON public.autonomy_config
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert example thresholds from design
INSERT INTO public.autonomy_config 
    (metric_name, description, warning_threshold, critical_threshold)
VALUES 
    ('agent_response_time', 'Agent response time in milliseconds', 5000, 10000),
    ('goal_completion_rate', 'Overall goal completion rate (0.0 to 1.0)', 0.7, 0.5);
