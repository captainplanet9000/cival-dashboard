/**
 * Test Supabase Frontend Connection
 * 
 * This script verifies that the frontend can successfully connect to Supabase
 * using the same approach as client components in the Trading Farm dashboard.
 */

// Import Supabase client - similar to how it's used in client components
import { createClient } from '@supabase/supabase-js';

// Use the correct Supabase URL and key
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

console.log('==== Testing Supabase Frontend Connection ====');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Key available: ${Boolean(SUPABASE_KEY)}`);

// Create client similar to how it's used in client components (createBrowserClient)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Test public tables that should be accessible from frontend
async function testFrontendAccess() {
  console.log('\n📱 Testing frontend access to public tables with RLS...');
  
  // Tables that should be accessible from frontend based on RLS policies
  const tables = ['orders', 'farms', 'agents', 'goals'];
  
  for (const table of tables) {
    try {
      console.log(`\nTesting frontend access to: ${table}`);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(5);
      
      if (error) {
        console.error(`❌ Error accessing ${table} from frontend:`, error.message);
        console.log(`  Error code: ${error.code}`);
        console.log(`  Error hint: ${error.hint || 'None'}`);
        
        // Check if this is an RLS policy error
        if (error.code === '42501' || error.message.includes('permission denied')) {
          console.log(`  This appears to be an RLS policy error - the table exists but frontend access is restricted`);
        }
        
        continue;
      }
      
      console.log(`✅ Successfully accessed ${table} from frontend`);
      console.log(`  Records found: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        // Show sample structure
        const keys = Object.keys(data[0]);
        console.log(`  Columns: ${keys.join(', ')}`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error with ${table}:`, err.message);
    }
  }
}

// Test auth status (should be anonymous since we're not logged in)
async function testAuthStatus() {
  console.log('\n🔐 Testing authentication status...');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('✅ Session found - user is authenticated:');
      console.log(`  User ID: ${session.user.id}`);
      console.log(`  Email: ${session.user.email}`);
    } else {
      console.log('✅ No session found - user is anonymous (expected for frontend test)');
    }
  } catch (err) {
    console.error('❌ Error checking auth status:', err.message);
  }
}

// Test insert operation
async function testInsertOperation() {
  console.log('\n📝 Testing insert operation (frontend permissions)...');
  
  try {
    const testData = {
      farm_id: 1,
      exchange: 'binance',
      symbol: 'ETH/USDT',
      type: 'market',
      side: 'buy',
      quantity: 0.1,
      status: 'pending',
      metadata: {
        created_from: 'frontend-test',
        test: true,
        timestamp: new Date().toISOString()
      }
    };
    
    const { data, error } = await supabase
      .from('orders')
      .insert(testData)
      .select();
    
    if (error) {
      console.error('❌ Error inserting test order from frontend:', error.message);
      
      // Check if this is an RLS policy error
      if (error.code === '42501' || error.message.includes('permission denied')) {
        console.log('  This appears to be an RLS policy error - modify policies to allow frontend inserts');
      } else if (error.message.includes('schema cache')) {
        console.log('  Schema cache error - the table structure may have changed');
        console.log('  Run the SQL migration to fix the orders table structure');
      }
    } else {
      console.log('✅ Successfully inserted test order from frontend');
      console.log('  Order data:', data);
    }
  } catch (err) {
    console.error('❌ Unexpected error inserting test order:', err.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🔄 Running frontend connection tests...');
  
  await testAuthStatus();
  await testFrontendAccess();
  await testInsertOperation();
  
  console.log('\n✅ Frontend connectivity tests completed!');
}

// Run the tests
runTests().catch(err => {
  console.error('❌ Fatal error:', err);
});
