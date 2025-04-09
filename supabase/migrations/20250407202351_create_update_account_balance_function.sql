-- supabase/migrations/xxxx_create_update_account_balance_function.sql

create or replace function public.update_account_balance(
    target_account_id uuid,
    amount_change numeric
)
returns numeric
language plpgsql
volatile
security invoker
as $$
declare
  current_balance numeric;
  new_balance numeric;
begin
  -- Ensure function runs with permissions of the caller
  -- and references tables with schema explicitly
  set search_path = '';

  -- Lock the row for update to ensure atomicity
  select balance into current_balance
  from public.vault_accounts
  where id = target_account_id
  for update;

  -- If account not found, raise an error
  if not found then
    raise exception 'Account with ID % not found', target_account_id;
  end if;

  -- Calculate new balance
  new_balance := coalesce(current_balance, 0) + amount_change;

  -- Check for insufficient funds if the change is negative
  if amount_change < 0 and new_balance < 0 then
    raise exception 'Insufficient funds for account ID %. Required: %, Available: %', target_account_id, abs(amount_change), coalesce(current_balance, 0);
  end if;

  -- Update the balance
  update public.vault_accounts
  set balance = new_balance,
      updated_at = now() -- Also update the timestamp
  where id = target_account_id;

  -- Return the new balance
  return new_balance;
end;
$$;
