-- Migration: 20250401_eliza_integration_only
-- Description: Adds ElizaOS integration to existing orders table without dropping/recreating it

-- If running in transaction, ensure we have handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create agent_commands table (essential for order-agent communication)
CREATE TABLE IF NOT EXISTS public.agent_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL REFERENCES public.agents(id),
  command_type TEXT NOT NULL,
  command_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_id UUID,
  context JSONB DEFAULT '{}'::jsonb,
  order_id INTEGER REFERENCES public.orders(id), -- Check actual data type in your database
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

-- Create policies with IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_commands' 
        AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.agent_commands
        FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_commands' 
        AND policyname = 'Enable insert for all users'
    ) THEN
        CREATE POLICY "Enable insert for all users" ON public.agent_commands
        FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_commands' 
        AND policyname = 'Enable update for all users'
    ) THEN
        CREATE POLICY "Enable update for all users" ON public.agent_commands
        FOR UPDATE USING (true);
    END IF;
END $$;

-- Create agent_responses table
CREATE TABLE IF NOT EXISTS public.agent_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id INTEGER NOT NULL REFERENCES public.agents(id),
  command_id UUID REFERENCES public.agent_commands(id),
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

-- Create policies with IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_responses' 
        AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.agent_responses
        FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_responses' 
        AND policyname = 'Enable insert for all users'
    ) THEN
        CREATE POLICY "Enable insert for all users" ON public.agent_responses
        FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_responses' 
        AND policyname = 'Enable update for all users'
    ) THEN
        CREATE POLICY "Enable update for all users" ON public.agent_responses
        FOR UPDATE USING (true);
    END IF;
END $$;

-- Create knowledge_base table
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

-- Create policies with IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'knowledge_base' 
        AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.knowledge_base
        FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'knowledge_base' 
        AND policyname = 'Enable insert for all users'
    ) THEN
        CREATE POLICY "Enable insert for all users" ON public.knowledge_base
        FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'knowledge_base' 
        AND policyname = 'Enable update for all users'
    ) THEN
        CREATE POLICY "Enable update for all users" ON public.knowledge_base
        FOR UPDATE USING (true);
    END IF;
END $$;

-- Check if orders table has agent_id column, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'agent_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN agent_id INTEGER;
    END IF;
END $$;

-- Drop existing create_order_command function if it exists (with any signature)
DO $$
BEGIN
    -- Drop all versions of the function with any parameter list
    DROP FUNCTION IF EXISTS public.create_order_command(INTEGER, UUID, TEXT, TEXT, JSONB);
    DROP FUNCTION IF EXISTS public.create_order_command(INTEGER, INTEGER, TEXT, TEXT, JSONB);
    DROP FUNCTION IF EXISTS public.create_order_command(INTEGER, BIGINT, TEXT, TEXT, JSONB);
    
    -- In case there are other signatures, try to drop them all using a more generic approach
    EXECUTE (
        SELECT string_agg('DROP FUNCTION IF EXISTS ' || p.oid::regprocedure, '; ')
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'create_order_command'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if function doesn't exist or if the approach fails
        RAISE NOTICE 'Dropping function failed: %', SQLERRM;
END $$;

-- Add a function to create an order command for an agent
CREATE OR REPLACE FUNCTION public.create_order_command_v2(
  agent_id_param INTEGER,
  order_id_param INTEGER, -- Matches the order_id column type
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

-- Drop existing trigger function before recreating
DROP FUNCTION IF EXISTS public.handle_new_order_command() CASCADE;

-- Add a trigger to automatically create a command when an order is created with an agent_id
CREATE OR REPLACE FUNCTION public.handle_new_order_command()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create a command if the order has an agent_id
  IF NEW.agent_id IS NOT NULL THEN
    -- Get the actual column name for order type from the database
    PERFORM public.create_order_command_v2(
      NEW.agent_id,
      NEW.id,
      'execute_order',
      format('Execute order for %s %s of %s on %s', 
             NEW.side, 
             NEW.quantity, 
             NEW.symbol, 
             NEW.exchange),
      jsonb_build_object(
        'order_id', NEW.id,
        'side', NEW.side,
        'quantity', NEW.quantity,
        'symbol', NEW.symbol,
        'exchange', NEW.exchange
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

-- Add indices to improve query performance
CREATE INDEX IF NOT EXISTS idx_agent_commands_agent_id ON public.agent_commands(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_order_id ON public.agent_commands(order_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_agent_id ON public.agent_responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_command_id ON public.agent_responses(command_id);

COMMENT ON TABLE public.agent_commands IS 'Commands sent to ElizaOS agents';
COMMENT ON TABLE public.agent_responses IS 'Responses from ElizaOS agents';
COMMENT ON TABLE public.knowledge_base IS 'Knowledge base for ElizaOS agents';
COMMENT ON FUNCTION public.create_order_command_v2 IS 'Creates a command for an agent to execute an order';
