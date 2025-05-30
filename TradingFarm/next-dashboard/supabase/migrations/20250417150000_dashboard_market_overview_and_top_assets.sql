-- Migration: Dashboard Market Overview and Top Performing Assets
-- SECURITY INVOKER, search_path = ''
-- Functions for dashboard widgets

-- 1. get_market_overview: Returns symbol, price, 24h change
CREATE OR REPLACE FUNCTION public.get_market_overview()
RETURNS TABLE (
    symbol text,
    price numeric,
    change24h numeric
) 
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT
        m.symbol,
        m.price,
        m.change_24h as change24h
    FROM public.market_tickers m
    WHERE m.is_active = true
    ORDER BY m.symbol;
$$;

-- 2. get_top_performing_assets: Returns top N assets by 7-day performance
CREATE OR REPLACE FUNCTION public.get_top_performing_assets()
RETURNS TABLE (
    asset text,
    performance numeric
) 
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT
        p.asset,
        p.performance_7d as performance
    FROM public.asset_performance p
    ORDER BY p.performance_7d DESC
    LIMIT 5;
$$;

-- Enable RLS if not already enabled on market_tickers and asset_performance
ALTER TABLE public.market_tickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_performance ENABLE ROW LEVEL SECURITY;
-- Add basic RLS policies if needed (customize as required)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'market_tickers') THEN
    EXECUTE 'CREATE POLICY "Allow read" ON public.market_tickers FOR SELECT USING (true);';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_performance') THEN
    EXECUTE 'CREATE POLICY "Allow read" ON public.asset_performance FOR SELECT USING (true);';
  END IF;
END$$;
