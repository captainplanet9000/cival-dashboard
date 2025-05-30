-- Migration for Active Trading Pairs Table
-- This migration adds support for tracking which trading pairs are actively monitored

-- Create active_trading_pairs table
CREATE TABLE IF NOT EXISTS public.active_trading_pairs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  exchange_credential_id BIGINT NOT NULL REFERENCES public.exchange_credentials(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  min_order_size FLOAT,
  price_precision INTEGER,
  quantity_precision INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add a unique constraint on user, exchange credential, and symbol
  UNIQUE(user_id, exchange_credential_id, symbol)
);

-- Enable Row Level Security
ALTER TABLE public.active_trading_pairs ENABLE ROW LEVEL SECURITY;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS handle_active_trading_pairs_updated_at ON public.active_trading_pairs;

-- Create triggers for updated_at timestamp
CREATE TRIGGER handle_active_trading_pairs_updated_at
BEFORE UPDATE ON public.active_trading_pairs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own active trading pairs" ON public.active_trading_pairs;
DROP POLICY IF EXISTS "Users can insert their own active trading pairs" ON public.active_trading_pairs;
DROP POLICY IF EXISTS "Users can update their own active trading pairs" ON public.active_trading_pairs;
DROP POLICY IF EXISTS "Users can delete their own active trading pairs" ON public.active_trading_pairs;

-- Create RLS policies for active_trading_pairs
CREATE POLICY "Users can view their own active trading pairs"
  ON public.active_trading_pairs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own active trading pairs"
  ON public.active_trading_pairs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own active trading pairs"
  ON public.active_trading_pairs
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own active trading pairs"
  ON public.active_trading_pairs
  FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for faster lookups on commonly queried columns
DO $$
BEGIN
  -- Check if active_trading_pairs table exists before creating indexes
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'active_trading_pairs') THEN
    -- Create index for user_id column if it exists
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'active_trading_pairs' 
              AND column_name = 'user_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_active_trading_pairs_user_id') THEN
        CREATE INDEX idx_active_trading_pairs_user_id ON public.active_trading_pairs(user_id);
      END IF;
    END IF;
    
    -- Create index for symbol column if it exists
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'active_trading_pairs' 
              AND column_name = 'symbol') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_active_trading_pairs_symbol') THEN
        CREATE INDEX idx_active_trading_pairs_symbol ON public.active_trading_pairs(symbol);
      END IF;
    END IF;
    
    -- Create index for exchange_credential_id column
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'active_trading_pairs' 
              AND column_name = 'exchange_credential_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_active_trading_pairs_exchange_credential_id') THEN
        CREATE INDEX idx_active_trading_pairs_exchange_credential_id ON public.active_trading_pairs(exchange_credential_id);
      END IF;
    END IF;
  END IF;
END
$$;
