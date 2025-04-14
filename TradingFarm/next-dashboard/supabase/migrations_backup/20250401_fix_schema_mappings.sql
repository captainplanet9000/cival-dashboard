-- Migration: 20250401_fix_schema_mappings
-- Description: Adds view mappings to make the ElizaOS integration test work with existing schema

-- Create a view that maps 'config' to 'configuration' and 'is_active' to 'status' for farms
CREATE OR REPLACE VIEW public.farm_view AS
SELECT 
  id,
  name,
  description,
  created_at,
  updated_at,
  is_active,
  CASE WHEN is_active THEN 'active' ELSE 'inactive' END AS status,
  risk_profile,
  performance_metrics,
  config AS configuration,
  metadata
FROM 
  public.farms;

-- Create a view that maps columns for agents
CREATE OR REPLACE VIEW public.agent_view AS
SELECT 
  id,
  farm_id,
  name,
  created_at,
  updated_at,
  is_active,
  CASE WHEN is_active THEN 'active' ELSE 'inactive' END AS status,
  model_config->>'provider' AS exchange,
  model_config->>'api_key' AS api_key,
  model_config->>'api_secret' AS api_secret,
  config AS configuration,
  performance_metrics,
  memory_context,
  tools_config,
  capabilities
FROM 
  public.agents;

-- Create a function to handle the agent command from orders
CREATE OR REPLACE FUNCTION public.handle_new_order_command_finalv1()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create a command if the order has an agent_id
  IF NEW.agent_id IS NOT NULL THEN
    -- Insert into agent_commands using the agent_id from the order
    INSERT INTO public.agent_commands (
      agent_id,
      order_id,
      command_type,
      command_content,
      status,
      context
    ) VALUES (
      NEW.agent_id,
      NEW.id,
      'execute_order',
      format('Execute %s order for %s %s of %s on %s', 
             NEW.order_type, 
             NEW.side, 
             NEW.quantity, 
             NEW.symbol, 
             NEW.exchange),
      'pending',
      jsonb_build_object(
        'order_id', NEW.id,
        'order_type', NEW.order_type,
        'side', NEW.side,
        'quantity', NEW.quantity,
        'symbol', NEW.symbol,
        'exchange', NEW.exchange,
        'price', NEW.price,
        'status', NEW.status,
        'metadata', NEW.metadata
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create the trigger on orders table if it doesn't exist
DROP TRIGGER IF EXISTS orders_create_command ON public.orders;
CREATE TRIGGER orders_create_command
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_order_command_finalv1();

-- Create function to simplify the creation of test farm
CREATE OR REPLACE FUNCTION public.create_test_farm(
  farm_name TEXT DEFAULT 'ElizaOS Test Farm',
  farm_description TEXT DEFAULT 'A test farm for ElizaOS integration'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  farm_id INTEGER;
BEGIN
  -- Check if farm already exists
  SELECT id INTO farm_id
  FROM public.farms
  WHERE name = farm_name;
  
  -- Create new farm if it doesn't exist
  IF farm_id IS NULL THEN
    INSERT INTO public.farms (
      name, 
      description, 
      is_active,
      risk_profile,
      performance_metrics,
      config,
      metadata
    ) VALUES (
      farm_name,
      farm_description,
      TRUE,
      jsonb_build_object('max_drawdown', 5, 'max_trade_size', 0.1),
      jsonb_build_object('win_rate', 0, 'trades_count', 0),
      jsonb_build_object('test_mode', true),
      jsonb_build_object('created_by', 'eliza_test')
    )
    RETURNING id INTO farm_id;
  END IF;
  
  RETURN farm_id;
END;
$$;

-- Create function to simplify the creation of test agent
CREATE OR REPLACE FUNCTION public.create_test_agent(
  farm_id INTEGER,
  agent_name TEXT DEFAULT 'ElizaOS Test Agent',
  agent_description TEXT DEFAULT 'A test agent for ElizaOS integration'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  agent_id INTEGER;
BEGIN
  -- Check if agent already exists for this farm
  SELECT id INTO agent_id
  FROM public.agents
  WHERE name = agent_name AND farm_id = $1;
  
  -- Create new agent if it doesn't exist
  IF agent_id IS NULL THEN
    INSERT INTO public.agents (
      farm_id,
      name,
      is_active,
      model_config,
      tools_config,
      capabilities,
      performance_metrics,
      memory_context,
      config
    ) VALUES (
      farm_id,
      agent_name,
      TRUE,
      jsonb_build_object(
        'model', 'anthropic/claude-3-opus',
        'provider', 'binance',
        'temperature', 0.7
      ),
      jsonb_build_object(
        'enabled_tools', array['market_analysis', 'trade_execution']
      ),
      array['market_analysis', 'trade_execution', 'risk_management'],
      jsonb_build_object('win_rate', 0, 'trades_count', 0),
      jsonb_build_object('key_memories', '{}'),
      jsonb_build_object(
        'risk_level', 'low',
        'max_concurrent_trades', 1
      )
    )
    RETURNING id INTO agent_id;
  END IF;
  
  RETURN agent_id;
END;
$$;

-- Create a function to simplify testing the ElizaOS integration
CREATE OR REPLACE FUNCTION public.test_eliza_integration()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  farm_id INTEGER;
  agent_id INTEGER;
  order_id INTEGER;
  command_count INTEGER;
  result JSONB;
BEGIN
  -- Create test farm
  farm_id := public.create_test_farm();
  
  -- Create test agent
  agent_id := public.create_test_agent(farm_id);
  
  -- Create test order
  INSERT INTO public.orders (
    farm_id,
    agent_id,
    symbol,
    order_type,
    side,
    quantity,
    price,
    status,
    exchange,
    metadata
  ) VALUES (
    farm_id,
    agent_id,
    'BTC/USDT',
    'market',
    'buy',
    0.01,
    NULL,
    'pending',
    'binance',
    jsonb_build_object('test_id', 'eliza_integration_test')
  )
  RETURNING id INTO order_id;
  
  -- Wait a moment for trigger to execute
  PERFORM pg_sleep(0.5);
  
  -- Check if command was created
  SELECT COUNT(*) INTO command_count
  FROM public.agent_commands
  WHERE order_id = order_id;
  
  -- Build result
  result := jsonb_build_object(
    'success', command_count > 0,
    'farm_id', farm_id,
    'agent_id', agent_id,
    'order_id', order_id,
    'command_count', command_count
  );
  
  RETURN result;
END;
$$;
