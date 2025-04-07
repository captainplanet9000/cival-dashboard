-- Add Foreign Key from farm_members to farms
ALTER TABLE public.farm_members
ADD CONSTRAINT fk_farm_members_farm_id FOREIGN KEY (farm_id)
REFERENCES public.farms(id) ON DELETE CASCADE;

-- Reinstate/Update RLS policy for farm_members management
-- Drop the temporary policy first
DROP POLICY IF EXISTS manage_farm_members_temp_allow_all ON public.farm_members;
-- Create the proper policy that checks farm ownership
CREATE POLICY manage_farm_members_for_farm_owners ON public.farm_members
    FOR ALL
    USING (
        farm_id IN (SELECT f.id FROM public.farms f WHERE f.owner_id = auth.uid())
        -- Add check for admin role if needed: OR auth.uid() IN (SELECT fm.user_id FROM public.farm_members fm WHERE fm.farm_id = farm_members.farm_id AND fm.role = 'admin')
    )
    WITH CHECK (
        farm_id IN (SELECT f.id FROM public.farms f WHERE f.owner_id = auth.uid())
    );

-- Reinstate/Update RLS policy for selecting farms
-- Drop the temporary policy first
DROP POLICY IF EXISTS select_farms_for_owner ON public.farms;
-- Create the proper policy that checks ownership OR membership
CREATE POLICY select_farms_for_owner_or_member ON public.farms
    FOR SELECT
    USING (
        owner_id = auth.uid()
        OR id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid())
    );
