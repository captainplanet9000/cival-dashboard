-- Supabase Function: vault_add_member
-- Adds a user as a member to a vault (for multi-party custody)
-- SECURITY INVOKER, sets search_path, explicit typing, RLS enforced
CREATE OR REPLACE FUNCTION public.vault_add_member(
    p_vault_id UUID,
    p_user_id UUID,
    p_role TEXT,
    p_added_by UUID
)
RETURNS public.wallet_permissions AS $$
  DECLARE
    result public.wallet_permissions;
  BEGIN
    set search_path = '';
    INSERT INTO public.wallet_permissions (
      wallet_id, user_id, role, granted_by
    ) SELECT w.id, p_user_id, p_role, p_added_by
      FROM public.wallets w
      WHERE w.vault_id = p_vault_id
    RETURNING * INTO STRICT result;
    RETURN result;
  END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
