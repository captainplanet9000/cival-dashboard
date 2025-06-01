-- Migration: Add RLS policies and utility functions
-- This migration adds Row Level Security policies and utility functions for the trading system

-- Add RLS policies for all tables
DO $$ 
BEGIN
    -- 1. Exchange Connections
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exchange_connections') THEN
        -- Drop any existing policies to avoid conflicts
        DROP POLICY IF EXISTS "Users can view their own exchange connections" ON public.exchange_connections;
        DROP POLICY IF EXISTS "Users can create their own exchange connections" ON public.exchange_connections;
        DROP POLICY IF EXISTS "Users can update their own exchange connections" ON public.exchange_connections;
        DROP POLICY IF EXISTS "Users can delete their own exchange connections" ON public.exchange_connections;
        
        -- Create policies
        CREATE POLICY "Users can view their own exchange connections"
        ON public.exchange_connections FOR SELECT
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = exchange_connections.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can create their own exchange connections"
        ON public.exchange_connections FOR INSERT
        WITH CHECK (
            auth.uid() = user_id
        );
        
        CREATE POLICY "Users can update their own exchange connections"
        ON public.exchange_connections FOR UPDATE
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = exchange_connections.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin')
            )
        );
        
        CREATE POLICY "Users can delete their own exchange connections"
        ON public.exchange_connections FOR DELETE
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = exchange_connections.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin')
            )
        );
    END IF;
    
    -- 2. Orders
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        -- Drop any existing policies
        DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
        DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
        DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
        
        -- Create policies
        CREATE POLICY "Users can view their own orders"
        ON public.orders FOR SELECT
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = orders.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can create their own orders"
        ON public.orders FOR INSERT
        WITH CHECK (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = orders.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'trader')
            )
        );
        
        CREATE POLICY "Users can update their own orders"
        ON public.orders FOR UPDATE
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = orders.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'trader')
            )
        );
    END IF;
    
    -- 3. Trades
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trades') THEN
        -- Drop any existing policies
        DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
        DROP POLICY IF EXISTS "Users can create trade records" ON public.trades;
        
        -- Create policies
        CREATE POLICY "Users can view their own trades"
        ON public.trades FOR SELECT
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = trades.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can create trade records"
        ON public.trades FOR INSERT
        WITH CHECK (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = trades.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'trader')
            )
        );
    END IF;
    
    -- 4. Positions
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'positions') THEN
        -- Drop any existing policies
        DROP POLICY IF EXISTS "Users can view their own positions" ON public.positions;
        DROP POLICY IF EXISTS "Users can create their own positions" ON public.positions;
        DROP POLICY IF EXISTS "Users can update their own positions" ON public.positions;
        
        -- Create policies
        CREATE POLICY "Users can view their own positions"
        ON public.positions FOR SELECT
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = positions.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can create their own positions"
        ON public.positions FOR INSERT
        WITH CHECK (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = positions.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'trader')
            )
        );
        
        CREATE POLICY "Users can update their own positions"
        ON public.positions FOR UPDATE
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = positions.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'trader')
            )
        );
    END IF;
    
    -- 5. Position History
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'position_history') THEN
        -- Drop any existing policies
        DROP POLICY IF EXISTS "Users can view their own position history" ON public.position_history;
        DROP POLICY IF EXISTS "Users can create position history records" ON public.position_history;
        
        -- Create policies
        CREATE POLICY "Users can view their own position history"
        ON public.position_history FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.positions
                WHERE positions.id = position_history.position_id
                AND (
                    positions.user_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.farm_users
                        WHERE farm_users.farm_id = positions.farm_id
                        AND farm_users.user_id = auth.uid()
                    )
                )
            )
        );
        
        CREATE POLICY "Users can create position history records"
        ON public.position_history FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.positions
                WHERE positions.id = position_history.position_id
                AND (
                    positions.user_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.farm_users
                        WHERE farm_users.farm_id = positions.farm_id
                        AND farm_users.user_id = auth.uid()
                        AND farm_users.role IN ('owner', 'admin', 'trader')
                    )
                )
            )
        );
    END IF;
    
    -- 6. Portfolio Snapshots
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'portfolio_snapshots') THEN
        -- Drop any existing policies
        DROP POLICY IF EXISTS "Users can view their own portfolio snapshots" ON public.portfolio_snapshots;
        DROP POLICY IF EXISTS "Users can create portfolio snapshot records" ON public.portfolio_snapshots;
        
        -- Create policies
        CREATE POLICY "Users can view their own portfolio snapshots"
        ON public.portfolio_snapshots FOR SELECT
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = portfolio_snapshots.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can create portfolio snapshot records"
        ON public.portfolio_snapshots FOR INSERT
        WITH CHECK (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = portfolio_snapshots.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'analyst')
            )
        );
    END IF;
    
    -- 7. Risk Parameters
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'risk_parameters') THEN
        -- Drop any existing policies
        DROP POLICY IF EXISTS "Users can view their own risk parameters" ON public.risk_parameters;
        DROP POLICY IF EXISTS "Users can create their own risk parameters" ON public.risk_parameters;
        DROP POLICY IF EXISTS "Users can update their own risk parameters" ON public.risk_parameters;
        DROP POLICY IF EXISTS "Users can delete their own risk parameters" ON public.risk_parameters;
        
        -- Create policies
        CREATE POLICY "Users can view their own risk parameters"
        ON public.risk_parameters FOR SELECT
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = risk_parameters.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can create their own risk parameters"
        ON public.risk_parameters FOR INSERT
        WITH CHECK (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = risk_parameters.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'risk_manager')
            )
        );
        
        CREATE POLICY "Users can update their own risk parameters"
        ON public.risk_parameters FOR UPDATE
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = risk_parameters.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'risk_manager')
            )
        );
        
        CREATE POLICY "Users can delete their own risk parameters"
        ON public.risk_parameters FOR DELETE
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = risk_parameters.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin')
            )
        );
    END IF;
    
    -- 8. Strategy Executions
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'strategy_executions') THEN
        -- Drop any existing policies
        DROP POLICY IF EXISTS "Users can view strategy executions they have access to" ON public.strategy_executions;
        DROP POLICY IF EXISTS "Users can create strategy executions" ON public.strategy_executions;
        DROP POLICY IF EXISTS "Users can update strategy executions" ON public.strategy_executions;
        
        -- Create policies
        CREATE POLICY "Users can view strategy executions they have access to"
        ON public.strategy_executions FOR SELECT
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = strategy_executions.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can create strategy executions"
        ON public.strategy_executions FOR INSERT
        WITH CHECK (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = strategy_executions.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'trader')
            )
        );
        
        CREATE POLICY "Users can update strategy executions"
        ON public.strategy_executions FOR UPDATE
        USING (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = strategy_executions.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'trader')
            )
        );
    END IF;
END $$;

-- Create utility functions for trading operations
-- Function to get order details with security checks
CREATE OR REPLACE FUNCTION public.get_order_details(p_order_id UUID)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.orders
    WHERE id = p_order_id
    AND (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.farm_users
            WHERE farm_users.farm_id = orders.farm_id
            AND farm_users.user_id = auth.uid()
        )
    );
END;
$$;

-- Function to calculate position PNL
CREATE OR REPLACE FUNCTION public.calculate_position_pnl(
    p_position_id UUID,
    p_current_price NUMERIC(24, 8)
)
RETURNS NUMERIC(24, 8)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_side VARCHAR(10);
    v_quantity NUMERIC(24, 8);
    v_entry_price NUMERIC(24, 8);
    v_pnl NUMERIC(24, 8);
BEGIN
    -- Get position details
    SELECT side, quantity, entry_price
    INTO v_side, v_quantity, v_entry_price
    FROM public.positions
    WHERE id = p_position_id
    AND (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.farm_users
            WHERE farm_users.farm_id = positions.farm_id
            AND farm_users.user_id = auth.uid()
        )
    );
    
    -- If position not found or not authorized
    IF v_side IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate PNL based on position side
    IF v_side = 'long' THEN
        v_pnl := v_quantity * (p_current_price - v_entry_price);
    ELSIF v_side = 'short' THEN
        v_pnl := v_quantity * (v_entry_price - p_current_price);
    ELSE
        v_pnl := 0;
    END IF;
    
    RETURN v_pnl;
END;
$$;

-- Function to validate a risk check for a potential trade
CREATE OR REPLACE FUNCTION public.validate_risk_check(
    p_user_id UUID,
    p_farm_id UUID,
    p_strategy_id UUID,
    p_symbol VARCHAR(50),
    p_side VARCHAR(10),
    p_quantity NUMERIC(24, 8),
    p_price NUMERIC(24, 8),
    p_risk_parameter_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_risk_param_id UUID;
    v_max_position_size NUMERIC(24, 8);
    v_max_drawdown NUMERIC(5, 2);
    v_current_position_size NUMERIC(24, 8);
    v_current_exposure NUMERIC(24, 8);
    v_position_count INTEGER;
    v_daily_pnl NUMERIC(24, 8);
    v_max_daily_loss NUMERIC(24, 8);
    v_check_passed BOOLEAN := TRUE;
    v_result JSONB;
    v_errors TEXT[] := '{}';
BEGIN
    -- Authorization check
    IF auth.uid() <> p_user_id AND 
       NOT EXISTS (
            SELECT 1 FROM public.farm_users
            WHERE farm_users.farm_id = p_farm_id
            AND farm_users.user_id = auth.uid()
            AND farm_users.role IN ('owner', 'admin', 'trader', 'risk_manager')
        ) THEN
        RAISE EXCEPTION 'Not authorized to perform risk check';
    END IF;
    
    -- Find applicable risk parameter if not provided
    IF p_risk_parameter_id IS NULL THEN
        SELECT id INTO v_risk_param_id
        FROM public.risk_parameters
        WHERE farm_id = p_farm_id
        AND is_active = TRUE
        AND (
            applies_to->'strategies' @> jsonb_build_array(p_strategy_id::TEXT)
            OR applies_to->'symbols' @> jsonb_build_array(p_symbol)
            OR jsonb_array_length(applies_to->'strategies') = 0 -- applies to all if empty
        )
        ORDER BY created_at DESC
        LIMIT 1;
    ELSE
        v_risk_param_id := p_risk_parameter_id;
    END IF;
    
    -- No risk parameters found, allow the trade but with warning
    IF v_risk_param_id IS NULL THEN
        RETURN jsonb_build_object(
            'passed', TRUE,
            'warnings', jsonb_build_array('No risk parameters found for this trade'),
            'errors', jsonb_build_array(),
            'details', jsonb_build_object()
        );
    END IF;
    
    -- Get risk parameters
    SELECT 
        max_position_size,
        max_drawdown_percent,
        max_daily_loss
    INTO 
        v_max_position_size,
        v_max_drawdown,
        v_max_daily_loss
    FROM public.risk_parameters
    WHERE id = v_risk_param_id;
    
    -- Get current position size for the symbol
    SELECT COALESCE(SUM(quantity * current_price), 0)
    INTO v_current_position_size
    FROM public.positions
    WHERE farm_id = p_farm_id
    AND symbol = p_symbol
    AND status = 'open';
    
    -- Calculate new position size
    v_current_position_size := v_current_position_size + (p_quantity * p_price);
    
    -- Check if exceeds max position size
    IF v_max_position_size IS NOT NULL AND v_current_position_size > v_max_position_size THEN
        v_check_passed := FALSE;
        v_errors := array_append(v_errors, 'Trade exceeds maximum position size');
    END IF;
    
    -- Get daily PNL
    SELECT COALESCE(SUM(realized_pnl), 0)
    INTO v_daily_pnl
    FROM public.trades
    WHERE farm_id = p_farm_id
    AND execution_timestamp >= CURRENT_DATE;
    
    -- Check if exceeds max daily loss
    IF v_max_daily_loss IS NOT NULL AND v_daily_pnl < -v_max_daily_loss THEN
        v_check_passed := FALSE;
        v_errors := array_append(v_errors, 'Maximum daily loss exceeded');
    END IF;
    
    -- Build result object
    v_result := jsonb_build_object(
        'passed', v_check_passed,
        'risk_parameter_id', v_risk_param_id,
        'errors', v_errors,
        'details', jsonb_build_object(
            'max_position_size', v_max_position_size,
            'current_position_size', v_current_position_size,
            'max_daily_loss', v_max_daily_loss,
            'current_daily_pnl', v_daily_pnl
        )
    );
    
    RETURN v_result;
END;
$$;

-- Trigger function to update position from trade
CREATE OR REPLACE FUNCTION public.update_position_from_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_position_id UUID;
    v_position_exists BOOLEAN;
    v_position_side VARCHAR(10);
    v_trade_direction VARCHAR(10);
    v_quantity_delta NUMERIC(24, 8);
    v_new_quantity NUMERIC(24, 8);
    v_new_entry_price NUMERIC(24, 8);
    v_realized_pnl NUMERIC(24, 8) := 0;
BEGIN
    -- Determine if this is a buy or sell in terms of position impact
    IF NEW.side = 'buy' THEN
        v_trade_direction := 'long';
        v_quantity_delta := NEW.quantity;
    ELSE
        v_trade_direction := 'short';
        v_quantity_delta := -NEW.quantity;
    END IF;
    
    -- Check if a position already exists for this symbol
    SELECT id, side, CASE WHEN id IS NOT NULL THEN TRUE ELSE FALSE END, quantity
    INTO v_position_id, v_position_side, v_position_exists, v_new_quantity
    FROM public.positions
    WHERE 
        user_id = NEW.user_id
        AND farm_id = NEW.farm_id
        AND exchange_connection_id = NEW.exchange_connection_id
        AND symbol = NEW.symbol
        AND status = 'open'
        AND position_type = 'spot' -- Adjust for margin/futures
    LIMIT 1;
    
    IF v_position_exists THEN
        -- Existing position: update quantity and avg price
        IF v_position_side = v_trade_direction OR v_position_side IS NULL THEN
            -- Same direction or new position: add to position
            UPDATE public.positions
            SET 
                quantity = quantity + v_quantity_delta,
                entry_price = CASE
                    WHEN quantity <= 0 THEN NEW.price
                    ELSE (entry_price * quantity + NEW.price * ABS(v_quantity_delta)) / (quantity + ABS(v_quantity_delta))
                END,
                current_price = NEW.price,
                updated_at = NOW()
            WHERE id = v_position_id;
        ELSE
            -- Opposite direction: reduce position or flip
            IF v_new_quantity + v_quantity_delta > 0 THEN
                -- Position reduced but still open
                v_realized_pnl := ABS(v_quantity_delta) * (NEW.price - entry_price) * 
                    CASE WHEN v_position_side = 'long' THEN 1 ELSE -1 END;
                
                UPDATE public.positions
                SET 
                    quantity = quantity + v_quantity_delta,
                    realized_pnl = realized_pnl + v_realized_pnl,
                    current_price = NEW.price,
                    updated_at = NOW()
                WHERE id = v_position_id;
            ELSIF v_new_quantity + v_quantity_delta < 0 THEN
                -- Position flipped to opposite side
                v_realized_pnl := ABS(v_new_quantity) * (NEW.price - entry_price) * 
                    CASE WHEN v_position_side = 'long' THEN 1 ELSE -1 END;
                
                UPDATE public.positions
                SET 
                    quantity = quantity + v_quantity_delta,
                    side = CASE WHEN v_position_side = 'long' THEN 'short' ELSE 'long' END,
                    entry_price = NEW.price,
                    realized_pnl = realized_pnl + v_realized_pnl,
                    current_price = NEW.price,
                    updated_at = NOW()
                WHERE id = v_position_id;
            ELSE
                -- Position closed exactly
                v_realized_pnl := ABS(v_new_quantity) * (NEW.price - entry_price) * 
                    CASE WHEN v_position_side = 'long' THEN 1 ELSE -1 END;
                
                UPDATE public.positions
                SET 
                    quantity = 0,
                    status = 'closed',
                    realized_pnl = realized_pnl + v_realized_pnl,
                    current_price = NEW.price,
                    updated_at = NOW()
                WHERE id = v_position_id;
            END IF;
        END IF;
        
        -- Insert position history record
        INSERT INTO public.position_history
        (position_id, event_type, quantity_change, price, pnl_realized, metadata)
        VALUES
        (v_position_id, 'trade', v_quantity_delta, NEW.price, v_realized_pnl, 
         jsonb_build_object('trade_id', NEW.id));
        
    ELSE
        -- No position exists: create a new one
        INSERT INTO public.positions
        (user_id, farm_id, exchange_connection_id, strategy_id, symbol, 
         position_type, side, quantity, entry_price, current_price, 
         is_paper_trading, metadata)
        VALUES
        (NEW.user_id, NEW.farm_id, NEW.exchange_connection_id, NULL, NEW.symbol,
         'spot', v_trade_direction, ABS(v_quantity_delta), NEW.price, NEW.price,
         NEW.is_paper_trading, jsonb_build_object('source_trade_id', NEW.id))
        RETURNING id INTO v_position_id;
        
        -- Insert position history record for new position
        INSERT INTO public.position_history
        (position_id, event_type, quantity_change, price, pnl_realized, metadata)
        VALUES
        (v_position_id, 'open', v_quantity_delta, NEW.price, 0, 
         jsonb_build_object('trade_id', NEW.id));
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to update order fill status
CREATE OR REPLACE FUNCTION public.update_order_fill_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_total_filled NUMERIC(24, 8) := 0;
    v_weighted_price NUMERIC(24, 8) := 0;
    v_new_status VARCHAR(20) := 'pending';
BEGIN
    -- Calculate total filled quantity and weighted average price
    SELECT 
        COALESCE(SUM(quantity), 0),
        CASE 
            WHEN COALESCE(SUM(quantity), 0) > 0 
            THEN COALESCE(SUM(quantity * price) / SUM(quantity), 0)
            ELSE 0
        END
    INTO v_total_filled, v_weighted_price
    FROM public.trades
    WHERE order_id = NEW.order_id;
    
    -- Update the parent order
    IF v_total_filled > 0 THEN
        -- Determine new status
        IF v_total_filled >= (SELECT quantity FROM public.orders WHERE id = NEW.order_id) THEN
            v_new_status := 'filled';
        ELSE
            v_new_status := 'partially_filled';
        END IF;
        
        -- Update order
        UPDATE public.orders
        SET 
            filled_quantity = v_total_filled,
            average_fill_price = v_weighted_price,
            status = v_new_status,
            updated_at = NOW()
        WHERE id = NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the actual triggers if they don't exist
DO $$
BEGIN
    -- Create trigger for updating positions from trades
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_position_on_trade'
    ) AND EXISTS (
        SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trades'
    ) THEN
        CREATE TRIGGER update_position_on_trade
        AFTER INSERT ON public.trades
        FOR EACH ROW
        EXECUTE FUNCTION public.update_position_from_trade();
    END IF;
    
    -- Create trigger for updating order status from trades
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_order_on_trade'
    ) AND EXISTS (
        SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trades'
    ) THEN
        CREATE TRIGGER update_order_on_trade
        AFTER INSERT OR UPDATE ON public.trades
        FOR EACH ROW
        WHEN (NEW.order_id IS NOT NULL)
        EXECUTE FUNCTION public.update_order_fill_status();
    END IF;
END $$;
