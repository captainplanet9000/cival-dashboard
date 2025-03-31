/**
 * Test Supabase MCP Connection
 * 
 * This script tests the Supabase MCP connection with the proper credentials.
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Load config
const config = JSON.parse(fs.readFileSync('./supabase-mcp-config.json', 'utf8'));

async function testSupabaseConnection() {
  console.log('🔄 Testing Supabase API connection...');
  
  // Create Supabase client
  const supabase = createClient(config.databaseUrl, config.apiKey, {
    auth: { persistSession: false },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          timeout: config.settings.timeoutMs
        });
      }
    }
  });
  
  try {
    // Test query with Supabase client
    const { data, error } = await supabase
      .from('farms')
      .select('id, name')
      .limit(5);
      
    if (error) throw error;
    
    console.log('✅ Supabase API connection successful!');
    console.log('Sample data:', data);
    
    return true;
  } catch (err) {
    console.error('❌ Supabase API connection failed:', err.message);
    return false;
  }
}

async function testPostgresConnection() {
  console.log('\n🔄 Testing direct PostgreSQL connection...');
  
  // Try all connection strings
  const connectionStrings = [
    { name: 'Standard', url: config.connectionString },
    { name: 'PostgreSQL', url: config.postgresql_url },
    { name: 'Pooler', url: config.pooler_url }
  ];
  
  let success = false;
  let successfulUrl = '';

  for (const conn of connectionStrings) {
    console.log(`\nTrying ${conn.name} connection...`);
    
    let pool = null;
    try {
      // Create PostgreSQL pool with SSL disabled for testing
      pool = new Pool({ 
        connectionString: conn.url,
        ssl: { rejectUnauthorized: false }
      });
      
      // Test query
      const result = await pool.query('SELECT current_database(), current_user, version()');
      
      console.log(`✅ ${conn.name} connection successful!`);
      console.log('Connection info:', result.rows[0]);
      
      // Test for tables
      const tables = await pool.query(`
        SELECT tablename 
        FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
      `);
      
      console.log(`\n📋 Database Tables (${conn.name}):`);
      if (tables.rows.length === 0) {
        console.log('No tables found in the public schema.');
      } else {
        tables.rows.forEach(row => {
          console.log(`- ${row.tablename}`);
        });
      }
      
      success = true;
      successfulUrl = conn.url;
      
      console.log(`\n✅ SUCCESSFUL CONNECTION: ${conn.name}`);
      console.log(`Use this connection string for MCP: ${conn.url.replace(/:[^:@]*@/, ':********@')}`);
      
      // Close the pool
      await pool.end();
      break;
      
    } catch (err) {
      console.error(`❌ ${conn.name} connection failed:`, err.message);
      
      try {
        // Make sure to close the pool if it was created
        if (pool) await pool.end();
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }
  
  return { success, successfulUrl };
}

async function main() {
  console.log('🧪 TRADING FARM SUPABASE MCP CONNECTION TEST');
  console.log('===========================================');
  console.log('Project ID:', config.projectId);
  console.log('Using Pooler:', config.settings.pooler ? 'Yes' : 'No');
  console.log('Timeout:', config.settings.timeoutMs, 'ms');
  console.log('===========================================\n');
  
  const supabaseSuccess = await testSupabaseConnection();
  const { success: postgresSuccess, successfulUrl } = await testPostgresConnection();
  
  console.log('\n===========================================');
  console.log('RESULTS SUMMARY:');
  console.log('- Supabase API:', supabaseSuccess ? '✅ SUCCESS' : '❌ FAILED');
  console.log('- PostgreSQL:', postgresSuccess ? '✅ SUCCESS' : '❌ FAILED');
  
  if (supabaseSuccess) {
    console.log('\n✅ SUPABASE API CONNECTION SUCCESSFUL');
    console.log('The Supabase REST API is working correctly!');
    
    // Create MCP-ready configuration
    const mcpConfig = {
      "project_id": config.projectId,
      "api_url": config.databaseUrl,
      "api_key": config.apiKey,
      "connection_string": postgresSuccess ? successfulUrl : "API_ONLY",
      "mcp_parameters": {
        "timeoutMs": 60000,
        "debug": true,
        "retryAttempts": 3
      }
    };
    
    // Write the successful configuration to a file
    try {
      fs.writeFileSync('./supabase-mcp-ready.json', JSON.stringify(mcpConfig, null, 2));
      console.log('\nCreated supabase-mcp-ready.json with MCP configuration');
    } catch (err) {
      console.error('Error writing configuration file:', err.message);
    }
    
    console.log('\nIMPORTANT: When using the Supabase MCP, use the following settings:');
    console.log('1. Project ID:', config.projectId);
    console.log('2. API Key: Use the service role key (already in your config)');
    
    if (postgresSuccess) {
      console.log('3. Connection String: Use the successful connection identified above');
      console.log('4. Set a timeout of at least 60 seconds');
    } else {
      console.log('3. Direct PostgreSQL connection failed, but REST API is working');
      console.log('4. The MCP can still use the REST API for most operations');
    }
    
  } else {
    console.log('\n⚠️ SUPABASE CONNECTION FAILED');
    console.log('\nTROUBLESHOOTING STEPS:');
    console.log('1. Check that your Supabase project exists and is active');
    console.log('2. Verify the API key is valid and has not expired');
    console.log('3. Ensure your network allows outbound connections to Supabase');
  }
}

// Run the test
main().catch(err => {
  console.error('💥 FATAL ERROR:', err);
});
