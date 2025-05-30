/**
 * Simple Supabase Connection Test
 * 
 * A standalone script to test the Supabase connection using credentials from .env
 * This doesn't rely on the MCP's logger or other components.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get configuration from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Display configuration (without sensitive values)
console.log('Testing Supabase connection with:');
console.log(`- URL: ${supabaseUrl}`);
console.log(`- API Key: ${supabaseKey ? '✓ Set' : '✗ Not set'}`);
console.log(`- Service Role Key: ${serviceRoleKey ? '✓ Set' : '✗ Not set'}`);
console.log('-----------------------------------');

async function testConnection() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase URL and API key are required.');
    return false;
  }

  try {
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Testing connection...');
    
    // Try a simple query that's expected to fail but shows we have connectivity
    const { error } = await supabase
      .from('non_existent_table')
      .select('id')
      .limit(1);
    
    // If we get a "relation does not exist" error, that's actually good
    // It shows we connected successfully but the table doesn't exist
    if (error && error.message.includes('does not exist')) {
      console.log('✅ Connection successful! (The query failed as expected, but we connected to the database)');
      return true;
    }
    
    if (error) {
      console.log('Unexpected error:');
      throw error;
    }
    
    console.log('✅ Connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Connection failed with error:');
    console.error(error.message);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('✅ Your Supabase MCP setup is ready to use!');
    } else {
      console.error('❌ Supabase connection test failed. Please check your credentials.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }); 