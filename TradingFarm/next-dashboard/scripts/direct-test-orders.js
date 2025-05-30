// Direct order testing script with hardcoded credentials
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// ===== CORRECT HARDCODED VALUES =====
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

// Initialize Supabase client
console.log('==== Trading Farm Direct Order Test ====');
console.log(`Using URL: ${SUPABASE_URL}`);
console.log(`Using Key (first 10 chars): ${SUPABASE_KEY.substring(0, 10)}...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  global: { fetch: fetch }
});

// Test order data
const testOrder = {
  farm_id: 1,
  exchange: 'binance',
  symbol: 'BTC/USDT',
  type: 'market',
  side: 'buy',
  quantity: 0.01,
  status: 'pending',
  metadata: {
    test: true,
    created_from: 'direct-test-script'
  }
};

// Simple database check
async function checkConnection() {
  console.log('\n📡 Testing database connection...');
  try {
    const { data, error } = await supabase
      .from('_migrations')  // This table should exist in every Supabase project
      .select('name')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection error:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Test order creation
async function testOrderCreation() {
  console.log('\n📝 Testing order creation...');
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(testOrder)
      .select();
    
    if (error) {
      console.error('❌ Error creating order:', error.message);
      
      // If the error is a constraint violation, it could be related to schema issues
      if (error.code === '23502' || error.code === '23503') {
        console.log('\n⚠️ You might be missing required fields or referencing non-existent values.');
      }
      
      return false;
    }
    
    console.log('✅ Order created successfully!');
    console.log('Order data:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// List tables to help with debugging
async function listTables() {
  console.log('\n📋 Listing database tables...');
  
  try {
    // Using a direct query to list tables since the RPC might not exist
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (error) {
      console.error('❌ Error listing tables:', error.message);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No tables found in public schema');
      return [];
    }
    
    console.log('Available tables:');
    data.forEach(table => console.log(`- ${table.tablename}`));
    
    return data.map(t => t.tablename);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return [];
  }
}

// Main function
async function runTest() {
  // First check connection
  const connected = await checkConnection();
  if (!connected) {
    console.error('❌ Cannot continue due to connection issues');
    return;
  }
  
  // List tables for reference
  const tables = await listTables();
  
  // Check if orders table exists
  if (!tables.includes('orders')) {
    console.log('⚠️ Orders table not found. Creating a test order will likely fail.');
    console.log('You may need to run your migrations first to create the schema.');
    
    // Ask if we should continue anyway
    console.log('\nContinuing with order creation test anyway...');
  }
  
  // Test order creation
  await testOrderCreation();
  
  console.log('\n✅ Test completed!');
}

// Run the test
runTest()
  .catch(error => {
    console.error('❌ Fatal error:', error);
  });
