import { TradingSystem, OrderParams, TradeParams, PositionUpdateParams } from '../utils/supabase/trading-system';

/**
 * Test script for the Trading Farm trading system
 * Run with: npx ts-node src/scripts/test-trading-system.ts
 */
async function testTradingSystem() {
  try {
    console.log('🚀 Testing Trading Farm Trading System...');
    
    // You'll need to replace these with actual values from your database
    const testFarmId = 'YOUR_FARM_ID';
    const testExchangeConnectionId = 'YOUR_EXCHANGE_CONNECTION_ID';
    
    // Step 1: Create a test order
    console.log('\n📝 Step 1: Creating test order...');
    const orderParams: OrderParams = {
      farmId: testFarmId,
      exchangeConnectionId: testExchangeConnectionId,
      symbol: 'BTC/USDT',
      orderType: 'market',
      side: 'buy',
      quantity: 0.01,
      isPaperTrading: true
    };
    
    const order = await TradingSystem.createOrder(orderParams);
    console.log('✅ Test order created:', order);
    
    // Step 2: Record a test trade
    console.log('\n📊 Step 2: Recording test trade...');
    const tradeParams: TradeParams = {
      farmId: testFarmId,
      orderId: order.id,
      exchangeConnectionId: testExchangeConnectionId,
      symbol: 'BTC/USDT',
      side: 'buy',
      quantity: 0.01,
      price: 75000,
      commission: 0.00075,
      commissionAsset: 'USDT',
      executionTimestamp: new Date(),
      isPaperTrading: true
    };
    
    const trade = await TradingSystem.recordTrade(tradeParams);
    console.log('✅ Test trade recorded:', trade);
    
    // Step 3: Update a position
    console.log('\n📈 Step 3: Updating position...');
    const positionParams: PositionUpdateParams = {
      farmId: testFarmId,
      exchangeConnectionId: testExchangeConnectionId,
      symbol: 'BTC/USDT',
      side: 'long',
      quantity: 0.01,
      entryPrice: 75000,
      currentPrice: 75500,
      isPaperTrading: true
    };
    
    const position = await TradingSystem.updatePosition(positionParams);
    console.log('✅ Position updated:', position);
    
    // Step 4: Perform a risk check
    console.log('\n⚠️ Step 4: Performing risk check...');
    const riskCheck = await TradingSystem.performRiskCheck({
      farmId: testFarmId,
      symbol: 'BTC/USDT',
      side: 'buy',
      quantity: 0.5,
      price: 75000
    });
    
    console.log('✅ Risk check result:', riskCheck);
    
    // Step 5: Query positions
    console.log('\n🔍 Step 5: Querying positions...');
    const positions = await TradingSystem.getPositions(testFarmId, {
      isPaperTrading: true
    });
    
    console.log(`✅ Found ${positions.length} positions:`, positions);
    
    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testTradingSystem();
