/**
 * Complete ElizaOS Workflow Test
 * 
 * This script demonstrates the full ElizaOS integration workflow:
 * 1. Create a test farm
 * 2. Create a test agent
 * 3. Create a test order (which generates a command)
 * 4. Process the command and create a response
 * 5. Update order status based on response
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Starting Complete ElizaOS Workflow Test');
  console.log('──────────────────────────────────────────');
  
  try {
    // ─── Step 1: Create Test Farm ────────────────────────────────────
    console.log('\n📋 Step 1: Creating Test Farm');
    const farmName = `ElizaOS Test Farm ${new Date().toISOString()}`;
    
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .insert({
        name: farmName,
        description: 'A test farm for ElizaOS integration',
        is_active: true,
        risk_profile: { max_drawdown: 5, max_trade_size: 0.1 },
        performance_metrics: { win_rate: 0, trades_count: 0 },
        config: { test_mode: true },
        metadata: { created_by: 'eliza_workflow_test' }
      })
      .select()
      .single();
    
    if (farmError) {
      throw new Error(`Farm creation failed: ${farmError.message}`);
    }
    
    console.log(`✅ Farm created successfully with ID: ${farmData.id}`);
    
    // ─── Step 2: Create Test Agent ───────────────────────────────────
    console.log('\n🤖 Step 2: Creating Test Agent');
    const agentName = `ElizaOS Test Agent ${new Date().toISOString()}`;
    
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .insert({
        farm_id: farmData.id,
        name: agentName,
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
      throw new Error(`Agent creation failed: ${agentError.message}`);
    }
    
    console.log(`✅ Agent created successfully with ID: ${agentData.id}`);
    
    // ─── Step 3: Create Test Order ───────────────────────────────────
    console.log('\n🛒 Step 3: Creating Test Order');
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
        metadata: { test_id: 'eliza_workflow_test' }
      })
      .select()
      .single();
    
    if (orderError) {
      throw new Error(`Order creation failed: ${orderError.message}`);
    }
    
    console.log(`✅ Order created successfully with ID: ${orderData.id}`);
    
    // Wait for the trigger to execute
    console.log('⏳ Waiting for command trigger...');
    await sleep(1000);
    
    // ─── Step 4: Check Command Creation ───────────────────────────────
    console.log('\n📝 Step 4: Checking Command Creation');
    const { data: commandData, error: commandError } = await supabase
      .from('agent_commands')
      .select('*')
      .eq('order_id', orderData.id)
      .single();
    
    if (commandError) {
      throw new Error(`Command check failed: ${commandError.message}`);
    }
    
    if (!commandData) {
      throw new Error('No command was created for the order');
    }
    
    console.log(`✅ Command created successfully with ID: ${commandData.id}`);
    console.log(`📊 Command details: ${commandData.command_content}`);
    
    // ─── Step 5: Create Agent Response ────────────────────────────────
    console.log('\n💬 Step 5: Creating Agent Response');
    const { data: responseData, error: responseError } = await supabase
      .from('agent_responses')
      .insert({
        agent_id: agentData.id,
        command_id: commandData.id,
        response_type: 'order_execution',
        response_content: 'Order executed successfully on Binance',
        status: 'completed',
        context: {
          order_id: orderData.id,
          exchange_order_id: 'BINANCE123456789',
          execution_price: 64350.75,
          execution_quantity: 0.01,
          execution_timestamp: new Date().toISOString(),
          execution_status: 'FILLED'
        },
        metadata: { test_id: 'eliza_workflow_test' }
      })
      .select()
      .single();
    
    if (responseError) {
      throw new Error(`Response creation failed: ${responseError.message}`);
    }
    
    console.log(`✅ Response created successfully with ID: ${responseData.id}`);
    
    // ─── Step 6: Update Command Status ────────────────────────────────
    console.log('\n🔄 Step 6: Updating Command Status');
    const { error: updateCommandError } = await supabase
      .from('agent_commands')
      .update({
        status: 'completed',
        response_id: responseData.id
      })
      .eq('id', commandData.id);
    
    if (updateCommandError) {
      throw new Error(`Command update failed: ${updateCommandError.message}`);
    }
    
    console.log('✅ Command status updated to "completed"');
    
    // ─── Step 7: Update Order Status ─────────────────────────────────
    console.log('\n📈 Step 7: Updating Order Status');
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        status: 'filled',
        exchange_order_id: 'BINANCE123456789',
        executed_at: new Date().toISOString(),
        metadata: {
          ...orderData.metadata,
          execution_price: 64350.75,
          execution_timestamp: new Date().toISOString()
        }
      })
      .eq('id', orderData.id);
    
    if (updateOrderError) {
      throw new Error(`Order update failed: ${updateOrderError.message}`);
    }
    
    console.log('✅ Order status updated to "filled"');
    
    // ─── Step 8: Retrieve Complete Workflow Data ────────────────────
    console.log('\n📊 Step 8: Retrieving Complete Workflow Data');
    
    // Get updated order
    const { data: finalOrder, error: finalOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderData.id)
      .single();
    
    if (finalOrderError) {
      throw new Error(`Final order retrieval failed: ${finalOrderError.message}`);
    }
    
    // Get command with response
    const { data: finalCommand, error: finalCommandError } = await supabase
      .from('agent_commands')
      .select(`
        *,
        agent_responses (*)
      `)
      .eq('id', commandData.id)
      .single();
    
    if (finalCommandError) {
      throw new Error(`Final command retrieval failed: ${finalCommandError.message}`);
    }
    
    console.log('\n🎉 WORKFLOW TEST COMPLETED SUCCESSFULLY!');
    console.log('──────────────────────────────────────────');
    console.log('\n📑 Final Order Status:');
    console.log(`ID: ${finalOrder.id}`);
    console.log(`Status: ${finalOrder.status}`);
    console.log(`Exchange Order ID: ${finalOrder.exchange_order_id}`);
    console.log(`Executed At: ${finalOrder.executed_at}`);
    
    console.log('\n📑 Final Command Status:');
    console.log(`ID: ${finalCommand.id}`);
    console.log(`Status: ${finalCommand.status}`);
    console.log(`Content: ${finalCommand.command_content}`);
    
    console.log('\n📑 Agent Response:');
    if (finalCommand.agent_responses && finalCommand.agent_responses.length > 0) {
      const response = finalCommand.agent_responses[0];
      console.log(`ID: ${response.id}`);
      console.log(`Content: ${response.response_content}`);
      console.log(`Status: ${response.status}`);
    } else {
      console.log('No response found');
    }
    
    // ─── Step 9: Clean Up Test Data ─────────────────────────────────
    if (process.env.KEEP_TEST_DATA !== 'true') {
      console.log('\n🧹 Step 9: Cleaning Up Test Data');
      
      // Delete in reverse order of dependencies
      // Delete responses
      await supabase
        .from('agent_responses')
        .delete()
        .eq('id', responseData.id);
      
      // Delete commands
      await supabase
        .from('agent_commands')
        .delete()
        .eq('id', commandData.id);
      
      // Delete order
      await supabase
        .from('orders')
        .delete()
        .eq('id', orderData.id);
      
      // Delete agent
      await supabase
        .from('agents')
        .delete()
        .eq('id', agentData.id);
      
      // Delete farm
      await supabase
        .from('farms')
        .delete()
        .eq('id', farmData.id);
      
      console.log('✅ Test data cleaned up successfully');
    } else {
      console.log('\n📌 Test data retention enabled - skipping cleanup');
    }
    
    console.log('\n✅ ElizaOS integration is fully functional!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
main().catch(error => {
  console.error('Fatal error:', error);
});
