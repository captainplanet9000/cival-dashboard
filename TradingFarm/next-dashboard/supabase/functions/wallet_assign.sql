-- Supabase Function: wallet_assign
-- Assigns a wallet to a farm, agent, or goal; logs assignment in wallet_assignments
-- SECURITY INVOKER, sets search_path, explicit typing, RLS enforced
CREATE OR REPLACE FUNCTION public.wallet_assign(
    p_wallet_id UUID,
    p_assigned_to_type TEXT,
    p_assigned_to_id UUID,
    p_assigned_by UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.wallet_assignments AS $$
  DECLARE
    result public.wallet_assignments;
  BEGIN
    set search_path = '';
    INSERT INTO public.wallet_assignments (
      wallet_id, assigned_to_type, assigned_to_id, assigned_by, metadata
    ) VALUES (
      p_wallet_id, p_assigned_to_type, p_assigned_to_id, p_assigned_by, p_metadata
    ) RETURNING * INTO STRICT result;
    RETURN result;
  END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
