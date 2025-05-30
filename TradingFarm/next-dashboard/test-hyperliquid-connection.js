/**
 * Hyperliquid Connection Test Script
 * 
 * This script tests the connection to Hyperliquid on Arbitrum
 * with the provided API credentials.
 */

const { ethers } = require('ethers');

// Configuration - Replace with your actual credentials
const config = {
  apiKey: '', // Optional for public endpoints
  privateKey: '0x29311cb34026f4c04a6802575cd95b64316af02c85a53800bb2941dda569609a', // This should be the private key you provided
  walletAddress: '0xAe93892da6055a6ed3d5AAa53A05Ce54ee28dDa2', // The wallet address you provided
  testnet: false  // Set to true for testnet, false for mainnet
};

// Hyperliquid API base URL
const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz';

/**
 * Create a signature for a request using a private key
 */
async function createSignature(privateKey, message) {
  try {
    // Create a wallet from the private key
    const wallet = new ethers.Wallet(privateKey);
    
    // Hash the message using keccak256
    const messageStr = JSON.stringify(message);
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(messageStr));
    
    // Sign the hash
    const signature = await wallet.signMessage(ethers.utils.arrayify(hash));
    
    return signature;
  } catch (error) {
    console.error('Error creating signature:', error);
    throw new Error(`Failed to create signature: ${error.message}`);
  }
}

/**
 * Make a request to the Hyperliquid API
 */
async function makeRequest(endpoint, method = 'GET', params = {}, isPrivate = true) {
  try {
    const url = `${HYPERLIQUID_API_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    let requestBody = { ...params };
    
    if (isPrivate && config.privateKey) {
      // Hyperliquid requires wallet signature for authentication
      if (!config.walletAddress) {
        throw new Error('Wallet address is required for private endpoints');
      }
      
      const timestamp = Date.now();
      const nonce = Math.floor(Math.random() * 1000000);
      
      // Create signature
      const message = {
        ...requestBody,
        timestamp,
        nonce
      };
      
      const signature = await createSignature(config.privateKey, message);
      
      // Add authentication parameters
      requestBody = {
        ...requestBody,
        signature,
        wallet: config.walletAddress,
        timestamp,
        nonce
      };
    }
    
    // Make the request
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(requestBody) : undefined,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Hyperliquid API error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Test public endpoints
 */
async function testPublicEndpoints() {
  console.log('Testing Hyperliquid Public Endpoints...');
  
  try {
    // Test market meta endpoint
    console.log('\nFetching market meta information...');
    const metaResponse = await makeRequest('/info', 'POST', { type: 'meta' }, false);
    console.log('Response:', JSON.stringify(metaResponse, null, 2).substring(0, 500) + '...');
    
    // Test funding rates endpoint
    console.log('\nFetching funding rates...');
    const fundingResponse = await makeRequest('/info', 'POST', { type: 'fundingRates' }, false);
    console.log('Response:', JSON.stringify(fundingResponse, null, 2).substring(0, 500) + '...');
    
    // Test recent trades for BTC
    console.log('\nFetching recent trades for BTC...');
    const tradesResponse = await makeRequest('/info', 'POST', { 
      type: 'trades', 
      asset: 'BTC',
      limit: 5
    }, false);
    console.log('Response:', JSON.stringify(tradesResponse, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error testing public endpoints:', error);
    return false;
  }
}

/**
 * Test private endpoints
 */
async function testPrivateEndpoints() {
  if (!config.privateKey || !config.walletAddress) {
    console.warn('Private key or wallet address not provided. Skipping private endpoint tests.');
    return false;
  }
  
  console.log('\nTesting Hyperliquid Private Endpoints...');
  
  try {
    // Test account information endpoint
    console.log('\nFetching account information...');
    const accountResponse = await makeRequest('/info', 'POST', { type: 'clearinghouseState' }, true);
    console.log('Response:', JSON.stringify(accountResponse, null, 2));
    
    // Test positions endpoint
    console.log('\nFetching positions...');
    const positionsResponse = await makeRequest('/info', 'POST', { type: 'positions' }, true);
    console.log('Response:', JSON.stringify(positionsResponse, null, 2));
    
    // Test open orders endpoint
    console.log('\nFetching open orders...');
    const ordersResponse = await makeRequest('/info', 'POST', { type: 'openOrders' }, true);
    console.log('Response:', JSON.stringify(ordersResponse, null, 2));
    
    return true;
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
  console.log('HYPERLIQUID CONNECTION TEST');
  console.log('==================================================');
  console.log(`Wallet Address: ${config.walletAddress || 'Not provided'}`);
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
