const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function applyMigration() {
  try {
    console.log('🔄 Applying ElizaOS integration migration...');
    
    const apiUrl = 'http://localhost:3001/api/mcp/supabase';
    const migrationPath = path.resolve(__dirname, 'supabase/migrations/20250330_update_schema_eliza_integration.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`📝 Read migration file: ${migrationPath.substring(0, 60)}...`);
    
    // Directly send the SQL content to the run_sql endpoint
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'run_migration',
        params: {
          sql: migrationSql
        }
      })
    });
    
    const result = await response.json();
    console.log('Migration result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Migration processed successfully');
      
      // Now let's test the ElizaOS integration
      await testElizaIntegration();
    } else {
      console.log('❌ Migration processing failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

async function testElizaIntegration() {
  try {
    console.log('\n🔄 Testing ElizaOS Integration with Trading Farm...');
    
    const apiUrl = 'http://localhost:3001/api/mcp/supabase';
    
    // Create a test farm
    console.log('\n📝 Creating a test farm for ElizaOS');
    const farmResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'create_farm',
        params: {
          name: `ElizaOS Integration Farm ${new Date().toISOString().slice(0, 16)}`,
          description: 'Test farm for ElizaOS integration',
          status: 'active'
        }
      })
    });
    
    const farmResult = await farmResponse.json();
    console.log('Farm creation result:', JSON.stringify(farmResult, null, 2));
    
    if (farmResult.success && farmResult.data) {
      const farmId = farmResult.data.id;
      console.log(`✅ Created farm with ID: ${farmId}`);
      
      // Create a trading agent
      console.log('\n📝 Creating a trading agent');
      const agentResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'create_agent',
          params: {
            name: `ElizaBot ${new Date().toISOString().slice(11, 19)}`,
            farm_id: farmId,
            status: 'inactive',
            type: 'eliza_ai',
            configuration: {
              strategy: 'mean_reversion',
              risk_level: 'medium',
              markets: ['BTC/USD', 'ETH/USD']
            }
          }
        })
      });
      
      const agentResult = await agentResponse.json();
      console.log('Agent creation result:', JSON.stringify(agentResult, null, 2));
      
      if (agentResult.success && agentResult.data) {
        const agentId = agentResult.data.id;
        console.log(`✅ Created agent with ID: ${agentId}`);
        
        // Connect agent to ElizaOS
        console.log('\n📝 Connecting agent to ElizaOS');
        const connectResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool: 'connect_eliza_agent',
            params: {
              agent_id: agentId,
              eliza_id: `eliza-${Date.now()}`,
              connection_type: 'full',
              capabilities: ['market_data', 'portfolio_query', 'trading_execution']
            }
          })
        });
        
        const connectResult = await connectResponse.json();
        console.log('ElizaOS connection result:', JSON.stringify(connectResult, null, 2));
        
        // Store knowledge for the agent
        console.log('\n📝 Storing trading knowledge');
        const knowledgeResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool: 'store_knowledge',
            params: {
              title: 'Mean Reversion Strategy Guide',
              content: 'Mean reversion is a trading strategy based on the idea that prices will revert to their average over time. When an asset price deviates significantly from its historical mean, it creates potential trading opportunities.',
              tags: ['trading', 'strategy', 'mean_reversion'],
              agent_ids: [agentId]
            }
          })
        });
        
        const knowledgeResult = await knowledgeResponse.json();
        console.log('Knowledge storage result:', JSON.stringify(knowledgeResult, null, 2));
        
        // Query the knowledge
        console.log('\n📝 Querying knowledge');
        const queryResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool: 'query_knowledge',
            params: {
              query: 'mean reversion',
              agent_id: agentId
            }
          })
        });
        
        const queryResult = await queryResponse.json();
        console.log('Knowledge query result:', JSON.stringify(queryResult, null, 2));
      }
    }
    
    console.log('\n✅ ElizaOS integration testing completed successfully');
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

// Run the migration
applyMigration();
