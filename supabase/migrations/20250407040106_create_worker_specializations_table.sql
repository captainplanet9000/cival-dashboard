-- Create worker_specializations table
CREATE TABLE public.worker_specializations (
    worker_id UUID PRIMARY KEY REFERENCES public.worker_agents(id) ON DELETE CASCADE,
    specialization_type VARCHAR(50) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performance_boost DECIMAL, -- Optional: Quantifiable boost metric
    confirmed_effective BOOLEAN DEFAULT false,
    metadata JSONB, -- Store additional details about the specialization
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.worker_specializations IS 'Tracks applied specializations for worker agents.';
COMMENT ON COLUMN public.worker_specializations.worker_id IS 'The worker agent that received the specialization.';
COMMENT ON COLUMN public.worker_specializations.specialization_type IS 'The type or category of specialization applied.';
COMMENT ON COLUMN public.worker_specializations.applied_at IS 'Timestamp when the specialization was applied.';
COMMENT ON COLUMN public.worker_specializations.performance_boost IS 'Estimated or measured performance improvement due to specialization.';
COMMENT ON COLUMN public.worker_specializations.confirmed_effective IS 'Flag indicating if the specialization effectiveness has been confirmed.';
COMMENT ON COLUMN public.worker_specializations.metadata IS 'Additional data related to the specialization process or outcome.';
COMMENT ON COLUMN public.worker_specializations.created_at IS 'Timestamp when the specialization record was created.';
COMMENT ON COLUMN public.worker_specializations.updated_at IS 'Timestamp when the specialization record was last updated.';

-- Enable Row Level Security
ALTER TABLE public.worker_specializations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Allow users to view specializations for workers in their farms
CREATE POLICY select_worker_specializations_for_farm_members ON public.worker_specializations
    FOR SELECT
    USING (
        worker_id IN (
            SELECT wa.id FROM public.worker_agents wa
            JOIN public.manager_agents ma ON wa.manager_id = ma.id
            WHERE ma.farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid())
        )
    );

-- Policy: Allow managers/system to manage specializations for their workers
CREATE POLICY manage_worker_specializations_for_managers ON public.worker_specializations
    FOR ALL
    USING (
        worker_id IN (
            SELECT wa.id FROM public.worker_agents wa
            JOIN public.manager_agents ma ON wa.manager_id = ma.id
            WHERE ma.id IN (SELECT id FROM public.manager_agents WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()))
            -- Add check if user/role is the specific manager
        )
    )
    WITH CHECK (
        worker_id IN (
            SELECT wa.id FROM public.worker_agents wa
            JOIN public.manager_agents ma ON wa.manager_id = ma.id
            WHERE ma.id IN (SELECT id FROM public.manager_agents WHERE farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()))
        )
    );

-- Setup automatic timestamp updates
CREATE TRIGGER handle_worker_specializations_updated_at
BEFORE UPDATE ON public.worker_specializations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
