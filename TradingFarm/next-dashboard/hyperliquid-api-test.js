/**
 * Hyperliquid API Test Script
 * 
 * This script tests the updated Hyperliquid API integration
 * with the correct API formats as of April 2025.
 */

// Import necessary libraries
const { ethers } = require('ethers');

// Configuration
const config = {
  privateKey: '0x29311cb34026f4c04a6802575cd95b64316af02c85a53800bb2941dda569609a', // Replace with your private key
  walletAddress: '0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2', // Replace with your wallet address
  testnet: false
};

// API Endpoints
const INFO_API = 'https://api.hyperliquid.xyz/info';
const EXCHANGE_API = 'https://api.hyperliquid.xyz/exchange';

/**
 * Sign a message with the private key
 */
async function signMessage(message, privateKey) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(message)));
    const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
    return signature;
  } catch (error) {
    console.error('Signing error:', error);
    throw error;
  }
}

/**
 * Call the Hyperliquid Info API
 */
async function callInfoAPI(body) {
  try {
    console.log(`📤 Info API Request: ${JSON.stringify(body)}`);
    
    const response = await fetch(INFO_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Info API error:', error);
    return { error: error.message };
  }
}

/**
 * Call the Hyperliquid Exchange API with authentication
 */
async function callExchangeAPI(action, args) {
  try {
    // Create payload for signature
    const payload = { action, args };
    
    // Sign the payload
    const signature = await signMessage(payload, config.privateKey);
    
    // Create the request body
    const body = {
      signature,
      wallet: config.walletAddress,
      payload
    };
    
    console.log(`📤 Exchange API Request: ${JSON.stringify(body)}`);
    
    // Make the API call
    const response = await fetch(EXCHANGE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Exchange API error:', error);
    return { error: error.message };
  }
}

/**
 * Test the Hyperliquid API endpoints
 */
async function runTests() {
  console.log('======================================');
  console.log('HYPERLIQUID API FORMAT TEST');
  console.log('======================================');
  console.log(`Wallet: ${config.walletAddress}`);
  console.log(`Environment: ${config.testnet ? 'Testnet' : 'Mainnet'}`);
  console.log('======================================\n');
  
  // --- Public API Tests --- //
  console.log('🧪 TESTING PUBLIC INFO ENDPOINTS');
  
  // Test 1: Get Universe (assets)
  console.log('\n🔍 TEST 1: Get Universe');
  const universeResponse = await callInfoAPI({ type: 'universe' });
  
  if (universeResponse.error) {
    console.log('❌ Test failed:', universeResponse.error);
  } else {
    console.log('✅ Success! Sample data:');
    console.log(JSON.stringify(universeResponse.slice(0, 2), null, 2));
  }
  
  // Test 2: Get Market Data (L2 Book)
  console.log('\n🔍 TEST 2: Get L2 Book for BTC');
  const l2BookResponse = await callInfoAPI({ 
    type: 'l2Book', 
    asset: 'BTC' 
  });
  
  if (l2BookResponse.error) {
    console.log('❌ Test failed:', l2BookResponse.error);
  } else {
    console.log('✅ Success! Sample data:');
    console.log(`Bids: ${l2BookResponse.bids?.slice(0, 2).map(b => `${b[0]}@${b[1]}`).join(', ') || 'N/A'}`);
    console.log(`Asks: ${l2BookResponse.asks?.slice(0, 2).map(a => `${a[0]}@${a[1]}`).join(', ') || 'N/A'}`);
  }
  
  // Test 3: Get Recent Trades
  console.log('\n🔍 TEST 3: Get Recent Trades for ETH');
  const recentTradesResponse = await callInfoAPI({ 
    type: 'recentTrades', 
    asset: 'ETH',
    limit: 5
  });
  
  if (recentTradesResponse.error) {
    console.log('❌ Test failed:', recentTradesResponse.error);
  } else {
    console.log('✅ Success! Sample data:');
    console.log(JSON.stringify(recentTradesResponse.slice(0, 2), null, 2));
  }
  
  // --- Private API Tests --- //
  console.log('\n🧪 TESTING PRIVATE INFO ENDPOINTS');
  
  // Test 4: Get User State
  console.log('\n🔍 TEST 4: Get User State');
  const userStateResponse = await callInfoAPI({ 
    type: 'userState',
    user: config.walletAddress
  });
  
  if (userStateResponse.error) {
    console.log('❌ Test failed:', userStateResponse.error);
  } else {
    console.log('✅ Success! Sample data:');
    console.log(`Assets: ${userStateResponse.assetPositions?.length || 0}`);
    console.log(`USDC Balance: ${userStateResponse.crossMarginSummary?.accountValue || 'N/A'}`);
  }
  
  // Test 5: Get User Orders
  console.log('\n🔍 TEST 5: Get User Orders');
  const userOrdersResponse = await callInfoAPI({ 
    type: 'userOrders',
    user: config.walletAddress
  });
  
  if (userOrdersResponse.error) {
    console.log('❌ Test failed:', userOrdersResponse.error);
  } else {
    console.log('✅ Success! Sample data:');
    console.log(`Open Orders: ${userOrdersResponse.length || 0}`);
    if (userOrdersResponse.length > 0) {
      console.log(JSON.stringify(userOrdersResponse[0], null, 2));
    }
  }
  
  // --- Exchange API Tests --- //
  console.log('\n🧪 TESTING EXCHANGE API');
  
  // Test 6: Place a test order (if enabled)
  const PLACE_TEST_ORDER = false; // Set to true to place a real order
  if (PLACE_TEST_ORDER) {
    console.log('\n🔍 TEST 6: Place a Limit Order');
    
    const orderResponse = await callExchangeAPI('order', {
      asset: 'ETH',
      side: 'B', // Buy
      size: '0.01',
      limitPx: '1500', // Limit price far from market to avoid execution
      orderType: 'Limit',
      reduceOnly: false,
      cloid: `test_${Date.now()}`
    });
    
    if (orderResponse.error || orderResponse.status !== 'ok') {
      console.log('❌ Test failed:', orderResponse.error || orderResponse.response?.error);
    } else {
      console.log('✅ Success! Order placed:');
      console.log(JSON.stringify(orderResponse.response, null, 2));
    }
  } else {
    console.log('\n🔍 TEST 6: Place Order Test (SKIPPED)');
    console.log('Skipping order placement test. Set PLACE_TEST_ORDER to true to enable.');
  }
  
  console.log('\n======================================');
  console.log('TEST SUMMARY');
  console.log('======================================');
  console.log('Tests completed. Check the results above.');
  console.log('======================================');
}

// Run the tests
runTests()
  .then(() => console.log('Tests completed.'))
  .catch(error => console.error('Unhandled error:', error));
