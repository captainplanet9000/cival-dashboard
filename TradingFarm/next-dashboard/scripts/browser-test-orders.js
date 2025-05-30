/**
 * Browser-compatible order testing script
 * Run this with: npx tsx scripts/browser-test-orders.js
 */

import { createClient } from '@supabase/supabase-js';

// Use the correct Supabase credentials from our environment
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

console.log('==== Trading Farm Order Test (Browser API) ====');
console.log(`Using URL: ${SUPABASE_URL}`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sample test order based on your order types
const testOrders = [
  {
    name: 'Basic Market Order',
    data: {
      farm_id: 1,
      exchange: 'binance',
      symbol: 'BTC/USDT',
      type: 'market',
      side: 'buy',
      quantity: 0.01,
      status: 'pending'
    }
  },
  {
    name: 'Trailing Stop Order',
    data: {
      farm_id: 1,
      exchange: 'binance',
      symbol: 'BTC/USDT',
      type: 'trailing_stop',
      side: 'sell',
      quantity: 0.01,
      price: 75000,
      status: 'pending',
      metadata: {
        trail_value: 5,
        trail_type: 'percent',
        activation_price: 76000
      }
    }
  },
  {
    name: 'OCO Order with Agent',
    data: {
      farm_id: 1,
      agent_id: 1, // Link to your ElizaOS agent
      exchange: 'binance',
      symbol: 'ETH/USDT',
      type: 'oco',
      side: 'buy',
      quantity: 0.1,
      price: 3500,
      status: 'pending',
      metadata: {
        take_profit: 4000,
        stop_loss: 3000
      }
    }
  }
];

// Check if orders table exists by trying to get a single row
async function checkOrdersTable() {
  console.log('\n📊 Checking if orders table exists...');
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.error('❌ Orders table does not exist');
        console.log('\nCreating orders table structure...');
        await createOrdersTable();
        return false;
      } else {
        console.error('❌ Error checking orders table:', error.message);
        return false;
      }
    }
    
    console.log('✅ Orders table exists');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Create orders table using RPC if needed
async function createOrdersTable() {
  // Use Supabase SQL RPC to create the table
  const { error } = await supabase.rpc('create_orders_table');
  
  if (error) {
    // If the function doesn't exist, suggest manual creation through SQL Editor
    console.error('❌ Failed to create orders table:', error.message);
    console.log('\n⚠️ Please create the orders table manually using the migration file:');
    console.log('1. Go to Supabase dashboard: https://app.supabase.com/project/bgvlzvswzpfoywfxehis');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the SQL from: supabase/migrations/20250401_create_orders_table.sql');
    console.log('4. Execute the SQL to create the table');
    return false;
  }
  
  console.log('✅ Orders table created successfully');
  return true;
}

// Test creating orders
async function testOrderCreation() {
  console.log('\n🧪 Testing order creation...');
  
  let successCount = 0;
  
  for (const order of testOrders) {
    console.log(`\nTesting ${order.name}...`);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert(order.data)
        .select();
      
      if (error) {
        console.error(`❌ Error creating ${order.name}:`, error.message);
        continue;
      }
      
      console.log(`✅ ${order.name} created successfully!`);
      console.log(data);
      successCount++;
    } catch (error) {
      console.error(`❌ Unexpected error creating ${order.name}:`, error);
    }
  }
  
  console.log(`\n${successCount} out of ${testOrders.length} orders created successfully.`);
  return successCount > 0;
}

// List existing orders
async function listOrders() {
  console.log('\n📋 Listing existing orders...');
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error listing orders:', error.message);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No orders found.');
      return [];
    }
    
    console.log(`Found ${data.length} orders:`);
    data.forEach((order, index) => {
      console.log(`\nOrder ${index + 1}:`);
      console.log(`- ID: ${order.id}`);
      console.log(`- Type: ${order.type}`);
      console.log(`- Symbol: ${order.symbol}`);
      console.log(`- Side: ${order.side}`);
      console.log(`- Quantity: ${order.quantity}`);
      console.log(`- Status: ${order.status}`);
      console.log(`- Created: ${new Date(order.created_at).toLocaleString()}`);
    });
    
    return data;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return [];
  }
}

// Main function
async function main() {
  // Check if orders table exists
  const tableExists = await checkOrdersTable();
  
  // If table exists or was created successfully, test order creation
  if (tableExists) {
    const success = await testOrderCreation();
    
    if (success) {
      // List orders after successful creation
      await listOrders();
    }
  }
  
  console.log('\n✅ Test completed!');
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
});
