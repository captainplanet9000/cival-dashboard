-- Migration: Add positions and portfolio tables safely
-- This migration handles safely adding position and portfolio tracking tables

DO $$ 
BEGIN
    -- 1. Positions
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'positions') THEN
        CREATE TABLE public.positions (
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
        CREATE INDEX idx_positions_user_id ON public.positions(user_id);
        CREATE INDEX idx_positions_farm_id ON public.positions(farm_id);
        CREATE INDEX idx_positions_exchange_connection_id ON public.positions(exchange_connection_id);
        CREATE INDEX idx_positions_strategy_id ON public.positions(strategy_id);
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
    END IF;
    
    -- 2. Position History
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'position_history') THEN
        CREATE TABLE public.position_history (
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
        
        CREATE INDEX idx_position_history_position_id ON public.position_history(position_id);
        CREATE INDEX idx_position_history_event_type ON public.position_history(event_type);
        CREATE INDEX idx_position_history_timestamp ON public.position_history(timestamp);
        
        -- Add triggers for timestamp handling
        CREATE TRIGGER handle_position_history_created_at
        BEFORE INSERT ON public.position_history
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        
        -- Enable RLS
        ALTER TABLE public.position_history ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- 3. Portfolio Snapshots
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'portfolio_snapshots') THEN
        CREATE TABLE public.portfolio_snapshots (
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
        
        CREATE INDEX idx_portfolio_snapshots_user_id ON public.portfolio_snapshots(user_id);
        CREATE INDEX idx_portfolio_snapshots_farm_id ON public.portfolio_snapshots(farm_id);
        CREATE INDEX idx_portfolio_snapshots_exchange_connection_id ON public.portfolio_snapshots(exchange_connection_id);
        CREATE INDEX idx_portfolio_snapshots_snapshot_timestamp ON public.portfolio_snapshots(snapshot_timestamp);
        
        -- Add triggers for timestamp handling
        CREATE TRIGGER handle_portfolio_snapshots_created_at
        BEFORE INSERT ON public.portfolio_snapshots
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        
        -- Enable RLS
        ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- 4. Risk Parameters
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'risk_parameters') THEN
        CREATE TABLE public.risk_parameters (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
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
        
        CREATE INDEX idx_risk_parameters_user_id ON public.risk_parameters(user_id);
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
    END IF;
    
    -- 5. Strategy Executions
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'strategy_executions') THEN
        CREATE TABLE public.strategy_executions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
            strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
            exchange_connection_id UUID REFERENCES public.exchange_connections(id) ON DELETE SET NULL,
            agent_id UUID REFERENCES public.elizaos_agents(id) ON DELETE SET NULL,
            risk_parameter_id UUID REFERENCES public.risk_parameters(id) ON DELETE SET NULL,
            start_timestamp TIMESTAMPTZ NOT NULL,
            end_timestamp TIMESTAMPTZ,
            status VARCHAR(20) DEFAULT 'running',
            symbols JSONB NOT NULL,
            is_paper_trading BOOLEAN DEFAULT TRUE,
            execution_parameters JSONB DEFAULT '{}'::jsonb,
            performance_metrics JSONB DEFAULT '{
                "total_trades": 0,
                "win_rate": 0,
                "profit_factor": 0,
                "max_drawdown": 0,
                "total_pnl": 0
            }'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb,
            CONSTRAINT chk_strategy_execution_status CHECK (status IN ('running', 'paused', 'completed', 'failed', 'stopped'))
        );
        
        CREATE INDEX idx_strategy_executions_user_id ON public.strategy_executions(user_id);
        CREATE INDEX idx_strategy_executions_farm_id ON public.strategy_executions(farm_id);
        CREATE INDEX idx_strategy_executions_strategy_id ON public.strategy_executions(strategy_id);
        CREATE INDEX idx_strategy_executions_exchange_connection_id ON public.strategy_executions(exchange_connection_id);
        CREATE INDEX idx_strategy_executions_agent_id ON public.strategy_executions(agent_id);
        CREATE INDEX idx_strategy_executions_status ON public.strategy_executions(status);
        
        -- Add triggers for timestamp handling
        CREATE TRIGGER handle_strategy_executions_created_at
        BEFORE INSERT ON public.strategy_executions
        FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
        
        CREATE TRIGGER handle_strategy_executions_updated_at
        BEFORE UPDATE ON public.strategy_executions
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        
        -- Enable RLS
        ALTER TABLE public.strategy_executions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;
