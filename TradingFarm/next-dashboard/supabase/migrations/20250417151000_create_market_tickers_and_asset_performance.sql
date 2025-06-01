-- Migration: Create market_tickers and asset_performance tables for dashboard
-- SECURITY INVOKER, search_path = ''

-- 1. Create market_tickers table
CREATE TABLE IF NOT EXISTS public.market_tickers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol text NOT NULL,
    price numeric NOT NULL,
    change_24h numeric NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Create asset_performance table
CREATE TABLE IF NOT EXISTS public.asset_performance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset text NOT NULL,
    performance_7d numeric NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Triggers for created_at and updated_at
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_created_at_market_tickers ON public.market_tickers;
CREATE TRIGGER set_created_at_market_tickers
  BEFORE INSERT ON public.market_tickers
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS set_updated_at_market_tickers ON public.market_tickers;
CREATE TRIGGER set_updated_at_market_tickers
  BEFORE UPDATE ON public.market_tickers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_created_at_asset_performance ON public.asset_performance;
CREATE TRIGGER set_created_at_asset_performance
  BEFORE INSERT ON public.asset_performance
  FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

DROP TRIGGER IF EXISTS set_updated_at_asset_performance ON public.asset_performance;
CREATE TRIGGER set_updated_at_asset_performance
  BEFORE UPDATE ON public.asset_performance
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. RLS and policies
ALTER TABLE public.market_tickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_performance ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'market_tickers') THEN
    EXECUTE 'CREATE POLICY "Allow read" ON public.market_tickers FOR SELECT USING (true);';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_performance') THEN
    EXECUTE 'CREATE POLICY "Allow read" ON public.asset_performance FOR SELECT USING (true);';
  END IF;
END$$;
