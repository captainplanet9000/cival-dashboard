-- Migration for Farm-related SQL functions
-- These functions will handle complex calculations and data integrity

-- Function to calculate farm performance metrics
CREATE OR REPLACE FUNCTION public.calculate_farm_performance(farm_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result json;
  total_transactions integer;
  successful_trades integer;
  total_profit numeric;
  total_loss numeric;
  start_balance numeric;
  current_balance numeric;
  roi numeric;
  win_rate numeric;
  farm_created_at timestamp;
  days_active integer;
  daily_avg numeric;
BEGIN
  -- Set search path to avoid unexpected behavior
  SET search_path = '';
  
  -- Get farm creation date
  SELECT public.farms.created_at INTO farm_created_at
  FROM public.farms
  WHERE public.farms.id = farm_id;
  
  -- Calculate days active
  days_active := GREATEST(1, EXTRACT(DAY FROM NOW() - farm_created_at));
  
  -- Count transactions
  SELECT COUNT(*) INTO total_transactions
  FROM public.farm_transactions
  WHERE public.farm_transactions.farm_id = farm_id;
  
  -- Count successful trades
  SELECT COUNT(*) INTO successful_trades
  FROM public.farm_transactions
  WHERE public.farm_transactions.farm_id = farm_id
  AND public.farm_transactions.status = 'completed'
  AND public.farm_transactions.profit > 0;
  
  -- Calculate total profit
  SELECT COALESCE(SUM(profit), 0) INTO total_profit
  FROM public.farm_transactions
  WHERE public.farm_transactions.farm_id = farm_id
  AND public.farm_transactions.profit > 0;
  
  -- Calculate total loss
  SELECT COALESCE(SUM(profit), 0) INTO total_loss
  FROM public.farm_transactions
  WHERE public.farm_transactions.farm_id = farm_id
  AND public.farm_transactions.profit < 0;
  
  -- Get initial balance (first transaction)
  SELECT COALESCE(
    (SELECT amount 
     FROM public.farm_transactions 
     WHERE public.farm_transactions.farm_id = farm_id 
     ORDER BY created_at ASC LIMIT 1),
    0
  ) INTO start_balance;
  
  -- Get current balance
  SELECT COALESCE(
    (SELECT balance 
     FROM public.farms 
     WHERE public.farms.id = farm_id),
    0
  ) INTO current_balance;
  
  -- Calculate ROI
  IF start_balance > 0 THEN
    roi := ((current_balance - start_balance) / start_balance) * 100;
  ELSE
    roi := 0;
  END IF;
  
  -- Calculate win rate
  IF total_transactions > 0 THEN
    win_rate := (successful_trades::numeric / total_transactions) * 100;
  ELSE
    win_rate := 0;
  END IF;
  
  -- Calculate daily average profit
  daily_avg := total_profit / days_active;
  
  -- Create JSON result
  result := json_build_object(
    'roi', ROUND(roi::numeric, 2),
    'win_rate', ROUND(win_rate::numeric, 2),
    'total_profit', ROUND(total_profit::numeric, 2),
    'total_loss', ROUND(total_loss::numeric, 2),
    'net_profit', ROUND((total_profit + total_loss)::numeric, 2),
    'transactions_count', total_transactions,
    'successful_trades', successful_trades,
    'daily_avg_profit', ROUND(daily_avg::numeric, 2),
    'days_active', days_active
  );
  
  RETURN result;
END;
$$;

-- Function to update farm performance metrics
CREATE OR REPLACE FUNCTION public.update_farm_performance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set search path to avoid unexpected behavior
  SET search_path = '';
  
  -- Update performance metrics in the farms table
  UPDATE public.farms
  SET performance_metrics = public.calculate_farm_performance(NEW.farm_id)
  WHERE public.farms.id = NEW.farm_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update farm performance after transaction
DROP TRIGGER IF EXISTS after_transaction_update_farm_performance ON public.farm_transactions;
CREATE TRIGGER after_transaction_update_farm_performance
AFTER INSERT OR UPDATE ON public.farm_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_farm_performance();

-- Function to check if a goal can be started based on dependencies
CREATE OR REPLACE FUNCTION public.can_start_goal(goal_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  dependency_type text;
  all_dependencies_completed boolean := true;
  any_dependency_completed boolean := false;
  dependency_record record;
BEGIN
  -- Set search path to avoid unexpected behavior
  SET search_path = '';
  
  -- Get dependency type for the goal
  SELECT dependency_type INTO dependency_type
  FROM public.goals
  WHERE public.goals.id = goal_id;
  
  -- Default to no dependencies if null
  IF dependency_type IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if all dependencies are completed for sequential dependency
  IF dependency_type = 'sequential' THEN
    FOR dependency_record IN 
      SELECT dependent_goal_id, status
      FROM public.goal_dependencies gd
      JOIN public.goals g ON gd.dependent_goal_id = g.id
      WHERE gd.goal_id = goal_id
    LOOP
      IF dependency_record.status != 'COMPLETED' THEN
        all_dependencies_completed := false;
        EXIT;
      END IF;
    END LOOP;
    
    RETURN all_dependencies_completed;
  END IF;
  
  -- Check if any dependency is completed for parallel dependency
  IF dependency_type = 'parallel' THEN
    FOR dependency_record IN 
      SELECT dependent_goal_id, status
      FROM public.goal_dependencies gd
      JOIN public.goals g ON gd.dependent_goal_id = g.id
      WHERE gd.goal_id = goal_id
    LOOP
      IF dependency_record.status = 'COMPLETED' THEN
        any_dependency_completed := true;
        EXIT;
      END IF;
    END LOOP;
    
    RETURN any_dependency_completed;
  END IF;
  
  -- If no dependency type recognized, assume no dependencies
  RETURN true;
END;
$$;

-- Function to update goal progress based on transactions
CREATE OR REPLACE FUNCTION public.update_goal_progress(goal_id text, transaction_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_amount numeric;
  target_amount numeric;
BEGIN
  -- Set search path to avoid unexpected behavior
  SET search_path = '';
  
  -- Get current amounts
  SELECT g.current_amount, g.target_amount 
  INTO current_amount, target_amount
  FROM public.goals g
  WHERE g.id = goal_id;
  
  -- Update current amount
  UPDATE public.goals
  SET 
    current_amount = current_amount + transaction_amount,
    status = CASE 
      WHEN (current_amount + transaction_amount) >= target_amount THEN 'COMPLETED'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = goal_id;
  
  -- Execute completion actions if goal is completed
  IF (current_amount + transaction_amount) >= target_amount THEN
    -- TODO: Add completion actions handling here
    -- This could trigger notifications, start dependent goals, etc.
    NULL;
  END IF;
END;
$$;

-- Function to automatically update goal transaction when a transaction is created
CREATE OR REPLACE FUNCTION public.associate_transaction_with_goals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  goal_record record;
BEGIN
  -- Set search path to avoid unexpected behavior
  SET search_path = '';
  
  -- Find all active goals for this farm
  FOR goal_record IN 
    SELECT id, target_amount, current_amount
    FROM public.goals
    WHERE farm_id = NEW.farm_id
    AND status = 'ACTIVE'
  LOOP
    -- Create goal transaction record
    INSERT INTO public.goal_transactions (
      goal_id,
      transaction_id,
      amount,
      created_at,
      updated_at
    ) VALUES (
      goal_record.id,
      NEW.id,
      NEW.amount,
      NOW(),
      NOW()
    );
    
    -- Update goal progress
    PERFORM public.update_goal_progress(goal_record.id, NEW.amount);
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger to associate transactions with goals
DROP TRIGGER IF EXISTS after_transaction_associate_with_goals ON public.farm_transactions;
CREATE TRIGGER after_transaction_associate_with_goals
AFTER INSERT ON public.farm_transactions
FOR EACH ROW
EXECUTE FUNCTION public.associate_transaction_with_goals();

-- Function to update vault balances after transactions
CREATE OR REPLACE FUNCTION public.update_vault_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set search path to avoid unexpected behavior
  SET search_path = '';
  
  -- Update vault account balance
  UPDATE public.vault_accounts
  SET 
    balance = balance + NEW.amount,
    updated_at = NOW()
  WHERE id = NEW.vault_account_id;
  
  -- If this is a transfer transaction, update the target account
  IF NEW.transaction_type = 'transfer' AND NEW.target_account_id IS NOT NULL THEN
    UPDATE public.vault_accounts
    SET 
      balance = balance - NEW.amount, -- Negate the amount for target
      updated_at = NOW()
    WHERE id = NEW.target_account_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update vault balance after transaction
DROP TRIGGER IF EXISTS after_vault_transaction_update_balance ON public.vault_transactions;
CREATE TRIGGER after_vault_transaction_update_balance
AFTER INSERT ON public.vault_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_vault_balance();

-- Function to enforce daily withdrawal limits
CREATE OR REPLACE FUNCTION public.check_withdrawal_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  daily_limit numeric;
  daily_withdrawals numeric;
BEGIN
  -- Set search path to avoid unexpected behavior
  SET search_path = '';
  
  -- Only check for withdrawals with negative amounts
  IF NEW.transaction_type = 'withdrawal' AND NEW.amount < 0 THEN
    -- Get the daily withdrawal limit
    SELECT daily_withdrawal_limit INTO daily_limit
    FROM public.vault_accounts
    WHERE id = NEW.vault_account_id;
    
    -- If there's a limit (not null and greater than 0)
    IF daily_limit IS NOT NULL AND daily_limit > 0 THEN
      -- Calculate today's withdrawals
      SELECT COALESCE(SUM(ABS(amount)), 0) INTO daily_withdrawals
      FROM public.vault_transactions
      WHERE vault_account_id = NEW.vault_account_id
      AND transaction_type = 'withdrawal'
      AND amount < 0
      AND DATE(created_at) = CURRENT_DATE;
      
      -- Check if this withdrawal would exceed the limit
      IF (daily_withdrawals + ABS(NEW.amount)) > daily_limit THEN
        RAISE EXCEPTION 'Daily withdrawal limit of % exceeded', daily_limit;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check withdrawal limits before transaction
DROP TRIGGER IF EXISTS before_vault_transaction_check_limit ON public.vault_transactions;
CREATE TRIGGER before_vault_transaction_check_limit
BEFORE INSERT ON public.vault_transactions
FOR EACH ROW
EXECUTE FUNCTION public.check_withdrawal_limit();

-- Function to update farm allocation percentages
CREATE OR REPLACE FUNCTION public.normalize_agent_allocations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_allocation numeric;
  farm_id_val integer;
BEGIN
  -- Set search path to avoid unexpected behavior
  SET search_path = '';
  
  -- Store the farm_id for reuse
  farm_id_val := NEW.farm_id;
  
  -- Calculate total allocation for this farm
  SELECT COALESCE(SUM(allocation_percentage), 0) INTO total_allocation
  FROM public.farm_agents
  WHERE farm_id = farm_id_val
  AND id != NEW.id; -- Exclude current record
  
  -- Add the new allocation
  total_allocation := total_allocation + NEW.allocation_percentage;
  
  -- If total allocation exceeds 100%, adjust the new allocation
  IF total_allocation > 100 THEN
    NEW.allocation_percentage := GREATEST(1, NEW.allocation_percentage - (total_allocation - 100));
  END IF;
  
  -- If this is a primary agent, update other agents to non-primary
  IF NEW.is_primary = true THEN
    UPDATE public.farm_agents
    SET is_primary = false
    WHERE farm_id = farm_id_val
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to normalize agent allocations
DROP TRIGGER IF EXISTS before_farm_agent_normalize ON public.farm_agents;
CREATE TRIGGER before_farm_agent_normalize
BEFORE INSERT OR UPDATE ON public.farm_agents
FOR EACH ROW
EXECUTE FUNCTION public.normalize_agent_allocations();

-- Same for goal agents
CREATE OR REPLACE FUNCTION public.normalize_goal_agent_allocations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_allocation numeric;
  goal_id_val text;
BEGIN
  -- Set search path to avoid unexpected behavior
  SET search_path = '';
  
  -- Store the goal_id for reuse
  goal_id_val := NEW.goal_id;
  
  -- Calculate total allocation for this goal
  SELECT COALESCE(SUM(allocation_percentage), 0) INTO total_allocation
  FROM public.goal_agents
  WHERE goal_id = goal_id_val
  AND id != NEW.id; -- Exclude current record
  
  -- Add the new allocation
  total_allocation := total_allocation + NEW.allocation_percentage;
  
  -- If total allocation exceeds 100%, adjust the new allocation
  IF total_allocation > 100 THEN
    NEW.allocation_percentage := GREATEST(1, NEW.allocation_percentage - (total_allocation - 100));
  END IF;
  
  -- If this is a primary agent, update other agents to non-primary
  IF NEW.is_primary = true THEN
    UPDATE public.goal_agents
    SET is_primary = false
    WHERE goal_id = goal_id_val
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to normalize goal agent allocations
DROP TRIGGER IF EXISTS before_goal_agent_normalize ON public.goal_agents;
CREATE TRIGGER before_goal_agent_normalize
BEFORE INSERT OR UPDATE ON public.goal_agents
FOR EACH ROW
EXECUTE FUNCTION public.normalize_goal_agent_allocations();

-- Add comments to document functions
COMMENT ON FUNCTION public.calculate_farm_performance IS 'Calculates and returns performance metrics for a farm, including ROI, win rate, profits, etc.';
COMMENT ON FUNCTION public.update_farm_performance IS 'Trigger function to update farm performance metrics when transactions are added or updated';
COMMENT ON FUNCTION public.can_start_goal IS 'Determines if a goal can be started based on its dependencies';
COMMENT ON FUNCTION public.update_goal_progress IS 'Updates goal progress based on transaction amount and checks for completion';
COMMENT ON FUNCTION public.associate_transaction_with_goals IS 'Associates farm transactions with active goals and updates goal progress';
COMMENT ON FUNCTION public.update_vault_balance IS 'Updates vault account balances when transactions are added';
COMMENT ON FUNCTION public.check_withdrawal_limit IS 'Enforces daily withdrawal limits on vault accounts';
COMMENT ON FUNCTION public.normalize_agent_allocations IS 'Normalizes agent allocation percentages and handles primary agent designation for farms';
COMMENT ON FUNCTION public.normalize_goal_agent_allocations IS 'Normalizes agent allocation percentages and handles primary agent designation for goals';
