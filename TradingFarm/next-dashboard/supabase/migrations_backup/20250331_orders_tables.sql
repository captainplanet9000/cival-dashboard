-- Migration: Orders Tables
-- This migration creates tables for storing orders and order history

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id BIGINT REFERENCES farms(id) ON DELETE SET NULL,
  agent_id BIGINT REFERENCES agents(id) ON DELETE SET NULL,
  exchange VARCHAR(50) NOT NULL,
  exchange_order_id VARCHAR(100),
  symbol VARCHAR(50) NOT NULL,
  side VARCHAR(10) NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  quantity DECIMAL(24, 8) NOT NULL,
  price DECIMAL(24, 8),
  status VARCHAR(20) NOT NULL,
  filled_quantity DECIMAL(24, 8) DEFAULT 0,
  avg_fill_price DECIMAL(24, 8),
  commission DECIMAL(24, 8),
  commission_asset VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add triggers for timestamps
CREATE TRIGGER handle_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own orders
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own orders
CREATE POLICY "Users can insert their own orders"
  ON orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own orders
CREATE POLICY "Users can update their own orders"
  ON orders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own orders
CREATE POLICY "Users can delete their own orders"
  ON orders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create order_history table for tracking order actions
CREATE TABLE IF NOT EXISTS order_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id BIGINT REFERENCES farms(id) ON DELETE SET NULL,
  agent_id BIGINT REFERENCES agents(id) ON DELETE SET NULL,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  exchange VARCHAR(50) NOT NULL,
  exchange_order_id VARCHAR(100),
  action_type VARCHAR(50) NOT NULL, -- place, cancel, modify, fill, fetch_active, fetch_history
  status VARCHAR(20) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add triggers for timestamps
CREATE TRIGGER handle_created_at_order_history
  BEFORE INSERT ON order_history
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_created_at();

-- Enable Row Level Security
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own order history
CREATE POLICY "Users can view their own order history"
  ON order_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own order history
CREATE POLICY "Users can insert their own order history"
  ON order_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create positions table to track active positions
CREATE TABLE IF NOT EXISTS positions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id BIGINT REFERENCES farms(id) ON DELETE SET NULL,
  agent_id BIGINT REFERENCES agents(id) ON DELETE SET NULL,
  exchange VARCHAR(50) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  position_size DECIMAL(24, 8) NOT NULL,
  entry_price DECIMAL(24, 8) NOT NULL,
  liquidation_price DECIMAL(24, 8),
  unrealized_pnl DECIMAL(24, 8),
  realized_pnl DECIMAL(24, 8),
  margin DECIMAL(24, 8),
  leverage DECIMAL(10, 2),
  status VARCHAR(20) NOT NULL, -- open, closed, liquidated
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Each user can only have one active position for a given exchange/symbol/farm
  UNIQUE(user_id, exchange, symbol, farm_id, status) WHERE status = 'open'
);

-- Add triggers for timestamps
CREATE TRIGGER handle_updated_at_positions
  BEFORE UPDATE ON positions
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own positions
CREATE POLICY "Users can view their own positions"
  ON positions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own positions
CREATE POLICY "Users can insert their own positions"
  ON positions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own positions
CREATE POLICY "Users can update their own positions"
  ON positions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own positions
CREATE POLICY "Users can delete their own positions"
  ON positions
  FOR DELETE
  USING (auth.uid() = user_id);
