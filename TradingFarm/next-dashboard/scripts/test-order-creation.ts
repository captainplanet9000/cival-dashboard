/**
 * Test script for order creation functionality using TypeScript
 * 
 * This script tests the order creation functions from advanced-order-actions.ts
 * with proper TypeScript types to ensure type safety
 */

import { createTrailingStopOrder, createOcoOrder, createBracketOrder, createAlertForOrder, checkOrderRisk, OrderData } from '../src/app/actions/advanced-order-actions';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database.types';
import * as fs from 'fs';
import * as path from 'path';

// Load configuration from supabase-mcp-config.json
const configPath = path.join(__dirname, '../supabase-mcp-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Create a Supabase client with the config
const supabaseUrl = config.databaseUrl;
const supabaseKey = config.serviceKey; 
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Sample order data for testing
const sampleOrder: OrderData = {
  farm_id: 1,
  agent_id: 2,
  exchange: 'binance',
  symbol: 'BTC/USDT',
  side: 'buy',
  quantity: 0.1,
  price: 75000,
  time_in_force: 'gtc'
};

// Log function to enhance output
function logSection(title: string): void {
  console.log('\n' + '='.repeat(50));
  console.log(`  ${title}`);
  console.log('='.repeat(50) + '\n');
}

// Mock functions to avoid actual database operations
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'mock-order-id-123' },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

// Test trailing stop order
async function testTrailingStopOrder() {
  logSection('Testing Trailing Stop Order Creation');
  
  try {
    const trailingStopOrder = await createTrailingStopOrder({
      ...sampleOrder,
      trail_value: 5,
      trail_type: 'percent',
      activation_price: 76000
    });
    
    console.log('Successfully created trailing stop order:');
    console.log(JSON.stringify(trailingStopOrder, null, 2));
    return true;
  } catch (error) {
    console.error('Error creating trailing stop order:', error);
    return false;
  }
}

// Test OCO (One-Cancels-Other) order
async function testOcoOrder() {
  logSection('Testing OCO Order Creation');
  
  try {
    const ocoOrder = await createOcoOrder({
      ...sampleOrder,
      take_profit: 80000,
      stop_loss: 72000
    });
    
    console.log('Successfully created OCO order:');
    console.log(JSON.stringify(ocoOrder, null, 2));
    return true;
  } catch (error) {
    console.error('Error creating OCO order:', error);
    return false;
  }
}

// Test bracket order
async function testBracketOrder() {
  logSection('Testing Bracket Order Creation');
  
  try {
    const bracketOrder = await createBracketOrder({
      ...sampleOrder,
      entry_price: 75000,
      take_profit: 80000,
      stop_loss: 72000,
      trailing_stop: true
    });
    
    console.log('Successfully created bracket order:');
    console.log(JSON.stringify(bracketOrder, null, 2));
    return true;
  } catch (error) {
    console.error('Error creating bracket order:', error);
    return false;
  }
}

// Test risk check
async function testOrderRiskCheck() {
  logSection('Testing Order Risk Check');
  
  try {
    const riskCheck = await checkOrderRisk(sampleOrder);
    
    console.log('Order risk check results:');
    console.log(JSON.stringify(riskCheck, null, 2));
    return true;
  } catch (error) {
    console.error('Error running risk check:', error);
    return false;
  }
}

// Test alert creation
async function testAlertCreation() {
  logSection('Testing Alert Creation');
  
  try {
    const alert = await createAlertForOrder(
      'mock-order-id-123',
      sampleOrder.farm_id,
      `New ${sampleOrder.side} order for ${sampleOrder.quantity} ${sampleOrder.symbol}`
    );
    
    console.log('Successfully created alert:');
    console.log(JSON.stringify(alert, null, 2));
    return true;
  } catch (error) {
    console.error('Error creating alert:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  logSection('STARTING ORDER CREATION TESTS');
  
  const results = {
    trailingStop: await testTrailingStopOrder(),
    oco: await testOcoOrder(),
    bracket: await testBracketOrder(),
    riskCheck: await testOrderRiskCheck(),
    alert: await testAlertCreation()
  };
  
  logSection('TEST RESULTS SUMMARY');
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  }
  
  const allPassed = Object.values(results).every(result => result === true);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
}

// Execute tests
runAllTests().catch(error => {
  console.error('Unhandled error during test execution:', error);
});
