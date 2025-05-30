/**
 * Test Order Creation with ElizaOS Integration
 * 
 * This script tests the creation of an order with agent_id
 * and verifies that the ElizaOS command is automatically generated.
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create a test order with ElizaOS agent integration
 */
async function createTestOrder() {
  console.log('🚀 Creating test order with ElizaOS agent integration...');
  
  try {
    // Create a unique identifier for this test
    const testId = new Date().toISOString().replace(/[-:.TZ]/g, '');
    
    // 1. Create a test order with agent_id = 1
    console.log(`Creating order with agent_id = 1 (Test ID: ${testId})...`);
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        farm_id: 1,
        agent_id: 1, // ElizaOS agent ID
        exchange: 'binance',
        symbol: 'BTC/USDT',
        order_type: 'market', // Corrected field name from 'type' to 'order_type'
        side: 'buy',
        quantity: 0.01,
        status: 'pending',
        metadata: { test_id: testId }
      })
      .select('id')
      .single();
    
    if (orderError) {
      console.error('❌ Error creating order:', orderError.message);
      return;
    }
    
    console.log(`✅ Order created with ID: ${order.id}`);
    
    // 2. Wait a moment for the trigger to execute
    console.log('Waiting for ElizaOS trigger to process...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Check if the agent_command was created automatically
    const { data: commands, error: commandError } = await supabase
      .from('agent_commands')
      .select('*')
      .eq('order_id', order.id);
    
    if (commandError) {
      console.error('❌ Error retrieving agent commands:', commandError.message);
      return;
    }
    
    if (commands && commands.length > 0) {
      console.log(`✅ ElizaOS integration successful! Found ${commands.length} commands for this order.`);
      console.log('Command details:', commands[0]);
    } else {
      console.error('❌ ElizaOS integration FAILED: No agent commands were created for this order.');
      console.log('This could be because:');
      console.log('1. The trigger was not created correctly in the database');
      console.log('2. The agent_commands table does not exist');
      console.log('3. The order_id field is not present in agent_commands table');
      
      // Check if agent_commands table exists
      console.log('\nChecking if agent_commands table exists...');
      const { data: tableInfo, error: tableError } = await supabase
        .from('agent_commands')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('  ❌ agent_commands table check failed:', tableError.message);
      } else {
        console.log('  ✅ agent_commands table exists');
        
        // Check if orders table has the right structure
        console.log('\nChecking orders table structure...');
        const { data: orderStructure, error: structureError } = await supabase
          .from('orders')
          .select('*')
          .limit(1);
        
        if (structureError) {
          console.error('  ❌ orders table check failed:', structureError.message);
        } else {
          console.log('  ✅ orders table exists with structure:', Object.keys(orderStructure[0] || {}).join(', '));
        }
      }
    }
    
    // 4. Get order details to verify
    const { data: orderDetails, error: orderDetailsError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .single();
    
    if (orderDetailsError) {
      console.error('❌ Error retrieving order details:', orderDetailsError.message);
    } else {
      console.log('\nOrder Details:', orderDetails);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
createTestOrder().catch(error => {
  console.error('❌ Fatal error:', error);
});
