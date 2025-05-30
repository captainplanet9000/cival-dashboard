-- Market Data Table
-- This migration creates a time-series-like table for storing market data
-- from various exchanges with proper RLS policies and timestamp management

-- Create the market_data table
CREATE TABLE IF NOT EXISTS public.market_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exchange_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  bid DECIMAL(24, 8) NOT NULL,
  ask DECIMAL(24, 8) NOT NULL,
  last DECIMAL(24, 8) NOT NULL,
  high DECIMAL(24, 8) NOT NULL,
  low DECIMAL(24, 8) NOT NULL,
  base_volume DECIMAL(24, 8) NOT NULL,
  quote_volume DECIMAL(24, 8) NOT NULL,
  percent_change_24h DECIMAL(10, 2) NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comment on table
COMMENT ON TABLE public.market_data IS 'Stores historical market data from exchanges for analysis';

-- Add timestamp triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.market_data
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- All authenticated users can read market data (public information)
CREATE POLICY "Authenticated users can view market data"
  ON public.market_data FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the system service account can insert market data
CREATE POLICY "Only service account can insert market data"
  ON public.market_data FOR INSERT
  WITH CHECK (auth.uid() = '00000000-0000-0000-0000-000000000000' OR auth.jwt()->>'app_role' = 'service');

-- Create essential indexes for performance
-- Index for time-series queries
CREATE INDEX market_data_timestamp_idx ON public.market_data (timestamp DESC);

-- Index for symbol and exchange queries
CREATE INDEX market_data_symbol_exchange_idx ON public.market_data (exchange_id, symbol);

-- Index for timestamp range queries per symbol
CREATE INDEX market_data_symbol_timestamp_idx ON public.market_data (symbol, timestamp DESC);

-- Create a hypertable (if using TimescaleDB extension)
-- Uncomment this block if TimescaleDB is installed
/*
SELECT create_hypertable('public.market_data', 'timestamp', 
                         chunk_time_interval => INTERVAL '1 day',
                         if_not_exists => TRUE);
*/

-- Create a function to get latest market data for a symbol
CREATE OR REPLACE FUNCTION public.get_latest_market_data(
  p_exchange_id TEXT,
  p_symbol TEXT
)
RETURNS TABLE (
  exchange_id TEXT,
  symbol TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  bid DECIMAL(24, 8),
  ask DECIMAL(24, 8),
  last DECIMAL(24, 8),
  high DECIMAL(24, 8),
  low DECIMAL(24, 8),
  base_volume DECIMAL(24, 8),
  quote_volume DECIMAL(24, 8),
  percent_change_24h DECIMAL(10, 2)
)
SECURITY INVOKER
SET search_path = '';
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    md.exchange_id,
    md.symbol,
    md.timestamp,
    md.bid,
    md.ask,
    md.last,
    md.high,
    md.low,
    md.base_volume,
    md.quote_volume,
    md.percent_change_24h
  FROM public.market_data md
  WHERE md.exchange_id = p_exchange_id
    AND md.symbol = p_symbol
  ORDER BY md.timestamp DESC
  LIMIT 1;
END;
$$;

-- Create a function to get market data for a symbol in a time range
CREATE OR REPLACE FUNCTION public.get_market_data_range(
  p_exchange_id TEXT,
  p_symbol TEXT,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_interval TEXT DEFAULT '1h'
)
RETURNS TABLE (
  timestamp TIMESTAMP WITH TIME ZONE,
  open DECIMAL(24, 8),
  high DECIMAL(24, 8),
  low DECIMAL(24, 8),
  close DECIMAL(24, 8),
  volume DECIMAL(24, 8)
)
SECURITY INVOKER
SET search_path = '';
LANGUAGE plpgsql AS $$
BEGIN
  -- For standard intervals, use time bucket
  RETURN QUERY
  SELECT 
    time_bucket(p_interval::interval, md.timestamp) AS timestamp,
    first(md.last, md.timestamp) AS open,
    max(md.high) AS high,
    min(md.low) AS low,
    last(md.last, md.timestamp) AS close,
    sum(md.base_volume) AS volume
  FROM public.market_data md
  WHERE md.exchange_id = p_exchange_id
    AND md.symbol = p_symbol
    AND md.timestamp >= p_start_time
    AND md.timestamp <= p_end_time
  GROUP BY 1
  ORDER BY 1;
  
  -- Note: If TimescaleDB is not installed, replace the above query with a standard
  -- PostgreSQL date_trunc-based query for time bucketing
END;
$$;
