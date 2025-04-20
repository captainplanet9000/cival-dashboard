-- Migration for DeFi Lending Strategies with Aave V3
-- Creates tables to track lending strategies, positions, and actions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create lending_strategies table
CREATE TABLE IF NOT EXISTS public.lending_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    safe_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    protocol TEXT NOT NULL DEFAULT 'aave_v3',
    type TEXT NOT NULL,
    collateral_asset TEXT NOT NULL,
    borrow_asset TEXT NOT NULL,
    initial_collateral_amount TEXT NOT NULL,
    target_ltv INTEGER NOT NULL,
    target_health_factor NUMERIC(10, 2) NOT NULL,
    liquidation_protection BOOLEAN NOT NULL DEFAULT TRUE,
    auto_rebalancing BOOLEAN NOT NULL DEFAULT TRUE,
    max_iterations INTEGER,
    batch_processing BOOLEAN,
    repayment_interval INTEGER,
    repayment_threshold TEXT,
    ltv_range INTEGER[],
    rebalance_interval INTEGER,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_agent
        FOREIGN KEY(agent_id)
        REFERENCES public.agents(id)
        ON DELETE CASCADE
);

-- Create strategy_positions table to track current positions
CREATE TABLE IF NOT EXISTS public.strategy_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL,
    safe_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    collateral_asset TEXT NOT NULL,
    collateral_amount TEXT NOT NULL,
    borrow_asset TEXT NOT NULL,
    borrow_amount TEXT NOT NULL,
    health_factor TEXT NOT NULL,
    ltv NUMERIC(10, 2) NOT NULL,
    apy NUMERIC(10, 2),
    status TEXT NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_strategy
        FOREIGN KEY(strategy_id)
        REFERENCES public.lending_strategies(id)
        ON DELETE CASCADE
);

-- Create strategy_actions table to track history of actions
CREATE TABLE IF NOT EXISTS public.strategy_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    tx_hash TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    before_state JSONB,
    after_state JSONB,
    CONSTRAINT fk_strategy
        FOREIGN KEY(strategy_id)
        REFERENCES public.lending_strategies(id)
        ON DELETE CASCADE
);

-- Create agent_safes table to track Safe wallets
CREATE TABLE IF NOT EXISTS public.agent_safes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    safe_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    owners TEXT[] NOT NULL,
    threshold INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_agent
        FOREIGN KEY(agent_id)
        REFERENCES public.agents(id)
        ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lending_strategies_agent_id ON public.lending_strategies(agent_id);
CREATE INDEX IF NOT EXISTS idx_lending_strategies_status ON public.lending_strategies(status);
CREATE INDEX IF NOT EXISTS idx_strategy_positions_strategy_id ON public.strategy_positions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_actions_strategy_id ON public.strategy_actions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_agent_safes_agent_id ON public.agent_safes(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_safes_safe_address ON public.agent_safes(safe_address);

-- Add RLS policies to protect data
ALTER TABLE public.lending_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_safes ENABLE ROW LEVEL SECURITY;

-- Define RLS policies 
CREATE POLICY "Users can view their own strategies or strategies related to their farms"
    ON public.lending_strategies
    FOR SELECT
    USING (
        (agent_id IN (
            SELECT agent_id FROM agents
            WHERE user_id = auth.uid()
        ))
        OR 
        (agent_id IN (
            SELECT a.id FROM agents a
            JOIN farm_agents fa ON a.id = fa.agent_id
            JOIN farm_users fu ON fa.farm_id = fu.farm_id
            WHERE fu.user_id = auth.uid() AND fu.role IN ('admin', 'member')
        ))
    );

CREATE POLICY "Users can manage their own strategies"
    ON public.lending_strategies
    FOR ALL
    USING (
        agent_id IN (
            SELECT agent_id FROM agents
            WHERE user_id = auth.uid()
        )
    );

-- Similar policies for the other tables
CREATE POLICY "Users can view strategy positions they have access to"
    ON public.strategy_positions
    FOR SELECT
    USING (
        (strategy_id IN (
            SELECT id FROM lending_strategies
            WHERE agent_id IN (
                SELECT agent_id FROM agents
                WHERE user_id = auth.uid()
            )
        ))
        OR 
        (strategy_id IN (
            SELECT ls.id FROM lending_strategies ls
            JOIN agents a ON ls.agent_id = a.id
            JOIN farm_agents fa ON a.id = fa.agent_id
            JOIN farm_users fu ON fa.farm_id = fu.farm_id
            WHERE fu.user_id = auth.uid() AND fu.role IN ('admin', 'member')
        ))
    );

CREATE POLICY "Users can view strategy actions they have access to"
    ON public.strategy_actions
    FOR SELECT
    USING (
        (strategy_id IN (
            SELECT id FROM lending_strategies
            WHERE agent_id IN (
                SELECT agent_id FROM agents
                WHERE user_id = auth.uid()
            )
        ))
        OR 
        (strategy_id IN (
            SELECT ls.id FROM lending_strategies ls
            JOIN agents a ON ls.agent_id = a.id
            JOIN farm_agents fa ON a.id = fa.agent_id
            JOIN farm_users fu ON fa.farm_id = fu.farm_id
            WHERE fu.user_id = auth.uid() AND fu.role IN ('admin', 'member')
        ))
    );

CREATE POLICY "Users can view and manage their agent safes"
    ON public.agent_safes
    FOR ALL
    USING (
        agent_id IN (
            SELECT a.id FROM agents a
            WHERE a.user_id = auth.uid()
            OR a.id IN (
                SELECT fa.agent_id FROM farm_agents fa
                JOIN farm_users fu ON fa.farm_id = fu.farm_id
                WHERE fu.user_id = auth.uid() AND fu.role IN ('admin')
            )
        )
    );

-- Set up created_at and updated_at triggers
DO $$
BEGIN
    -- Check if the function already exists
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE OR REPLACE FUNCTION public.handle_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at_lending_strategies
BEFORE UPDATE ON public.lending_strategies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_strategy_positions
BEFORE UPDATE ON public.strategy_positions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add functions for health factor monitoring
CREATE OR REPLACE FUNCTION public.check_health_factor_critical()
RETURNS TRIGGER AS $$
BEGIN
    -- If health factor drops below 1.05, create an alert
    IF NEW.health_factor::numeric < 1.05 * 10^18 THEN
        INSERT INTO public.alerts (
            type,
            severity,
            message,
            related_entity_id,
            related_entity_type,
            created_at
        ) VALUES (
            'health_factor_critical',
            'critical',
            'Health factor for strategy ' || NEW.strategy_id || ' is critically low at ' || (NEW.health_factor::numeric / 10^18) || '. Immediate action required.',
            NEW.strategy_id,
            'lending_strategy',
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for health factor monitoring
CREATE TRIGGER monitor_health_factor
AFTER INSERT OR UPDATE ON public.strategy_positions
FOR EACH ROW
EXECUTE FUNCTION public.check_health_factor_critical();

-- Create function to automatically update positions when strategy is updated
CREATE OR REPLACE FUNCTION public.update_strategy_position()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the related position or create a new one if it doesn't exist
    INSERT INTO public.strategy_positions (
        strategy_id,
        safe_address,
        chain_id,
        collateral_asset,
        collateral_amount,
        borrow_asset,
        borrow_amount,
        health_factor,
        ltv,
        status,
        last_updated
    ) VALUES (
        NEW.id,
        NEW.safe_address,
        NEW.chain_id,
        NEW.collateral_asset,
        NEW.initial_collateral_amount,
        NEW.borrow_asset,
        '0', -- Will be updated by the service
        '0', -- Will be updated by the service
        0, -- Will be updated by the service
        NEW.status,
        NOW()
    )
    ON CONFLICT (strategy_id) 
    DO UPDATE SET
        safe_address = EXCLUDED.safe_address,
        chain_id = EXCLUDED.chain_id,
        collateral_asset = EXCLUDED.collateral_asset,
        borrow_asset = EXCLUDED.borrow_asset,
        status = EXCLUDED.status,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating positions
CREATE TRIGGER update_position_on_strategy_change
AFTER INSERT OR UPDATE ON public.lending_strategies
FOR EACH ROW
EXECUTE FUNCTION public.update_strategy_position();
