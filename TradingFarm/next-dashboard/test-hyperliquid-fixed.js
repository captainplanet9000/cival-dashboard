/**
 * Hyperliquid Connection Test Script - Updated Version
 * 
 * This script tests the connection to Hyperliquid with the proper API format
 */

const { ethers } = require('ethers');
const crypto = require('crypto');

// Configuration - Replace with your actual credentials
const config = {
  privateKey: '0x29311cb34026f4c04a6802575cd95b64316af02c85a53800bb2941dda569609a', // This should be the private key
  walletAddress: '0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2', // The wallet address
  chain: 'arbitrum', // 'arbitrum' or 'arbitrum_goerli' for testnet
  testnet: false // Set to true for testnet
};

// Base URL - updated to use the correct Hyperliquid API endpoints
const BASE_URL = config.chain === 'arbitrum_goerli' 
  ? 'https://api.hyperliquid-testnet.xyz/info' 
  : 'https://api.hyperliquid.xyz/info';

const EXCHANGE_URL = config.chain === 'arbitrum_goerli'
  ? 'https://api.hyperliquid-testnet.xyz/exchange'
  : 'https://api.hyperliquid.xyz/exchange';

/**
 * Utility to sign messages with the wallet
 */
async function signMessage(wallet, action, args) {
  const payload = {
    action,
    args
  };
  
  const message = JSON.stringify(payload);
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));
  const signature = await wallet.signMessage(ethers.utils.arrayify(hash));
  
  return {
    signature,
    message: payload
  };
}

/**
 * Call the Hyperliquid API with proper error handling
 */
async function callApi(endpoint, method, body) {
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call error:', error.message);
    return { error: error.message };
  }
}

/**
 * Test public endpoints with the updated format
 */
async function testPublicEndpoints() {
  console.log('Testing Hyperliquid Public Endpoints...');
  let success = true;
  
  try {
    // Test meta endpoint (universe)
    console.log('\n1. Fetching market universe...');
    const metaResponse = await callApi(BASE_URL, 'POST', { type: 'universe' });
    if (metaResponse.error) {
      console.log('❌ Failed to fetch universe');
      success = false;
    } else {
      console.log('✅ Successfully fetched universe');
      console.log('Sample data:', JSON.stringify(metaResponse.slice(0, 3), null, 2));
    }
    
    // Test L2 orderbook for BTC
    console.log('\n2. Fetching BTC orderbook...');
    const orderBookResponse = await callApi(BASE_URL, 'POST', { 
      type: 'l2Book',
      asset: 'BTC'
    });
    if (orderBookResponse.error) {
      console.log('❌ Failed to fetch orderbook');
      success = false;
    } else {
      console.log('✅ Successfully fetched orderbook');
      
      // Display top 3 bids and asks if available
      const bids = orderBookResponse.bids?.slice(0, 3) || [];
      const asks = orderBookResponse.asks?.slice(0, 3) || [];
      
      console.log('Top 3 bids:', bids);
      console.log('Top 3 asks:', asks);
    }
    
    // Test candles for BTC
    console.log('\n3. Fetching BTC candles...');
    const candlesResponse = await callApi(BASE_URL, 'POST', { 
      type: 'candleSnapshot',
      asset: 'BTC',
      interval: '1h',
      limit: 5
    });
    if (candlesResponse.error) {
      console.log('❌ Failed to fetch candles');
      success = false;
    } else {
      console.log('✅ Successfully fetched candles');
      console.log('Sample data:', JSON.stringify(candlesResponse.slice(0, 1), null, 2));
    }
    
    return success;
  } catch (error) {
    console.error('Error testing public endpoints:', error);
    return false;
  }
}

/**
 * Test private endpoints with authentication
 */
async function testPrivateEndpoints() {
  if (!config.privateKey || !config.walletAddress) {
    console.warn('Private key or wallet address not provided. Skipping private endpoint tests.');
    return false;
  }
  
  console.log('\nTesting Hyperliquid Private Endpoints...');
  let success = true;
  
  try {
    // Create a wallet from the private key
    const wallet = new ethers.Wallet(config.privateKey);
    
    // Get user state
    console.log('\n1. Fetching user state...');
    const userStateResponse = await callApi(BASE_URL, 'POST', { 
      type: 'userState',
      user: config.walletAddress
    });
    
    if (userStateResponse.error) {
      console.log('❌ Failed to fetch user state');
      success = false;
    } else {
      console.log('✅ Successfully fetched user state');
      console.log('User state:', JSON.stringify(userStateResponse, null, 2));
    }
    
    // Get user fills
    console.log('\n2. Fetching user fills...');
    const userFillsResponse = await callApi(BASE_URL, 'POST', { 
      type: 'userFills',
      user: config.walletAddress,
      startTime: 0,
      endTime: Date.now()
    });
    
    if (userFillsResponse.error) {
      console.log('❌ Failed to fetch user fills');
      success = false;
    } else {
      console.log('✅ Successfully fetched user fills');
      console.log('User fills count:', userFillsResponse.length);
      if (userFillsResponse.length > 0) {
        console.log('Latest fill:', JSON.stringify(userFillsResponse[0], null, 2));
      }
    }
    
    // Get user open orders
    console.log('\n3. Fetching user orders...');
    const userOrdersResponse = await callApi(BASE_URL, 'POST', { 
      type: 'userOrders',
      user: config.walletAddress
    });
    
    if (userOrdersResponse.error) {
      console.log('❌ Failed to fetch user orders');
      success = false;
    } else {
      console.log('✅ Successfully fetched user orders');
      console.log('Open orders count:', userOrdersResponse.length);
      if (userOrdersResponse.length > 0) {
        console.log('Latest order:', JSON.stringify(userOrdersResponse[0], null, 2));
      }
    }
    
    return success;
  } catch (error) {
    console.error('Error testing private endpoints:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('==================================================');
  console.log('HYPERLIQUID CONNECTION TEST (UPDATED)');
  console.log('==================================================');
  console.log(`Wallet Address: ${config.walletAddress || 'Not provided'}`);
  console.log(`Chain: ${config.chain}`);
  console.log(`Environment: ${config.testnet ? 'Testnet' : 'Mainnet'}`);
  console.log('==================================================\n');
  
  const publicSuccess = await testPublicEndpoints();
  const privateSuccess = await testPrivateEndpoints();
  
  console.log('\n==================================================');
  console.log('TEST RESULTS:');
  console.log('==================================================');
  console.log(`Public Endpoints: ${publicSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Private Endpoints: ${privateSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log('==================================================');
  
  return publicSuccess && privateSuccess;
}

// Run the tests
runTests().then(success => {
  console.log(`\nOverall test ${success ? 'passed' : 'failed'}.`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
