-- Migration: Fix update_position_from_trade function
-- This migration fixes the syntax error in the function by redefining it with proper syntax

-- Drop the function if it exists (this will also drop dependent triggers)
DROP FUNCTION IF EXISTS public.update_position_from_trade() CASCADE;

-- Recreate the function with the correct syntax
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
    -- Fix: Using CASE WHEN instead of EXISTS(id)
    SELECT id, side, CASE WHEN id IS NOT NULL THEN TRUE ELSE FALSE END, quantity
    INTO v_position_id, v_position_side, v_position_exists, v_new_quantity
    FROM public.positions
    WHERE 
        user_id = NEW.user_id
        AND farm_id = NEW.farm_id
        AND exchange_connection_id = NEW.exchange_connection_id
        AND symbol = NEW.symbol
        AND status = 'open'
        AND position_type = 'spot' -- Assume spot for simplicity, adjust for margin/futures
    LIMIT 1;
    
    IF v_position_exists THEN
        -- Existing position: update quantity and avg price, potentially flip or close
        IF v_position_side = v_trade_direction OR v_position_side IS NULL THEN
            -- Same direction or new position: add to position
            UPDATE public.positions
            SET 
                quantity = quantity + v_quantity_delta,
                entry_price = CASE
                    WHEN quantity <= 0 THEN NEW.price
                    ELSE (entry_price * quantity + NEW.price * ABS(v_quantity_delta)) / (quantity + ABS(v_quantity_delta))
                END,
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

-- Create trigger to update positions when trades are added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_position_on_trade'
        AND tgrelid = 'public.trades'::regclass
    ) THEN
        CREATE TRIGGER update_position_on_trade
        AFTER INSERT ON public.trades
        FOR EACH ROW
        EXECUTE FUNCTION public.update_position_from_trade();
        RAISE NOTICE 'Created update_position_on_trade trigger';
    ELSE
        RAISE NOTICE 'Trigger update_position_on_trade already exists, skipping';
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error creating trigger: %', SQLERRM;
END $$;
