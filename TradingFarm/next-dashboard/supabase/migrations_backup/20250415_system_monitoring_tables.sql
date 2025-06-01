-- Migration for system monitoring and logging
-- April 15, 2025

-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

--
-- PART 1: SYSTEM METRICS
--

-- Create table for system metrics
CREATE TABLE IF NOT EXISTS "public"."system_metrics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "cpu_usage" NUMERIC NOT NULL,
  "memory_usage" NUMERIC NOT NULL,
  "active_connections" INTEGER NOT NULL,
  "api_requests_per_minute" INTEGER NOT NULL,
  "websocket_connections" INTEGER NOT NULL,
  "database_query_time_ms" NUMERIC NOT NULL,
  "active_trading_agents" INTEGER NOT NULL,
  "pending_orders" INTEGER NOT NULL,
  "order_execution_time_ms" NUMERIC NOT NULL,
  "system_errors" INTEGER NOT NULL
);

-- Add index on timestamp for faster time series queries
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp 
  ON "public"."system_metrics" (timestamp DESC);

-- Set up RLS for system_metrics
ALTER TABLE "public"."system_metrics" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system_metrics
CREATE POLICY "Only admins can view system metrics" 
  ON "public"."system_metrics" 
  FOR SELECT 
  USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM "public"."user_roles" 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Service role can insert system metrics" 
  ON "public"."system_metrics" 
  FOR INSERT 
  WITH CHECK (true);

--
-- PART 2: SERVICE STATUS
--

-- Create table for service status
CREATE TABLE IF NOT EXISTS "public"."service_statuses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "service_name" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'down')),
  "last_check" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "response_time_ms" NUMERIC NOT NULL,
  "error_rate" NUMERIC NOT NULL,
  "details" JSONB
);

-- Add indexes for service status queries
CREATE INDEX IF NOT EXISTS idx_service_statuses_service_lastcheck 
  ON "public"."service_statuses" (service_name, last_check DESC);

CREATE INDEX IF NOT EXISTS idx_service_statuses_status 
  ON "public"."service_statuses" (status, last_check DESC);

-- Set up RLS for service_statuses
ALTER TABLE "public"."service_statuses" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service_statuses
CREATE POLICY "Only admins can view service statuses" 
  ON "public"."service_statuses" 
  FOR SELECT 
  USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM "public"."user_roles" 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Service role can insert service statuses" 
  ON "public"."service_statuses" 
  FOR INSERT 
  WITH CHECK (true);

--
-- PART 3: SYSTEM LOGS
--

-- Create table for system logs
CREATE TABLE IF NOT EXISTS "public"."system_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "level" TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
  "category" TEXT NOT NULL CHECK (category IN ('system', 'trading', 'exchange', 'agent', 'user', 'api', 'security', 'database', 'performance')),
  "message" TEXT NOT NULL,
  "context" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "correlation_id" TEXT,
  "user_id" UUID REFERENCES "auth"."users"("id") ON DELETE SET NULL,
  "agent_id" UUID REFERENCES "public"."elizaos_agents"("id") ON DELETE SET NULL
);

-- Add indexes for log queries
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp 
  ON "public"."system_logs" (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_level 
  ON "public"."system_logs" (level, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_category 
  ON "public"."system_logs" (category, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_correlation 
  ON "public"."system_logs" (correlation_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_user 
  ON "public"."system_logs" (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_agent 
  ON "public"."system_logs" (agent_id, timestamp DESC);

-- Set up RLS for system_logs
ALTER TABLE "public"."system_logs" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system_logs
CREATE POLICY "Users can view their own logs" 
  ON "public"."system_logs" 
  FOR SELECT 
  USING (user_id = auth.uid() OR auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM "public"."user_roles" 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Service role can insert logs" 
  ON "public"."system_logs" 
  FOR INSERT 
  WITH CHECK (true);

--
-- PART 4: TRADING PERFORMANCE STATS
--

-- Create table for trading performance statistics
CREATE TABLE IF NOT EXISTS "public"."trading_performance_stats" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "user_id" UUID REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "agent_id" UUID REFERENCES "public"."elizaos_agents"("id") ON DELETE CASCADE,
  "timeframe" TEXT NOT NULL CHECK (timeframe IN ('1h', '1d', '1w', '1m', 'all')),
  "trade_count" INTEGER NOT NULL,
  "win_count" INTEGER NOT NULL,
  "loss_count" INTEGER NOT NULL,
  "win_rate" NUMERIC NOT NULL,
  "profit_loss" NUMERIC NOT NULL,
  "volume" NUMERIC NOT NULL,
  "avg_trade_size" NUMERIC NOT NULL,
  "largest_win" NUMERIC NOT NULL,
  "largest_loss" NUMERIC NOT NULL,
  "sharpe_ratio" NUMERIC,
  "drawdown" NUMERIC,
  "details" JSONB
);

-- Add indexes for performance stats
CREATE INDEX IF NOT EXISTS idx_trading_performance_user_timeframe 
  ON "public"."trading_performance_stats" (user_id, timeframe, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_trading_performance_agent_timeframe 
  ON "public"."trading_performance_stats" (agent_id, timeframe, timestamp DESC);

-- Set up RLS for trading_performance_stats
ALTER TABLE "public"."trading_performance_stats" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trading_performance_stats
CREATE POLICY "Users can view their own performance stats" 
  ON "public"."trading_performance_stats" 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert performance stats" 
  ON "public"."trading_performance_stats" 
  FOR INSERT 
  WITH CHECK (true);

--
-- PART 5: SCHEDULED JOBS
--

-- Schedule periodic calculation of performance stats
SELECT cron.schedule(
  'calculate-performance-stats',
  '0 * * * *', -- Run hourly
  $$
    -- Insert hourly stats
    INSERT INTO public.trading_performance_stats (
      user_id, 
      agent_id, 
      timeframe, 
      trade_count, 
      win_count, 
      loss_count, 
      win_rate, 
      profit_loss, 
      volume, 
      avg_trade_size, 
      largest_win, 
      largest_loss, 
      details
    )
    WITH recent_trades AS (
      SELECT 
        user_id,
        agent_id,
        COUNT(*) as trade_count,
        COUNT(*) FILTER (WHERE profit_loss > 0) as win_count,
        COUNT(*) FILTER (WHERE profit_loss <= 0) as loss_count,
        COALESCE(SUM(profit_loss), 0) as total_profit_loss,
        COALESCE(SUM(price * quantity), 0) as total_volume,
        COALESCE(MAX(profit_loss) FILTER (WHERE profit_loss > 0), 0) as max_win,
        COALESCE(MIN(profit_loss) FILTER (WHERE profit_loss < 0), 0) as max_loss
      FROM 
        public.trading_agent_trades
      WHERE 
        created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY 
        user_id, agent_id
    )
    SELECT
      user_id,
      agent_id,
      '1h' as timeframe,
      trade_count,
      win_count,
      loss_count,
      CASE WHEN trade_count > 0 THEN (win_count::NUMERIC / trade_count) * 100 ELSE 0 END as win_rate,
      total_profit_loss as profit_loss,
      total_volume as volume,
      CASE WHEN trade_count > 0 THEN total_volume / trade_count ELSE 0 END as avg_trade_size,
      max_win as largest_win,
      max_loss as largest_loss,
      jsonb_build_object(
        'period_start', NOW() - INTERVAL '1 hour',
        'period_end', NOW()
      ) as details
    FROM
      recent_trades
    WHERE
      trade_count > 0;
  $$
);

-- Schedule a daily cleanup of old metrics data
SELECT cron.schedule(
  'cleanup-old-metrics',
  '0 3 * * *', -- Run at 3:00 AM every day
  $$
    -- Delete system metrics older than 30 days
    DELETE FROM public.system_metrics
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Delete service statuses older than 30 days
    DELETE FROM public.service_statuses
    WHERE last_check < NOW() - INTERVAL '30 days';
    
    -- Delete debug and info logs older than 7 days
    DELETE FROM public.system_logs
    WHERE 
      level IN ('debug', 'info') AND 
      timestamp < NOW() - INTERVAL '7 days';
      
    -- Delete warning logs older than 30 days
    DELETE FROM public.system_logs
    WHERE 
      level = 'warning' AND 
      timestamp < NOW() - INTERVAL '30 days';
      
    -- Keep error and critical logs for 90 days
    DELETE FROM public.system_logs
    WHERE 
      level IN ('error', 'critical') AND 
      timestamp < NOW() - INTERVAL '90 days';
  $$
);

--
-- PART 6: ADMIN ROLE MANAGEMENT
--

-- Create table for user roles if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."user_roles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK (role IN ('admin', 'support', 'analyst')),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Set up triggers for handling created_at and updated_at
CREATE TRIGGER handle_updated_at_user_roles
  BEFORE UPDATE ON "public"."user_roles"
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Set up RLS for user_roles
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
CREATE POLICY "Only admins can manage roles" 
  ON "public"."user_roles" 
  FOR ALL 
  USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM "public"."user_roles" 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can view their own roles" 
  ON "public"."user_roles" 
  FOR SELECT 
  USING (user_id = auth.uid());

--
-- PART 7: FUNCTIONS FOR MONITORING
--

-- Function to get system health summary
CREATE OR REPLACE FUNCTION public.get_system_health_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'overall_status', COALESCE(
      (SELECT 
        CASE 
          WHEN EXISTS (SELECT 1 FROM public.service_statuses WHERE status = 'down' AND last_check > NOW() - INTERVAL '1 hour') THEN 'critical'
          WHEN EXISTS (SELECT 1 FROM public.service_statuses WHERE status = 'degraded' AND last_check > NOW() - INTERVAL '1 hour') THEN 'warning'
          ELSE 'healthy'
        END
      ), 
      'unknown'
    ),
    'metrics', (
      SELECT jsonb_build_object(
        'cpu_usage', COALESCE(cpu_usage, 0),
        'memory_usage', COALESCE(memory_usage, 0),
        'active_trading_agents', COALESCE(active_trading_agents, 0),
        'api_requests_per_minute', COALESCE(api_requests_per_minute, 0),
        'system_errors', COALESCE(system_errors, 0)
      )
      FROM public.system_metrics
      ORDER BY timestamp DESC
      LIMIT 1
    ),
    'services', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', service_name,
          'status', status,
          'response_time', response_time_ms,
          'last_checked', last_check
        )
      )
      FROM (
        SELECT DISTINCT ON (service_name) 
          service_name, 
          status, 
          response_time_ms,
          last_check
        FROM public.service_statuses
        ORDER BY service_name, last_check DESC
      ) recent_statuses
    ),
    'recent_errors', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'timestamp', timestamp,
          'category', category,
          'message', message
        )
      )
      FROM (
        SELECT timestamp, category, message
        FROM public.system_logs
        WHERE level IN ('error', 'critical')
        ORDER BY timestamp DESC
        LIMIT 5
      ) recent_errors
    ),
    'updated_at', NOW()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Add comments to functions
COMMENT ON FUNCTION public.get_system_health_summary IS 'Get a summary of system health including metrics, service statuses, and recent errors';

-- Grant access to the authenticated role
GRANT EXECUTE ON FUNCTION public.get_system_health_summary TO authenticated;
