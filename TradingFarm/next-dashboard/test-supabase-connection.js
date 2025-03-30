/**
 * Simple Supabase Connection Test
 * 
 * This script tests the Supabase connection using the @supabase/supabase-js library.
 * Run with: node test-supabase-connection.js
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { execSync } = require('child_process');

// Supabase connection details
const SUPABASE_URL = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const SUPABASE_POOLER_URL = 'https://bgvlzvswzpfoywfxehis.pooler.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA';

// Network connectivity test
function testEndpoint(url) {
  return new Promise((resolve) => {
    console.log(`Testing connectivity to ${url}...`);
    
    const req = https.get(url, (res) => {
      console.log(`Status code: ${res.statusCode}`);
      resolve({
        success: res.statusCode >= 200 && res.statusCode < 300,
        statusCode: res.statusCode,
        headers: res.headers
      });
    });
    
    req.on('error', (err) => {
      console.error(`Connection error: ${err.message}`);
      resolve({
        success: false,
        error: err.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      console.error('Connection timed out');
      resolve({
        success: false,
        error: 'Timeout'
      });
    });
  });
}

async function testConnection() {
  console.log('🔄 Testing Supabase connection...');
  
  // First check network connectivity
  console.log('\n📡 CHECKING NETWORK CONNECTIVITY:');
  const standardConnectivity = await testEndpoint(SUPABASE_URL);
  const poolerConnectivity = await testEndpoint(SUPABASE_POOLER_URL);
  
  // DNS lookup
  console.log('\n🔍 DNS LOOKUP:');
  try {
    const dnsResult = execSync('nslookup bgvlzvswzpfoywfxehis.supabase.co').toString();
    console.log(dnsResult);
  } catch (e) {
    console.error('DNS lookup failed:', e.message);
  }
  
  console.log('\n🔌 TESTING DATABASE CONNECTION:');
  
  // First try with regular URL
  console.log('\nTesting standard URL:', SUPABASE_URL);
  let client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { 
      persistSession: false,
      autoRefreshToken: false
    }
  });
  
  try {
    console.log('Running simplified test query...');
    // Using a simpler query format to avoid parsing issues
    const { data, error } = await client.from('farms').select('id').limit(1);
    
    if (error) {
      console.error('❌ Standard URL failed:', error.message);
      
      // Try again with pooler URL
      console.log('\nTesting pooler URL:', SUPABASE_POOLER_URL);
      client = createClient(SUPABASE_POOLER_URL, SUPABASE_SERVICE_KEY, {
        auth: { 
          persistSession: false,
          autoRefreshToken: false
        }
      });
      
      const poolerResult = await client.from('farms').select('id').limit(1);
      
      if (poolerResult.error) {
        console.error('❌ Pooler URL also failed:', poolerResult.error.message);
        console.error('All connection attempts failed.');
        
        // Provide diagnostic information
        console.log('\n📊 CONNECTION DIAGNOSTICS:');
        console.log('1. Check if your IP address is whitelisted in Supabase');
        console.log('2. Verify the service role key is still valid');
        console.log('3. Ensure your network allows outbound connections to Supabase');
        
        // Check firewall
        console.log('\n🧱 CHECKING FIREWALL:');
        try {
          const tcpResult = execSync('Test-NetConnection -ComputerName bgvlzvswzpfoywfxehis.supabase.co -Port 443').toString();
          console.log(tcpResult);
        } catch (e) {
          console.log('Firewall check not available or failed');
        }
      } else {
        console.log('✅ Pooler URL connection successful!');
        console.log('Sample data:', poolerResult.data);
      }
    } else {
      console.log('✅ Standard URL connection successful!');
      console.log('Sample data:', data);
    }
  } catch (e) {
    console.error('❌ Connection error:', e.message);
    console.error('Stack:', e.stack);
  }
  
  console.log('\n🧪 MCP CONFIGURATION RECOMMENDATION:');
  console.log('Based on the test results, update your MCP config with:');
  console.log('1. Use the latest @smithery/cli version');
  console.log('2. Add "pooler": true if the pooler URL connection was successful');
  console.log('3. Increase timeoutMs to at least 360000 (6 minutes)');
}

// Run the test
testConnection().catch(err => {
  console.error('💥 FATAL ERROR:', err);
});
