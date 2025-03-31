/**
 * Supabase MCP Connection Test and Fixer
 * 
 * This script tests and fixes the Supabase MCP connection.
 * Run with: node fix-mcp-connection.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase connection details - these are known to work from your test
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';

// Create Supabase client with extended timeout
const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false
  },
  global: {
    // Longer timeout for potentially slower connections
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        timeout: 60000 // 60 second timeout
      });
    }
  }
});

// Test a basic query
async function testAndFix() {
  console.log('🔄 Testing and fixing Supabase MCP connection...');
  
  try {
    // Run a simple query to test connection
    const { data, error } = await client
      .from('farms')
      .select('id, name')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Connection successful!');
    console.log('Sample data:', data);
    
    // MCP configuration recommendation
    console.log('\n🔧 MCP CONFIGURATION FIX:');
    console.log('1. Use direct HTTPS connection (not pooler)');
    console.log('2. Set timeout to at least 60000ms (60 seconds)');
    console.log('3. Verify your database has the necessary tables (farms, agents, etc.)');
    
    // Generate SQL to check if required tables exist
    const { data: tables, error: tablesError } = await client.rpc('check_tables_exist', { 
      tables_to_check: ['farms', 'agents', 'wallets', 'transactions', 'strategies'] 
    });
    
    if (tablesError) {
      console.log('\n⚠️ Error checking tables:', tablesError.message);
      console.log('Run this SQL to create a helper function:');
      console.log(`
CREATE OR REPLACE FUNCTION check_tables_exist(tables_to_check text[])
RETURNS TABLE(table_name text, exists boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::text, true
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_name = ANY(tables_to_check)
  UNION
  SELECT unnest(tables_to_check) AS table_name, false
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = unnest(tables_to_check)
  );
END;
$$ LANGUAGE plpgsql;
      `);
    } else {
      console.log('\n📋 TABLE STATUS:');
      tables.forEach(t => {
        console.log(`${t.exists ? '✅' : '❌'} ${t.table_name}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    
    // Provide troubleshooting steps
    console.log('\n🔍 TROUBLESHOOTING STEPS:');
    console.log('1. Check if the Supabase project exists and is active');
    console.log('2. Verify the service key is valid and has not expired');
    console.log('3. Ensure the correct tables are created in the database');
    console.log('4. Try accessing the Supabase dashboard directly');
  }
}

// Run the test and fix
testAndFix().catch(err => {
  console.error('💥 FATAL ERROR:', err);
});
