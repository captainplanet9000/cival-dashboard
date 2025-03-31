/**
 * ElizaOS Integration Test for Trading Farm Dashboard
 * 
 * This script tests the ElizaOS integration capabilities with Supabase MCP.
 */

async function testElizaIntegration() {
  try {
    console.log('🔄 Testing ElizaOS Integration with Trading Farm...');
    
    const apiUrl = 'http://localhost:3001/api/mcp/supabase';
    
    // Test 1: Check if tables exist (safer approach)
    console.log('\n📝 Test 1: Checking database schema with schema inspection');
    const tableListResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'run_query',
        params: {
          table: 'farms',
          select: 'count(*)',
          limit: 1
        }
      })
    });
    
    let tableResult;
    try {
      tableResult = await tableListResponse.json();
      console.log('Farm table check result:', JSON.stringify(tableResult, null, 2));
    } catch (error) {
      console.log('Farm table does not exist, we may need to apply migrations');
      tableResult = { success: false };
    }
    
    // Test 2: Create a farm for testing
    console.log('\n📝 Test 2: Creating a test farm');
    const farmResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'create_farm',
        params: {
          name: `ElizaOS Test Farm ${new Date().toISOString().slice(0, 16)}`,
          description: 'Test farm for ElizaOS integration'
        }
      })
    });
    
    let farmResult;
    try {
      farmResult = await farmResponse.json();
      console.log('Farm creation result:', JSON.stringify(farmResult, null, 2));
    } catch (error) {
      console.log('Error creating farm, database may not be initialized:', error);
      farmResult = { success: false };
    }
    
    let farmId = null;
    if (farmResult.success && farmResult.data) {
      farmId = farmResult.data.id;
      console.log(`✅ Successfully created test farm with ID: ${farmId}`);
    } else {
      // Try getting an existing farm to continue testing
      console.log('⚠️ Farm creation failed, trying to find an existing farm...');
      
      const existingFarmsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'run_query',
          params: {
            table: 'farms',
            select: '*',
            limit: 1
          }
        })
      });
      
      try {
        const existingFarms = await existingFarmsResponse.json();
        if (existingFarms.success && existingFarms.data && existingFarms.data.length > 0) {
          farmId = existingFarms.data[0].id;
          console.log(`✅ Found existing farm with ID: ${farmId}`);
        }
      } catch (error) {
        console.log('Error finding existing farms:', error);
      }
    }
    
    // Proceed with ElizaOS integration tests if we have a farm
    if (farmId) {
      // Test 3: Create a trading agent
      console.log('\n📝 Test 3: Creating a trading agent for ElizaOS');
      const agentResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'create_agent',
          params: {
            name: `ElizaOS Agent ${new Date().toISOString().slice(11, 19)}`,
            farm_id: farmId,
            type: 'eliza_integrated',
            configuration: {
              strategy: 'mean_reversion',
              risk_level: 'medium',
              markets: ['BTC/USD', 'ETH/USD']
            }
          }
        })
      });
      
      let agentId = null;
      try {
        const agentResult = await agentResponse.json();
        console.log('Agent creation result:', JSON.stringify(agentResult, null, 2));
        
        if (agentResult.success && agentResult.data) {
          agentId = agentResult.data.id;
          console.log(`✅ Successfully created agent with ID: ${agentId}`);
        }
      } catch (error) {
        console.log('Error creating agent:', error);
      }
      
      if (agentId) {
        // Test 4: Connect agent with ElizaOS
        console.log('\n📝 Test 4: Connecting agent to ElizaOS');
        const elizaConnection = await fetch(apiUrl, {
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
              capabilities: [
                'market_data',
                'portfolio_query',
                'trading_execution',
                'knowledge_access'
              ]
            }
          })
        });
        
        try {
          const connectionResult = await elizaConnection.json();
          console.log('ElizaOS connection result:', JSON.stringify(connectionResult, null, 2));
          
          if (connectionResult.success) {
            console.log('✅ Successfully connected agent to ElizaOS');
            
            // Test 5: Store knowledge in ElizaOS for agent use
            console.log('\n📝 Test 5: Storing trading knowledge in ElizaOS');
            const knowledgeResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tool: 'store_knowledge',
                params: {
                  title: 'Mean Reversion Trading Strategy',
                  content: `
                    Mean reversion is a trading strategy based on the idea that asset prices and returns eventually revert to their historical average or mean.
                    
                    Key concepts:
                    1. Overbought/oversold conditions - When an asset deviates significantly from its historical mean, it's considered overbought (if above) or oversold (if below)
                    2. Mean calculation - Typically uses moving averages (simple, exponential, etc.)
                    3. Entry signals - Enter when price deviates significantly from the mean
                    4. Exit signals - Exit when price returns to the mean
                    
                    This agent is configured to use mean reversion on BTC/USD and ETH/USD markets with medium risk tolerance.
                  `,
                  tags: ['trading', 'strategy', 'mean_reversion', 'cryptocurrency'],
                  agent_ids: [agentId]
                }
              })
            });
            
            try {
              const knowledgeResult = await knowledgeResponse.json();
              console.log('Knowledge storage result:', JSON.stringify(knowledgeResult, null, 2));
              
              if (knowledgeResult.success) {
                console.log('✅ Successfully stored knowledge for the agent');
                
                // Test 6: Query knowledge to verify retrieval
                console.log('\n📝 Test 6: Querying knowledge from ElizaOS');
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
            } catch (error) {
              console.log('Error storing knowledge:', error);
            }
          }
        } catch (error) {
          console.log('Error connecting to ElizaOS:', error);
        }
      }
      
      // Test 7: Get farm details with all connections
      console.log('\n📝 Test 7: Getting farm details with ElizaOS connections');
      const farmDetailsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'get_farm_details',
          params: {
            farm_id: farmId
          }
        })
      });
      
      try {
        const farmDetails = await farmDetailsResponse.json();
        console.log('Farm details (summary):', JSON.stringify({
          farm: farmDetails.data?.farm,
          agentCount: farmDetails.data?.agents?.length,
          walletCount: farmDetails.data?.wallets?.length,
          transactionCount: farmDetails.data?.transactions?.length
        }, null, 2));
      } catch (error) {
        console.log('Error getting farm details:', error);
      }
    } else {
      console.log('❌ Could not find or create a farm to test with.');
    }
    
    console.log('\n✅ ElizaOS integration testing completed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testElizaIntegration();
