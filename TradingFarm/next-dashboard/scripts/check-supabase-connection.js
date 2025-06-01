/**
 * Supabase Connection Check
 * 
 * This script verifies Supabase connection using both browser and server clients
 * following the Trading Farm database workflow preferences.
 */

const { createClient } = require('@supabase/supabase-js');

// Use the correct URL provided by the user
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';

console.log('==== Supabase Connection Check ====');
console.log(`URL: ${SUPABASE_URL}`);

// Create client (simulating createBrowserClient)
const browserClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Create client (simulating createServerClient)
const serverClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

// Basic table fetch test
async function testTableAccess(client, clientType) {
  console.log(`\n🔍 Testing ${clientType} client connection...`);
  
  try {
    // First try listing tables using pg_tables view
    const { data: tablesData, error: tablesError } = await client
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .limit(10);
    
    if (tablesError) {
      if (tablesError.message.includes('does not exist')) {
        console.log(`Info: Cannot access pg_tables view from ${clientType}, trying specific tables...`);
      } else {
        console.error(`❌ ${clientType} error:`, tablesError.message);
      }
    } else {
      console.log(`✅ ${clientType} successfully accessed system tables`);
      console.log(`Tables found: ${tablesData.map(t => t.tablename).join(', ')}`);
    }
    
    // Now try accessing some expected tables
    const tables = ['orders', 'farms', 'agents', 'goals'];
    let successCount = 0;
    
    for (const table of tables) {
      try {
        const { data, error } = await client
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.code === '42P01') { // Relation does not exist
            console.log(`  Table '${table}' not found`);
          } else {
            console.error(`  ❌ Error accessing '${table}':`, error.message);
          }
        } else {
          successCount++;
          console.log(`  ✅ Successfully accessed '${table}' (${data.length} records)`);
        }
      } catch (err) {
        console.error(`  ❌ Exception accessing '${table}':`, err.message);
      }
    }
    
    if (successCount > 0) {
      console.log(`✅ ${clientType} successfully connected to ${successCount} tables`);
      return true;
    } else {
      console.log(`❌ ${clientType} couldn't access any expected tables`);
      return false;
    }
  } catch (err) {
    console.error(`❌ ${clientType} connection error:`, err.message);
    return false;
  }
}

// Test if the right tables exist for ElizaOS integration
async function testElizaOSIntegration(client) {
  console.log('\n🤖 Testing ElizaOS integration tables...');
  
  const elizaTables = ['agents', 'agent_commands', 'agent_responses', 'knowledge_base'];
  
  for (const table of elizaTables) {
    try {
      const { data, error } = await client
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') { // Relation does not exist
          console.log(`  ElizaOS table '${table}' not found`);
        } else {
          console.error(`  ❌ Error accessing ElizaOS table '${table}':`, error.message);
        }
      } else {
        console.log(`  ✅ Successfully accessed ElizaOS table '${table}' (${data.length} records)`);
      }
    } catch (err) {
      console.error(`  ❌ Exception accessing ElizaOS table '${table}':`, err.message);
    }
  }
}

async function main() {
  // Test browser client connection
  const browserConnected = await testTableAccess(browserClient, 'Browser client');
  
  // Test server client connection
  const serverConnected = await testTableAccess(serverClient, 'Server client');
  
  // Test ElizaOS integration tables
  if (browserConnected || serverConnected) {
    await testElizaOSIntegration(serverClient);
  }
  
  // Connection summary
  console.log('\n==== Connection Summary ====');
  console.log(`Browser client (createBrowserClient): ${browserConnected ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Server client (createServerClient): ${serverConnected ? '✅ Connected' : '❌ Failed'}`);
  
  if (browserConnected && serverConnected) {
    console.log('\n✅ Both frontend and backend Supabase connections are working!');
    console.log('Your Trading Farm dashboard should be able to connect to the database.');
  } else if (browserConnected) {
    console.log('\n⚠️ Only frontend connection works. Server components may have issues.');
  } else if (serverConnected) {
    console.log('\n⚠️ Only backend connection works. Client components may have issues.');
  } else {
    console.log('\n❌ Neither frontend nor backend connections are working.');
    console.log('Please check:');
    console.log('1. Supabase URL and API key are correct');
    console.log('2. Supabase project is active and accessible');
    console.log('3. Network connectivity to Supabase servers');
  }
}

// Run the connection check
main().catch(err => {
  console.error('❌ Fatal error:', err);
});
