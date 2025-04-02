/**
 * Test Order Creation Functionality
 * 
 * This script tests the order creation functionality using the 
 * same approach as the Trading Farm dashboard components.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Supabase configuration from environment variables - Use CORRECT URL
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

console.log('Using hardcoded credentials to ensure correctness:');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Key (first 10 chars): ${SUPABASE_KEY.substring(0, 10)}...`);

// Create supabase client similar to how it's used in the dashboard
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

// Sample test orders
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

// Test creating orders
async function testOrderCreation() {
  console.log('🧪 Testing order creation...');
  
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
  console.log('==== Trading Farm Order Test ====');
  console.log(`Using Supabase URL: ${SUPABASE_URL}`);
  
  // First, check if we can retrieve existing orders
  const existingOrders = await listOrders();
  
  if (existingOrders.length > 0) {
    console.log('\n✅ Found existing orders - table is accessible');
  } else {
    console.log('\n⚠️ No existing orders found - attempting to create new ones');
  }
  
  // Try creating new test orders
  await testOrderCreation();
  
  // List orders again to see if our new orders were created
  if (await testOrderCreation()) {
    await listOrders();
  }
  
  console.log('\n✅ Test completed! Check results above.');
  console.log('\nIf your test was successful, you can now use the order creation test page:');
  console.log('http://localhost:3004/dashboard/orders/test');
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
});
