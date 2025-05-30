-- Migration: 20250401_create_orders_table
-- Description: Creates the orders table with necessary fields and RLS policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function for handling created_at
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Function for handling updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
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
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for created_at
DROP TRIGGER IF EXISTS orders_created_at ON public.orders;
CREATE TRIGGER orders_created_at
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.orders
  FOR SELECT USING (true);
  
CREATE POLICY "Enable insert for all users" ON public.orders
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "Enable update for all users" ON public.orders
  FOR UPDATE USING (true);

-- Add comment
COMMENT ON TABLE public.orders IS 'Stores all trading orders for farms and agents';
