-- Supabase Function: vault_create
-- Creates a vault and returns the new vault row
-- SECURITY INVOKER, sets search_path, explicit typing, RLS enforced
CREATE OR REPLACE FUNCTION public.vault_create(
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_owner_id UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.vaults AS $$
  DECLARE
    result public.vaults;
  BEGIN
    set search_path = '';
    INSERT INTO public.vaults (
      name, description, owner_id, metadata
    ) VALUES (
      p_name, p_description, p_owner_id, p_metadata
    ) RETURNING * INTO STRICT result;
    RETURN result;
  END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
