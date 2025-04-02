/**
 * Validate ElizaOS Order Integration Flow
 * 
 * This script:
 * 1. Checks for existing farms
 * 2. Creates a test farm if needed
 * 3. Creates a test order with ElizaOS agent integration
 * 4. Verifies the agent command creation works
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check database schema and tables
 */
async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...');
  
  try {
    // Check farms table
    const { data: farms, error: farmsError } = await supabase
      .from('farms')
      .select('*')
      .limit(1);
    
    if (farmsError) {
      console.error('❌ Error accessing farms table:', farmsError.message);
      return { success: false, error: farmsError.message };
    }
    
    console.log(`✅ Farms table accessible (${farms.length} farms found)`);
    
    // Check agents table
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .limit(1);
    
    if (agentsError) {
      console.error('❌ Error accessing agents table:', agentsError.message);
      return { success: false, error: agentsError.message };
    }
    
    console.log(`✅ Agents table accessible (${agents.length} agents found)`);
    
    // Check orders table
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (ordersError) {
      console.error('❌ Error accessing orders table:', ordersError.message);
      return { success: false, error: ordersError.message };
    }
    
    if (orders.length > 0) {
      console.log(`✅ Orders table accessible with schema:`, Object.keys(orders[0]).join(', '));
    } else {
      console.log(`✅ Orders table accessible (empty)`);
    }
    
    // Check agent_commands table
    try {
      const { data: commands, error: commandsError } = await supabase
        .from('agent_commands')
        .select('*')
        .limit(1);
      
      if (commandsError) {
        console.error('❌ Error accessing agent_commands table:', commandsError.message);
        return { success: false, schema_issue: true, table: 'agent_commands', error: commandsError.message };
      }
      
      console.log(`✅ Agent commands table accessible (${commands.length} commands found)`);
    } catch (error) {
      console.error('❌ Error checking agent_commands:', error.message);
      return { success: false, schema_issue: true, table: 'agent_commands', error: error.message };
    }
    
    return { 
      success: true, 
      farms: farms,
      agents: agents
    };
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create a test farm if needed
 */
async function ensureTestFarm() {
  console.log('\n🏫 Ensuring test farm exists...');
  
  // Check if we already have a test farm
  const { data: existingFarms, error: farmError } = await supabase
    .from('farms')
    .select('*')
    .eq('name', 'ElizaOS Test Farm')
    .limit(1);
  
  if (farmError) {
    console.error('❌ Error checking for existing test farm:', farmError.message);
    return { success: false, error: farmError.message };
  }
  
  // If farm exists, return it
  if (existingFarms && existingFarms.length > 0) {
    console.log(`✅ Test farm already exists with ID: ${existingFarms[0].id}`);
    return { success: true, farm: existingFarms[0] };
  }
  
  // Check the schema to see what columns we have
  const { data: sampleFarm, error: sampleError } = await supabase
    .from('farms')
    .select('*')
    .limit(1);
  
  if (sampleError) {
    console.error('❌ Error checking farm schema:', sampleError.message);
    return { success: false, error: sampleError.message };
  }
  
  // Create a new test farm with only the columns that actually exist
  console.log('Creating new test farm...');
  
  // Prepare farm data based on available columns
  const farmData = {
    name: 'ElizaOS Test Farm',
    description: 'A test farm for ElizaOS order integration',
    status: 'active'
  };
  
  // Add configuration if the column exists
  if (sampleFarm.length > 0 && 'configuration' in sampleFarm[0]) {
    farmData.configuration = { test: true };
  }
  
  // Create the farm with only the columns that exist
  const { data: newFarm, error: createError } = await supabase
    .from('farms')
    .insert(farmData)
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating test farm:', createError.message);
    return { success: false, error: createError.message };
  }
  
  console.log(`✅ Created new test farm with ID: ${newFarm.id}`);
  return { success: true, farm: newFarm };
}

/**
 * Ensure test agent exists
 */
async function ensureTestAgent(farmId) {
  console.log('\n🤖 Ensuring test agent exists...');
  
  // Check if we already have a test agent for this farm
  const { data: existingAgents, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('name', 'ElizaOS Test Agent')
    .eq('farm_id', farmId)
    .limit(1);
  
  if (agentError) {
    console.error('❌ Error checking for existing test agent:', agentError.message);
    return { success: false, error: agentError.message };
  }
  
  // If agent exists, return it
  if (existingAgents && existingAgents.length > 0) {
    console.log(`✅ Test agent already exists with ID: ${existingAgents[0].id}`);
    return { success: true, agent: existingAgents[0] };
  }
  
  // Check the schema to see what columns we have
  const { data: sampleAgent, error: sampleError } = await supabase
    .from('agents')
    .select('*')
    .limit(1);
  
  if (sampleError) {
    console.error('❌ Error checking agent schema:', sampleError.message);
    return { success: false, error: sampleError.message };
  }
  
  // Create a new test agent with only the columns that actually exist
  console.log('Creating new test agent...');
  
  // Prepare agent data based on available columns
  const agentData = {
    name: 'ElizaOS Test Agent',
    description: 'A test agent for ElizaOS order integration',
    exchange: 'binance',
    status: 'active',
    farm_id: farmId
  };
  
  // Add configuration if the column exists
  if (sampleAgent.length > 0 && 'configuration' in sampleAgent[0]) {
    agentData.configuration = { 
      model: 'gpt-4',
      strategy: 'test',
      risk_level: 'low'
    };
  }
  
  // Create the agent with only the columns that exist
  const { data: newAgent, error: createError } = await supabase
    .from('agents')
    .insert(agentData)
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Error creating test agent:', createError.message);
    return { success: false, error: createError.message };
  }
  
  console.log(`✅ Created new test agent with ID: ${newAgent.id}`);
  return { success: true, agent: newAgent };
}

/**
 * Create a test order with ElizaOS agent integration
 */
async function createTestOrder(farmId, agentId) {
  console.log('\n🚀 Creating test order with ElizaOS agent integration...');
  
  try {
    // Create a unique identifier for this test
    const testId = new Date().toISOString().replace(/[-:.TZ]/g, '');
    
    // Create a test order with the provided agent_id
    console.log(`Creating order for farm_id=${farmId}, agent_id=${agentId} (Test ID: ${testId})...`);
    
    // Check schema first
    const { data: sampleOrder, error: sampleError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Error checking order schema:', sampleError.message);
      return { success: false, error: sampleError.message };
    }
    
    // Determine the field name for order type ('type' or 'order_type')
    let orderTypeField = 'order_type';
    if (sampleOrder.length > 0) {
      if ('type' in sampleOrder[0]) {
        orderTypeField = 'type';
      } else if ('order_type' in sampleOrder[0]) {
        orderTypeField = 'order_type';
      }
      console.log(`Using '${orderTypeField}' for order type field based on schema`);
    }
    
    // Basic order data
    const orderData = {
      farm_id: farmId,
      agent_id: agentId,
      exchange: 'binance',
      symbol: 'BTC/USDT',
      side: 'buy',
      quantity: 0.01,
      status: 'pending'
    };
    
    // Add order type using the correct field name
    orderData[orderTypeField] = 'market';
    
    // Add metadata if field exists
    if (sampleOrder.length > 0 && 'metadata' in sampleOrder[0]) {
      orderData.metadata = { test_id: testId };
    }
    
    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id')
      .single();
    
    if (orderError) {
      console.error('❌ Error creating order:', orderError.message);
      return { success: false, error: orderError.message };
    }
    
    console.log(`✅ Order created with ID: ${order.id}`);
    return { success: true, order: order };
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check if agent command was created
 */
async function checkAgentCommand(orderId) {
  console.log('\n🔍 Checking if ElizaOS agent command was created...');
  
  try {
    // Wait a moment for the trigger to execute
    console.log('Waiting for ElizaOS trigger to process...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if the agent_command was created automatically
    const { data: commands, error: commandError } = await supabase
      .from('agent_commands')
      .select('*')
      .eq('order_id', orderId);
    
    if (commandError) {
      console.error('❌ Error retrieving agent commands:', commandError.message);
      return { success: false, error: commandError.message };
    }
    
    if (commands && commands.length > 0) {
      console.log(`✅ ElizaOS integration successful! Found ${commands.length} commands for this order.`);
      console.log('Command details:', commands[0]);
      return { success: true, commands: commands };
    } else {
      console.error('❌ ElizaOS integration FAILED: No agent commands were created for this order.');
      console.log('This could be because:');
      console.log('1. The trigger was not created correctly in the database');
      console.log('2. The agent_commands table does not exist');
      console.log('3. The order_id field is not present in agent_commands table');
      
      return { success: false, error: 'No agent commands found' };
    }
  } catch (error) {
    console.error('❌ Error checking agent command:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main function to run the complete test
 */
async function main() {
  console.log('==== Testing ElizaOS Order Integration ====');
  
  // 1. Check database schema
  const schemaCheck = await checkDatabaseSchema();
  if (!schemaCheck.success) {
    console.error('❌ Database schema check failed. Please ensure all tables exist.');
    console.log('Run the migration SQL in the Supabase SQL Editor first.');
    return;
  }
  
  // 2. Ensure test farm exists
  const farmResult = await ensureTestFarm();
  if (!farmResult.success) {
    console.error('❌ Failed to ensure test farm. Cannot proceed.');
    return;
  }
  
  // 3. Ensure test agent exists
  const agentResult = await ensureTestAgent(farmResult.farm.id);
  if (!agentResult.success) {
    console.error('❌ Failed to ensure test agent. Cannot proceed.');
    return;
  }
  
  // 4. Create test order
  const orderResult = await createTestOrder(farmResult.farm.id, agentResult.agent.id);
  if (!orderResult.success) {
    console.error('❌ Failed to create test order. Integration test failed.');
    return;
  }
  
  // 5. Check if agent command was created
  const commandResult = await checkAgentCommand(orderResult.order.id);
  
  // 6. Report final results
  console.log('\n==== ElizaOS Order Integration Test Results ====');
  console.log(`Farm: ID ${farmResult.farm.id}, Name: ${farmResult.farm.name}`);
  console.log(`Agent: ID ${agentResult.agent.id}, Name: ${agentResult.agent.name}`);
  console.log(`Order: ID ${orderResult.order.id}`);
  
  if (commandResult.success) {
    console.log(`✅ SUCCESS: ElizaOS agent command was automatically created!`);
    console.log('Command ID:', commandResult.commands[0].id);
    console.log('Command Type:', commandResult.commands[0].command_type);
    console.log('Command Content:', commandResult.commands[0].command_content);
  } else {
    console.log(`❌ FAILURE: ElizaOS agent command was not created.`);
    console.log('Please check that the database migration for creating the trigger was applied.');
  }
}

// Add helper function to get column names (will be added via SQL if not exists)
async function setupHelperFunctions() {
  console.log('Setting up helper functions...');
  
  try {
    // Create function to get column names
    const { error } = await supabase.rpc('get_column_names', { table_name: 'orders' });
    
    if (error && error.message.includes('function does not exist')) {
      console.log('Creating helper function for schema introspection...');
      
      // Create the function via raw SQL
      const { error: fnError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION get_column_names(table_name text)
          RETURNS text[] 
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            cols text[];
          BEGIN
            SELECT array_agg(column_name::text) INTO cols
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = $1;
            
            RETURN cols;
          END;
          $$;
        `
      });
      
      if (fnError) {
        console.error('Error creating helper function:', fnError.message);
      } else {
        console.log('Helper function created successfully');
      }
    }
  } catch (error) {
    console.error('Error in setup:', error.message);
  }
}

// Run helper setup first, then main test
setupHelperFunctions()
  .then(() => main())
  .catch(error => {
    console.error('❌ Fatal error:', error);
  });
