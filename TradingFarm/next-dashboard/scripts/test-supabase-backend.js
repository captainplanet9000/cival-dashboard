/**
 * Test Supabase Backend Connection
 * 
 * This script verifies that the backend can successfully connect to Supabase
 * and perform basic operations using the server-side client.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Get Supabase credentials from environment - use hardcoded correct values
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

console.log('==== Testing Supabase Backend Connection ====');
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Key available: ${Boolean(SUPABASE_KEY)}`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

// Test functions
async function testPublicTables() {
  console.log('\n📊 Testing access to public tables...');
  
  // Array of tables to test
  const tables = ['orders', 'farms', 'agents', 'goals'];
  
  for (const table of tables) {
    try {
      console.log(`\nTesting table: ${table}`);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Error accessing ${table}:`, error.message);
        console.log(`  Error code: ${error.code}`);
        console.log(`  Error hint: ${error.hint || 'None'}`);
        continue;
      }
      
      if (data && data.length > 0) {
        console.log(`✅ Successfully accessed ${table} table`);
        console.log(`  Sample data:`, JSON.stringify(data[0], null, 2).substring(0, 100) + '...');
      } else {
        console.log(`✅ Table ${table} exists but no data found`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error with ${table}:`, err.message);
    }
  }
}

async function testRPC() {
  console.log('\n🔄 Testing RPC functions...');
  
  try {
    // Test a generic Postgres function that should exist
    const { data, error } = await supabase.rpc('get_server_version');
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('RPC function get_server_version does not exist. Trying a different approach...');
        
        // Alternative: run a simple query
        const { data: versionData, error: versionError } = await supabase
          .from('pg_catalog.pg_settings')
          .select('setting')
          .eq('name', 'server_version')
          .single();
          
        if (versionError) {
          console.error('❌ Error getting version info:', versionError.message);
        } else {
          console.log(`✅ Successfully queried database version: ${versionData?.setting || 'unknown'}`);
        }
      } else {
        console.error('❌ Error calling RPC:', error.message);
      }
    } else {
      console.log('✅ Successfully called RPC function');
      console.log('  Result:', data);
    }
  } catch (err) {
    console.error('❌ Unexpected error with RPC:', err.message);
  }
}

async function testDatabaseConnection() {
  console.log('\n🔌 Testing low-level database connection...');
  
  try {
    // Simplest query possible
    const { data, error } = await supabase
      .from('_schemas')
      .select('schema');
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('_schemas table does not exist. Trying a different approach...');
        
        // Try with system catalog
        const { data: catalogData, error: catalogError } = await supabase
          .from('pg_catalog.pg_namespace')
          .select('nspname')
          .limit(5);
          
        if (catalogError) {
          console.error('❌ Error accessing system catalog:', catalogError.message);
          return false;
        } else {
          console.log('✅ Successfully connected to database');
          console.log('  Available schemas:', catalogData.map(row => row.nspname).join(', '));
          return true;
        }
      }
      
      console.error('❌ Database connection error:', error.message);
      return false;
    }
    
    console.log('✅ Successfully connected to database');
    console.log('  Available schemas:', data.map(row => row.schema).join(', '));
    return true;
  } catch (err) {
    console.error('❌ Unexpected database connection error:', err.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  // First test basic connection
  const connected = await testDatabaseConnection();
  
  if (!connected) {
    console.error('\n❌ Basic database connection failed. Cannot proceed with further tests.');
    console.log('\nPossible issues:');
    console.log('1. Incorrect Supabase URL or key in .env.local');
    console.log('2. Supabase project is paused or unavailable');
    console.log('3. Network connectivity issues');
    return;
  }
  
  // Run additional tests
  await testPublicTables();
  await testRPC();
  
  console.log('\n✅ Backend connectivity tests completed!');
}

// Run the tests
runTests().catch(err => {
  console.error('❌ Fatal error:', err);
});
