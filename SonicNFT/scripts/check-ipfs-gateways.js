#!/usr/bin/env node

/**
 * IPFS Gateway Performance Check Script
 * 
 * This script tests the performance of various IPFS gateways and updates the database
 * with the results. It helps optimize the IPFS experience for users by finding the
 * fastest available gateways.
 */

require('dotenv').config({ path: '../frontend/.env.local' });
const { Pool } = require('pg');
const fetch = require('node-fetch');

// Test CID - a small file to check gateway availability
const TEST_CID = 'QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx';

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Default gateways to add if they don't exist in the database
const DEFAULT_GATEWAYS = [
  { url: 'https://nftstorage.link/ipfs/', priority: 1 },
  { url: 'https://cloudflare-ipfs.com/ipfs/', priority: 2 },
  { url: 'https://ipfs.io/ipfs/', priority: 3 },
  { url: 'https://gateway.pinata.cloud/ipfs/', priority: 4 },
  { url: 'https://ipfs.fleek.co/ipfs/', priority: 5 },
  { url: 'https://dweb.link/ipfs/', priority: 6 },
  { url: 'https://ipfs.infura.io/ipfs/', priority: 7 },
  { url: 'https://gateway.ipfs.io/ipfs/', priority: 8 },
];

/**
 * Test a single IPFS gateway
 * @param {string} gatewayUrl - The gateway URL to test
 * @returns {Promise<{url: string, status: string, responseTime: number|null}>}
 */
async function testGateway(gatewayUrl) {
  const testUrl = `${gatewayUrl}${TEST_CID}`;
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    // Set a timeout of 5 seconds
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(testUrl, { 
      method: 'HEAD',
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      url: gatewayUrl,
      status: response.ok ? 'online' : 'offline',
      responseTime: response.ok ? responseTime : null
    };
  } catch (error) {
    console.log(`Gateway ${gatewayUrl} error: ${error.message}`);
    return {
      url: gatewayUrl,
      status: 'offline',
      responseTime: null
    };
  }
}

/**
 * Add gateway to database if it doesn't exist
 * @param {object} gateway - Gateway info with url and priority
 */
async function ensureGatewayExists(gateway) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO sonic_nft.ipfs_gateways 
       (gateway_url, priority, is_active, status) 
       VALUES ($1, $2, true, 'unknown')
       ON CONFLICT (gateway_url) DO NOTHING`,
      [gateway.url, gateway.priority]
    );
  } finally {
    client.release();
  }
}

/**
 * Update gateway status in the database
 * @param {string} gatewayUrl - The gateway URL
 * @param {string} status - Status ('online' or 'offline')
 * @param {number|null} responseTime - Response time in milliseconds
 */
async function updateGatewayStatus(gatewayUrl, status, responseTime) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE sonic_nft.ipfs_gateways
       SET 
         status = $2,
         last_checked = CURRENT_TIMESTAMP,
         average_response_time = $3
       WHERE gateway_url = $1`,
      [gatewayUrl, status, responseTime]
    );
    console.log(`Updated ${gatewayUrl} status to ${status}${responseTime ? ` (${responseTime}ms)` : ''}`);
  } finally {
    client.release();
  }
}

/**
 * Get all gateways from the database
 * @returns {Promise<Array>} Array of gateway objects
 */
async function getAllGateways() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT gateway_url, priority, is_active
       FROM sonic_nft.ipfs_gateways
       ORDER BY priority`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Main function to check all gateways
 */
async function checkAllGateways() {
  try {
    console.log('Adding default gateways if they don\'t exist...');
    for (const gateway of DEFAULT_GATEWAYS) {
      await ensureGatewayExists(gateway);
    }
    
    console.log('Getting all gateways from database...');
    const dbGateways = await getAllGateways();
    
    console.log(`Testing ${dbGateways.length} IPFS gateways...`);
    
    // Only test active gateways
    const activeGateways = dbGateways.filter(g => g.is_active);
    
    // Test gateways in parallel (but limit concurrency to avoid overwhelming the network)
    const results = [];
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < activeGateways.length; i += BATCH_SIZE) {
      const batch = activeGateways.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(gateway => testGateway(gateway.gateway_url));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Brief pause between batches
      if (i + BATCH_SIZE < activeGateways.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Updating gateway statuses in database...');
    for (const result of results) {
      await updateGatewayStatus(result.url, result.status, result.responseTime);
    }
    
    // Summarize results
    const onlineCount = results.filter(r => r.status === 'online').length;
    const offlineCount = results.filter(r => r.status === 'offline').length;
    
    console.log('\nGateway Check Summary:');
    console.log(`Total gateways tested: ${results.length}`);
    console.log(`Online: ${onlineCount}`);
    console.log(`Offline: ${offlineCount}`);
    
    // Show the top 3 fastest gateways
    const fastestGateways = results
      .filter(r => r.status === 'online' && r.responseTime !== null)
      .sort((a, b) => a.responseTime - b.responseTime)
      .slice(0, 3);
    
    if (fastestGateways.length > 0) {
      console.log('\nFastest Gateways:');
      fastestGateways.forEach((gateway, index) => {
        console.log(`${index + 1}. ${gateway.url} - ${gateway.responseTime}ms`);
      });
    }
    
    console.log('\nGateway check completed successfully.');
  } catch (err) {
    console.error('Error during gateway check:', err);
  } finally {
    await pool.end();
  }
}

// Run the gateway check
checkAllGateways()
  .then(() => console.log('Done!'))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  }); 