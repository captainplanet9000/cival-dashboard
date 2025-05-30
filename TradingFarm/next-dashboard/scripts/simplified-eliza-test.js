/**
 * Simplified ElizaOS Integration Test
 * 
 * This script works with your existing schema structure to test the ElizaOS integration.
 * It adapts to your actual database schema instead of requiring schema changes.
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('==== Testing ElizaOS Order Integration ====');
  
  try {
    // Step 1: Create test farm using actual schema
    console.log('🏫 Creating test farm with correct schema...');
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .insert({
        name: 'ElizaOS Test Farm',
        description: 'A test farm for ElizaOS integration',
        is_active: true,
        risk_profile: { max_drawdown: 5, max_trade_size: 0.1 },
        performance_metrics: { win_rate: 0, trades_count: 0 },
        config: { test_mode: true },
        metadata: { created_by: 'eliza_test' }
      })
      .select()
      .single();
    
    if (farmError) {
      console.error('❌ Error creating farm:', farmError.message);
      return;
    }
    
    console.log(`✅ Test farm created with ID: ${farmData.id}`);
    
    // Step 2: Create test agent using actual schema
    console.log('🤖 Creating test agent with correct schema...');
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .insert({
        farm_id: farmData.id,
        name: 'ElizaOS Test Agent',
        is_active: true,
        model_config: {
          model: 'anthropic/claude-3-opus',
          provider: 'binance',
          temperature: 0.7
        },
        tools_config: {
          enabled_tools: ['market_analysis', 'trade_execution']
        },
        capabilities: ['market_analysis', 'trade_execution', 'risk_management'],
        performance_metrics: { win_rate: 0, trades_count: 0 },
        memory_context: { key_memories: {} },
        config: {
          risk_level: 'low',
          max_concurrent_trades: 1
        }
      })
      .select()
      .single();
    
    if (agentError) {
      console.error('❌ Error creating agent:', agentError.message);
      return;
    }
    
    console.log(`✅ Test agent created with ID: ${agentData.id}`);
    
    // Step 3: Create test order
    console.log('🛒 Creating test order with agent_id...');
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        farm_id: farmData.id,
        agent_id: agentData.id,
        symbol: 'BTC/USDT',
        order_type: 'market',
        side: 'buy',
        quantity: 0.01,
        price: null,
        status: 'pending',
        exchange: 'binance',
        metadata: { test_id: 'eliza_integration_test' }
      })
      .select()
      .single();
    
    if (orderError) {
      console.error('❌ Error creating order:', orderError.message);
      return;
    }
    
    console.log(`✅ Test order created with ID: ${orderData.id}`);
    
    // Step 4: Wait a moment for the trigger to execute
    console.log('⏳ Waiting for command trigger...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Check if command was created
    console.log('🔍 Checking for agent command...');
    const { data: commandData, error: commandError } = await supabase
      .from('agent_commands')
      .select('*')
      .eq('order_id', orderData.id);
    
    if (commandError) {
      console.error('❌ Error checking for command:', commandError.message);
      return;
    }
    
    if (commandData && commandData.length > 0) {
      console.log(`✅ Agent command created successfully! Command ID: ${commandData[0].id}`);
      console.log('📊 Command details:', JSON.stringify(commandData[0], null, 2));
      console.log('\n🎉 INTEGRATION TEST SUCCESSFUL! ElizaOS is properly integrated with your order system.');
    } else {
      console.log('❌ No agent command was created. Check the database trigger function.');
      
      // Try to diagnose the issue
      console.log('\n🔬 Diagnosing issue:');
      
      // Check if the agent_commands table exists and has the right schema
      const { data: tableInfo, error: tableError } = await supabase
        .from('agent_commands')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('❌ Problem with agent_commands table:', tableError.message);
      } else {
        console.log('✅ agent_commands table exists and is accessible');
      }
      
      // Check if the trigger function exists
      console.log('\n📋 You may need to verify that these elements exist in your database:');
      console.log('1. The agent_commands table with proper columns');
      console.log('2. A trigger on the orders table that fires on INSERT');
      console.log('3. A trigger function that creates entries in agent_commands');
      
      console.log('\nHere\'s a SQL snippet you can run in the Supabase SQL Editor to fix this:');
      console.log(`
CREATE OR REPLACE FUNCTION public.handle_new_order_command_final()
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
EXECUTE FUNCTION public.handle_new_order_command_final();
      `);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the test
main().catch(error => {
  console.error('Fatal error:', error);
});
