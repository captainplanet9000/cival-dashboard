-- Migration: Add positions and portfolio schema
-- This migration adds tables for tracking positions and portfolio management

-- Create positions table
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    exchange_connection_id UUID NOT NULL REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    symbol VARCHAR(50) NOT NULL,
    position_type VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    quantity NUMERIC(24, 8) NOT NULL,
    entry_price NUMERIC(24, 8) NOT NULL,
    current_price NUMERIC(24, 8),
    liquidation_price NUMERIC(24, 8),
    unrealized_pnl NUMERIC(24, 8),
    realized_pnl NUMERIC(24, 8) DEFAULT 0,
    margin_used NUMERIC(24, 8) DEFAULT 0,
    leverage NUMERIC(8, 2) DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    last_update_timestamp TIMESTAMPTZ,
    is_paper_trading BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_position_side CHECK (side IN ('long', 'short')),
    CONSTRAINT chk_position_type CHECK (position_type IN ('spot', 'margin', 'futures', 'options'))
);

-- Create indexes for positions
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_farm_id ON public.positions(farm_id);
CREATE INDEX IF NOT EXISTS idx_positions_exchange_connection_id ON public.positions(exchange_connection_id);
CREATE INDEX IF NOT EXISTS idx_positions_strategy_id ON public.positions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON public.positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_status ON public.positions(status);

-- Create position_history table to track changes
CREATE TABLE IF NOT EXISTS public.position_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    quantity_change NUMERIC(24, 8),
    price NUMERIC(24, 8),
    pnl_realized NUMERIC(24, 8),
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_position_history_position_id ON public.position_history(position_id);
CREATE INDEX IF NOT EXISTS idx_position_history_event_type ON public.position_history(event_type);
CREATE INDEX IF NOT EXISTS idx_position_history_timestamp ON public.position_history(timestamp);

-- Create portfolio_snapshots table to track portfolio value over time
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    exchange_connection_id UUID REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    total_equity NUMERIC(24, 8) NOT NULL,
    available_balance NUMERIC(24, 8) NOT NULL,
    margin_balance NUMERIC(24, 8) DEFAULT 0,
    unrealized_pnl NUMERIC(24, 8) DEFAULT 0,
    realized_pnl_daily NUMERIC(24, 8) DEFAULT 0,
    open_positions_count INTEGER DEFAULT 0,
    asset_allocation JSONB DEFAULT '{}'::jsonb,
    risk_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_id ON public.portfolio_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_farm_id ON public.portfolio_snapshots(farm_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_exchange_connection_id ON public.portfolio_snapshots(exchange_connection_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_snapshot_timestamp ON public.portfolio_snapshots(snapshot_timestamp);

-- Add triggers for automatic timestamp handling
CREATE TRIGGER handle_positions_created_at
BEFORE INSERT ON public.positions
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_position_history_created_at
BEFORE INSERT ON public.position_history
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_portfolio_snapshots_created_at
BEFORE INSERT ON public.portfolio_snapshots
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

-- Enable RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for positions
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

-- Create RLS policies for position_history
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

-- Create RLS policies for portfolio_snapshots
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

-- Function to calculate position PNL
CREATE OR REPLACE FUNCTION public.calculate_position_pnl(
    p_position_id UUID,
    p_current_price NUMERIC(24, 8)
)
RETURNS NUMERIC(24, 8)
SECURITY INVOKER
SET search_path = '';
LANGUAGE plpgsql AS $$
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
    WHERE id = p_position_id;
    
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

-- Function to update position with trade data
CREATE OR REPLACE FUNCTION public.update_position_from_trade()
RETURNS TRIGGER AS $$
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
    SELECT id, side, EXISTS(id), quantity
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = '';

-- Create trigger to update positions when trades are added
CREATE TRIGGER update_position_on_trade
AFTER INSERT ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.update_position_from_trade();
