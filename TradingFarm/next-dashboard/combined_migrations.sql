-- Combined Migrations for Trading Farm
-- Generated: 2025-04-01T21:44:15.421Z
-- Execute in Supabase SQL Editor

-- First create the migrations tracking table if not exists
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================
-- Migration: 20250401_fix_orders_table.sql
-- =========================================

BEGIN;

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


-- Record this migration
INSERT INTO _migrations (name)
VALUES ('20250401_fix_orders_table.sql')
ON CONFLICT (name) DO NOTHING;

COMMIT;


-- =========================================
-- Migration: 20250401_integrate_order_agent_commands.sql
-- =========================================

BEGIN;

-- Migration: 20250401_integrate_order_agent_commands
-- Description: Creates required tables for integrating orders with ElizaOS agents

-- Create agent_commands table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.agent_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  command_type TEXT NOT NULL,
  command_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_id UUID,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS agent_commands_updated_at ON public.agent_commands;
CREATE TRIGGER agent_commands_updated_at
BEFORE UPDATE ON public.agent_commands
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.agent_commands ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.agent_commands
  FOR SELECT USING (true);
  
CREATE POLICY "Enable insert for all users" ON public.agent_commands
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "Enable update for all users" ON public.agent_commands
  FOR UPDATE USING (true);

-- Create agent_responses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.agent_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL,
  command_id UUID,
  response_type TEXT NOT NULL,
  response_content TEXT NOT NULL,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS agent_responses_updated_at ON public.agent_responses;
CREATE TRIGGER agent_responses_updated_at
BEFORE UPDATE ON public.agent_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.agent_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.agent_responses
  FOR SELECT USING (true);
  
CREATE POLICY "Enable insert for all users" ON public.agent_responses
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "Enable update for all users" ON public.agent_responses
  FOR UPDATE USING (true);

-- Create knowledge_base table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS knowledge_base_updated_at ON public.knowledge_base;
CREATE TRIGGER knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.knowledge_base
  FOR SELECT USING (true);
  
CREATE POLICY "Enable insert for all users" ON public.knowledge_base
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "Enable update for all users" ON public.knowledge_base
  FOR UPDATE USING (true);

-- Add order_id to agent_commands for tracking order-related commands
ALTER TABLE public.agent_commands ADD COLUMN IF NOT EXISTS order_id UUID;

-- Add a function to create an order command for an agent
CREATE OR REPLACE FUNCTION public.create_order_command(
  agent_id_param INTEGER,
  order_id_param UUID,
  command_type_param TEXT,
  command_content_param TEXT,
  context_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  command_id UUID;
BEGIN
  INSERT INTO public.agent_commands (
    agent_id,
    order_id,
    command_type,
    command_content,
    status,
    context
  ) VALUES (
    agent_id_param,
    order_id_param,
    command_type_param,
    command_content_param,
    'pending',
    context_param
  )
  RETURNING id INTO command_id;
  
  RETURN command_id;
END;
$$;

-- Add indices to improve query performance
CREATE INDEX IF NOT EXISTS idx_agent_commands_agent_id ON public.agent_commands(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_order_id ON public.agent_commands(order_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_agent_id ON public.agent_responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_command_id ON public.agent_responses(command_id);

-- Add a trigger to automatically create a command when an order is created with an agent_id
CREATE OR REPLACE FUNCTION public.handle_new_order_command()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create a command if the order has an agent_id
  IF NEW.agent_id IS NOT NULL THEN
    PERFORM public.create_order_command(
      NEW.agent_id,
      NEW.id,
      'execute_order',
      format('Execute %s order for %s %s of %s on %s', 
             NEW.type, 
             NEW.side, 
             NEW.quantity, 
             NEW.symbol, 
             NEW.exchange),
      jsonb_build_object(
        'order_id', NEW.id,
        'order_type', NEW.type,
        'side', NEW.side,
        'quantity', NEW.quantity,
        'symbol', NEW.symbol,
        'exchange', NEW.exchange,
        'price', NEW.price,
        'time_in_force', NEW.time_in_force,
        'metadata', NEW.metadata
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create the trigger on orders table
DROP TRIGGER IF EXISTS orders_create_command ON public.orders;
CREATE TRIGGER orders_create_command
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_order_command();

COMMENT ON TABLE public.agent_commands IS 'Commands sent to ElizaOS agents';
COMMENT ON TABLE public.agent_responses IS 'Responses from ElizaOS agents';
COMMENT ON TABLE public.knowledge_base IS 'Knowledge base for ElizaOS agents';
COMMENT ON FUNCTION public.create_order_command IS 'Creates a command for an agent to execute an order';


-- Record this migration
INSERT INTO _migrations (name)
VALUES ('20250401_integrate_order_agent_commands.sql')
ON CONFLICT (name) DO NOTHING;

COMMIT;


-- =========================================
-- After running the migrations, generate TypeScript types:
-- =========================================
-- Run this command locally:
-- npx supabase gen types typescript --project-id bgvlzvswzpfoywfxehis > src/types/database.types.ts
