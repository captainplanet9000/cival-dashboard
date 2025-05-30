-- Migration for Market Data Table
-- This migration adds support for storing real-time and historical market data

-- Create market_data table for storing price information
CREATE TABLE IF NOT EXISTS public.market_data (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  last_price FLOAT NOT NULL,
  bid_price FLOAT,
  ask_price FLOAT,
  high_24h FLOAT,
  low_24h FLOAT,
  volume_24h FLOAT,
  price_change_percent FLOAT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add a unique constraint on symbol for upsert operations
  UNIQUE(symbol)
);

-- Create historical_market_data table for storing historical price snapshots
CREATE TABLE IF NOT EXISTS public.historical_market_data (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  last_price FLOAT NOT NULL,
  bid_price FLOAT,
  ask_price FLOAT, 
  high_24h FLOAT,
  low_24h FLOAT,
  volume_24h FLOAT,
  price_change_percent FLOAT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Index for efficient time-series queries
  -- We frequently query by symbol and time range
  CONSTRAINT historical_market_data_period CHECK (
    EXTRACT(MINUTE FROM timestamp) = 0
  )
);

-- Enable Row Level Security
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_market_data ENABLE ROW LEVEL SECURITY;

-- Drop existing triggers if they exist to make migration idempotent
DROP TRIGGER IF EXISTS handle_market_data_updated_at ON public.market_data;
DROP TRIGGER IF EXISTS archive_market_data_trigger ON public.market_data;

-- Create triggers for updated_at timestamp
CREATE TRIGGER handle_market_data_updated_at
BEFORE UPDATE ON public.market_data
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create a trigger to archive market data hourly
CREATE OR REPLACE FUNCTION public.archive_market_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Archive the data only at the start of each hour
  IF EXTRACT(MINUTE FROM NEW.timestamp) = 0 AND EXTRACT(SECOND FROM NEW.timestamp) < 10 THEN
    INSERT INTO public.historical_market_data (
      symbol, last_price, bid_price, ask_price, 
      high_24h, low_24h, volume_24h, price_change_percent, timestamp
    ) VALUES (
      NEW.symbol, NEW.last_price, NEW.bid_price, NEW.ask_price,
      NEW.high_24h, NEW.low_24h, NEW.volume_24h, NEW.price_change_percent, NEW.timestamp
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Register the archive trigger
CREATE TRIGGER archive_market_data_trigger
AFTER INSERT OR UPDATE ON public.market_data
FOR EACH ROW
EXECUTE FUNCTION public.archive_market_data();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Market data is viewable by all authenticated users" ON public.market_data;
DROP POLICY IF EXISTS "Historical market data is viewable by all authenticated users" ON public.historical_market_data;

-- Create RLS policies for market_data
CREATE POLICY "Market data is viewable by all authenticated users"
  ON public.market_data
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create RLS policies for historical_market_data  
CREATE POLICY "Historical market data is viewable by all authenticated users"
  ON public.historical_market_data
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create indexes for faster lookups on commonly queried columns
DO $$
BEGIN
  -- Check if market_data table exists before creating indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'market_data') THEN
    -- Create index for symbol column if it exists
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'market_data' 
              AND column_name = 'symbol') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_market_data_symbol') THEN
        CREATE INDEX idx_market_data_symbol ON public.market_data(symbol);
      END IF;
    END IF;
  END IF;
  
  -- Check if historical_market_data table exists before creating indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'historical_market_data') THEN
    -- Create index for symbol column if it exists
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'historical_market_data' 
              AND column_name = 'symbol') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_historical_market_data_symbol') THEN
        CREATE INDEX idx_historical_market_data_symbol ON public.historical_market_data(symbol);
      END IF;
    END IF;
    
    -- Create index for timestamp column if it exists
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'historical_market_data' 
              AND column_name = 'timestamp') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_historical_market_data_timestamp') THEN
        CREATE INDEX idx_historical_market_data_timestamp ON public.historical_market_data(timestamp);
      END IF;
    END IF;
    
    -- Create composite index for symbol and timestamp
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'historical_market_data' 
              AND column_name = 'symbol') AND
       EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'historical_market_data' 
              AND column_name = 'timestamp') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_historical_market_data_symbol_timestamp') THEN
        CREATE INDEX idx_historical_market_data_symbol_timestamp ON public.historical_market_data(symbol, timestamp);
      END IF;
    END IF;
  END IF;
END
$$;
