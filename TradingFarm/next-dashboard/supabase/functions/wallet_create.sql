-- Supabase Function: wallet_create
-- Creates a wallet and returns the new wallet row
-- SECURITY INVOKER, sets search_path, explicit typing, RLS enforced
CREATE OR REPLACE FUNCTION public.wallet_create(
    p_address TEXT,
    p_chain TEXT,
    p_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_farm_id UUID DEFAULT NULL,
    p_agent_id UUID DEFAULT NULL,
    p_vault_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.wallets AS $$
  BEGIN
    set search_path = '';
    INSERT INTO public.wallets (
      address, chain, type, user_id, farm_id, agent_id, vault_id, metadata
    ) VALUES (
      p_address, p_chain, p_type, p_user_id, p_farm_id, p_agent_id, p_vault_id, p_metadata
    ) RETURNING * INTO STRICT result;
    RETURN result;
  END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
