-- Portfolio Metrics Table
-- This table stores metrics related to trading portfolios and performance

CREATE TABLE IF NOT EXISTS public.portfolio_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id),
    farm_id UUID REFERENCES public.farms(id),
    agent_id UUID REFERENCES public.agents(id),
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    total_value DECIMAL(18, 8) NOT NULL,
    daily_pnl DECIMAL(18, 8) NOT NULL,
    daily_pnl_percentage DECIMAL(8, 4) NOT NULL,
    weekly_pnl DECIMAL(18, 8) NOT NULL,
    weekly_pnl_percentage DECIMAL(8, 4) NOT NULL,
    monthly_pnl DECIMAL(18, 8) NOT NULL,
    monthly_pnl_percentage DECIMAL(8, 4) NOT NULL,
    ytd_pnl DECIMAL(18, 8) NOT NULL,
    ytd_pnl_percentage DECIMAL(8, 4) NOT NULL,
    all_time_pnl DECIMAL(18, 8) NOT NULL,
    all_time_pnl_percentage DECIMAL(8, 4) NOT NULL,
    portfolio_allocation JSONB,
    risk_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookup by wallet_id
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_wallet_id ON public.portfolio_metrics(wallet_id);

-- Index for faster lookup by farm_id
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_farm_id ON public.portfolio_metrics(farm_id);

-- Index for faster lookup by agent_id
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_agent_id ON public.portfolio_metrics(agent_id);

-- Index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_date ON public.portfolio_metrics(date);

-- Sample data
INSERT INTO public.portfolio_metrics (
    wallet_id,
    farm_id,
    agent_id,
    date,
    total_value,
    daily_pnl,
    daily_pnl_percentage,
    weekly_pnl,
    weekly_pnl_percentage,
    monthly_pnl,
    monthly_pnl_percentage,
    ytd_pnl,
    ytd_pnl_percentage,
    all_time_pnl,
    all_time_pnl_percentage,
    portfolio_allocation,
    risk_metrics
) VALUES (
    -- Use some existing wallet_id, farm_id, agent_id from your database
    NULL, -- wallet_id
    NULL, -- farm_id
    NULL, -- agent_id
    now(),
    10000.00, -- total_value
    120.50, -- daily_pnl
    1.20, -- daily_pnl_percentage
    450.75, -- weekly_pnl
    4.50, -- weekly_pnl_percentage
    1200.25, -- monthly_pnl
    12.00, -- monthly_pnl_percentage
    3450.50, -- ytd_pnl
    34.50, -- ytd_pnl_percentage
    5250.75, -- all_time_pnl
    52.50, -- all_time_pnl_percentage
    '{"BTC": 45, "ETH": 30, "SOL": 15, "USD": 10}', -- portfolio_allocation
    '{"sharpe": 1.8, "sortino": 2.3, "maxDrawdown": 15.2, "volatility": 8.7}' -- risk_metrics
) ON CONFLICT DO NOTHING;
