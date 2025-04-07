-- Create farm_members table
CREATE TABLE public.farm_members (
    farm_id UUID NOT NULL, -- No reference yet, farms table created later
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- e.g., 'owner', 'admin', 'member'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (farm_id, user_id)
);

-- Add comments
COMMENT ON TABLE public.farm_members IS 'Tracks user membership and roles within farms.';
COMMENT ON COLUMN public.farm_members.farm_id IS 'The farm the user is a member of.';
COMMENT ON COLUMN public.farm_members.user_id IS 'The user who is a member.';
COMMENT ON COLUMN public.farm_members.role IS 'The role of the user within the farm.';

-- Add foreign key constraint *after* farms table is created
-- This will be done in a separate, later migration or by modifying the farms migration slightly.
-- ALTER TABLE public.farm_members ADD CONSTRAINT fk_farm_members_farm_id FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.farm_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to see their own memberships
CREATE POLICY select_own_farm_membership ON public.farm_members
    FOR SELECT
    USING (user_id = auth.uid());

-- Allow users to see memberships of farms they are also members of
CREATE POLICY select_farm_members_for_shared_farms ON public.farm_members
    FOR SELECT
    USING (farm_id IN (SELECT fm.farm_id FROM public.farm_members fm WHERE fm.user_id = auth.uid()));

-- Allow farm owners/admins to manage memberships (insert/update/delete)
-- TEMPORARILY SIMPLIFIED to remove dependency on the farms table during initial creation.
-- A later migration will add the proper check.
CREATE POLICY manage_farm_members_temp_allow_all ON public.farm_members
    FOR ALL
    USING (true) -- Temporarily allow all actions; relies on application logic for safety
    WITH CHECK (true);

-- Setup automatic timestamp updates
CREATE TRIGGER handle_farm_members_updated_at
BEFORE UPDATE ON public.farm_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
