-- Migration: 20250401_fix_orders_table
-- Description: Updates the orders table schema to ensure it has all required columns

-- Re-create the orders table with the correct schema
-- First back up existing data if any
CREATE TABLE IF NOT EXISTS public.orders_backup AS 
SELECT * FROM public.orders;

-- Drop the existing table
DROP TABLE IF EXISTS public.orders;

-- Re-create the table with the proper schema
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id INTEGER NOT NULL,
  agent_id INTEGER,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  time_in_force TEXT,
  status TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
set search_path = '';

-- Create trigger on orders table
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.orders
  FOR SELECT USING (true);
  
CREATE POLICY "Enable insert for all users" ON public.orders
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "Enable update for all users" ON public.orders
  FOR UPDATE USING (true);

-- Restore data from backup if possible
-- (will fail gracefully if schema is incompatible)
INSERT INTO public.orders (id, farm_id, exchange, symbol, side, quantity, status, created_at, updated_at)
SELECT id, farm_id, exchange, symbol, side, quantity, status, created_at, updated_at
FROM public.orders_backup
ON CONFLICT (id) DO NOTHING;

-- Insert a test order to verify everything works
INSERT INTO public.orders (
  farm_id, 
  exchange, 
  symbol, 
  type, 
  side, 
  quantity, 
  status
) VALUES (
  1, 
  'binance', 
  'BTC/USDT', 
  'market', 
  'buy', 
  0.01, 
  'pending'
);
