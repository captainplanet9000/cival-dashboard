-- Add support for advanced order types and risk management 

-- Extend the orders table with additional fields for advanced order types
ALTER TABLE "public"."orders" 
ADD COLUMN IF NOT EXISTS "trail_value" NUMERIC,
ADD COLUMN IF NOT EXISTS "trail_type" TEXT CHECK ("trail_type" IN ('amount', 'percentage')),
ADD COLUMN IF NOT EXISTS "parent_order_id" UUID REFERENCES "public"."orders"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "oco_order_id" UUID REFERENCES "public"."orders"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "iceberg_qty" NUMERIC,
ADD COLUMN IF NOT EXISTS "activation_price" NUMERIC,
ADD COLUMN IF NOT EXISTS "execution_risk_score" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "trigger_condition" TEXT CHECK ("trigger_condition" IN ('gt', 'lt', 'gte', 'lte')),
ADD COLUMN IF NOT EXISTS "trigger_price_source" TEXT CHECK ("trigger_price_source" IN ('mark', 'index', 'last')),
ADD COLUMN IF NOT EXISTS "exchange_account_id" TEXT;

-- Update order_type check constraint to include new order types
ALTER TABLE "public"."orders" DROP CONSTRAINT IF EXISTS "orders_order_type_check";
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_order_type_check" 
CHECK ("order_type" IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'oco', 'iceberg', 'twap', 'vwap', 'take_profit', 'bracket'));

-- Create risk_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."risk_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "max_position_size" NUMERIC NOT NULL,
    "max_drawdown_percent" NUMERIC NOT NULL,
    "max_daily_trades" INTEGER NOT NULL,
    "max_risk_per_trade_percent" NUMERIC NOT NULL,
    "leverage_limit" NUMERIC DEFAULT 1,
    "position_sizing_method" TEXT CHECK ("position_sizing_method" IN ('fixed', 'percent_of_balance', 'risk_based', 'kelly_criterion', 'custom')),
    "auto_hedging" BOOLEAN DEFAULT FALSE,
    "max_open_positions" INTEGER DEFAULT 10,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);

-- Create timestamps trigger for risk_profiles
CREATE TRIGGER "handle_updated_at_risk_profiles"
BEFORE UPDATE ON "public"."risk_profiles"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on risk_profiles
ALTER TABLE "public"."risk_profiles" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for risk_profiles
CREATE POLICY "Users can view their own risk profiles"
ON "public"."risk_profiles"
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own risk profiles"
ON "public"."risk_profiles"
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own risk profiles"
ON "public"."risk_profiles"
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own risk profiles"
ON "public"."risk_profiles"
FOR DELETE
USING (user_id = auth.uid());

-- Create agent_risk_assignments table for assigning risk profiles to agents
CREATE TABLE IF NOT EXISTS "public"."agent_risk_assignments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "agent_id" UUID NOT NULL REFERENCES "public"."agents"("id") ON DELETE CASCADE,
    "risk_profile_id" UUID NOT NULL REFERENCES "public"."risk_profiles"("id") ON DELETE CASCADE,
    "active" BOOLEAN DEFAULT TRUE,
    "override_params" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id"),
    UNIQUE ("agent_id", "risk_profile_id")
);

-- Create timestamps trigger for agent_risk_assignments
CREATE TRIGGER "handle_updated_at_agent_risk_assignments"
BEFORE UPDATE ON "public"."agent_risk_assignments"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on agent_risk_assignments
ALTER TABLE "public"."agent_risk_assignments" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for agent_risk_assignments
CREATE POLICY "Users can view their own agent risk assignments"
ON "public"."agent_risk_assignments"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."agents" a
        WHERE a.id = agent_id AND a.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own agent risk assignments"
ON "public"."agent_risk_assignments"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."agents" a
        WHERE a.id = agent_id AND a.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own agent risk assignments"
ON "public"."agent_risk_assignments"
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM "public"."agents" a
        WHERE a.id = agent_id AND a.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own agent risk assignments"
ON "public"."agent_risk_assignments"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "public"."agents" a
        WHERE a.id = agent_id AND a.user_id = auth.uid()
    )
);

-- Create exchange_accounts table for managing multiple exchange connections
CREATE TABLE IF NOT EXISTS "public"."exchange_accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "exchange" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "api_secret" TEXT NOT NULL,
    "passphrase" TEXT,
    "is_testnet" BOOLEAN DEFAULT FALSE,
    "status" TEXT DEFAULT 'active',
    "permissions" TEXT[] DEFAULT ARRAY['read', 'trade'],
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);

-- Create timestamps trigger for exchange_accounts
CREATE TRIGGER "handle_updated_at_exchange_accounts"
BEFORE UPDATE ON "public"."exchange_accounts"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on exchange_accounts
ALTER TABLE "public"."exchange_accounts" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for exchange_accounts
CREATE POLICY "Users can view their own exchange accounts"
ON "public"."exchange_accounts"
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own exchange accounts"
ON "public"."exchange_accounts"
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own exchange accounts"
ON "public"."exchange_accounts"
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own exchange accounts"
ON "public"."exchange_accounts"
FOR DELETE
USING (user_id = auth.uid());

-- Create positions table for position reconciliation
CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "farm_id" UUID NOT NULL REFERENCES "public"."farms"("id") ON DELETE CASCADE,
    "agent_id" UUID REFERENCES "public"."agents"("id") ON DELETE SET NULL,
    "exchange" TEXT NOT NULL,
    "exchange_account_id" UUID REFERENCES "public"."exchange_accounts"("id"),
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL CHECK ("side" IN ('long', 'short')),
    "quantity" NUMERIC NOT NULL,
    "entry_price" NUMERIC NOT NULL,
    "current_price" NUMERIC,
    "unrealized_pnl" NUMERIC,
    "realized_pnl" NUMERIC DEFAULT 0,
    "status" TEXT DEFAULT 'open' CHECK ("status" IN ('open', 'closed', 'liquidated')),
    "open_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "close_time" TIMESTAMP WITH TIME ZONE,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);

-- Create timestamps trigger for positions
CREATE TRIGGER "handle_updated_at_positions"
BEFORE UPDATE ON "public"."positions"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on positions
ALTER TABLE "public"."positions" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for positions
CREATE POLICY "Users can view their own positions"
ON "public"."positions"
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own positions"
ON "public"."positions"
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own positions"
ON "public"."positions"
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own positions"
ON "public"."positions"
FOR DELETE
USING (user_id = auth.uid());

-- Create performance_metrics table for monitoring
CREATE TABLE IF NOT EXISTS "public"."performance_metrics" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "farm_id" UUID REFERENCES "public"."farms"("id") ON DELETE CASCADE,
    "agent_id" UUID REFERENCES "public"."agents"("id") ON DELETE CASCADE,
    "strategy_id" UUID REFERENCES "public"."strategies"("id") ON DELETE SET NULL,
    "period" TEXT CHECK ("period" IN ('daily', 'weekly', 'monthly', 'yearly', 'all_time')),
    "period_start" TIMESTAMP WITH TIME ZONE,
    "period_end" TIMESTAMP WITH TIME ZONE,
    "total_trades" INTEGER DEFAULT 0,
    "winning_trades" INTEGER DEFAULT 0,
    "losing_trades" INTEGER DEFAULT 0,
    "win_rate" NUMERIC,
    "profit_loss" NUMERIC DEFAULT 0,
    "profit_loss_percent" NUMERIC,
    "max_drawdown" NUMERIC,
    "sharpe_ratio" NUMERIC,
    "volatility" NUMERIC,
    "largest_win" NUMERIC,
    "largest_loss" NUMERIC,
    "avg_win" NUMERIC,
    "avg_loss" NUMERIC,
    "avg_trade_duration" NUMERIC,
    "roi" NUMERIC,
    "data" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);

-- Create timestamps trigger for performance_metrics
CREATE TRIGGER "handle_updated_at_performance_metrics"
BEFORE UPDATE ON "public"."performance_metrics"
FOR EACH ROW
EXECUTE PROCEDURE "public"."handle_updated_at"();

-- Enable RLS on performance_metrics
ALTER TABLE "public"."performance_metrics" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for performance_metrics
CREATE POLICY "Users can view their own performance metrics"
ON "public"."performance_metrics"
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own performance metrics"
ON "public"."performance_metrics"
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own performance metrics"
ON "public"."performance_metrics"
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own performance metrics"
ON "public"."performance_metrics"
FOR DELETE
USING (user_id = auth.uid());

-- Create position_reconciliation_logs table
CREATE TABLE IF NOT EXISTS "public"."position_reconciliation_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "exchange" TEXT NOT NULL,
    "exchange_account_id" UUID REFERENCES "public"."exchange_accounts"("id"),
    "reconciliation_time" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "status" TEXT DEFAULT 'success' CHECK ("status" IN ('success', 'partial', 'failed')),
    "discrepancies_found" INTEGER DEFAULT 0,
    "discrepancies_resolved" INTEGER DEFAULT 0,
    "details" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("id")
);

-- Enable RLS on position_reconciliation_logs
ALTER TABLE "public"."position_reconciliation_logs" ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for position_reconciliation_logs
CREATE POLICY "Users can view their own reconciliation logs"
ON "public"."position_reconciliation_logs"
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own reconciliation logs"
ON "public"."position_reconciliation_logs"
FOR INSERT
WITH CHECK (user_id = auth.uid());
