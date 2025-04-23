// Test script for agent health monitoring system
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgvlzvswzpfoywfxehis.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTI1MzE2NywiZXhwIjoyMDYwODI5MTY3fQ.MyP21Ig3G7HvDPNZcx81LzQQrIy5yfC9ErmC686LMX4';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// Helper to display detailed errors
const logError = (step, error) => {
  console.error(`❌ Error during ${step}:`);
  if (error.code) console.error(`  Code: ${error.code}`);
  if (error.message) console.error(`  Message: ${error.message}`);
  if (error.details) console.error(`  Details: ${error.details}`);
  if (error.hint) console.error(`  Hint: ${error.hint}`);
  console.error('  Full error:', JSON.stringify(error, null, 2));
};

// Verify if a table exists
async function tableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    if (error && error.code === '42P01') { // Table doesn't exist
      return false;
    }
    
    return true; // Table exists, even if empty
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

async function main() {
  console.log('🔄 Testing agent health monitoring system...');
  
  try {
    // Check if tables exist
    console.log('🔄 Verifying health tables exist...');
    const healthTableExists = await tableExists('agent_health');
    const eventsTableExists = await tableExists('agent_events');
    const alertsTableExists = await tableExists('agent_alert_configs');
    const breakersTableExists = await tableExists('agent_circuit_breakers');
    
    console.log(`Table agent_health exists: ${healthTableExists}`);
    console.log(`Table agent_events exists: ${eventsTableExists}`);
    console.log(`Table agent_alert_configs exists: ${alertsTableExists}`);
    console.log(`Table agent_circuit_breakers exists: ${breakersTableExists}`);
    
    if (!healthTableExists || !eventsTableExists || !alertsTableExists || !breakersTableExists) {
      console.error('❌ One or more required tables do not exist. Please run the migration first.');
      return;
    }
    
    // 1. Test connection
    console.log('🔄 Testing Supabase connection...');
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .select('id, name')
      .limit(1);
    
    if (farmError) {
      logError('farm data retrieval', farmError);
      return;
    }
    
    console.log('✅ Connection successful!');
    console.log(`Found farm: ${farmData[0].name} (ID: ${farmData[0].id})`);
    
    // 2. Get an agent to work with
    console.log('🔄 Getting an agent to work with...');
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('id, name, farm_id')
      .eq('farm_id', farmData[0].id)
      .limit(1);
    
    if (agentError) {
      logError('agent data retrieval', agentError);
      return;
    }
    
    let agent;
    if (!agentData || agentData.length === 0) {
      console.log('⚠️ No agents found for this farm. Creating a test agent...');
      const { data: newAgent, error: createError } = await supabase
        .from('agents')
        .insert([
          { 
            name: 'Test Health Monitor Agent', 
            farm_id: farmData[0].id,
            type: 'trading',
            status: 'inactive',
            config: { test_mode: true },
            metadata: { created_by: 'health_test' }
          }
        ])
        .select();
      
      if (createError) {
        logError('agent creation', createError);
        return;
      }
      
      console.log(`✅ Created test agent: ${newAgent[0].name} (ID: ${newAgent[0].id})`);
      agent = newAgent[0];
    } else {
      console.log(`Found agent: ${agentData[0].name} (ID: ${agentData[0].id})`);
      agent = agentData[0];
    }
    
    // 3. Create health record
    console.log('🔄 Creating health record for agent...');
    const healthData = {
      agent_id: agent.id,
      status: 'healthy',
      metrics: {
        cpu_usage: 15.2,
        memory_usage: 245.6,
        uptime: 3600,
        trade_count: 12,
        connection_status: 'connected',
        last_trade_time: new Date().toISOString()
      },
      last_update: new Date().toISOString()
    };
    
    const { data: healthRecord, error: healthError } = await supabase
      .from('agent_health')
      .insert([healthData])
      .select();
    
    if (healthError) {
      logError('health record creation', healthError);
      // Try to debug by checking table structure
      const { data: healthColumns } = await supabase.rpc('_postgrest_table_info', {
        table_name: 'agent_health'
      });
      console.log('Table structure:', healthColumns);
      return;
    }
    
    console.log('✅ Created health record!');
    console.log(healthRecord[0]);
    
    // 4. Create an event
    console.log('🔄 Creating agent event...');
    const eventData = {
      agent_id: agent.id,
      event_type: 'health_check',
      severity: 'info',
      details: {
        message: 'Health check completed successfully',
        cpu_usage: healthData.metrics.cpu_usage,
        memory_usage: healthData.metrics.memory_usage
      }
    };
    
    const { data: eventRecord, error: eventError } = await supabase
      .from('agent_events')
      .insert([eventData])
      .select();
    
    if (eventError) {
      logError('event record creation', eventError);
      return;
    }
    
    console.log('✅ Created event record!');
    console.log(eventRecord[0]);
    
    // 5. Create alert config
    console.log('🔄 Creating alert config...');
    const alertData = {
      agent_id: agent.id,
      metric_name: 'cpu_usage',
      threshold: 80,
      condition: 'gt',
      severity: 'warning',
      enabled: true,
      notification_channels: ['email', 'dashboard']
    };
    
    const { data: alertRecord, error: alertError } = await supabase
      .from('agent_alert_configs')
      .insert([alertData])
      .select();
    
    if (alertError) {
      logError('alert config creation', alertError);
      return;
    }
    
    console.log('✅ Created alert config!');
    console.log(alertRecord[0]);
    
    // 6. Create circuit breaker
    console.log('🔄 Creating circuit breaker...');
    const breakerData = {
      agent_id: agent.id,
      metric_name: 'trade_drawdown',
      threshold: 5,
      condition: 'gt',
      action: 'pause_trading',
      enabled: true,
      cooldown_minutes: 60
    };
    
    const { data: breakerRecord, error: breakerError } = await supabase
      .from('agent_circuit_breakers')
      .insert([breakerData])
      .select();
    
    if (breakerError) {
      logError('circuit breaker creation', breakerError);
      return;
    }
    
    console.log('✅ Created circuit breaker!');
    console.log(breakerRecord[0]);
    
    // 7. Test queries
    console.log('🔄 Testing queries on agent health data...');
    
    // Get all health records for the agent
    const { data: healthRecords, error: healthQueryError } = await supabase
      .from('agent_health')
      .select('*')
      .eq('agent_id', agent.id);
    
    if (healthQueryError) {
      logError('health records query', healthQueryError);
      return;
    }
    
    console.log(`✅ Found ${healthRecords.length} health records for the agent`);
    
    // Get all events for the agent
    const { data: eventRecords, error: eventQueryError } = await supabase
      .from('agent_events')
      .select('*')
      .eq('agent_id', agent.id);
    
    if (eventQueryError) {
      logError('event records query', eventQueryError);
      return;
    }
    
    console.log(`✅ Found ${eventRecords.length} event records for the agent`);
    
    console.log('✅ All tests completed successfully!');
    console.log('The agent health monitoring system is ready for use!');
    
  } catch (error) {
    console.error('❌ Unexpected error testing agent health system:');
    console.error(error);
  }
}

main();
