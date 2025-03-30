import { SupabaseClientFactory, getSupabaseClient } from './lib/supabase-client';

/**
 * Script to check table structures and field availability in the database
 */
async function verifyTableSchemas() {
  // Initialize the Supabase client
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
  SupabaseClientFactory.initialize(apiKey);
  const client = getSupabaseClient();
  
  console.log('Verifying table schemas in the Trading Farm database...');

  // List of tables to check
  const tables = [
    'farms',
    'agents',
    'agent_messages',
    'wallets',
    'transactions',
    'market_data',
    'eliza_commands',
    'orders',
    'trades',
    'trading_strategies',
    'farm_strategies'
  ];

  for (const table of tables) {
    try {
      console.log(`\n--------- Checking ${table} ---------`);
      
      // Try to query a single row - this will show us if the table exists
      const { data, error } = await client
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`Error accessing ${table}:`, error.message);
        continue;
      }
      
      console.log(`✅ Table ${table} exists`);
      
      // Now let's use a simple test insert to check column availability
      // We'll construct a minimal record with only required fields
      const testRecord: Record<string, any> = {};
      
      // Set up required fields based on table name
      switch(table) {
        case 'farms':
          testRecord.name = 'Test Farm';
          testRecord.is_active = true;
          break;
        case 'agents':
          testRecord.farm_id = 1;
          testRecord.name = 'Test Agent';
          testRecord.is_active = true;
          break;
        case 'agent_messages':
          testRecord.agent_id = 1;
          testRecord.content = 'Test message';
          testRecord.direction = 'inbound';
          testRecord.source = 'test';
          break;
        case 'wallets':
          testRecord.owner_id = 1;
          testRecord.owner_type = 'farm';
          testRecord.name = 'Test Wallet';
          testRecord.balance = 1000;
          testRecord.currency = 'USD';
          testRecord.is_active = true;
          break;
        case 'transactions':
          testRecord.wallet_id = 1;
          testRecord.amount = 100;
          testRecord.currency = 'USD';
          testRecord.transaction_type = 'deposit';
          break;
        case 'market_data':
          testRecord.symbol = 'BTC/USD';
          testRecord.exchange = 'binance';
          testRecord.data_type = 'ticker';
          // Test both 'data' and 'market_data' fields
          testRecord.data = { price: 60000 };
          testRecord.market_data = { price: 60000 };
          testRecord.fetched_at = new Date().toISOString();
          testRecord.source = 'api';
          break;
        case 'eliza_commands':
          testRecord.command = 'test';
          testRecord.source = 'user';
          break;
        case 'orders':
          testRecord.farm_id = 1;
          testRecord.exchange = 'binance';
          testRecord.symbol = 'BTC/USD';
          testRecord.order_type = 'limit';
          testRecord.side = 'buy';
          testRecord.quantity = 0.1;
          testRecord.price = 60000;
          testRecord.status = 'new';
          testRecord.filled_quantity = 0;
          break;
        case 'trades':
          testRecord.order_id = 1;
          testRecord.quantity = 0.1;
          testRecord.price = 60000;
          testRecord.side = 'buy';
          testRecord.exchange = 'binance';
          testRecord.symbol = 'BTC/USD';
          testRecord.executed_at = new Date().toISOString();
          break;
        case 'trading_strategies':
          testRecord.name = 'Test Strategy';
          testRecord.strategy_type = 'momentum';
          // Test both with and without description
          testRecord.description = 'Test description';
          testRecord.parameters = { timeframe: '1h' };
          testRecord.is_active = true;
          testRecord.performance_metrics = { win_rate: 0 };
          // Test both with and without backtest_results
          testRecord.backtest_results = {};
          break;
        case 'farm_strategies':
          testRecord.farm_id = 1;
          testRecord.strategy_id = 1;
          testRecord.allocation = 0.5;
          testRecord.config = {};
          break;
      }
      
      // Attempt to insert a record and see which fields cause errors
      console.log(`Testing fields for ${table}:`);
      const { error: insertError } = await client
        .from(table)
        .insert(testRecord)
        .select()
        .limit(1);
      
      if (insertError) {
        console.error(`Insert test error for ${table}:`, insertError.message);
        
        // Try to identify which field caused the problem
        if (insertError.message.includes('column')) {
          const match = insertError.message.match(/column "([^"]+)"/);
          if (match) {
            console.log(`❌ Problem field: ${match[1]}`);
            
            // Try again without the problematic field
            delete testRecord[match[1]];
            console.log(`Retrying without ${match[1]}...`);
            
            const { error: retryError } = await client
              .from(table)
              .insert(testRecord)
              .select()
              .limit(1);
            
            if (retryError) {
              console.error(`Still failed:`, retryError.message);
            } else {
              console.log(`✅ Insert succeeded without ${match[1]}`);
            }
          }
        }
      } else {
        console.log(`✅ All fields accepted for ${table}`);
      }
      
      // Now let's try querying different field combinations to see what works
      console.log(`Testing individual field queries for ${table}:`);
      
      // Create a list of fields to test based on the test record
      const fieldsToTest = Object.keys(testRecord);
      
      for (const field of fieldsToTest) {
        const { data: queryData, error: queryError } = await client
          .from(table)
          .select(field)
          .limit(1);
        
        if (queryError) {
          console.log(`❌ Cannot query '${field}' field:`, queryError.message);
        } else {
          console.log(`✅ Field '${field}' can be queried successfully`);
        }
      }
      
    } catch (error) {
      console.error(`Error checking ${table}:`, error);
    }
  }
  
  console.log('\n--------- Verification Complete ---------');
}

// Run the verification
verifyTableSchemas().catch(console.error);
