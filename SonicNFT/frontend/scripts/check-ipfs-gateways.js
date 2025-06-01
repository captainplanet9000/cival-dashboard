#!/usr/bin/env node

/**
 * IPFS Gateway Performance Check Script
 * Tests performance of multiple IPFS gateways and updates database with results
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test CID (a small file to check gateway speed)
const TEST_CID = 'QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx';

// Timeout for gateway requests (in ms)
const REQUEST_TIMEOUT = 5000;

// AbortController polyfill if needed
if (!globalThis.AbortController) {
  const { AbortController } = require('abort-controller');
  globalThis.AbortController = AbortController;
}

async function checkGateways() {
  const client = await pool.connect();
  
  try {
    console.log('Starting IPFS gateway performance check...');
    
    // Get list of gateways from database
    const gatewaysResult = await client.query(
      'SELECT gateway_url FROM sonic_nft.ipfs_gateways WHERE is_active = true'
    );
    
    const gateways = gatewaysResult.rows.map(row => row.gateway_url);
    console.log(`Testing ${gateways.length} IPFS gateways`);
    
    // Test each gateway
    const results = await Promise.all(
      gateways.map(async (gateway) => {
        const url = `${gateway}${TEST_CID}`;
        
        console.log(`Testing gateway: ${gateway}`);
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
          
          const startTime = Date.now();
          const response = await fetch(url, { 
            method: 'HEAD',
            signal: controller.signal 
          });
          const endTime = Date.now();
          
          clearTimeout(timeoutId);
          
          const responseTime = endTime - startTime;
          const success = response.ok;
          
          console.log(`${gateway}: ${success ? 'SUCCESS' : 'FAILED'} in ${responseTime}ms`);
          
          return {
            gateway,
            responseTime,
            success
          };
        } catch (error) {
          console.log(`${gateway}: FAILED (${error.message})`);
          
          return {
            gateway,
            responseTime: REQUEST_TIMEOUT,
            success: false
          };
        }
      })
    );
    
    // Sort by response time (fastest first)
    results.sort((a, b) => {
      // First sort by success (successful gateways first)
      if (a.success && !b.success) return -1;
      if (!a.success && b.success) return 1;
      
      // Then sort by response time
      return a.responseTime - b.responseTime;
    });
    
    // Update database with results
    await client.query('BEGIN');
    
    for (const result of results) {
      await client.query(
        `UPDATE sonic_nft.ipfs_gateways 
         SET response_time_ms = $1, 
             success_rate = CASE WHEN $2 THEN success_rate * 0.7 + 0.3 ELSE success_rate * 0.7 END,
             last_checked = NOW()
         WHERE gateway_url = $3`,
        [result.responseTime, result.success, result.gateway]
      );
    }
    
    await client.query('COMMIT');
    
    // Print summary
    console.log('\nIPFS Gateway Performance Results:');
    console.log('--------------------------------');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.gateway} - ${result.success ? 'OK' : 'FAIL'} - ${result.responseTime}ms`);
    });
    
    console.log('\nFastest working gateway:', 
      results.find(r => r.success)?.gateway || 'None available');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error checking IPFS gateways:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkGateways().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 