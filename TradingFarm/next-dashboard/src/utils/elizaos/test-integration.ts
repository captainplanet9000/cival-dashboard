import { elizaOSPluginManager } from './index';

/**
 * Test function to verify ElizaOS integration
 */
export async function testElizaOSIntegration() {
  try {
    console.log('Initializing ElizaOS plugin manager...');
    await elizaOSPluginManager.initialize();
    console.log('ElizaOS plugin manager initialized successfully');
    
    // Test if plugins were loaded
    const plugins = elizaOSPluginManager.getAllPlugins();
    console.log(`Loaded ${plugins.size} plugins:`);
    
    for (const [name, plugin] of plugins.entries()) {
      console.log(`- ${name} v${plugin.config?.version || 'unknown'}`);
    }
    
    // Test market data functionality
    try {
      console.log('\nTesting market data functionality...');
      const btcData = await elizaOSPluginManager.getMarketData('BTC-USDT', '1h');
      console.log('BTC-USDT market data:', btcData);
    } catch (error) {
      console.error('Failed to get market data:', error);
    }
    
    // Test technical indicators
    try {
      console.log('\nTesting technical indicators...');
      const rsiData = await elizaOSPluginManager.calculateIndicator('BTC-USDT', 'rsi', '1h');
      console.log('BTC-USDT RSI:', rsiData);
    } catch (error) {
      console.error('Failed to calculate indicator:', error);
    }
    
    // Test exchange functionality
    try {
      console.log('\nTesting exchange connector (SIMULATION MODE)...');
      const orderResult = await elizaOSPluginManager.placeOrder(
        'binance',
        'BTC-USDT',
        'buy',
        'limit',
        0.001,
        30000,
        { simulate: true }
      );
      console.log('Order simulation result:', orderResult);
    } catch (error) {
      console.error('Failed to simulate order placement:', error);
    }
    
    console.log('\nElizaOS integration test completed');
    return true;
  } catch (error) {
    console.error('ElizaOS integration test failed:', error);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testElizaOSIntegration()
    .then(success => {
      console.log(`Integration test ${success ? 'succeeded' : 'failed'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error during integration test:', error);
      process.exit(1);
    });
}
