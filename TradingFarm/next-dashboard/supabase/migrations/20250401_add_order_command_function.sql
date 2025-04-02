-- Migration: 20250401_add_order_command_function
-- Description: Add missing function for ElizaOS integration

-- Create the missing function referenced by the trigger
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

-- Create a trigger function that uses create_order_command_v2
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

-- Create the trigger on orders table if it doesn't exist
DROP TRIGGER IF EXISTS orders_create_command_v2 ON public.orders;
CREATE TRIGGER orders_create_command_v2
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.order_command_trigger_v2();
