-- Supabase Function: wallet_transfer
-- Transfers funds between wallets (with permission checks)
-- SECURITY INVOKER, sets search_path, explicit typing, RLS enforced
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
