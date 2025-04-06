
-- Goal-related tables for the Farm Goal Acquisition Workflow
-- Created: 2025-04-06

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Goals table - Core table for tracking acquisition goals
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES public.farms(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    target_assets TEXT[] NOT NULL, -- Can contain multiple options like ['SONIC', 'SUI']
    selected_asset TEXT, -- Will be set during strategy selection
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED')),
    completion_actions JSONB, -- { transferToBank: true, startNextGoal: false, nextGoalId: null }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Goal strategies table - Tracks strategy proposals and selections for goals
CREATE TABLE public.goal_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES public.goals(id) NOT NULL,
    agent_id UUID REFERENCES public.agents(id) NOT NULL,
    strategy_type TEXT NOT NULL, -- e.g., 'DEX_SWAP', 'YIELD_FARMING'
    parameters JSONB,
    is_active BOOLEAN DEFAULT false,
    proposed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    selected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Goal transactions table - Tracks transactions related to goal acquisition
CREATE TABLE public.goal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES public.goals(id) NOT NULL,
    strategy_id UUID REFERENCES public.goal_strategies(id),
    transaction_type TEXT NOT NULL, -- e.g., 'SWAP', 'STAKE', 'UNSTAKE', 'CLAIM'
    asset_from TEXT,
    amount_from NUMERIC,
    asset_to TEXT,
    amount_to NUMERIC,
    transaction_hash TEXT,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Goal monitoring table - Tracks monitoring events and adaptations
CREATE TABLE public.goal_monitoring (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES public.goals(id) NOT NULL,
    agent_id UUID REFERENCES public.agents(id) NOT NULL,
    event_type TEXT NOT NULL, -- e.g., 'PROGRESS_UPDATE', 'MARKET_CHANGE', 'STRATEGY_ADJUSTMENT'
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create triggers for created_at and updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.goal_strategies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.goal_transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS for all tables
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_monitoring ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Goals policies
CREATE POLICY "Users can view their own goals" ON public.goals
    FOR SELECT USING (farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own goals" ON public.goals
    FOR INSERT WITH CHECK (farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own goals" ON public.goals
    FOR UPDATE USING (farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own goals" ON public.goals
    FOR DELETE USING (farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid()));

-- Goal strategies policies
CREATE POLICY "Users can view their own goal strategies" ON public.goal_strategies
    FOR SELECT USING (goal_id IN (SELECT id FROM public.goals WHERE farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert their own goal strategies" ON public.goal_strategies
    FOR INSERT WITH CHECK (goal_id IN (SELECT id FROM public.goals WHERE farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())));

CREATE POLICY "Users can update their own goal strategies" ON public.goal_strategies
    FOR UPDATE USING (goal_id IN (SELECT id FROM public.goals WHERE farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete their own goal strategies" ON public.goal_strategies
    FOR DELETE USING (goal_id IN (SELECT id FROM public.goals WHERE farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())));

-- Goal transactions policies
CREATE POLICY "Users can view their own goal transactions" ON public.goal_transactions
    FOR SELECT USING (goal_id IN (SELECT id FROM public.goals WHERE farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert their own goal transactions" ON public.goal_transactions
    FOR INSERT WITH CHECK (goal_id IN (SELECT id FROM public.goals WHERE farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())));

CREATE POLICY "Users can update their own goal transactions" ON public.goal_transactions
    FOR UPDATE USING (goal_id IN (SELECT id FROM public.goals WHERE farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())));

-- Goal monitoring policies
CREATE POLICY "Users can view their own goal monitoring" ON public.goal_monitoring
    FOR SELECT USING (goal_id IN (SELECT id FROM public.goals WHERE farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert their own goal monitoring" ON public.goal_monitoring
    FOR INSERT WITH CHECK (goal_id IN (SELECT id FROM public.goals WHERE farm_id IN (SELECT id FROM public.farms WHERE user_id = auth.uid())));

-- Create indexes for performance
CREATE INDEX idx_goals_farm_id ON public.goals(farm_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_goal_strategies_goal_id ON public.goal_strategies(goal_id);
CREATE INDEX idx_goal_strategies_agent_id ON public.goal_strategies(agent_id);
CREATE INDEX idx_goal_transactions_goal_id ON public.goal_transactions(goal_id);
CREATE INDEX idx_goal_transactions_strategy_id ON public.goal_transactions(strategy_id);
CREATE INDEX idx_goal_monitoring_goal_id ON public.goal_monitoring(goal_id);
CREATE INDEX idx_goal_monitoring_agent_id ON public.goal_monitoring(agent_id);