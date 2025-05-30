-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trading Strategies Table
CREATE TABLE IF NOT EXISTS public.trading_strategies (
    strategy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parameters_schema JSONB, -- Schema for strategy-specific parameters
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.trading_strategies IS 'Stores definitions of available trading strategies.';
COMMENT ON COLUMN public.trading_strategies.parameters_schema IS 'JSON schema defining configurable parameters for the strategy.';

-- Trading Agents Table
CREATE TABLE IF NOT EXISTS public.trading_agents (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'paused', 'error', 'archived')),
    assigned_strategy_id UUID REFERENCES public.trading_strategies(strategy_id),
    configuration_parameters JSONB, -- Specific parameters for this agent instance, conforming to parameters_schema
    wallet_id UUID NOT NULL UNIQUE REFERENCES public.wallets(wallet_id) ON DELETE RESTRICT, -- Each agent must have a unique wallet
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.trading_agents IS 'Stores information about individual trading agents.';
COMMENT ON COLUMN public.trading_agents.wallet_id IS 'FK to the agent''s dedicated wallet in the Wallets table.';

-- Agent Trades Table
-- Drop existing table if it exists from old migrations to ensure clean slate
DROP TABLE IF EXISTS public.agent_trades CASCADE; 
CREATE TABLE public.agent_trades (
    trade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.trading_agents(agent_id) ON DELETE CASCADE,
    symbol TEXT NOT NULL, -- Trading pair, e.g., BTC/USD
    direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    quantity NUMERIC(36, 18) NOT NULL,
    entry_price NUMERIC(36, 18) NOT NULL,
    exit_price NUMERIC(36, 18),
    entry_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    exit_ts TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'pending_open', 'pending_close', 'failed', 'cancelled')),
    pnl NUMERIC(36, 18), -- Profit and Loss
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.agent_trades IS 'Records individual trades executed by trading agents.';

-- Agent Performance Logs Table
-- Drop existing table if it exists from old migrations
DROP TABLE IF EXISTS public.agent_performance_logs CASCADE;
DROP TABLE IF EXISTS public.agent_performance CASCADE; -- Also drop this if it was from old schema
CREATE TABLE public.agent_performance_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.trading_agents(agent_id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    metric_name TEXT NOT NULL, -- e.g., 'active_trades', 'cpu_usage', 'api_error_count', 'pnl_realized_1h'
    metric_value TEXT, -- Store as text to accommodate various value types, parse as needed in application
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.agent_performance_logs IS 'Stores time-series performance metrics and logs for trading agents.';

-- Market Data Settings Table
-- Drop existing table if it exists from old migrations
DROP TABLE IF EXISTS public.agent_market_data_subscriptions CASCADE; 
DROP TABLE IF EXISTS public.market_data_settings CASCADE;
CREATE TABLE public.market_data_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.trading_agents(agent_id) ON DELETE CASCADE,
    data_source TEXT NOT NULL, -- e.g., 'CoinMarketCap', 'Binance', 'LocalSim'
    symbol TEXT NOT NULL, -- Trading pair or market symbol
    update_frequency_seconds INT CHECK (update_frequency_seconds > 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (agent_id, data_source, symbol) -- Ensure one setting per agent/source/symbol
);
COMMENT ON TABLE public.market_data_settings IS 'Configuration for market data feeds used by trading agents.';

-- Triggers for updated_at (assuming trigger_set_timestamp function exists from vault migration)
CREATE TRIGGER set_trading_strategies_updated_at
BEFORE UPDATE ON public.trading_strategies
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_trading_agents_updated_at
BEFORE UPDATE ON public.trading_agents
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_agent_trades_updated_at
BEFORE UPDATE ON public.agent_trades
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

CREATE TRIGGER set_market_data_settings_updated_at
BEFORE UPDATE ON public.market_data_settings
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trading_agents_user_id ON public.trading_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_agents_status ON public.trading_agents(status);
CREATE INDEX IF NOT EXISTS idx_agent_trades_agent_id_symbol_status ON public.agent_trades(agent_id, symbol, status);
CREATE INDEX IF NOT EXISTS idx_agent_trades_entry_ts ON public.agent_trades(entry_ts);
CREATE INDEX IF NOT EXISTS idx_agent_performance_logs_agent_id_ts ON public.agent_performance_logs(agent_id, ts);
CREATE INDEX IF NOT EXISTS idx_market_data_settings_agent_id ON public.market_data_settings(agent_id);


-- RLS Policies

-- Trading Strategies: Publicly readable, service_role writable
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to trading strategies" ON public.trading_strategies FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to trading strategies" ON public.trading_strategies FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Trading Agents: Users manage their own agents. Service role for backend.
ALTER TABLE public.trading_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own trading agents" ON public.trading_agents
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow service_role full access to trading_agents" ON public.trading_agents FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Agent Trades: Users view trades of their agents. Service role for backend.
ALTER TABLE public.agent_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view trades of their own agents" ON public.agent_trades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trading_agents ta
      WHERE ta.agent_id = agent_trades.agent_id AND ta.user_id = auth.uid()
    )
  );
CREATE POLICY "Allow service_role full access to agent_trades" ON public.agent_trades FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- Agent Performance Logs: Users view logs of their agents. Service role for backend.
ALTER TABLE public.agent_performance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view performance logs of their own agents" ON public.agent_performance_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trading_agents ta
      WHERE ta.agent_id = agent_performance_logs.agent_id AND ta.user_id = auth.uid()
    )
  );
CREATE POLICY "Allow service_role full access to agent_performance_logs" ON public.agent_performance_logs FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Market Data Settings: Users manage settings for their agents. Service role for backend.
ALTER TABLE public.market_data_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage market data settings for their own agents" ON public.market_data_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trading_agents ta
      WHERE ta.agent_id = market_data_settings.agent_id AND ta.user_id = auth.uid()
    )
  );
CREATE POLICY "Allow service_role full access to market_data_settings" ON public.market_data_settings FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
