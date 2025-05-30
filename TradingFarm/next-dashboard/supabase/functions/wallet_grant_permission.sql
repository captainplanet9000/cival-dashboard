-- Supabase Function: wallet_grant_permission
-- Grants a role to a user for a wallet (owner, manager, agent, viewer)
-- SECURITY INVOKER, sets search_path, explicit typing, RLS enforced
CREATE OR REPLACE FUNCTION public.wallet_grant_permission(
    p_wallet_id UUID,
    p_user_id UUID,
    p_role TEXT,
    p_granted_by UUID
)
RETURNS public.wallet_permissions AS $$
  DECLARE
    result public.wallet_permissions;
  BEGIN
    set search_path = '';
    INSERT INTO public.wallet_permissions (
      wallet_id, user_id, role, granted_by
    ) VALUES (
      p_wallet_id, p_user_id, p_role, p_granted_by
    ) RETURNING * INTO STRICT result;
    RETURN result;
  END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
