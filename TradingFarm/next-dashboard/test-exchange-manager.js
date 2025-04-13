/**
 * Exchange Connection Manager Direct Test
 * 
 * This script tests the functionality of the Exchange Connection Manager
 * by simulating the database operations and API calls.
 */

const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test credentials
const credentials = {
  // Hyperliquid
  hyperliquidCreds: {
    exchange_name: 'hyperliquid',
    chain: 'arbitrum',
    api_key: '', // Public endpoints don't need API key
    wallet_address: '0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2',
    private_key: '0x29311cb34026f4c04a6802575cd95b64316af02c85a53800bb2941dda569609a',
    label: 'Hyperliquid Arbitrum',
    is_testnet: false,
    permissions: {
      trade: true,
      withdraw: false,
      deposit: true
    }
  },
  
  // Bybit credentials - add if you want to test Bybit
  bybitCreds: {
    exchange_name: 'bybit',
    api_key: 'YOUR_BYBIT_API_KEY', // Replace with your Bybit API key
    api_secret: 'YOUR_BYBIT_API_SECRET', // Replace with your Bybit API secret
    label: 'Bybit Testnet',
    is_testnet: true,
    permissions: {
      trade: true,
      withdraw: false,
      deposit: true
    }
  }
};

/**
 * Test 1: Add a new exchange connection
 */
async function testAddExchangeConnection() {
  console.log('🧪 TEST 1: Add Exchange Connection');
  try {
    const { data, error } = await supabase
      .from('exchange_credentials')
      .insert([credentials.hyperliquidCreds])
      .select();
    
    if (error) {
      console.log('❌ Failed to add exchange connection:', error.message);
      return null;
    }
    
    console.log('✅ Successfully added exchange connection');
    console.log(data[0]);
    return data[0];
  } catch (error) {
    console.log('❌ Error adding exchange connection:', error.message);
    return null;
  }
}

/**
 * Test 2: Test connection health
 */
async function testConnectionHealth(connection) {
  console.log('\n🧪 TEST 2: Check Connection Health');
  
  if (!connection) {
    console.log('❌ No connection to test');
    return;
  }
  
  try {
    // Test Hyperliquid API
    if (connection.exchange_name === 'hyperliquid') {
      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'userState',
          user: connection.wallet_address
        })
      });
      
      if (!response.ok) {
        throw new Error(`API Error (${response.status}): ${await response.text()}`);
      }
      
      const data = await response.json();
      console.log('✅ Connection is healthy');
      console.log('Account Value:', data?.crossMarginSummary?.accountValue || 'N/A');
      console.log('Positions:', data?.assetPositions?.length || 0);
    }
    
    // Add Bybit test here if needed
    
  } catch (error) {
    console.log('❌ Connection health check failed:', error.message);
  }
}

/**
 * Test 3: List all connections
 */
async function testListConnections() {
  console.log('\n🧪 TEST 3: List Exchange Connections');
  try {
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('*');
    
    if (error) {
      console.log('❌ Failed to list connections:', error.message);
      return;
    }
    
    console.log(`✅ Found ${data.length} connections:`);
    data.forEach((conn, index) => {
      console.log(`${index + 1}. ${conn.exchange_name} (${conn.label || 'Unnamed'})`);
    });
  } catch (error) {
    console.log('❌ Error listing connections:', error.message);
  }
}

/**
 * Test 4: Delete test connection
 */
async function testDeleteConnection(connectionId) {
  console.log('\n🧪 TEST 4: Delete Exchange Connection');
  
  if (!connectionId) {
    console.log('❌ No connection ID to delete');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('exchange_credentials')
      .delete()
      .eq('id', connectionId);
    
    if (error) {
      console.log('❌ Failed to delete connection:', error.message);
      return;
    }
    
    console.log('✅ Successfully deleted exchange connection');
  } catch (error) {
    console.log('❌ Error deleting connection:', error.message);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('======================================');
  console.log('EXCHANGE CONNECTION MANAGER TEST');
  console.log('======================================');
  
  // Test 1: Add connection
  const newConnection = await testAddExchangeConnection();
  
  // Test 2: Check health
  await testConnectionHealth(newConnection);
  
  // Test 3: List connections
  await testListConnections();
  
  // Test 4: Delete test connection (if requested)
  if (newConnection && process.argv.includes('--cleanup')) {
    await testDeleteConnection(newConnection.id);
  }
  
  console.log('\n======================================');
  console.log('TESTS COMPLETED');
  console.log('======================================');
}

// Run tests
runTests()
  .catch(console.error)
  .finally(() => process.exit());
