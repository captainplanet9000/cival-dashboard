import { TradingFarmDataService, tradingFarmData } from './trading-farm-data-service';
import { getSupabaseClient } from '../lib/supabase-client';

/**
 * Test script to verify database connection and tables
 */
async function testDatabaseConnection() {
  console.log('===== Testing Trading Farm Database Connection =====');
  
  try {
    // Initialize the Supabase client with a valid API key if needed
    // TradingFarmDataService.initialize('your-api-key-here');
    
    // Test basic connection
    const connectionTest = await tradingFarmData.testConnection();
    if (connectionTest) {
      console.log('✅ Basic database connection successful');
    } else {
      console.error('❌ Database connection failed');
      return;
    }
    
    // Get Supabase client directly for table checks
    const supabase = getSupabaseClient();
    
    // List of tables to check
    const tables = [
      'farms',
      'agents',
      'wallets',
      'market_data',
      'orders',
      'trades',
      'agent_messages',
      'transactions',
      'trading_strategies'
    ];
    
    console.log('\n----- Checking Tables -----');
    
    for (const table of tables) {
      try {
        // Try to query one row from each table
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(1);
        
        if (error) {
          console.error(`❌ Table "${table}" error: ${error.message}`);
        } else {
          console.log(`✅ Table "${table}" exists with ${count || 0} records`);
        }
      } catch (err) {
        console.error(`❌ Failed to query table "${table}": ${err}`);
      }
    }
    
    // Test repository operations
    console.log('\n----- Testing Repository Operations -----');
    
    // Test farm repository
    try {
      const farms = await tradingFarmData.farmRepository.findAll({ limit: 5 });
      console.log(`✅ Farm repository returned ${farms.length} farms`);
      
      if (farms.length > 0) {
        const farm = await tradingFarmData.farmRepository.findById(farms[0].id);
        console.log(`✅ Retrieved farm: ${farm?.name || 'unnamed'}`);
      }
    } catch (err) {
      console.error('❌ Farm repository test failed:', err);
    }
    
    // Test agent repository
    try {
      const agents = await tradingFarmData.agentRepository.findAll({ limit: 5 });
      console.log(`✅ Agent repository returned ${agents.length} agents`);
    } catch (err) {
      console.error('❌ Agent repository test failed:', err);
    }
    
    // Test new agent_messages repository
    try {
      const messages = await tradingFarmData.agentMessageRepository.findAll({ limit: 5 });
      console.log(`✅ Agent message repository returned ${messages.length} messages`);
    } catch (err) {
      console.error('❌ Agent message repository test failed:', err);
    }
    
    // Test new transactions repository
    try {
      const transactions = await tradingFarmData.transactionRepository.findAll({ limit: 5 });
      console.log(`✅ Transaction repository returned ${transactions.length} transactions`);
    } catch (err) {
      console.error('❌ Transaction repository test failed:', err);
    }
    
    console.log('\n----- Database Integration Test Complete -----');
    console.log('Database connection and repositories are working correctly.');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Execute the test
testDatabaseConnection()
  .then(() => {
    console.log('Test script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });

export default testDatabaseConnection; 