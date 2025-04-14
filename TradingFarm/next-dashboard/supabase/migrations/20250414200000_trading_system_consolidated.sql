-- Migration: Consolidated Trading System Schema
-- This migration handles safely adding all required tables and functions for the Trading Farm system

-- First, ensure utility functions exist
DO $$ 
BEGIN
    -- Create handle_created_at function if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'handle_created_at') THEN
        CREATE OR REPLACE FUNCTION public.handle_created_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.created_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    END IF;

    -- Create handle_updated_at function if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE OR REPLACE FUNCTION public.handle_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    END IF;

    -- Create uuid extension if it doesn't exist
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
END $$;

-- Exchange Connections Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exchange_connections') THEN
        CREATE TABLE public.exchange_connections (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            farm_id UUID NOT NULL,
            exchange_name VARCHAR(50) NOT NULL,
            exchange_type VARCHAR(20) NOT NULL,
            is_testnet BOOLEAN DEFAULT FALSE,
            api_key_encrypted TEXT,
            api_secret_encrypted TEXT,
            passphrase_encrypted TEXT,
            additional_credentials JSONB DEFAULT '{}'::jsonb,
            connection_status VARCHAR(20) DEFAULT 'pending',
            last_connected_at TIMESTAMPTZ,
            permissions JSONB DEFAULT '{
                "trading": false,
                "margin": false,
                "futures": false,
                "withdrawal": false
            }'::jsonb,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            CONSTRAINT unique_user_exchange UNIQUE(owner_id, exchange_name, is_testnet)
        );
        
        -- Create indexes for exchange_connections
        CREATE INDEX idx_exchange_connections_owner_id ON public.exchange_connections(owner_id);
        CREATE INDEX idx_exchange_connections_farm_id ON public.exchange_connections(farm_id);
        CREATE INDEX idx_exchange_connections_exchange_name ON public.exchange_connections(exchange_name);
        
        -- Add triggers for timestamp handling
        CREATE TRIGGER handle_exchange_connections_created_at
        BEFORE INSERT ON public.exchange_connections
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        
        CREATE TRIGGER handle_exchange_connections_updated_at
        BEFORE UPDATE ON public.exchange_connections
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        
        -- Enable RLS
        ALTER TABLE public.exchange_connections ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own exchange connections"
        ON public.exchange_connections FOR SELECT
        USING (
            auth.uid() = owner_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = exchange_connections.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can create their own exchange connections"
        ON public.exchange_connections FOR INSERT
        WITH CHECK (
            auth.uid() = owner_id
        );
        
        CREATE POLICY "Users can update their own exchange connections"
        ON public.exchange_connections FOR UPDATE
        USING (
            auth.uid() = owner_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = exchange_connections.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin')
            )
        );
    END IF;
END $$;

-- Orders Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        CREATE TABLE public.orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            farm_id UUID NOT NULL,
            exchange_connection_id UUID NOT NULL REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
            strategy_id UUID,
            agent_id UUID,
            exchange_order_id VARCHAR(100),
            symbol VARCHAR(50) NOT NULL,
            order_type VARCHAR(20) NOT NULL,
            side VARCHAR(10) NOT NULL,
            quantity NUMERIC(24, 8) NOT NULL,
            price NUMERIC(24, 8),
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            filled_quantity NUMERIC(24, 8) DEFAULT 0,
            average_fill_price NUMERIC(24, 8),
            commission NUMERIC(24, 8) DEFAULT 0,
            commission_asset VARCHAR(10),
            execution_time_ms INTEGER,
            is_paper_trading BOOLEAN DEFAULT FALSE,
            raw_exchange_data JSONB,
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb,
            CONSTRAINT chk_order_side CHECK (side IN ('buy', 'sell')),
            CONSTRAINT chk_order_type CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'oco', 'post_only'))
        );
        
        -- Create indexes for orders
        CREATE INDEX idx_orders_owner_id ON public.orders(owner_id);
        CREATE INDEX idx_orders_farm_id ON public.orders(farm_id);
        CREATE INDEX idx_orders_exchange_connection_id ON public.orders(exchange_connection_id);
        CREATE INDEX idx_orders_symbol ON public.orders(symbol);
        CREATE INDEX idx_orders_status ON public.orders(status);
        CREATE INDEX idx_orders_created_at ON public.orders(created_at);
        
        -- Add triggers for timestamp handling
        CREATE TRIGGER handle_orders_created_at
        BEFORE INSERT ON public.orders
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        
        CREATE TRIGGER handle_orders_updated_at
        BEFORE UPDATE ON public.orders
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        
        -- Enable RLS
        ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own orders"
        ON public.orders FOR SELECT
        USING (
            auth.uid() = owner_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = orders.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can create their own orders"
        ON public.orders FOR INSERT
        WITH CHECK (
            auth.uid() = owner_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = orders.farm_id
                AND farm_users.user_id = auth.uid()
                AND farm_users.role IN ('owner', 'admin', 'trader')
            )
        );
    END IF;
END $$;

-- Trades Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trades') THEN
        CREATE TABLE public.trades (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            farm_id UUID NOT NULL,
            order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
            exchange_connection_id UUID NOT NULL REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
            exchange_trade_id VARCHAR(100),
            symbol VARCHAR(50) NOT NULL,
            side VARCHAR(10) NOT NULL,
            quantity NUMERIC(24, 8) NOT NULL,
            price NUMERIC(24, 8) NOT NULL,
            commission NUMERIC(24, 8) DEFAULT 0,
            commission_asset VARCHAR(10),
            realized_pnl NUMERIC(24, 8),
            execution_timestamp TIMESTAMPTZ NOT NULL,
            is_paper_trading BOOLEAN DEFAULT FALSE,
            raw_exchange_data JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb,
            CONSTRAINT chk_trade_side CHECK (side IN ('buy', 'sell'))
        );
        
        -- Create indexes for trades
        CREATE INDEX idx_trades_owner_id ON public.trades(owner_id);
        CREATE INDEX idx_trades_farm_id ON public.trades(farm_id);
        CREATE INDEX idx_trades_order_id ON public.trades(order_id);
        CREATE INDEX idx_trades_exchange_connection_id ON public.trades(exchange_connection_id);
        CREATE INDEX idx_trades_symbol ON public.trades(symbol);
        CREATE INDEX idx_trades_execution_timestamp ON public.trades(execution_timestamp);
        
        -- Add triggers for timestamp handling
        CREATE TRIGGER handle_trades_created_at
        BEFORE INSERT ON public.trades
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        
        CREATE TRIGGER handle_trades_updated_at
        BEFORE UPDATE ON public.trades
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        
        -- Enable RLS
        ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own trades"
        ON public.trades FOR SELECT
        USING (
            auth.uid() = owner_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = trades.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Positions Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'positions') THEN
        CREATE TABLE public.positions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            farm_id UUID NOT NULL,
            exchange_connection_id UUID NOT NULL REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
            strategy_id UUID,
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
        CREATE INDEX idx_positions_owner_id ON public.positions(owner_id);
        CREATE INDEX idx_positions_farm_id ON public.positions(farm_id);
        CREATE INDEX idx_positions_exchange_connection_id ON public.positions(exchange_connection_id);
        CREATE INDEX idx_positions_symbol ON public.positions(symbol);
        CREATE INDEX idx_positions_status ON public.positions(status);
        
        -- Add triggers for timestamp handling
        CREATE TRIGGER handle_positions_created_at
        BEFORE INSERT ON public.positions
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        
        CREATE TRIGGER handle_positions_updated_at
        BEFORE UPDATE ON public.positions
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        
        -- Enable RLS
        ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own positions"
        ON public.positions FOR SELECT
        USING (
            auth.uid() = owner_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = positions.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Risk Parameters Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'risk_parameters') THEN
        CREATE TABLE public.risk_parameters (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            farm_id UUID NOT NULL,
            name VARCHAR(100) NOT NULL,
            max_position_size NUMERIC(24, 8),
            max_drawdown_percent NUMERIC(5, 2),
            max_daily_loss NUMERIC(24, 8),
            max_leverage NUMERIC(5, 2) DEFAULT 1,
            position_sizing_method VARCHAR(50) DEFAULT 'fixed',
            position_sizing_config JSONB DEFAULT '{}'::jsonb,
            stop_loss_config JSONB DEFAULT '{}'::jsonb,
            take_profit_config JSONB DEFAULT '{}'::jsonb,
            correlation_limits JSONB DEFAULT '{}'::jsonb,
            is_active BOOLEAN DEFAULT TRUE,
            applies_to JSONB DEFAULT '{"strategies": [], "symbols": [], "exchanges": []}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb
        );
        
        -- Create indexes for risk_parameters
        CREATE INDEX idx_risk_parameters_owner_id ON public.risk_parameters(owner_id);
        CREATE INDEX idx_risk_parameters_farm_id ON public.risk_parameters(farm_id);
        CREATE INDEX idx_risk_parameters_is_active ON public.risk_parameters(is_active);
        
        -- Add triggers for timestamp handling
        CREATE TRIGGER handle_risk_parameters_created_at
        BEFORE INSERT ON public.risk_parameters
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        
        CREATE TRIGGER handle_risk_parameters_updated_at
        BEFORE UPDATE ON public.risk_parameters
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        
        -- Enable RLS
        ALTER TABLE public.risk_parameters ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own risk parameters"
        ON public.risk_parameters FOR SELECT
        USING (
            auth.uid() = owner_id
            OR EXISTS (
                SELECT 1 FROM public.farm_users
                WHERE farm_users.farm_id = risk_parameters.farm_id
                AND farm_users.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Create validate_risk_check function
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'validate_risk_check') THEN
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
    END IF;
END $$;

-- Create calculate_position_pnl function
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'calculate_position_pnl') THEN
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
                owner_id = auth.uid()
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
    END IF;
END $$;
