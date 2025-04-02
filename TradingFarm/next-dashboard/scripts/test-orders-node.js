// Script to test order creation with Node.js-compatible Supabase client
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const nodeFetch = require('node-fetch'); // Explicit fetch implementation for Node.js

// =====================================================
// CONFIGURATION & SETUP
// =====================================================

// Get credentials from environment and validate
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('==== Trading Farm Order Test Script ====');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Anon Key: ${supabaseKey?.substring(0, 15)}...`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local file');
  process.exit(1);
}

// Initialize Supabase client with explicit fetch implementation
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { fetch: nodeFetch }
});

// =====================================================
// TEST ORDERS
// =====================================================

const testOrders = {
  trailingStop: {
    farm_id: 1,
    exchange: 'binance',
    symbol: 'BTC/USDT',
    type: 'trailing_stop',
    side: 'buy',
    quantity: 0.01,
    price: 75000,
    time_in_force: 'gtc',
    status: 'pending',
    metadata: {
      trail_value: 5,
      trail_type: 'percent',
      activation_price: 76000
    }
  },
  
  oco: {
    farm_id: 1,
    exchange: 'binance',
    symbol: 'ETH/USDT',
    type: 'oco',
    side: 'buy',
    quantity: 0.1,
    price: 3500,
    time_in_force: 'gtc',
    status: 'pending',
    metadata: {
      take_profit: 4000,
      stop_loss: 3000
    }
  },
  
  bracket: {
    farm_id: 1,
    exchange: 'binance',
    symbol: 'SOL/USDT',
    type: 'bracket',
    side: 'buy',
    quantity: 1,
    price: 150,
    time_in_force: 'gtc',
    status: 'pending',
    metadata: {
      take_profit: 180,
      stop_loss: 130,
      trailing_stop: true,
      trail_value: 5,
      trail_type: 'percent'
    }
  }
};

// =====================================================
// TEST FUNCTIONS
// =====================================================

// List tables to verify connection
async function listTables() {
  console.log('\n📊 Checking database connection by listing tables...');
  
  try {
    const { data, error } = await supabase
      .rpc('list_tables');
    
    if (error) {
      console.error('❌ Database error:', error.message);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No tables found in database');
      return false;
    }
    
    console.log('✅ Successfully connected to database!');
    console.log('📋 Available tables:');
    data.forEach(table => console.log(`- ${table.tablename}`));
    
    // Check for orders table
    const hasOrdersTable = data.some(t => t.tablename === 'orders');
    if (hasOrdersTable) {
      console.log('✅ Orders table found!');
      return true;
    } else {
      console.log('⚠️ Orders table not found. Some tests may fail.');
      return true; // Continue with testing anyway
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Create a single test order
async function createOrder(orderType, orderData) {
  console.log(`\n🧪 Testing ${orderType} Order Creation...`);
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select();
    
    if (error) {
      console.error(`❌ Error creating ${orderType} order:`, error.message);
      return { success: false, error };
    }
    
    console.log(`✅ ${orderType} order created successfully!`);
    console.log('📝 Order data:', JSON.stringify(data, null, 2));
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Unexpected error creating ${orderType} order:`, error);
    return { success: false, error };
  }
}

// =====================================================
// MAIN TEST SEQUENCE
// =====================================================

async function runTests() {
  console.log('\n🚀 Starting order creation tests...');
  
  // First check database connection
  const dbConnected = await listTables();
  if (!dbConnected) {
    console.error('❌ Cannot proceed with tests due to database connection issues');
    return;
  }
  
  // Run order tests
  const results = {
    trailingStop: await createOrder('Trailing Stop', testOrders.trailingStop),
    oco: await createOrder('OCO', testOrders.oco),
    bracket: await createOrder('Bracket', testOrders.bracket)
  };
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  Object.entries(results).forEach(([type, result]) => {
    console.log(`${type}: ${result.success ? '✅ Success' : '❌ Failed'}`);
  });
  
  const successCount = Object.values(results).filter(r => r.success).length;
  console.log(`\n${successCount} out of ${Object.keys(results).length} tests passed`);
}

// Handle node-fetch dependency check
try {
  // Check if node-fetch is installed
  require.resolve('node-fetch');
  
  // Run the tests
  runTests()
    .catch(error => {
      console.error('❌ Fatal error:', error);
    });
} catch (err) {
  console.error('\n❌ Required dependency missing: node-fetch');
  console.log('Please install it with: npm install node-fetch@2');
}
