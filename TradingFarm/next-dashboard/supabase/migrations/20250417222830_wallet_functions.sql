-- Supabase Wallet/Vault Functions Migration

-- wallet_create
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
  DECLARE
    result public.wallets;
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

-- wallet_assign
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

-- wallet_transfer
CREATE OR REPLACE FUNCTION public.wallet_transfer(
    p_from_wallet_id UUID,
    p_to_wallet_id UUID,
    p_asset TEXT,
    p_amount NUMERIC,
    p_initiated_by UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.wallet_transactions AS $$
  DECLARE
    from_balance NUMERIC;
    result public.wallet_transactions;
  BEGIN
    set search_path = '';
    -- Check sufficient balance
    SELECT balance INTO from_balance FROM public.wallet_balances WHERE wallet_id = p_from_wallet_id AND asset = p_asset;
    IF from_balance IS NULL OR from_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
    -- Deduct from sender
    UPDATE public.wallet_balances SET balance = balance - p_amount, updated_at = NOW()
      WHERE wallet_id = p_from_wallet_id AND asset = p_asset;
    -- Credit to recipient
    INSERT INTO public.wallet_balances (wallet_id, asset, balance, updated_at)
      VALUES (p_to_wallet_id, p_asset, p_amount, NOW())
      ON CONFLICT (wallet_id, asset) DO UPDATE SET balance = public.wallet_balances.balance + p_amount, updated_at = NOW();
    -- Log transaction
    INSERT INTO public.wallet_transactions (
      wallet_id, tx_hash, asset, amount, tx_type, counterparty_wallet_id, status, metadata
    ) VALUES (
      p_from_wallet_id, NULL, p_asset, -p_amount, 'transfer', p_to_wallet_id, 'completed', p_metadata
    ) RETURNING * INTO STRICT result;
    -- Also log for recipient (optional, for full audit)
    INSERT INTO public.wallet_transactions (
      wallet_id, tx_hash, asset, amount, tx_type, counterparty_wallet_id, status, metadata
    ) VALUES (
      p_to_wallet_id, NULL, p_asset, p_amount, 'transfer', p_from_wallet_id, 'completed', p_metadata
    );
    RETURN result;
  END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- wallet_grant_permission
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

-- vault_create
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

-- vault_add_member
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
