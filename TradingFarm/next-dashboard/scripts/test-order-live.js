// Live test script for order creation functionality using real Supabase connection
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Set up the Supabase client with the environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Make sure .env.local is configured correctly.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sample order data for testing
const sampleTrailingStopOrder = {
  farm_id: 1,
  agent_id: null, // Optional
  exchange: 'binance',
  symbol: 'BTC/USDT',
  side: 'buy',
  quantity: 0.01,
  price: 75000,
  time_in_force: 'gtc',
  trail_value: 5,
  trail_type: 'percent',
  activation_price: 76000
};

const sampleOcoOrder = {
  farm_id: 1,
  agent_id: null, // Optional
  exchange: 'binance',
  symbol: 'BTC/USDT',
  side: 'buy',
  quantity: 0.01,
  price: 75000,
  time_in_force: 'gtc',
  take_profit: 80000,
  stop_loss: 70000
};

const sampleBracketOrder = {
  farm_id: 1,
  agent_id: null, // Optional
  exchange: 'binance',
  symbol: 'BTC/USDT',
  side: 'buy',
  quantity: 0.01,
  entry_price: 75000,
  time_in_force: 'gtc',
  take_profit: 80000,
  stop_loss: 70000,
  trailing_stop: true,
  trail_value: 5,
  trail_type: 'percent'
};

// Helper function to log results
const logResult = (testName, result) => {
  console.log(`\n----- ${testName} Test Result -----`);
  if (result.error) {
    console.error('❌ Error:', result.error.message);
    console.error('Error details:', result.error);
  } else {
    console.log('✅ Success!');
    console.log('Order ID:', result.data?.id);
    console.log('Order Data:', JSON.stringify(result.data, null, 2));
  }
};

// Test functions
async function testTrailingStopOrder() {
  console.log('\n🧪 Testing Trailing Stop Order Creation...');
  
  try {
    // Insert the order
    const { data, error } = await supabase
      .from('orders')
      .insert({
        farm_id: sampleTrailingStopOrder.farm_id,
        agent_id: sampleTrailingStopOrder.agent_id,
        exchange: sampleTrailingStopOrder.exchange,
        symbol: sampleTrailingStopOrder.symbol,
        type: 'trailing_stop',
        side: sampleTrailingStopOrder.side,
        quantity: sampleTrailingStopOrder.quantity,
        price: sampleTrailingStopOrder.price,
        time_in_force: sampleTrailingStopOrder.time_in_force,
        status: 'pending',
        metadata: {
          trail_value: sampleTrailingStopOrder.trail_value,
          trail_type: sampleTrailingStopOrder.trail_type,
          activation_price: sampleTrailingStopOrder.activation_price
        }
      })
      .select()
      .single();
    
    logResult('Trailing Stop Order', { data, error });
    return { data, error };
  } catch (error) {
    logResult('Trailing Stop Order', { error });
    return { error };
  }
}

async function testOcoOrder() {
  console.log('\n🧪 Testing OCO Order Creation...');
  
  try {
    // Insert the order
    const { data, error } = await supabase
      .from('orders')
      .insert({
        farm_id: sampleOcoOrder.farm_id,
        agent_id: sampleOcoOrder.agent_id,
        exchange: sampleOcoOrder.exchange,
        symbol: sampleOcoOrder.symbol,
        type: 'oco',
        side: sampleOcoOrder.side,
        quantity: sampleOcoOrder.quantity,
        price: sampleOcoOrder.price,
        time_in_force: sampleOcoOrder.time_in_force,
        status: 'pending',
        metadata: {
          take_profit: sampleOcoOrder.take_profit,
          stop_loss: sampleOcoOrder.stop_loss
        }
      })
      .select()
      .single();
    
    logResult('OCO Order', { data, error });
    return { data, error };
  } catch (error) {
    logResult('OCO Order', { error });
    return { error };
  }
}

async function testBracketOrder() {
  console.log('\n🧪 Testing Bracket Order Creation...');
  
  try {
    // Insert the order
    const { data, error } = await supabase
      .from('orders')
      .insert({
        farm_id: sampleBracketOrder.farm_id,
        agent_id: sampleBracketOrder.agent_id,
        exchange: sampleBracketOrder.exchange,
        symbol: sampleBracketOrder.symbol,
        type: 'bracket',
        side: sampleBracketOrder.side,
        quantity: sampleBracketOrder.quantity,
        price: sampleBracketOrder.entry_price,
        time_in_force: sampleBracketOrder.time_in_force,
        status: 'pending',
        metadata: {
          take_profit: sampleBracketOrder.take_profit,
          stop_loss: sampleBracketOrder.stop_loss,
          trailing_stop: sampleBracketOrder.trailing_stop,
          trail_value: sampleBracketOrder.trail_value,
          trail_type: sampleBracketOrder.trail_type
        }
      })
      .select()
      .single();
    
    logResult('Bracket Order', { data, error });
    return { data, error };
  } catch (error) {
    logResult('Bracket Order', { error });
    return { error };
  }
}

// Check if the orders table exists
async function checkOrdersTable() {
  console.log('📊 Checking if orders table exists...');
  
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'orders');
  
  if (error) {
    console.error('❌ Error checking orders table:', error.message);
    return false;
  }
  
  if (data && data.length > 0) {
    console.log('✅ Orders table exists!');
    return true;
  } else {
    console.log('❌ Orders table does not exist!');
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting order creation tests with live Supabase connection...');
  console.log(`Supabase URL: ${supabaseUrl}`);
  
  // First check if the orders table exists
  const tableExists = await checkOrdersTable();
  
  if (!tableExists) {
    console.error('❌ Cannot run tests: orders table does not exist.');
    return;
  }
  
  // Run the tests
  await testTrailingStopOrder();
  await testOcoOrder();
  await testBracketOrder();
  
  console.log('\n✅ All tests completed!');
}

// Execute the tests
runTests()
  .catch(error => {
    console.error('❌ Error running tests:', error);
  });
