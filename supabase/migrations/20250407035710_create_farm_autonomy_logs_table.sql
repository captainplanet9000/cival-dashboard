-- Create farm_autonomy_logs table
CREATE TABLE public.farm_autonomy_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- No updated_at needed for immutable logs
);

-- Add comments
COMMENT ON TABLE public.farm_autonomy_logs IS 'Logs events related to autonomous farm operations.';
COMMENT ON COLUMN public.farm_autonomy_logs.farm_id IS 'The farm associated with the logged event.';
COMMENT ON COLUMN public.farm_autonomy_logs.event_type IS 'Type of autonomous event (e.g., GOAL_UPDATED, AGENT_ASSIGNED, STRATEGY_ADJUSTED).';
COMMENT ON COLUMN public.farm_autonomy_logs.event_data IS 'JSON data containing details about the event.';
COMMENT ON COLUMN public.farm_autonomy_logs.created_at IS 'Timestamp when the log entry was created.';

-- Create an index for faster querying by farm_id and event_type
CREATE INDEX idx_farm_autonomy_logs_farm_id_event_type ON public.farm_autonomy_logs(farm_id, event_type);

-- Enable Row Level Security
ALTER TABLE public.farm_autonomy_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Allow users to view logs for farms they are members of
CREATE POLICY select_farm_autonomy_logs_for_farm_members ON public.farm_autonomy_logs
    FOR SELECT
    USING (
        farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid())
    );

-- Policy: Allow system roles or farm owners/admins to insert logs
CREATE POLICY insert_farm_autonomy_logs_for_system ON public.farm_autonomy_logs
    FOR INSERT
    -- Define who can insert logs (e.g., a specific system role or farm admins)
    -- Example: Allow farm owners
    WITH CHECK (
        farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
        -- Or check for a specific role: auth.role() = 'service_role' -- Be careful with service_role
    );

-- Logs are typically immutable, so UPDATE/DELETE policies might not be needed or should be highly restrictive.
