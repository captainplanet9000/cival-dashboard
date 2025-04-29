-- Create Portfolio Maintenance Functions and Triggers
-- Date: 2025-04-24

-- Function to check if portfolios need rebalancing
CREATE OR REPLACE FUNCTION public.check_portfolio_rebalance()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = '';
LANGUAGE plpgsql
AS $$
DECLARE
  next_rebalance TIMESTAMPTZ;
  rebalancing_frequency TEXT;
BEGIN
  -- Get rebalancing frequency for the portfolio
  SELECT p.rebalancing_frequency INTO rebalancing_frequency 
  FROM public.portfolios p 
  WHERE p.id = NEW.portfolio_id;
  
  -- Set next rebalance date based on frequency
  CASE rebalancing_frequency
    WHEN 'daily' THEN
      next_rebalance := NEW.date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      next_rebalance := NEW.date + INTERVAL '7 days';
    WHEN 'monthly' THEN
      next_rebalance := NEW.date + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      next_rebalance := NEW.date + INTERVAL '3 months';
    WHEN 'yearly' THEN
      next_rebalance := NEW.date + INTERVAL '1 year';
    ELSE
      next_rebalance := NULL; -- For 'threshold' or 'manual'
  END CASE;
  
  -- Update the portfolio's next_rebalance date
  IF next_rebalance IS NOT NULL THEN
    UPDATE public.portfolios
    SET next_rebalance = next_rebalance,
        last_rebalanced = NEW.date
    WHERE id = NEW.portfolio_id;
  ELSE
    UPDATE public.portfolios
    SET last_rebalanced = NEW.date
    WHERE id = NEW.portfolio_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update next_rebalance when a rebalancing transaction is completed
CREATE TRIGGER after_rebalance_transaction_completed
AFTER INSERT ON public.rebalancing_transactions
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION public.check_portfolio_rebalance();

-- Function to update portfolio allocations after performance change
CREATE OR REPLACE FUNCTION public.update_portfolio_allocations()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = '';
LANGUAGE plpgsql
AS $$
DECLARE
  portfolio_total_value FLOAT;
  alloc RECORD;
  drift_threshold FLOAT;
  rebalance_needed BOOLEAN := FALSE;
BEGIN
  -- Get portfolio total value from the new performance record
  portfolio_total_value := NEW.value;
  
  -- Update the portfolio's current_value
  UPDATE public.portfolios
  SET current_value = portfolio_total_value
  WHERE id = NEW.portfolio_id;
  
  -- Get drift threshold for this portfolio
  SELECT p.drift_threshold INTO drift_threshold
  FROM public.portfolios p
  WHERE p.id = NEW.portfolio_id;
  
  IF drift_threshold IS NULL THEN
    drift_threshold := 5.0; -- Default to 5% if not specified
  END IF;
  
  -- Update each allocation's current_value and actual_percentage
  FOR alloc IN 
    SELECT * FROM public.portfolio_allocations 
    WHERE portfolio_id = NEW.portfolio_id
  LOOP
    -- Calculate new actual percentage based on current value
    DECLARE
      actual_pct FLOAT;
      drift FLOAT;
    BEGIN
      actual_pct := (alloc.current_value / portfolio_total_value) * 100;
      drift := actual_pct - alloc.allocation_percentage;
      
      -- Update the allocation
      UPDATE public.portfolio_allocations
      SET actual_percentage = actual_pct,
          drift = drift
      WHERE id = alloc.id;
      
      -- Check if drift exceeds threshold
      IF ABS(drift) > drift_threshold THEN
        rebalance_needed := TRUE;
      END IF;
    END;
  END LOOP;
  
  -- If using threshold rebalancing and drift exceeds threshold, create a rebalance notification
  IF rebalance_needed THEN
    -- Check if portfolio uses threshold rebalancing
    DECLARE
      rebalancing_frequency TEXT;
    BEGIN
      SELECT p.rebalancing_frequency INTO rebalancing_frequency
      FROM public.portfolios p
      WHERE p.id = NEW.portfolio_id;
      
      IF rebalancing_frequency = 'threshold' THEN
        -- Insert a notification for threshold rebalancing (would go to a notifications table in a real system)
        -- For now we'll just log a note in the portfolio record
        UPDATE public.portfolios
        SET rebalance_notification = TRUE
        WHERE id = NEW.portfolio_id;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update portfolio allocations when performance is recorded
CREATE TRIGGER after_performance_update
AFTER INSERT ON public.portfolio_performance
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_allocations();

-- Function to check portfolio rebalance schedule
CREATE OR REPLACE FUNCTION public.check_scheduled_rebalances()
RETURNS void
SECURITY DEFINER
SET search_path = '';
LANGUAGE plpgsql
AS $$
DECLARE
  portfolio RECORD;
BEGIN
  -- Find portfolios that need scheduled rebalancing
  FOR portfolio IN
    SELECT *
    FROM public.portfolios
    WHERE 
      status = 'active' AND
      rebalancing_frequency NOT IN ('manual', 'threshold') AND
      next_rebalance IS NOT NULL AND
      next_rebalance <= NOW()
  LOOP
    -- Mark portfolio for rebalancing
    UPDATE public.portfolios
    SET rebalance_notification = TRUE
    WHERE id = portfolio.id;
    
    -- In a production system, we would trigger an actual rebalancing job
    -- For now, we'll just notify the system that rebalancing is needed
  END LOOP;
END;
$$;

-- Function to update portfolio volatility and risk metrics
CREATE OR REPLACE FUNCTION public.update_portfolio_risk_metrics()
RETURNS void
SECURITY DEFINER
SET search_path = '';
LANGUAGE plpgsql
AS $$
DECLARE
  portfolio RECORD;
  volatility_30d FLOAT;
  sharpe_ratio_30d FLOAT;
  sortino_ratio_30d FLOAT;
  max_drawdown_30d FLOAT;
  max_drawdown_30d_pct FLOAT;
  avg_return_30d FLOAT;
  risk_free_rate FLOAT := 0.02 / 365; -- Daily risk-free rate (2% annual)
BEGIN
  -- Find all active portfolios
  FOR portfolio IN
    SELECT id FROM public.portfolios WHERE status = 'active'
  LOOP
    -- Calculate 30-day volatility (standard deviation of returns)
    SELECT 
      STDDEV(daily_return_pct),
      AVG(daily_return_pct),
      COALESCE(MAX(drawdown_pct), 0)
    INTO 
      volatility_30d,
      avg_return_30d,
      max_drawdown_30d_pct
    FROM public.portfolio_performance
    WHERE 
      portfolio_id = portfolio.id AND
      date >= (NOW() - INTERVAL '30 days');
    
    -- Calculate Sharpe ratio
    IF volatility_30d > 0 THEN
      sharpe_ratio_30d := (avg_return_30d - risk_free_rate) / volatility_30d;
    ELSE
      sharpe_ratio_30d := 0;
    END IF;
    
    -- Calculate Sortino ratio (using negative returns only)
    SELECT 
      COALESCE(STDDEV(CASE WHEN daily_return_pct < 0 THEN daily_return_pct ELSE NULL END), 0.0001)
    INTO 
      volatility_30d
    FROM public.portfolio_performance
    WHERE 
      portfolio_id = portfolio.id AND
      date >= (NOW() - INTERVAL '30 days');
    
    IF volatility_30d > 0 THEN
      sortino_ratio_30d := (avg_return_30d - risk_free_rate) / volatility_30d;
    ELSE
      sortino_ratio_30d := 0;
    END IF;
    
    -- Calculate maximum drawdown in value
    SELECT 
      COALESCE(MAX(drawdown), 0)
    INTO 
      max_drawdown_30d
    FROM public.portfolio_performance
    WHERE 
      portfolio_id = portfolio.id AND
      date >= (NOW() - INTERVAL '30 days');
    
    -- Update the latest performance record with these metrics
    UPDATE public.portfolio_performance
    SET 
      volatility_30d = volatility_30d,
      sharpe_ratio_30d = sharpe_ratio_30d,
      sortino_ratio_30d = sortino_ratio_30d,
      max_drawdown_30d = max_drawdown_30d,
      max_drawdown_30d_pct = max_drawdown_30d_pct
    WHERE 
      id = (
        SELECT id 
        FROM public.portfolio_performance 
        WHERE portfolio_id = portfolio.id 
        ORDER BY date DESC 
        LIMIT 1
      );
  END LOOP;
END;
$$;

-- Function to create scheduled rebalance transactions
CREATE OR REPLACE FUNCTION public.create_scheduled_rebalance_transactions()
RETURNS void
SECURITY DEFINER
SET search_path = '';
LANGUAGE plpgsql
AS $$
DECLARE
  portfolio RECORD;
  current_alloc RECORD;
  target_alloc RECORD;
  portfolio_value FLOAT;
  target_value FLOAT;
  current_value FLOAT;
  difference FLOAT;
BEGIN
  -- Find portfolios that need rebalancing
  FOR portfolio IN
    SELECT *
    FROM public.portfolios
    WHERE rebalance_notification = TRUE AND status = 'active'
  LOOP
    portfolio_value := portfolio.current_value;
    
    -- For each strategy in the portfolio, calculate rebalance transactions
    FOR current_alloc IN
      SELECT pa.*, s.name as strategy_name
      FROM public.portfolio_allocations pa
      JOIN public.strategies s ON pa.strategy_id = s.id
      WHERE pa.portfolio_id = portfolio.id
    LOOP
      -- Find target allocation for this strategy
      SELECT at.* INTO target_alloc
      FROM public.allocation_targets at
      WHERE at.portfolio_id = portfolio.id AND at.strategy_id = current_alloc.strategy_id;
      
      IF target_alloc.id IS NOT NULL THEN
        -- Calculate target and current values
        target_value := (target_alloc.target_percentage / 100) * portfolio_value;
        current_value := current_alloc.current_value;
        difference := target_value - current_value;
        
        -- Only create transaction if difference is significant (e.g., > $10)
        IF ABS(difference) > 10 THEN
          -- Insert rebalancing transaction
          INSERT INTO public.rebalancing_transactions (
            portfolio_id,
            strategy_id,
            date,
            action,
            amount,
            previous_allocation,
            new_allocation,
            reason,
            executed_by,
            status
          ) VALUES (
            portfolio.id,
            current_alloc.strategy_id,
            NOW(),
            CASE WHEN difference > 0 THEN 'buy' ELSE 'sell' END,
            ABS(difference),
            current_alloc.allocation_percentage,
            target_alloc.target_percentage,
            CASE 
              WHEN portfolio.rebalancing_frequency = 'threshold' THEN 'threshold'
              ELSE 'scheduled'
            END,
            'system',
            'pending'
          );
        END IF;
      END IF;
    END LOOP;
    
    -- Also handle strategies in target but not in current allocations
    FOR target_alloc IN
      SELECT at.*, s.name as strategy_name
      FROM public.allocation_targets at
      JOIN public.strategies s ON at.strategy_id = s.id
      WHERE at.portfolio_id = portfolio.id
      AND NOT EXISTS (
        SELECT 1 FROM public.portfolio_allocations pa 
        WHERE pa.portfolio_id = portfolio.id AND pa.strategy_id = at.strategy_id
      )
    LOOP
      -- Calculate target value
      target_value := (target_alloc.target_percentage / 100) * portfolio_value;
      
      -- Only create transaction if amount is significant
      IF target_value > 10 THEN
        -- Insert rebalancing transaction to add new strategy
        INSERT INTO public.rebalancing_transactions (
          portfolio_id,
          strategy_id,
          date,
          action,
          amount,
          previous_allocation,
          new_allocation,
          reason,
          executed_by,
          status
        ) VALUES (
          portfolio.id,
          target_alloc.strategy_id,
          NOW(),
          'buy',
          target_value,
          0,
          target_alloc.target_percentage,
          CASE 
            WHEN portfolio.rebalancing_frequency = 'threshold' THEN 'threshold'
            ELSE 'scheduled'
          END,
          'system',
          'pending'
        );
      END IF;
    END LOOP;
    
    -- Reset notification flag
    UPDATE public.portfolios
    SET rebalance_notification = FALSE
    WHERE id = portfolio.id;
  END LOOP;
END;
$$;

-- Add a column to portfolios table for rebalance notifications
ALTER TABLE public.portfolios 
ADD COLUMN IF NOT EXISTS rebalance_notification BOOLEAN DEFAULT FALSE;

-- Create a cron job extension if not already installed
-- This would be set up by the platform administrator
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- In a production environment, we would schedule these jobs
-- But for the tutorial, we'll describe the scheduling
COMMENT ON FUNCTION public.check_scheduled_rebalances IS E'This function should be scheduled to run daily to check for portfolios that need rebalancing based on their schedule. In production, it would be scheduled with pg_cron.';

COMMENT ON FUNCTION public.update_portfolio_risk_metrics IS E'This function should be scheduled to run daily to update risk metrics for all portfolios. In production, it would be scheduled with pg_cron.';

COMMENT ON FUNCTION public.create_scheduled_rebalance_transactions IS E'This function should be scheduled to run daily to create rebalancing transactions for portfolios that need rebalancing. In production, it would be scheduled with pg_cron.';

-- In production with pg_cron, we would add:
/*
SELECT cron.schedule('0 0 * * *', $$SELECT public.check_scheduled_rebalances()$$);
SELECT cron.schedule('0 1 * * *', $$SELECT public.update_portfolio_risk_metrics()$$);
SELECT cron.schedule('0 2 * * *', $$SELECT public.create_scheduled_rebalance_transactions()$$);
*/
