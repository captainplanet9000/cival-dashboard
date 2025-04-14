-- Migration: Complete and fix Trading System schema
-- This migration handles safely adding tables and columns that may or may not already exist

-- First, check if tables exist and create them if they don't
DO $$ 
BEGIN
    -- 1. Exchange Connections
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exchange_connections') THEN
        CREATE TABLE public.exchange_connections (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
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
            CONSTRAINT unique_user_exchange UNIQUE(user_id, exchange_name, is_testnet)
        );
        
        -- Create indexes for exchange_connections
        CREATE INDEX idx_exchange_connections_user_id ON public.exchange_connections(user_id);
        CREATE INDEX idx_exchange_connections_farm_id ON public.exchange_connections(farm_id);
        CREATE INDEX idx_exchange_connections_exchange_name ON public.exchange_connections(exchange_name);
        CREATE INDEX idx_exchange_connections_status ON public.exchange_connections(connection_status);
        
        -- Add triggers for timestamp handling
        CREATE TRIGGER handle_exchange_connections_created_at
        BEFORE INSERT ON public.exchange_connections
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        
        CREATE TRIGGER handle_exchange_connections_updated_at
        BEFORE UPDATE ON public.exchange_connections
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        
        -- Enable RLS
        ALTER TABLE public.exchange_connections ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- 2. Orders
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        CREATE TABLE public.orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
            exchange_connection_id UUID NOT NULL REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
            strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
            agent_id UUID REFERENCES public.elizaos_agents(id) ON DELETE SET NULL,
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
        CREATE INDEX idx_orders_user_id ON public.orders(user_id);
        CREATE INDEX idx_orders_farm_id ON public.orders(farm_id);
        CREATE INDEX idx_orders_exchange_connection_id ON public.orders(exchange_connection_id);
        CREATE INDEX idx_orders_strategy_id ON public.orders(strategy_id);
        CREATE INDEX idx_orders_agent_id ON public.orders(agent_id);
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
    END IF;
    
    -- 3. Trades
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trades') THEN
        CREATE TABLE public.trades (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
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
        CREATE INDEX idx_trades_user_id ON public.trades(user_id);
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
    END IF;
END $$;
