-- Trading Farm Database Initialization Script
-- This script runs on container startup to set up database triggers and functions

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for text search

-- Create TimescaleDB extension if available (uncomment if using TimescaleDB)
-- CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- Create handle_created_at function
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = (now() at time zone 'utc');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Create handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (now() at time zone 'utc');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Create the auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create missing tables needed for the integration

-- Create bridges table for LayerZero integration
CREATE TABLE IF NOT EXISTS public.bridges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_chain_id INTEGER NOT NULL,
  to_chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create command_history table
CREATE TABLE IF NOT EXISTS public.command_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  command TEXT NOT NULL,
  response TEXT,
  farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create missing RPCs for dashboard queries

-- Create get_market_overview RPC
CREATE OR REPLACE FUNCTION public.get_market_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- For now, return mock data
  RETURN json_build_object(
    'btc_price', 62345.67,
    'eth_price', 3456.78,
    'total_volume_24h', 123456789.12,
    'market_cap', 1234567890123.45,
    'top_gainers', json_build_array(
      json_build_object('symbol', 'SOL/USD', 'change_24h', 5.67),
      json_build_object('symbol', 'AVAX/USD', 'change_24h', 4.21),
      json_build_object('symbol', 'ATOM/USD', 'change_24h', 3.45)
    ),
    'top_losers', json_build_array(
      json_build_object('symbol', 'DOGE/USD', 'change_24h', -2.34),
      json_build_object('symbol', 'SHIB/USD', 'change_24h', -1.78),
      json_build_object('symbol', 'DOT/USD', 'change_24h', -1.23)
    )
  );
END;
$$;

-- Create get_top_performing_assets RPC
CREATE OR REPLACE FUNCTION public.get_top_performing_assets()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- For now, return mock data
  RETURN json_build_array(
    json_build_object('symbol', 'BTC/USD', 'price', 62345.67, 'change_24h', 2.34),
    json_build_object('symbol', 'ETH/USD', 'price', 3456.78, 'change_24h', 1.23),
    json_build_object('symbol', 'SOL/USD', 'price', 123.45, 'change_24h', 5.67),
    json_build_object('symbol', 'AVAX/USD', 'price', 34.56, 'change_24h', 4.21),
    json_build_object('symbol', 'ATOM/USD', 'price', 12.34, 'change_24h', 3.45)
  );
END;
$$;

-- Create default triggers for all tables that need timestamp management
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN (
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  )
  LOOP
    -- Check if the table has created_at column
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_name 
      AND column_name = 'created_at'
    ) THEN
      -- Create trigger only if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = table_name || '_handle_created_at'
      ) THEN
        EXECUTE format('
          CREATE TRIGGER %I
          BEFORE INSERT ON public.%I
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_created_at();
        ', table_name || '_handle_created_at', table_name);
      END IF;
    END IF;
    
    -- Check if the table has updated_at column
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_name 
      AND column_name = 'updated_at'
    ) THEN
      -- Create trigger only if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = table_name || '_handle_updated_at'
      ) THEN
        EXECUTE format('
          CREATE TRIGGER %I
          BEFORE UPDATE ON public.%I
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_updated_at();
        ', table_name || '_handle_updated_at', table_name);
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Create RLS policies for the new tables
DO $$
BEGIN
  -- Enable RLS on bridges table
  ALTER TABLE public.bridges ENABLE ROW LEVEL SECURITY;

  -- Create policy for bridges table
  CREATE POLICY bridges_select_policy 
  ON public.bridges 
  FOR SELECT
  USING (
    (farm_id IS NULL) OR -- public bridges
    (farm_id IN (
      SELECT farm_id 
      FROM public.farm_users 
      WHERE user_id = auth.uid()
    ))
  );

  -- Enable RLS on command_history table
  ALTER TABLE public.command_history ENABLE ROW LEVEL SECURITY;

  -- Create policy for command_history table
  CREATE POLICY command_history_select_policy 
  ON public.command_history 
  FOR SELECT
  USING (
    user_id = auth.uid() OR -- user's own commands
    (farm_id IS NOT NULL AND farm_id IN (
      SELECT farm_id 
      FROM public.farm_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );
EXCEPTION
  -- Ignore errors if the tables don't exist yet
  WHEN undefined_table THEN
    NULL;
END;
$$;
