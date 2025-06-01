/**
 * Test script for order creation functionality
 * 
 * This script tests the order creation functions from advanced-order-actions.ts
 * by creating a mock version that logs the operations instead of connecting to the database
 */

// Import required modules
const { createServerClient } = require('@supabase/ssr');
const { revalidatePath } = require('next/cache');

// Mock the imports
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn()
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

// Sample order data for testing
const sampleOrder = {
  farm_id: 1,
  agent_id: 2,
  exchange: 'binance',
  symbol: 'BTC/USDT',
  side: 'buy',
  quantity: 0.1,
  price: 75000,
  time_in_force: 'gtc'
};

// Mock Supabase client response
const mockSupabaseResponse = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnValue({
    data: { id: 'mock-order-id-123' },
    error: null
  })
};

// Set up mock
createServerClient.mockReturnValue(mockSupabaseResponse);

// Import the order functions with mocked dependencies
const {
  createTrailingStopOrder,
  createOcoOrder,
  createBracketOrder,
  createIcebergOrder,
  createTwapOrder,
  createAlertForOrder,
  checkOrderRisk
} = require('../src/app/actions/advanced-order-actions');

// Test trailing stop order
async function testTrailingStopOrder() {
  console.log('Testing Trailing Stop Order creation...');
  
  const result = await createTrailingStopOrder({
    ...sampleOrder,
    trail_value: 5,
    trail_type: 'percent',
    activation_price: 76000
  });
  
  console.log('Result:', result);
  console.log('Insert called with:', mockSupabaseResponse.insert.mock.calls[0][0]);
  console.log('----------------------------');
}

// Test OCO order
async function testOcoOrder() {
  console.log('Testing OCO Order creation...');
  
  const result = await createOcoOrder({
    ...sampleOrder,
    take_profit: 80000,
    stop_loss: 72000
  });
  
  console.log('Result:', result);
  console.log('Insert called with:', mockSupabaseResponse.insert.mock.calls[0][0]);
  console.log('----------------------------');
}

// Test bracket order
async function testBracketOrder() {
  console.log('Testing Bracket Order creation...');
  
  const result = await createBracketOrder({
    ...sampleOrder,
    entry_price: 75000,
    take_profit: 80000,
    stop_loss: 72000,
    trailing_stop: true
  });
  
  console.log('Result:', result);
  console.log('Insert called with:', mockSupabaseResponse.insert.mock.calls[0][0]);
  console.log('----------------------------');
}

// Test risk check
async function testOrderRiskCheck() {
  console.log('Testing Order Risk Check...');
  
  const result = await checkOrderRisk(sampleOrder);
  
  console.log('Risk Check Result:', result);
  console.log('----------------------------');
}

// Run tests
async function runTests() {
  try {
    // Reset mocks between tests
    mockSupabaseResponse.insert.mockClear();
    await testTrailingStopOrder();
    
    mockSupabaseResponse.insert.mockClear();
    await testOcoOrder();
    
    mockSupabaseResponse.insert.mockClear();
    await testBracketOrder();
    
    await testOrderRiskCheck();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runTests();
