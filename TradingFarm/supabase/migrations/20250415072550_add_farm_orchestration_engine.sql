-- Add orchestration_state column to farms
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS orchestration_state TEXT DEFAULT 'IDLE';

-- Create farm_orchestration_logs table
CREATE TABLE IF NOT EXISTS public.farm_orchestration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    prev_state TEXT,
    new_state TEXT,
    event TEXT,
    agent_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    message TEXT
);

-- Triggers for created_at/updated_at
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_created_at') THEN
        RAISE NOTICE 'handle_created_at() does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        RAISE NOTICE 'handle_updated_at() does not exist';
    END IF;
END $$;

CREATE TRIGGER set_created_at BEFORE INSERT ON public.farm_orchestration_logs FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.farm_orchestration_logs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.farm_orchestration_logs ENABLE ROW LEVEL SECURITY;

-- Allow farm owners and farm agents to view their farm orchestration logs
CREATE POLICY "Allow farm owners and agents to view logs" ON public.farm_orchestration_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.farms f
        WHERE f.id = farm_orchestration_logs.farm_id
        AND (
            f.owner_id = auth.uid() OR
            EXISTS (SELECT 1 FROM public.farm_users fu WHERE fu.farm_id = f.id AND fu.user_id = auth.uid())
        )
    )
);

-- Allow farm owners to insert logs
CREATE POLICY "Allow farm owners to insert logs" ON public.farm_orchestration_logs
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.farms f
        WHERE f.id = farm_orchestration_logs.farm_id
        AND f.owner_id = auth.uid()
    )
);

-- Allow farm owners to update logs
CREATE POLICY "Allow farm owners to update logs" ON public.farm_orchestration_logs
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.farms f
        WHERE f.id = farm_orchestration_logs.farm_id
        AND f.owner_id = auth.uid()
    )
);

-- Allow farm owners to delete logs
CREATE POLICY "Allow farm owners to delete logs" ON public.farm_orchestration_logs
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.farms f
        WHERE f.id = farm_orchestration_logs.farm_id
        AND f.owner_id = auth.uid()
    )
);
