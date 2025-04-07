-- Create farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- risk_profile_id UUID, -- Add later if needed, requires risk_profiles table
  settings JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.farms IS 'Stores information about individual trading farms.';
COMMENT ON COLUMN public.farms.owner_id IS 'The user who owns this farm.';
COMMENT ON COLUMN public.farms.is_active IS 'Whether the farm is currently active.';
COMMENT ON COLUMN public.farms.settings IS 'Farm-specific configuration settings.';

-- Setup automatic timestamp updates (assuming functions exist)
CREATE TRIGGER handle_farms_updated_at
BEFORE UPDATE ON public.farms
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
-- Allow users to see farms they own
-- TEMPORARILY SIMPLIFIED: The check for membership will be added back later.
CREATE POLICY select_farms_for_owner ON public.farms
    FOR SELECT
    USING (owner_id = auth.uid());

-- Allow users to insert farms for themselves
CREATE POLICY insert_farms_for_owner ON public.farms
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Allow owners to update their own farms
CREATE POLICY update_farms_for_owner ON public.farms
    FOR UPDATE
    USING (owner_id = auth.uid());

-- Allow owners to delete their own farms
CREATE POLICY delete_farms_for_owner ON public.farms
    FOR DELETE
    USING (owner_id = auth.uid());
