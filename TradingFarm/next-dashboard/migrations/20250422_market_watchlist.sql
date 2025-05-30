-- Market Watchlist Table
-- This migration creates a table for storing user market watchlists
-- with proper RLS policies and timestamp management

-- Create the market_watchlist table
CREATE TABLE IF NOT EXISTS public.market_watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  exchange_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  display_name TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  UNIQUE (user_id, exchange_id, symbol)
);

-- Comment on table
COMMENT ON TABLE public.market_watchlist IS 'User-defined watchlists for market data';

-- Add timestamp triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.market_watchlist
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.market_watchlist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- 1. Users can only view their own watchlist items
CREATE POLICY "Users can view own watchlist items"
  ON public.market_watchlist FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can only insert their own watchlist items
CREATE POLICY "Users can insert own watchlist items"
  ON public.market_watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Users can only update their own watchlist items
CREATE POLICY "Users can update own watchlist items"
  ON public.market_watchlist FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Users can only delete their own watchlist items
CREATE POLICY "Users can delete own watchlist items"
  ON public.market_watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX market_watchlist_user_idx ON public.market_watchlist (user_id);
CREATE INDEX market_watchlist_symbol_idx ON public.market_watchlist (exchange_id, symbol);

-- Create function to reorder watchlist items
CREATE OR REPLACE FUNCTION public.reorder_watchlist_items(
  p_user_id UUID,
  p_item_ids UUID[]
)
RETURNS BOOLEAN
SECURITY INVOKER
SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
  item_id UUID;
  i INTEGER;
BEGIN
  -- Validate that all items belong to the user
  IF NOT (
    SELECT COUNT(*) = array_length(p_item_ids, 1)
    FROM public.market_watchlist
    WHERE user_id = p_user_id AND id = ANY(p_item_ids)
  ) THEN
    RAISE EXCEPTION 'Invalid item IDs or user does not own all items';
  END IF;
  
  -- Update display order for each item
  i := 0;
  FOREACH item_id IN ARRAY p_item_ids
  LOOP
    UPDATE public.market_watchlist
    SET display_order = i,
        updated_at = now()
    WHERE id = item_id;
    
    i := i + 1;
  END LOOP;
  
  RETURN TRUE;
END;
$$;
