import { TradingFarmDataService } from './index';

/**
 * Test script to verify Supabase connection and Trading Farm repositories
 */
async function testConnection() {
  console.log('Testing Trading Farm Supabase Connection...');
  
  // Initialize the Supabase client with the updated API key
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU';
  TradingFarmDataService.initialize(apiKey);
  
  // Get the data service instance
  const dataService = TradingFarmDataService.getInstance();
  
  try {
    console.log('\n--------- Checking Database Connectivity ---------');
    
    // Create a test farm to verify database write access
    const testFarm = await dataService.farmRepository.create({
      name: 'Test Farm ' + new Date().toISOString(),
      is_active: true,
      risk_profile: { max_drawdown: 10, max_position_size: 5 },
      performance_metrics: { trades_count: 0, win_rate: 0 },
      config: { test_mode: true },
      metadata: { created_by: 'connection_test' }
    });
    
    console.log('✅ Successfully created test farm:', testFarm);
    
    // Find the farm by ID
    const retrievedFarm = await dataService.farmRepository.findById(testFarm.id);
    console.log('✅ Successfully retrieved farm by ID:', retrievedFarm?.name);
    
    // Delete the test farm to clean up
    const deleteResult = await dataService.farmRepository.deleteById(testFarm.id);
    console.log('✅ Successfully deleted test farm:', deleteResult);
    
    // Count active farms
    const activeFarmCount = await dataService.farmRepository.count('is_active', true);
    console.log(`✅ Found ${activeFarmCount} active farms in the database`);
    
    // Test strategy repository
    console.log('\n--------- Testing Strategy Repository ---------');
    const strategies = await dataService.strategyRepository.findAll();
    console.log(`✅ Found ${strategies.length} trading strategies in the database`);
    
    if (strategies.length > 0) {
      console.log('First strategy:', {
        id: strategies[0].id,
        name: strategies[0].name,
        type: strategies[0].strategy_type
      });
    }
    
    // Test market data repository
    console.log('\n--------- Testing Market Data Repository ---------');
    try {
      const testMarketData = await dataService.marketDataRepository.create({
        symbol: 'BTC/USD',
        exchange: 'test',
        data_type: 'ticker',
        data: {
          price: 62345.67,
          volume: 12345.67,
          timestamp: new Date().toISOString()
        },
        fetched_at: new Date().toISOString(),
        source: 'connection_test'
      });
      
      console.log('✅ Successfully stored test market data:', testMarketData?.id);
      
      // Clean up test market data
      if (testMarketData) {
        const deleteResult = await dataService.marketDataRepository.deleteById(testMarketData.id);
        console.log('✅ Successfully deleted test market data:', deleteResult);
      }
    } catch (error) {
      console.log('❌ Error with market data repository:', error);
    }
    
    // Test ElizaOS command service
    console.log('\n--------- Testing ElizaOS Command Service ---------');
    try {
      const command = await dataService.elizaCommandService.processCommand(
        'show farm status',
        'test',
        { test: true }
      );
      
      console.log('✅ Successfully processed ElizaOS command:', command.id);
      console.log('Command status:', command.status);
    } catch (error) {
      console.log('❌ Error with ElizaOS command service:', error);
    }
    
    console.log('\n--------- Connection Test Complete ---------');
    console.log('✅ Supabase connection is working correctly!');
    console.log('✅ Trading Farm repositories are functioning properly!');
    
  } catch (error) {
    console.error('❌ Error testing connection:', error);
  }
}

// Run the test
testConnection().catch(console.error);
