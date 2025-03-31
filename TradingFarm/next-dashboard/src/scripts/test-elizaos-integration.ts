/**
 * Test script for ElizaOS API integration
 * 
 * This script tests the connection to ElizaOS API and performs
 * basic operations to verify the integration is working correctly.
 */

import { elizaOSService } from '../lib/elizaos';
import { CreateAgentParams, ElizaAgent } from '../lib/elizaos/models';

async function testElizaOSIntegration() {
  console.log('===== Testing ElizaOS Integration =====');
  
  try {
    // 1. Test fetching agents
    console.log('\n----- Testing Agent Listing -----');
    const agentsResponse = await elizaOSService.getAgents();
    
    if (agentsResponse.error) {
      console.error('❌ Failed to fetch agents:', agentsResponse.error);
    } else {
      console.log(`✅ Successfully fetched ${agentsResponse.data?.length || 0} agents`);
      
      if (agentsResponse.data && agentsResponse.data.length > 0) {
        const firstAgent = agentsResponse.data[0];
        console.log('First agent details:', {
          id: firstAgent.id,
          name: firstAgent.name,
          status: firstAgent.status,
          agent_type: firstAgent.agent_type
        });
      }
    }
    
    // 2. Test creating an agent
    console.log('\n----- Testing Agent Creation -----');
    
    const newAgentParams: CreateAgentParams = {
      name: `Test Agent ${new Date().toISOString()}`,
      description: 'Test agent created for integration testing',
      agent_type: 'trading',
      capabilities: ['market_analysis', 'order_execution'],
      config: {
        memory_enabled: true,
        api_access: true,
        trading_permissions: 'read',
        risk_level: 'low',
        auto_recovery: true,
        allowed_markets: ['BTC-USD', 'ETH-USD'],
      },
      linked_farm_id: 1,
      metadata: {
        created_by: 'integration_test',
        test_run: true
      }
    };
    
    const createResponse = await elizaOSService.createAgent(newAgentParams);
    
    let createdAgent: ElizaAgent | undefined;
    
    if (createResponse.error) {
      console.error('❌ Failed to create agent:', createResponse.error);
    } else {
      createdAgent = createResponse.data;
      console.log('✅ Successfully created agent:', {
        id: createdAgent?.id,
        name: createdAgent?.name,
        status: createdAgent?.status
      });
    }
    
    // 3. Test commanding an agent (if created successfully)
    if (createdAgent) {
      console.log('\n----- Testing Agent Control -----');
      
      // Start the agent
      const startResponse = await elizaOSService.controlAgent(createdAgent.id, 'start');
      
      if (startResponse.error) {
        console.error('❌ Failed to start agent:', startResponse.error);
      } else {
        console.log('✅ Successfully sent start command');
      }
      
      // Wait a bit for the agent to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Pause the agent
      const pauseResponse = await elizaOSService.controlAgent(createdAgent.id, 'pause');
      
      if (pauseResponse.error) {
        console.error('❌ Failed to pause agent:', pauseResponse.error);
      } else {
        console.log('✅ Successfully sent pause command');
      }
      
      // Test command execution
      console.log('\n----- Testing Command Execution -----');
      
      const commandResponse = await elizaOSService.executeCommand(
        'Get current market prices for BTC-USD', 
        createdAgent.id
      );
      
      if (commandResponse.error) {
        console.error('❌ Failed to execute command:', commandResponse.error);
      } else {
        console.log('✅ Successfully executed command:', {
          command_id: commandResponse.data?.id,
          status: commandResponse.data?.status
        });
      }
      
      // Get agent commands
      console.log('\n----- Testing Agent Commands Listing -----');
      
      const commandsResponse = await elizaOSService.getAgentCommands(createdAgent.id);
      
      if (commandsResponse.error) {
        console.error('❌ Failed to fetch agent commands:', commandsResponse.error);
      } else {
        console.log(`✅ Successfully fetched ${commandsResponse.data?.length || 0} commands for agent`);
      }
      
      // Clean up the test agent
      console.log('\n----- Testing Agent Deletion -----');
      
      // First stop the agent
      await elizaOSService.controlAgent(createdAgent.id, 'stop');
      
      // Delete the agent
      const deleteResponse = await elizaOSService.deleteAgent(createdAgent.id);
      
      if (deleteResponse.error) {
        console.error('❌ Failed to delete agent:', deleteResponse.error);
      } else {
        console.log('✅ Successfully deleted agent');
      }
    }
    
    // 4. Test events setup (will not actually test events, just the setup)
    console.log('\n----- Testing Events Setup -----');
    
    try {
      elizaOSService.addEventListener('test', () => {});
      elizaOSService.removeEventListener('test', () => {});
      console.log('✅ Successfully set up event listeners');
    } catch (error) {
      console.error('❌ Failed to set up event listeners:', error);
    }
    
    console.log('\n===== ElizaOS Integration Test Complete =====');
  } catch (error) {
    console.error('❌ Integration test failed with unhandled error:', error);
  }
}

// Run the test
if (require.main === module) {
  testElizaOSIntegration()
    .then(() => {
      console.log('Test script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test script failed with unhandled error:', error);
      process.exit(1);
    });
}

export default testElizaOSIntegration; 