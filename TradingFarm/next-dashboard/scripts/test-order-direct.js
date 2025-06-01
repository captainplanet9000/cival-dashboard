// Direct test script for order creation with detailed logging
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// =====================================================
// CONFIGURATION & SETUP
// =====================================================

// Get credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate credentials
console.log('🔑 Checking Supabase credentials...');
console.log(`URL: ${supabaseUrl?.substring(0, 15)}...`);
console.log(`Key: ${supabaseKey?.substring(0, 10)}...${supabaseKey?.substring(supabaseKey.length - 5)}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Check your .env.local file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { fetch: fetch }
});

// =====================================================
// ORDER TEMPLATES
// =====================================================

// Test data
const trailingStopOrder = {
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
};

const ocoOrder = {
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
};

const bracketOrder = {
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
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

// Pretty print results
function printResult(testName, result) {
  console.log(`\n----- ${testName} -----`);
  
  if (result.error) {
    console.error('❌ Error:', result.error.message);
    console.error('Error details:', result.error);
    return;
  }
  
  if (!result.data) {
    console.log('⚠️ No data returned');
    return;
  }
  
  console.log('✅ Success!');
  console.log(JSON.stringify(result.data, null, 2));
}

// =====================================================
// TEST FUNCTIONS
// =====================================================

// Check if the orders table exists
async function checkDatabase() {
  console.log('\n🔍 Checking database connection and schema...');
  
  try {
    // List all tables in the public schema
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (error) {
      console.error('❌ Database connection error:', error.message);
      return false;
    }
    
    // Check if we got data back
    if (!data || data.length === 0) {
      console.log('⚠️ No tables found in public schema');
      return false;
    }
    
    console.log('📋 Available tables:');
    data.forEach(table => console.log(`- ${table.tablename}`));
    
    // Check specifically for the orders table
    const ordersTable = data.find(t => t.tablename === 'orders');
    if (ordersTable) {
      console.log('✅ Orders table exists!');
      return true;
    } else {
      console.log('❌ Orders table not found!');
      return false;
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Create a test order
async function createTestOrder(orderData) {
  try {
    const result = await supabase
      .from('orders')
      .insert(orderData)
      .select();
    
    return result;
  } catch (error) {
    return { error };
  }
}

// =====================================================
// MAIN TEST SEQUENCE
// =====================================================

async function runTests() {
  console.log('🚀 Starting direct database tests...');
  
  // First verify database connection
  const dbReady = await checkDatabase();
  
  if (!dbReady) {
    console.error('❌ Database not ready. Please check your connection and schema.');
    return;
  }
  
  // Run the order creation tests
  console.log('\n📝 Testing order creation...');
  
  // Test 1: Create trailing stop order
  const trailingStopResult = await createTestOrder(trailingStopOrder);
  printResult('Trailing Stop Order', trailingStopResult);
  
  // Test 2: Create OCO order
  const ocoResult = await createTestOrder(ocoOrder);
  printResult('OCO Order', ocoResult);
  
  // Test 3: Create bracket order
  const bracketResult = await createTestOrder(bracketOrder);
  printResult('Bracket Order', bracketResult);
  
  console.log('\n✅ Test sequence completed');
}

// Execute the tests
runTests()
  .catch(error => {
    console.error('❌ Fatal error running tests:', error);
  });
