-- Migration: Market Data Cache
-- This migration creates a table for caching market data to reduce external API usage

-- Create market_data_cache table
CREATE TABLE IF NOT EXISTS market_data_cache (
  id BIGSERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookups by cache key
CREATE INDEX IF NOT EXISTS market_data_cache_key_idx ON market_data_cache (cache_key);

-- Add index for easier cleanup of expired cache entries
CREATE INDEX IF NOT EXISTS market_data_expires_idx ON market_data_cache (expires_at);

-- Add triggers for timestamps
CREATE TRIGGER handle_updated_at_market_data_cache
  BEFORE UPDATE ON market_data_cache
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Setup function for automatic cleanup of expired market data cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_market_data_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM market_data_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run the cleanup function every hour
-- Note: This requires pg_cron extension to be enabled in Supabase
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'market-data-cache-cleanup',
      '0 * * * *', -- Every hour
      $$SELECT cleanup_expired_market_data_cache()$$
    );
  END IF;
END $$;

-- No RLS policies needed since this is just a cache table used by the system
-- but we'll implement a simple policy to prevent unauthorized access

-- Enable Row Level Security
ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read from the cache
CREATE POLICY "Public market data cache access"
  ON market_data_cache
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the service account can modify the cache
CREATE POLICY "Service can update market data cache"
  ON market_data_cache
  FOR ALL
  USING (auth.uid() = service_role());
