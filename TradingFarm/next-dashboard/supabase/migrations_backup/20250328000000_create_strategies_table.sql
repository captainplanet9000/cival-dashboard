-- Migration to create the base strategies table
-- This table is required for several other migrations to function correctly

CREATE TABLE IF NOT EXISTS "public"."strategies" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "farm_id" UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT CHECK (type IN ('trend_following', 'mean_reversion', 'breakout', 'volatility', 'arbitrage', 'market_making', 'custom')),
    "status" TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    "parameters" JSONB DEFAULT '{}'::jsonb,
    "indicators" JSONB DEFAULT '{}'::jsonb,
    "signals" JSONB DEFAULT '{}'::jsonb,
    "time_frames" TEXT[] DEFAULT '{}'::text[],
    "symbols" TEXT[] DEFAULT '{}'::text[],
    "exchanges" TEXT[] DEFAULT '{}'::text[],
    "risk_score" INTEGER DEFAULT 5, -- 1-10 scale
    "performance_metrics" JSONB DEFAULT '{}'::jsonb,
    "backtest_results" JSONB DEFAULT '{}'::jsonb,
    "tags" TEXT[] DEFAULT '{}'::text[],
    "version" TEXT DEFAULT '1.0.0',
    "is_template" BOOLEAN DEFAULT FALSE,
    "parent_id" UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON public.strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_farm_id ON public.strategies(farm_id);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON public.strategies(status);
CREATE INDEX IF NOT EXISTS idx_strategies_type ON public.strategies(type);
CREATE INDEX IF NOT EXISTS idx_strategies_is_template ON public.strategies(is_template);

-- Create timestamps trigger for strategies
DROP TRIGGER IF EXISTS handle_strategies_created_at ON public.strategies;
CREATE TRIGGER handle_strategies_created_at
BEFORE INSERT ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS handle_strategies_updated_at ON public.strategies;
CREATE TRIGGER handle_strategies_updated_at
BEFORE UPDATE ON public.strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on strategies
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for strategies
CREATE POLICY "Users can view their own strategies"
ON public.strategies
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own strategies"
ON public.strategies
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own strategies"
ON public.strategies
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own strategies"
ON public.strategies
FOR DELETE
USING (user_id = auth.uid());
