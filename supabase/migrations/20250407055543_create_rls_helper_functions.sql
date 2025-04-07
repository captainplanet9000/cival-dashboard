-- Migration: Create RLS helper function
-- Description: Defines a SECURITY DEFINER function to check farm ownership for use in RLS policies.

CREATE OR REPLACE FUNCTION public.is_farm_owner(p_farm_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
-- Set a secure search_path
SET search_path = ''
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id
  INTO v_owner_id
  FROM public.farms -- Use fully qualified name
  WHERE id = p_farm_id;

  RETURN v_owner_id = auth.uid();
EXCEPTION
  -- Return false if farm not found or any other error occurs
  WHEN others THEN
    RETURN FALSE;
END;
$$;
