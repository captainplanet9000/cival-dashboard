-- Migration for trading system monitoring and paper trading
-- April 14, 2025

-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 
-- PART 1: OPTIMIZATION JOBS
--

-- Create table for strategy optimization jobs
CREATE TABLE IF NOT EXISTS "public"."optimization_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL REFERENCES "public"."elizaos_agents"("id") ON DELETE CASCADE,
  "strategy_id" UUID NOT NULL, 
  "status" TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'complete', 'failed')),
  "parameters" JSONB,
  "result" JSONB,
  "message" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up RLS for optimization_jobs
ALTER TABLE "public"."optimization_jobs" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for optimization_jobs
CREATE POLICY "Users can view their own optimization jobs" 
  ON "public"."optimization_jobs" 
  FOR SELECT 
  USING (
    agent_id IN (
      SELECT id FROM "public"."elizaos_agents" WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own optimization jobs" 
  ON "public"."optimization_jobs" 
  FOR INSERT 
  WITH CHECK (
    agent_id IN (
      SELECT id FROM "public"."elizaos_agents" WHERE user_id = auth.uid()
    )
  );

-- Set up triggers for handling created_at and updated_at
CREATE TRIGGER handle_updated_at_optimization_jobs
  BEFORE UPDATE ON "public"."optimization_jobs"
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

--
-- PART 2: TRADING ALERTS
--

-- Create table for trading alerts
CREATE TABLE IF NOT EXISTS "public"."trading_alerts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "agent_id" UUID REFERENCES "public"."elizaos_agents"("id") ON DELETE CASCADE,
  "alert_type" TEXT NOT NULL CHECK (alert_type IN ('anomaly', 'connection', 'performance', 'system')),
  "severity" TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "details" JSONB,
  "is_read" BOOLEAN DEFAULT false NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up RLS for trading_alerts
ALTER TABLE "public"."trading_alerts" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trading_alerts
CREATE POLICY "Users can view their own alerts" 
  ON "public"."trading_alerts" 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Service role can create alerts" 
  ON "public"."trading_alerts" 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update their own alerts" 
  ON "public"."trading_alerts" 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Add index on alert status and timestamp for faster queries
CREATE INDEX idx_trading_alerts_user_read_created 
  ON "public"."trading_alerts" (user_id, is_read, created_at DESC);

--
-- PART 3: EXCHANGE CONNECTION LOGS
--

-- Create table for exchange connection logs
CREATE TABLE IF NOT EXISTS "public"."exchange_connection_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "connection_id" UUID NOT NULL REFERENCES "public"."exchange_connections"("id") ON DELETE CASCADE,
  "operation" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  "details" JSONB,
  "error" TEXT,
  "duration_ms" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up RLS for exchange_connection_logs
ALTER TABLE "public"."exchange_connection_logs" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for exchange_connection_logs
CREATE POLICY "Users can view their own connection logs" 
  ON "public"."exchange_connection_logs" 
  FOR SELECT 
  USING (
    connection_id IN (
      SELECT id FROM "public"."exchange_connections" WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can create connection logs" 
  ON "public"."exchange_connection_logs" 
  FOR INSERT 
  WITH CHECK (true);

-- Add index on connection ID and timestamp for faster queries
CREATE INDEX idx_connection_logs_connection_created 
  ON "public"."exchange_connection_logs" (connection_id, created_at DESC);

--
-- PART 4: PAPER TRADING
--

-- Create table for paper trading accounts
CREATE TABLE IF NOT EXISTS "public"."paper_trading_accounts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE UNIQUE,
  "configuration" JSONB NOT NULL,
  "balances" JSONB NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up RLS for paper_trading_accounts
ALTER TABLE "public"."paper_trading_accounts" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for paper_trading_accounts
CREATE POLICY "Users can view their own paper trading account" 
  ON "public"."paper_trading_accounts" 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own paper trading account" 
  ON "public"."paper_trading_accounts" 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own paper trading account" 
  ON "public"."paper_trading_accounts" 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Set up triggers for handling created_at and updated_at
CREATE TRIGGER handle_updated_at_paper_trading_accounts
  BEFORE UPDATE ON "public"."paper_trading_accounts"
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create table for paper trading orders
CREATE TABLE IF NOT EXISTS "public"."paper_trading_orders" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "agent_id" UUID REFERENCES "public"."elizaos_agents"("id") ON DELETE SET NULL,
  "symbol" TEXT NOT NULL,
  "side" TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  "type" TEXT NOT NULL CHECK (type IN ('MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT')),
  "price" NUMERIC,
  "quantity" NUMERIC NOT NULL,
  "quote_quantity" NUMERIC,
  "filled_quantity" NUMERIC DEFAULT 0 NOT NULL,
  "status" TEXT NOT NULL CHECK (status IN ('NEW', 'OPEN', 'FILLED', 'PARTIALLY_FILLED', 'CANCELED', 'REJECTED', 'EXPIRED')),
  "time_in_force" TEXT DEFAULT 'GTC' NOT NULL CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),
  "client_order_id" TEXT,
  "reason" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "closed_at" TIMESTAMP WITH TIME ZONE
);

-- Set up RLS for paper_trading_orders
ALTER TABLE "public"."paper_trading_orders" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for paper_trading_orders
CREATE POLICY "Users can view their own paper trading orders" 
  ON "public"."paper_trading_orders" 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own paper trading orders" 
  ON "public"."paper_trading_orders" 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own paper trading orders" 
  ON "public"."paper_trading_orders" 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Set up triggers for handling created_at and updated_at
CREATE TRIGGER handle_updated_at_paper_trading_orders
  BEFORE UPDATE ON "public"."paper_trading_orders"
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create table for paper trading positions
CREATE TABLE IF NOT EXISTS "public"."paper_trading_positions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "agent_id" UUID REFERENCES "public"."elizaos_agents"("id") ON DELETE SET NULL,
  "symbol" TEXT NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "entry_price" NUMERIC NOT NULL,
  "current_price" NUMERIC NOT NULL,
  "unrealized_pnl" NUMERIC NOT NULL,
  "realized_pnl" NUMERIC NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, agent_id, symbol)
);

-- Set up RLS for paper_trading_positions
ALTER TABLE "public"."paper_trading_positions" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for paper_trading_positions
CREATE POLICY "Users can view their own paper trading positions" 
  ON "public"."paper_trading_positions" 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own paper trading positions" 
  ON "public"."paper_trading_positions" 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own paper trading positions" 
  ON "public"."paper_trading_positions" 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own paper trading positions" 
  ON "public"."paper_trading_positions" 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Set up triggers for handling created_at and updated_at
CREATE TRIGGER handle_updated_at_paper_trading_positions
  BEFORE UPDATE ON "public"."paper_trading_positions"
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create table for paper trading trades
CREATE TABLE IF NOT EXISTS "public"."paper_trading_trades" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "public"."paper_trading_orders"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "agent_id" UUID REFERENCES "public"."elizaos_agents"("id") ON DELETE SET NULL,
  "symbol" TEXT NOT NULL,
  "side" TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  "price" NUMERIC NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "quote_quantity" NUMERIC NOT NULL,
  "fee" NUMERIC DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up RLS for paper_trading_trades
ALTER TABLE "public"."paper_trading_trades" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for paper_trading_trades
CREATE POLICY "Users can view their own paper trading trades" 
  ON "public"."paper_trading_trades" 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own paper trading trades" 
  ON "public"."paper_trading_trades" 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Add index on user_id and created_at for faster queries
CREATE INDEX idx_paper_trading_trades_user_created 
  ON "public"."paper_trading_trades" (user_id, created_at DESC);

--
-- PART 5: SCHEDULED JOBS
--

-- Create a scheduled job to update paper trading positions prices every 5 minutes
SELECT cron.schedule(
  'update-paper-positions',
  '*/5 * * * *',
  $$
    WITH latest_prices AS (
      -- In a real implementation, this would query a price feed table
      -- For now, we'll leave this as a placeholder
      SELECT 'BTC/USDT' as symbol, 50000 as price UNION
      SELECT 'ETH/USDT' as symbol, 2000 as price
    )
    UPDATE public.paper_trading_positions AS pos
    SET 
      current_price = lp.price,
      unrealized_pnl = (lp.price - pos.entry_price) * pos.quantity,
      updated_at = now()
    FROM latest_prices AS lp
    WHERE pos.symbol = lp.symbol;
  $$
);

-- Create a scheduled job to check for trading anomalies every 15 minutes
SELECT cron.schedule(
  'check-trading-anomalies',
  '*/15 * * * *',
  $$
    -- This would call a stored procedure to run trading anomaly checks
    -- For now, we'll leave this as a placeholder for future implementation
    -- CALL public.check_trading_anomalies();
  $$
);

--
-- PART 6: CRON JOBS MANAGEMENT TABLE
--

-- Create a table to manage optimization job processing
CREATE TABLE IF NOT EXISTS "public"."background_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "job_type" TEXT NOT NULL,
  "reference_id" UUID NOT NULL,
  "status" TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  "attempts" INTEGER DEFAULT 0 NOT NULL,
  "max_attempts" INTEGER DEFAULT 3 NOT NULL,
  "last_error" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "next_attempt_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up RLS for background_jobs
ALTER TABLE "public"."background_jobs" ENABLE ROW LEVEL SECURITY;

-- Only service role can access background_jobs
CREATE POLICY "Service role can manage background jobs" 
  ON "public"."background_jobs" 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Set up triggers for handling created_at and updated_at
CREATE TRIGGER handle_updated_at_background_jobs
  BEFORE UPDATE ON "public"."background_jobs"
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create index for job processing
CREATE INDEX idx_background_jobs_status_next_attempt 
  ON "public"."background_jobs" (status, next_attempt_at)
  WHERE status = 'pending';

--
-- PART 7: FUNCTIONS FOR PAPER TRADING
--

-- Function to reset paper trading account
CREATE OR REPLACE FUNCTION public.reset_paper_trading_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_exists BOOLEAN;
  v_configuration JSONB;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if account exists
  SELECT EXISTS(
    SELECT 1 FROM public.paper_trading_accounts WHERE user_id = p_user_id
  ) INTO v_account_exists;

  IF v_account_exists THEN
    -- Get existing configuration
    SELECT configuration INTO v_configuration 
    FROM public.paper_trading_accounts 
    WHERE user_id = p_user_id;

    -- Delete all related data
    DELETE FROM public.paper_trading_positions WHERE user_id = p_user_id;
    DELETE FROM public.paper_trading_orders WHERE user_id = p_user_id;
    
    -- Update account with initial balance
    UPDATE public.paper_trading_accounts
    SET 
      balances = v_configuration->'initialBalance',
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Paper trading account not found for user';
  END IF;

  RETURN TRUE;
END;
$$;

-- Add comments to functions
COMMENT ON FUNCTION public.reset_paper_trading_account IS 'Resets a paper trading account to initial state, clearing all positions and orders';

-- Grant access to the authenticated role
GRANT EXECUTE ON FUNCTION public.reset_paper_trading_account TO authenticated;

-- Function to check if a token balance is sufficient for an order
CREATE OR REPLACE FUNCTION public.paper_trading_check_balance(
  p_user_id UUID,
  p_symbol TEXT,
  p_side TEXT,
  p_quantity NUMERIC,
  p_price NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base_asset TEXT;
  v_quote_asset TEXT;
  v_balances JSONB;
  v_base_balance NUMERIC;
  v_quote_balance NUMERIC;
  v_required_amount NUMERIC;
BEGIN
  -- Extract base and quote assets from symbol
  v_base_asset := split_part(p_symbol, '/', 1);
  v_quote_asset := split_part(p_symbol, '/', 2);
  
  IF v_quote_asset = '' THEN
    v_quote_asset := 'USDT'; -- Default quote asset
  END IF;

  -- Get user's balances
  SELECT balances INTO v_balances
  FROM public.paper_trading_accounts
  WHERE user_id = p_user_id;

  IF v_balances IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get balances for the assets
  v_base_balance := COALESCE((v_balances->>v_base_asset)::NUMERIC, 0);
  v_quote_balance := COALESCE((v_balances->>v_quote_asset)::NUMERIC, 0);

  -- Check if balance is sufficient
  IF p_side = 'BUY' THEN
    v_required_amount := p_quantity * p_price;
    RETURN v_quote_balance >= v_required_amount;
  ELSE -- SELL
    RETURN v_base_balance >= p_quantity;
  END IF;
END;
$$;

-- Add comments to functions
COMMENT ON FUNCTION public.paper_trading_check_balance IS 'Checks if a user has sufficient balance for a paper trading order';

-- Grant access to the authenticated role
GRANT EXECUTE ON FUNCTION public.paper_trading_check_balance TO authenticated;
