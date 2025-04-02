
-- Creates the orders table and related functionality for the Trading Farm dashboard
-- This migration adds support for advanced order types including trailing stops

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id INTEGER REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES public.agents(id) ON DELETE SET NULL,
  exchange VARCHAR NOT NULL,
  exchange_account_id VARCHAR,
  symbol VARCHAR NOT NULL,
  order_type VARCHAR NOT NULL,
  side VARCHAR NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  trigger_price NUMERIC,
  trailing_percent NUMERIC,
  stop_price NUMERIC,
  status VARCHAR NOT NULL DEFAULT 'pending',
  external_id VARCHAR,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create created_at trigger
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'orders_updated_at_trigger'
  ) THEN
    CREATE TRIGGER orders_updated_at_trigger
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'orders_created_at_trigger'
  ) THEN
    CREATE TRIGGER orders_created_at_trigger
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();
  END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access to orders based on farm association
CREATE POLICY "Users can view their own farm's orders"
  ON public.orders
  FOR SELECT
  USING (
    farm_id IN (
      SELECT id FROM public.farms
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for inserting orders
CREATE POLICY "Users can insert orders for their farms"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT id FROM public.farms
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for updating orders
CREATE POLICY "Users can update their farm's orders"
  ON public.orders
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT id FROM public.farms
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for deleting orders
CREATE POLICY "Users can delete their farm's orders"
  ON public.orders
  FOR DELETE
  USING (
    farm_id IN (
      SELECT id FROM public.farms
      WHERE user_id = auth.uid()
    )
  );