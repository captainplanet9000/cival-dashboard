-- Migration to add farm_id column to agents table
-- This migration addresses a missing farm_id column needed for farm-based RLS policies

-- Add farm_id column to agents table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'farm_id'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_agents_farm_id ON public.agents(farm_id);
        COMMENT ON COLUMN public.agents.farm_id IS 'The farm that owns this agent';
    END IF;
END
$$;

-- Update existing agents to assign them to appropriate farms based on user_id
-- This assumes that each user has a single farm
UPDATE public.agents a
SET farm_id = f.id
FROM public.farms f
WHERE a.user_id = f.user_id
AND a.farm_id IS NULL;
