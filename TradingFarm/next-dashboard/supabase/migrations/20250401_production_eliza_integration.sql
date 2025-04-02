-- =========================================================
-- ElizaOS Production Integration Migration
-- Created: 2025-04-01
-- Description: Complete ElizaOS integration for production
-- =========================================================

-- Create required tables if they don't exist
-- =========================================================

-- Create agent_commands table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.agent_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
    command_type TEXT NOT NULL,
    command_content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    response_id UUID,
    context JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create agent_responses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.agent_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id BIGINT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    command_id UUID REFERENCES public.agent_commands(id) ON DELETE SET NULL,
    response_type TEXT NOT NULL,
    response_content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    context JSONB DEFAULT '{}'::jsonb NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create knowledge_base table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}'::text[] NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add columns to existing tables if needed
-- =========================================================

-- Fix agent_responses columns (in case table exists but missing columns)
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.agent_responses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL;

-- Enable RLS on all tables
-- =========================================================
ALTER TABLE public.agent_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create default policies
-- =========================================================
DO $$
BEGIN
    -- Create agent_commands policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_commands' AND policyname = 'agent_commands_admin_all') THEN
        CREATE POLICY agent_commands_admin_all ON public.agent_commands USING (true);
    END IF;

    -- Create agent_responses policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_responses' AND policyname = 'agent_responses_admin_all') THEN
        CREATE POLICY agent_responses_admin_all ON public.agent_responses USING (true);
    END IF;

    -- Create knowledge_base policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_base' AND policyname = 'knowledge_base_admin_all') THEN
        CREATE POLICY knowledge_base_admin_all ON public.knowledge_base USING (true);
    END IF;
END $$;

-- Create timestamp handler functions if they don't exist
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create timestamp triggers
-- =========================================================

-- agent_commands triggers
DROP TRIGGER IF EXISTS set_agent_commands_created_at ON public.agent_commands;
DROP TRIGGER IF EXISTS set_agent_commands_updated_at ON public.agent_commands;

CREATE TRIGGER set_agent_commands_created_at
BEFORE INSERT ON public.agent_commands
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_agent_commands_updated_at
BEFORE UPDATE ON public.agent_commands
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- agent_responses triggers
DROP TRIGGER IF EXISTS set_agent_responses_created_at ON public.agent_responses;
DROP TRIGGER IF EXISTS set_agent_responses_updated_at ON public.agent_responses;

CREATE TRIGGER set_agent_responses_created_at
BEFORE INSERT ON public.agent_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_agent_responses_updated_at
BEFORE UPDATE ON public.agent_responses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- knowledge_base triggers
DROP TRIGGER IF EXISTS set_knowledge_base_created_at ON public.knowledge_base;
DROP TRIGGER IF EXISTS set_knowledge_base_updated_at ON public.knowledge_base;

CREATE TRIGGER set_knowledge_base_created_at
BEFORE INSERT ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create command generation functions and triggers
-- =========================================================

-- Function to create order command
CREATE OR REPLACE FUNCTION public.create_order_command_v2(
  p_order_id BIGINT,
  p_agent_id BIGINT,
  p_symbol TEXT,
  p_exchange TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  -- Get the order details
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;
  
  -- Only proceed if the order exists
  IF FOUND THEN
    -- Insert a command for the agent to execute
    INSERT INTO public.agent_commands (
      agent_id,
      order_id,
      command_type,
      command_content,
      status,
      context
    ) VALUES (
      p_agent_id,
      p_order_id,
      'execute_order',
      format('Execute %s order for %s %s of %s on %s', 
             v_order.order_type, 
             v_order.side, 
             v_order.quantity, 
             v_order.symbol, 
             v_order.exchange),
      'pending',
      jsonb_build_object(
        'order_id', v_order.id,
        'order_type', v_order.order_type,
        'side', v_order.side,
        'quantity', v_order.quantity,
        'symbol', v_order.symbol,
        'exchange', v_order.exchange,
        'price', v_order.price,
        'status', v_order.status,
        'metadata', COALESCE(p_metadata, v_order.metadata)
      )
    );
  END IF;
END;
$$;

-- Trigger function that calls create_order_command_v2
CREATE OR REPLACE FUNCTION public.order_command_trigger_v2()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create a command if the order has an agent_id
  IF NEW.agent_id IS NOT NULL THEN
    -- Call the function to create the command
    PERFORM public.create_order_command_v2(
      NEW.id,
      NEW.agent_id,
      NEW.symbol,
      NEW.exchange,
      NEW.metadata
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create the trigger on orders table
DROP TRIGGER IF EXISTS orders_create_command_v2 ON public.orders;
CREATE TRIGGER orders_create_command_v2
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.order_command_trigger_v2();

-- Comments for better documentation
-- =========================================================
COMMENT ON TABLE public.agent_commands IS 'Table storing commands for agents to execute';
COMMENT ON TABLE public.agent_responses IS 'Table storing responses from agents to commands';
COMMENT ON TABLE public.knowledge_base IS 'Table storing knowledge for agents like trading strategies';

COMMENT ON COLUMN public.agent_commands.command_type IS 'Type of command (e.g. execute_order, analyze_market)';
COMMENT ON COLUMN public.agent_commands.status IS 'Status of the command (pending, completed, failed)';
COMMENT ON COLUMN public.agent_commands.context IS 'JSON context and details for the command';

COMMENT ON COLUMN public.agent_responses.response_type IS 'Type of response (e.g. order_execution, analysis)';
COMMENT ON COLUMN public.agent_responses.status IS 'Status of the response (pending, completed, failed)';
COMMENT ON COLUMN public.agent_responses.context IS 'JSON context and details for the response';
COMMENT ON COLUMN public.agent_responses.metadata IS 'Additional metadata for the response';

-- Output Success Message
DO $$
BEGIN
    RAISE NOTICE 'ElizaOS Integration Migration Complete - Ready for Production';
END $$;
