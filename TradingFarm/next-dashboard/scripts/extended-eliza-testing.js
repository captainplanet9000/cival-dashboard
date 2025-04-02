/**
 * Extended Testing Script for ElizaOS Integration
 * 
 * This script tests various order types and edge cases to ensure
 * the ElizaOS integration is fully functional in all scenarios.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Test Farm and Agent IDs (created once and reused)
let testFarmId;
let testAgentId;

// Utility to log test steps
const log = {
  step: (message) => console.log(`\n📝 ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  error: (message, error) => {
    console.error(`❌ ${message}`, error);
    return new Error(`${message}: ${error?.message || error}`);
  },
  info: (message) => console.log(`ℹ️ ${message}`),
  wait: (message) => console.log(`⏳ ${message}`),
  section: (title) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🧪 ${title}`);
    console.log(`${'='.repeat(50)}`);
  }
};

// Create test farm and agent if they don't exist
async function setupTestEnvironment() {
  log.section('Setting Up Test Environment');
  
  // Create test farm
  log.step('Creating Test Farm');
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .insert({
      name: 'ElizaOS Extended Test Farm',
      description: 'A test farm for extended ElizaOS order testing',
      status: 'active'
    })
    .select()
    .single();
    
  if (farmError) {
    throw log.error('Failed to create test farm', farmError);
  }
  testFarmId = farm.id;
  log.success(`Farm created with ID: ${testFarmId}`);
  
  // Create test agent
  log.step('Creating Test Agent');
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .insert({
      name: 'ElizaOS Extended Test Agent',
      farm_id: testFarmId,
      is_active: true,
      configuration: {
        exchanges: ['binance', 'coinbase', 'ftx'],
        permissions: ['market_orders', 'limit_orders', 'risk_management'],
        risk_profile: 'moderate'
      }
    })
    .select()
    .single();
    
  if (agentError) {
    throw log.error('Failed to create test agent', agentError);
  }
  testAgentId = agent.id;
  log.success(`Agent created with ID: ${testAgentId}`);
  
  return { farmId: testFarmId, agentId: testAgentId };
}

// Poll until a command is created
async function waitForCommand(orderId, timeout = 5000, maxAttempts = 10) {
  log.wait('Waiting for command to be created...');
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from('agent_commands')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
      
    if (error) {
      throw log.error('Error checking for command', error);
    }
    
    if (data) {
      log.success(`Command created: ${data.command_content}`);
      return data;
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, timeout / maxAttempts));
  }
  
  throw log.error('Timed out waiting for command creation', { message: 'Command was not created within timeout period' });
}

// Create agent response
async function createAgentResponse(command, responseContent, status = 'completed', additionalContext = {}) {
  log.step('Creating Agent Response');
  
  const { data: response, error } = await supabase
    .from('agent_responses')
    .insert({
      agent_id: command.agent_id,
      command_id: command.id,
      response_type: 'order_execution',
      response_content: responseContent,
      status: status,
      context: {
        order_id: command.order_id,
        execution_status: status === 'completed' ? 'FILLED' : 'FAILED',
        execution_price: command.context.price || 50000,
        execution_timestamp: new Date().toISOString(),
        ...additionalContext
      },
      metadata: {
        test_type: 'extended',
        timestamp: new Date().toISOString()
      }
    })
    .select()
    .single();
    
  if (error) {
    throw log.error('Failed to create agent response', error);
  }
  
  log.success(`Response created with ID: ${response.id}`);
  return response;
}

// Update order status
async function updateOrderStatus(orderId, status, exchangeOrderId = null) {
  log.step(`Updating order ${orderId} status to ${status}`);
  
  const updateData = {
    status: status
  };
  
  if (status === 'filled' || status === 'partially_filled') {
    updateData.executed_at = new Date().toISOString();
    updateData.exchange_order_id = exchangeOrderId || `TEST${Math.floor(Math.random() * 1000000)}`;
  }
  
  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);
    
  if (error) {
    throw log.error(`Failed to update order ${orderId} status`, error);
  }
  
  log.success(`Order ${orderId} status updated to ${status}`);
}

// Update command status
async function updateCommandStatus(commandId, status, responseId = null) {
  log.step(`Updating command ${commandId} status to ${status}`);
  
  const updateData = {
    status: status
  };
  
  if (responseId) {
    updateData.response_id = responseId;
  }
  
  const { error } = await supabase
    .from('agent_commands')
    .update(updateData)
    .eq('id', commandId);
    
  if (error) {
    throw log.error(`Failed to update command ${commandId} status`, error);
  }
  
  log.success(`Command ${commandId} status updated to ${status}`);
}

// Clean up test data 
async function cleanupTestData(orderId, commandId, responseId) {
  log.section('Cleaning Up Test Data');
  
  if (responseId) {
    log.step(`Deleting response ${responseId}`);
    const { error: responseError } = await supabase
      .from('agent_responses')
      .delete()
      .eq('id', responseId);
      
    if (responseError) {
      log.error(`Failed to delete response ${responseId}`, responseError);
    } else {
      log.success(`Response ${responseId} deleted`);
    }
  }
  
  if (commandId) {
    log.step(`Deleting command ${commandId}`);
    const { error: commandError } = await supabase
      .from('agent_commands')
      .delete()
      .eq('id', commandId);
      
    if (commandError) {
      log.error(`Failed to delete command ${commandId}`, commandError);
    } else {
      log.success(`Command ${commandId} deleted`);
    }
  }
  
  if (orderId) {
    log.step(`Deleting order ${orderId}`);
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);
      
    if (orderError) {
      log.error(`Failed to delete order ${orderId}`, orderError);
    } else {
      log.success(`Order ${orderId} deleted`);
    }
  }
}

// Test Case 1: Market Order (base functionality)
async function testMarketOrder({ farmId, agentId }) {
  log.section('Test Case 1: Market Order');
  let orderId, commandId, responseId;
  
  try {
    // 1. Create order
    log.step('Creating market order');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        farm_id: farmId,
        agent_id: agentId,
        symbol: 'BTC/USDT',
        exchange: 'binance',
        order_type: 'market',
        side: 'buy',
        quantity: 0.01,
        status: 'pending',
        metadata: {
          test_case: 'market_order',
          priority: 'high'
        }
      })
      .select()
      .single();
      
    if (orderError) {
      throw log.error('Failed to create market order', orderError);
    }
    
    orderId = order.id;
    log.success(`Market order created with ID: ${orderId}`);
    
    // 2. Wait for command to be created
    const command = await waitForCommand(orderId);
    commandId = command.id;
    
    // 3. Create response
    const response = await createAgentResponse(
      command, 
      'Market order executed at 50,123.45 USD on Binance',
      'completed',
      {
        execution_price: 50123.45,
        exchange_order_id: 'BINANCE123456789'
      }
    );
    responseId = response.id;
    
    // 4. Update command status
    await updateCommandStatus(commandId, 'completed', responseId);
    
    // 5. Update order status
    await updateOrderStatus(orderId, 'filled', 'BINANCE123456789');
    
    // 6. Verify final state
    log.step('Verifying final state');
    const { data: finalOrder, error: finalOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (finalOrderError) {
      throw log.error('Failed to retrieve final order state', finalOrderError);
    }
    
    log.success(`Final order status: ${finalOrder.status}`);
    log.success(`Exchange order ID: ${finalOrder.exchange_order_id}`);
    log.success('Market order test completed successfully');
    
    return { success: true, orderId, commandId, responseId };
  } catch (error) {
    log.error('Market order test failed', error);
    return { success: false, orderId, commandId, responseId, error };
  }
}

// Test Case 2: Limit Order
async function testLimitOrder({ farmId, agentId }) {
  log.section('Test Case 2: Limit Order');
  let orderId, commandId, responseId;
  
  try {
    // 1. Create order
    log.step('Creating limit order');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        farm_id: farmId,
        agent_id: agentId,
        symbol: 'ETH/USDT',
        exchange: 'coinbase',
        order_type: 'limit',
        side: 'sell',
        quantity: 0.05,
        price: 3500.00,
        status: 'pending',
        metadata: {
          test_case: 'limit_order',
          priority: 'medium'
        }
      })
      .select()
      .single();
      
    if (orderError) {
      throw log.error('Failed to create limit order', orderError);
    }
    
    orderId = order.id;
    log.success(`Limit order created with ID: ${orderId}`);
    
    // 2. Wait for command to be created
    const command = await waitForCommand(orderId);
    commandId = command.id;
    
    // 3. Create response (limit orders might not fill immediately)
    const response = await createAgentResponse(
      command, 
      'Limit order placed at 3,500.00 USD on Coinbase',
      'completed',
      {
        execution_status: 'PLACED',
        exchange_order_id: 'COINBASE987654321'
      }
    );
    responseId = response.id;
    
    // 4. Update command status
    await updateCommandStatus(commandId, 'completed', responseId);
    
    // 5. Update order status (to open, not filled yet)
    await updateOrderStatus(orderId, 'open', 'COINBASE987654321');
    
    // 6. Verify final state
    log.step('Verifying final state');
    const { data: finalOrder, error: finalOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (finalOrderError) {
      throw log.error('Failed to retrieve final order state', finalOrderError);
    }
    
    log.success(`Final order status: ${finalOrder.status}`);
    log.success(`Exchange order ID: ${finalOrder.exchange_order_id}`);
    log.success('Limit order test completed successfully');
    
    return { success: true, orderId, commandId, responseId };
  } catch (error) {
    log.error('Limit order test failed', error);
    return { success: false, orderId, commandId, responseId, error };
  }
}

// Test Case 3: Failed Order
async function testFailedOrder({ farmId, agentId }) {
  log.section('Test Case 3: Failed Order');
  let orderId, commandId, responseId;
  
  try {
    // 1. Create order with invalid parameters
    log.step('Creating order with invalid parameters');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        farm_id: farmId,
        agent_id: agentId,
        symbol: 'INVALID/PAIR',
        exchange: 'ftx', // FTX has shut down, so this should cause an error
        order_type: 'market',
        side: 'buy',
        quantity: 0.01,
        status: 'pending',
        metadata: {
          test_case: 'failed_order',
          should_fail: true
        }
      })
      .select()
      .single();
      
    if (orderError) {
      throw log.error('Failed to create order with invalid parameters', orderError);
    }
    
    orderId = order.id;
    log.success(`Order with invalid parameters created with ID: ${orderId}`);
    
    // 2. Wait for command to be created
    const command = await waitForCommand(orderId);
    commandId = command.id;
    
    // 3. Create failed response
    const response = await createAgentResponse(
      command, 
      'Order execution failed: Invalid symbol or exchange not available',
      'failed',
      {
        execution_status: 'FAILED',
        error_code: 'INVALID_SYMBOL',
        error_message: 'Symbol INVALID/PAIR is not available on FTX'
      }
    );
    responseId = response.id;
    
    // 4. Update command status
    await updateCommandStatus(commandId, 'failed', responseId);
    
    // 5. Update order status
    await updateOrderStatus(orderId, 'failed');
    
    // 6. Verify final state
    log.step('Verifying final state');
    const { data: finalOrder, error: finalOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
      
    if (finalOrderError) {
      throw log.error('Failed to retrieve final order state', finalOrderError);
    }
    
    log.success(`Final order status: ${finalOrder.status}`);
    log.success('Failed order test completed successfully');
    
    return { success: true, orderId, commandId, responseId };
  } catch (error) {
    log.error('Failed order test failed', error);
    return { success: false, orderId, commandId, responseId, error };
  }
}

// Test Case 4: Multiple Simultaneous Orders
async function testMultipleOrders({ farmId, agentId }) {
  log.section('Test Case 4: Multiple Simultaneous Orders');
  const orderIds = [];
  const commandIds = [];
  const responseIds = [];
  
  try {
    // 1. Create multiple orders
    log.step('Creating multiple orders simultaneously');
    
    const orders = [
      {
        farm_id: farmId,
        agent_id: agentId,
        symbol: 'BTC/USDT',
        exchange: 'binance',
        order_type: 'market',
        side: 'buy',
        quantity: 0.01,
        status: 'pending',
        metadata: { test_case: 'multiple_orders', order_index: 1 }
      },
      {
        farm_id: farmId,
        agent_id: agentId,
        symbol: 'ETH/USDT',
        exchange: 'coinbase',
        order_type: 'limit',
        side: 'sell',
        quantity: 0.05,
        price: 3500.00,
        status: 'pending',
        metadata: { test_case: 'multiple_orders', order_index: 2 }
      },
      {
        farm_id: farmId,
        agent_id: agentId,
        symbol: 'SOL/USDT',
        exchange: 'binance',
        order_type: 'market',
        side: 'sell',
        quantity: 1.0,
        status: 'pending',
        metadata: { test_case: 'multiple_orders', order_index: 3 }
      }
    ];
    
    const { data: createdOrders, error: ordersError } = await supabase
      .from('orders')
      .insert(orders)
      .select();
      
    if (ordersError) {
      throw log.error('Failed to create multiple orders', ordersError);
    }
    
    for (const order of createdOrders) {
      orderIds.push(order.id);
      log.success(`Order ${orderIds.length} created with ID: ${order.id}`);
    }
    
    // 2. Wait for commands to be created (in series to avoid race conditions)
    for (const orderId of orderIds) {
      const command = await waitForCommand(orderId);
      commandIds.push(command.id);
    }
    
    log.success(`All ${commandIds.length} commands created successfully`);
    
    // 3. Process each command and order
    for (let i = 0; i < commandIds.length; i++) {
      const command = await supabase
        .from('agent_commands')
        .select('*')
        .eq('id', commandIds[i])
        .single()
        .then(res => res.data);
      
      // Create response
      const response = await createAgentResponse(
        command,
        `Order ${i + 1} executed successfully`,
        'completed',
        { order_index: i + 1 }
      );
      responseIds.push(response.id);
      
      // Update command status
      await updateCommandStatus(commandIds[i], 'completed', response.id);
      
      // Update order status
      await updateOrderStatus(orderIds[i], 'filled', `TEST${i+1}_${Date.now()}`);
    }
    
    // 4. Verify all orders were processed
    log.step('Verifying all orders were processed');
    
    const { data: finalOrders, error: finalOrdersError } = await supabase
      .from('orders')
      .select('id, status, exchange_order_id')
      .in('id', orderIds);
      
    if (finalOrdersError) {
      throw log.error('Failed to retrieve final order states', finalOrdersError);
    }
    
    for (const order of finalOrders) {
      log.success(`Order ${order.id} final status: ${order.status}`);
    }
    
    log.success('Multiple orders test completed successfully');
    
    return { success: true, orderIds, commandIds, responseIds };
  } catch (error) {
    log.error('Multiple orders test failed', error);
    return { success: false, orderIds, commandIds, responseIds, error };
  }
}

// Main test function
async function runExtendedTests() {
  console.log('\n🚀 Starting Extended ElizaOS Integration Tests');
  console.log('================================================');
  
  try {
    // Setup test environment once
    const testEnv = await setupTestEnvironment();
    
    // Run all test cases
    const testResults = {};
    
    // Test 1: Market Order
    const marketResult = await testMarketOrder(testEnv);
    testResults.marketOrder = marketResult;
    
    // Test 2: Limit Order
    const limitResult = await testLimitOrder(testEnv);
    testResults.limitOrder = limitResult;
    
    // Test 3: Failed Order
    const failedResult = await testFailedOrder(testEnv);
    testResults.failedOrder = failedResult;
    
    // Test 4: Multiple Orders
    const multipleResult = await testMultipleOrders(testEnv);
    testResults.multipleOrders = multipleResult;
    
    // Output summary
    log.section('Test Results Summary');
    
    const allTestsPassed = Object.values(testResults).every(result => result.success);
    
    if (allTestsPassed) {
      log.success('✅ ALL TESTS PASSED');
    } else {
      log.error('❌ SOME TESTS FAILED', {
        message: 'Check individual test results for details'
      });
    }
    
    Object.entries(testResults).forEach(([testName, result]) => {
      if (result.success) {
        log.success(`✅ ${testName}: PASSED`);
      } else {
        log.error(`❌ ${testName}: FAILED`, result.error);
      }
    });
    
    // Clean up all test data (optional, could be commented out to keep test data for inspection)
    if (testResults.marketOrder.orderId) {
      await cleanupTestData(
        testResults.marketOrder.orderId,
        testResults.marketOrder.commandId,
        testResults.marketOrder.responseId
      );
    }
    
    if (testResults.limitOrder.orderId) {
      await cleanupTestData(
        testResults.limitOrder.orderId,
        testResults.limitOrder.commandId,
        testResults.limitOrder.responseId
      );
    }
    
    if (testResults.failedOrder.orderId) {
      await cleanupTestData(
        testResults.failedOrder.orderId,
        testResults.failedOrder.commandId,
        testResults.failedOrder.responseId
      );
    }
    
    if (testResults.multipleOrders.orderIds) {
      for (let i = 0; i < testResults.multipleOrders.orderIds.length; i++) {
        await cleanupTestData(
          testResults.multipleOrders.orderIds[i],
          testResults.multipleOrders.commandIds[i],
          testResults.multipleOrders.responseIds[i]
        );
      }
    }
    
    // Clean up test farm and agent
    log.step('Cleaning up test farm and agent');
    if (testAgentId) {
      const { error: agentError } = await supabase
        .from('agents')
        .delete()
        .eq('id', testAgentId);
        
      if (agentError) {
        log.error(`Failed to delete test agent ${testAgentId}`, agentError);
      } else {
        log.success(`Test agent ${testAgentId} deleted`);
      }
    }
    
    if (testFarmId) {
      const { error: farmError } = await supabase
        .from('farms')
        .delete()
        .eq('id', testFarmId);
        
      if (farmError) {
        log.error(`Failed to delete test farm ${testFarmId}`, farmError);
      } else {
        log.success(`Test farm ${testFarmId} deleted`);
      }
    }
    
    console.log('\n🏁 Extended ElizaOS Integration Tests Complete');
    console.log('================================================');
    
    return allTestsPassed;
  } catch (error) {
    log.error('Test suite execution failed', error);
    console.log('\n❌ Extended ElizaOS Integration Tests Failed');
    console.log('================================================');
    return false;
  }
}

// Run the tests
runExtendedTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
