/**
 * Test script for Supabase MCP integration
 * 
 * This script tests the Supabase MCP API to ensure it's working correctly.
 */

async function testSupabaseMCP() {
  try {
    console.log('🔄 Testing Supabase MCP integration...');
    
    const apiUrl = 'http://localhost:3001/api/mcp/supabase';
    
    // Test 1: Simple SQL query to check PostgreSQL version
    console.log('\n📝 Test 1: Running SQL query to check PostgreSQL version');
    const sqlResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'run_sql',
        params: {
          sql: 'SELECT version();'
        }
      })
    });
    
    const sqlResult = await sqlResponse.json();
    console.log('Result:', JSON.stringify(sqlResult, null, 2));

    // Test 2: Create a test farm
    console.log('\n📝 Test 2: Creating a test farm');
    const farmResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'create_farm',
        params: {
          name: 'Test Farm ' + new Date().toISOString(),
          description: 'Test farm created via MCP integration test'
        }
      })
    });
    
    const farmResult = await farmResponse.json();
    console.log('Result:', JSON.stringify(farmResult, null, 2));
    
    if (!farmResult.success) {
      console.log('⚠️ Farm creation failed. Testing if tables exist...');
      
      // Test 3: Check if tables exist
      console.log('\n📝 Test 3: Checking table existence');
      const tableResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_sql',
          params: {
            sql: `SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public'
              AND table_name = 'farms'
            );`
          }
        })
      });
      
      const tableResult = await tableResponse.json();
      console.log('Result:', JSON.stringify(tableResult, null, 2));
      
      if (tableResult.success && tableResult.data?.[0]?.exists === false) {
        console.log('❌ The farms table does not exist. Please run the migrations first.');
        
        // Test 4: Run migration to create schemas
        console.log('\n📝 Test 4: Running migrations');
        const migrationResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool: 'apply_schema',
            params: {
              file_path: 'supabase/migrations/20250330_create_trading_farm_schema.sql'
            }
          })
        });
        
        const migrationResult = await migrationResponse.json();
        console.log('Migration Result:', JSON.stringify(migrationResult, null, 2));
      }
    } else {
      // If farm creation was successful, test ElizaOS integration
      if (farmResult.data?.id) {
        // Test 5: Create a test agent
        console.log('\n📝 Test 5: Creating a test agent');
        const agentResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool: 'create_agent',
            params: {
              name: 'Test Agent ' + new Date().toISOString(),
              farm_id: farmResult.data.id,
              type: 'test',
              status: 'inactive'
            }
          })
        });
        
        const agentResult = await agentResponse.json();
        console.log('Result:', JSON.stringify(agentResult, null, 2));
        
        // Test 6: Connect agent to ElizaOS
        if (agentResult.success && agentResult.data?.id) {
          console.log('\n📝 Test 6: Connecting agent to ElizaOS');
          const connectResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tool: 'connect_eliza_agent',
              params: {
                agent_id: agentResult.data.id,
                eliza_id: 'test-eliza-id-' + Date.now(),
                connection_type: 'read-only',
                capabilities: ['market_data', 'portfolio_query']
              }
            })
          });
          
          const connectResult = await connectResponse.json();
          console.log('Result:', JSON.stringify(connectResult, null, 2));
        }
      }
    }
    
    console.log('\n✅ Supabase MCP testing completed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSupabaseMCP();
