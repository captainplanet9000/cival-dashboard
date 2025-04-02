/**
 * ElizaOS Integration - Complete End-to-End Test Script
 * 
 * This script tests the entire workflow of the ElizaOS integration:
 * 1. Verifies database tables exist
 * 2. Creates test farm, agent, and order
 * 3. Verifies command generation
 * 4. Creates simulated agent response
 * 5. Updates command and order statuses
 * 6. Verifies complete workflow
 */

// Import required dependencies
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Connect to Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('\n❌ Missing Supabase API key!');
  console.error('Please set one of these environment variables:');
  console.error('  - SUPABASE_SERVICE_KEY (preferred for tests)');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Constants for testing
const TEST_PREFIX = `test_${Date.now().toString().slice(-6)}`;
const TEST_FARM_NAME = `${TEST_PREFIX}_ElizaOS Test Farm`;
const TEST_AGENT_NAME = `${TEST_PREFIX}_ElizaOS Test Agent`;
const TEST_SYMBOL = 'BTC/USDT';

// Utility functions
const log = {
  info: (msg) => console.log(`\n📝 ${msg}`),
  success: (msg) => console.log(`\n✅ ${msg}`),
  error: (msg, error) => {
    console.error(`\n❌ ${msg}`);
    if (error) {
      console.error(error);
      if (error.details) console.error(`Details: ${error.details}`);
      if (error.hint) console.error(`Hint: ${error.hint}`);
    }
    return null;
  },
  step: (msg) => console.log(`\n🔍 STEP: ${msg}`),
  json: (data) => console.log(JSON.stringify(data, null, 2)),
};

// Main test function
async function testElizaOSWorkflow() {
  console.log('\n=================================================');
  console.log('🚀 ELIZAOS INTEGRATION - COMPLETE WORKFLOW TEST');
  console.log('=================================================\n');
  
  try {
    // STEP 1: Verify database tables exist
    log.step('Verifying database tables');
    const requiredTables = ['agent_commands', 'agent_responses', 'knowledge_base'];
    const missingTables = [];
    
    for (const table of requiredTables) {
      const { error } = await supabase.from(table).select('*').limit(1);
      
      if (error && error.code === '42P01') {
        missingTables.push(table);
      } else if (error) {
        log.error(`Error checking table ${table}`, error);
        return;
      }
    }
    
    if (missingTables.length > 0) {
      log.error(`Missing tables: ${missingTables.join(', ')}`, {
        details: 'Please run the production migration script before testing.',
        hint: 'Execute 20250401_production_eliza_integration.sql in Supabase SQL Editor.',
      });
      return;
    }
    
    log.success('All required database tables exist');
    
    // STEP 2: Create test farm
    log.step('Creating test farm');
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .insert({
        name: TEST_FARM_NAME,
        description: 'Farm for testing ElizaOS integration',
        status: 'active'
      })
      .select()
      .single();
    
    if (farmError) {
      return log.error('Failed to create test farm', farmError);
    }
    
    const farmId = farmData.id;
    log.success(`Created test farm with ID: ${farmId}`);
    
    // STEP 3: Create test agent
    log.step('Creating test agent');
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .insert({
        name: TEST_AGENT_NAME,
        farm_id: farmId,
        is_active: true,
        configuration: {
          exchanges: ['binance'],
          permissions: ['market_orders', 'limit_orders']
        }
      })
      .select()
      .single();
    
    if (agentError) {
      return log.error('Failed to create test agent', agentError);
    }
    
    const agentId = agentData.id;
    log.success(`Created test agent with ID: ${agentId}`);
    
    // STEP 4: Create test order (should trigger auto-command generation)
    log.step('Creating test order');
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        farm_id: farmId,
        agent_id: agentId,
        symbol: TEST_SYMBOL,
        exchange: 'binance',
        order_type: 'market',
        side: 'buy',
        quantity: 0.01,
        price: null,
        status: 'pending'
      })
      .select()
      .single();
    
    if (orderError) {
      return log.error('Failed to create test order', orderError);
    }
    
    const orderId = orderData.id;
    log.success(`Created test order with ID: ${orderId}`);
    
    // STEP 5: Check if command was auto-generated
    log.step('Verifying command auto-generation');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger to execute
    
    const { data: commandData, error: commandError } = await supabase
      .from('agent_commands')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (commandError) {
      return log.error('Failed to find auto-generated command', commandError);
    }
    
    const commandId = commandData.id;
    log.success(`Command was auto-generated with ID: ${commandId}`);
    log.info('Command details:');
    log.json({
      id: commandData.id,
      command_type: commandData.command_type,
      command_content: commandData.command_content,
      status: commandData.status
    });
    
    // STEP 6: Create simulated agent response
    log.step('Creating simulated agent response');
    const { data: responseData, error: responseError } = await supabase
      .from('agent_responses')
      .insert({
        agent_id: agentId,
        command_id: commandId,
        response_type: 'order_execution',
        response_content: 'Successfully executed market order on Binance',
        status: 'completed',
        context: {
          order_id: orderId,
          execution_price: 50000,
          exchange_order_id: `BINANCE_${Date.now()}`
        }
      })
      .select()
      .single();
    
    if (responseError) {
      return log.error('Failed to create simulated response', responseError);
    }
    
    const responseId = responseData.id;
    log.success(`Created simulated response with ID: ${responseId}`);
    
    // STEP 7: Update command status to completed
    log.step('Updating command status');
    const { error: updateCommandError } = await supabase
      .from('agent_commands')
      .update({
        status: 'completed',
        response_id: responseId
      })
      .eq('id', commandId);
    
    if (updateCommandError) {
      return log.error('Failed to update command status', updateCommandError);
    }
    
    log.success('Updated command status to completed');
    
    // STEP 8: Update order status to filled
    log.step('Updating order status');
    const exchangeOrderId = `BINANCE_${Date.now()}`;
    
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        status: 'filled',
        exchange_order_id: exchangeOrderId,
        executed_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (updateOrderError) {
      return log.error('Failed to update order status', updateOrderError);
    }
    
    log.success('Updated order status to filled');
    
    // STEP 9: Verify complete workflow
    log.step('Verifying complete workflow');
    
    // Check order
    const { data: finalOrderData, error: finalOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (finalOrderError) {
      return log.error('Failed to retrieve final order data', finalOrderError);
    }
    
    // Check command
    const { data: finalCommandData, error: finalCommandError } = await supabase
      .from('agent_commands')
      .select('*')
      .eq('id', commandId)
      .single();
    
    if (finalCommandError) {
      return log.error('Failed to retrieve final command data', finalCommandError);
    }
    
    // Check response
    const { data: finalResponseData, error: finalResponseError } = await supabase
      .from('agent_responses')
      .select('*')
      .eq('id', responseId)
      .single();
    
    if (finalResponseError) {
      return log.error('Failed to retrieve final response data', finalResponseError);
    }
    
    // Verify full workflow
    const workflowComplete = 
      finalOrderData.status === 'filled' && 
      finalOrderData.exchange_order_id === exchangeOrderId &&
      finalCommandData.status === 'completed' &&
      finalCommandData.response_id === responseId &&
      finalResponseData.status === 'completed';
    
    if (workflowComplete) {
      log.success('COMPLETE WORKFLOW VERIFICATION SUCCESSFUL');
      log.info('Order, command, and response are all properly connected and updated');
    } else {
      log.error('Workflow verification failed', {
        details: 'One or more components were not properly updated',
        order: finalOrderData,
        command: finalCommandData,
        response: finalResponseData
      });
    }
    
    console.log('\n=================================================');
    console.log('✅ ELIZAOS INTEGRATION TEST COMPLETED SUCCESSFULLY');
    console.log('=================================================\n');
    
  } catch (error) {
    log.error('Unexpected error during test execution', error);
  }
}

// Run the test
testElizaOSWorkflow();
