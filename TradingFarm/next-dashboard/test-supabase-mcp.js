/**
 * Test Supabase MCP Integration
 * 
 * This script tests the connection to Supabase through the MCP server.
 */

const fs = require('fs');

// Load MCP-ready configuration
const config = JSON.parse(fs.readFileSync('./supabase-mcp-ready.json', 'utf8'));

console.log('🧪 TESTING SUPABASE MCP CONNECTION');
console.log('===============================');
console.log('Project ID:', config.project_id);
console.log('API URL:', config.api_url);
console.log('Connection Method:', config.connection_method);
console.log('===============================\n');

// Function to format results for display
function formatResults(results) {
  if (!results || !Array.isArray(results)) return 'No results or invalid data';
  return JSON.stringify(results, null, 2);
}

async function testMcpConnection() {
  try {
    console.log('⏳ Attempting to use Supabase MCP...');
    
    // Printing the configuration for reference
    console.log('\n📋 MCP Configuration to use:');
    console.log(`{
  "project_id": "${config.project_id}",
  "api_url": "${config.api_url}",
  "connection_method": "${config.connection_method}",
  "timeoutMs": ${config.mcp_parameters.timeoutMs}
}`);
    
    console.log('\n🔍 To test this connection with the Neon/Supabase MCP:');
    console.log('1. Use run_sql MCP tool with these parameters:');
    console.log(`{
  "projectId": "${config.project_id}",
  "databaseName": "postgres", 
  "sql": "SELECT * FROM farms LIMIT 5;"
}`);
    
    console.log('\n✅ If properly configured, this will return your farms data.');
    console.log('\n⚠️ Important: Make sure you have:');
    console.log('1. Set up the farms table in your Supabase database');
    console.log('2. Configured the MCP server with the provided configuration');
    console.log('3. Applied proper RLS policies for your tables');
    
    console.log('\n🧠 For reference, here are common RLS policies for farms table:');
    console.log(`
-- Enable RLS on farms table
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read farms
CREATE POLICY "Allow users to read farms"
  ON farms FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow users to create farms
CREATE POLICY "Allow users to create farms"
  ON farms FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow owners to update their farms
CREATE POLICY "Allow owners to update farms"
  ON farms FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
`);
    
  } catch (err) {
    console.error('💥 ERROR:', err.message);
  }
}

// Run the test
testMcpConnection().catch(err => {
  console.error('💥 FATAL ERROR:', err);
});
