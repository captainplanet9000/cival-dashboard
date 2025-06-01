/**
 * Trading Farm Memory Integration Demo
 * 
 * This script demonstrates the integration of Cognee.ai and Graphiti memory systems
 * with the Trading Farm data access layer, showing how to use agent memory and
 * market relationship analysis in a trading context.
 */

import { 
  TradingFarmDataService, 
  tradingFarmDashboard, 
  Farm, 
  Agent, 
  MarketData,
  MemoryEvent
} from './index';

// API keys - in production, these would come from environment variables
const SUPABASE_API_KEY = 'your-supabase-api-key';
const COGNEE_API_KEY = 'your-cognee-api-key';
const GRAPHITI_API_KEY = 'your-graphiti-api-key';

async function runMemoryDemo() {
  console.log('Starting Trading Farm Memory Integration Demo...');
  
  // Step 1: Initialize the Trading Farm Data Service with all memory systems
  console.log('\n1. Initializing Trading Farm Data Service...');
  TradingFarmDataService.initialize(SUPABASE_API_KEY);
  const dataService = TradingFarmDataService.getInstance();
  dataService.initializeMemorySystems(COGNEE_API_KEY, GRAPHITI_API_KEY);
  
  // Step 2: Initialize the Dashboard Integration
  console.log('\n2. Initializing Dashboard Integration...');
  tradingFarmDashboard.initialize(SUPABASE_API_KEY, COGNEE_API_KEY, GRAPHITI_API_KEY);
  
  // Step 3: Create demo farm and agent
  console.log('\n3. Creating demo farm and agent...');
  const farm = await createDemoFarm();
  console.log(`Farm created: ${farm.name} (ID: ${farm.id})`);
  
  const agent = await createDemoAgent(farm.id);
  console.log(`Agent created: ${agent.name} (ID: ${agent.id})`);
  
  // Step 4: Store agent memories based on market events
  console.log('\n4. Storing agent memories based on market events...');
  const marketEvents = generateMarketEvents();
  
  for (const event of marketEvents) {
    await dataService.tradingFarmMemory.storeAgentMemory(agent.id, event);
    console.log(`Stored memory: ${event.type} - ${event.content.substring(0, 50)}...`);
  }
  
  // Step 5: Analyze agent memory for patterns and insights
  console.log('\n5. Analyzing agent memory for patterns and insights...');
  const memoryAnalysis = await tradingFarmDashboard.getAgentMemoryInsights(agent.id);
  console.log('Memory Analysis Results:');
  console.log(JSON.stringify(memoryAnalysis, null, 2));
  
  // Step 6: Get market correlations from knowledge graph
  console.log('\n6. Getting market correlations from knowledge graph...');
  const marketCorrelations = await tradingFarmDashboard.getMarketRelationships('BTC/USD');
  console.log('Market Correlations:');
  console.log(JSON.stringify(marketCorrelations, null, 2));
  
  // Step 7: Demonstrate memory-based trading decision
  console.log('\n7. Demonstrating memory-based trading decision...');
  const tradingDecision = await makeMemoryBasedTradingDecision(agent.id, 'BTC/USD');
  console.log('Trading Decision:');
  console.log(JSON.stringify(tradingDecision, null, 2));
  
  console.log('\nMemory Integration Demo Completed Successfully!');
}

// Helper function to create a demo farm
async function createDemoFarm(): Promise<Farm> {
  const dataService = TradingFarmDataService.getInstance();
  
  const farm = await dataService.farmRepository.create({
    name: 'Memory Test Farm',
    description: 'A farm for testing memory integration',
    status: 'active',
    settings: {
      risk_level: 'moderate',
      auto_rebalance: true
    }
  });
  
  return farm;
}

// Helper function to create a demo agent
async function createDemoAgent(farmId: number): Promise<Agent> {
  const dataService = TradingFarmDataService.getInstance();
  
  const agent = await dataService.agentRepository.create({
    farm_id: farmId,
    name: 'Memory Test Agent',
    type: 'trader',
    status: 'active',
    capabilities: ['market_analysis', 'pattern_recognition', 'trend_following'],
    settings: {
      memory_retention: 0.9,
      learning_rate: 0.05,
      max_position_size: 0.1
    }
  });
  
  return agent;
}

// Generate sample market events for agent memory
function generateMarketEvents(): MemoryEvent[] {
  const now = Date.now();
  const hourInMs = 3600000;
  
  return [
    {
      type: 'market_data',
      content: 'BTC/USD reached a new daily high of $52,500 with increased volume.',
      importance: 0.7,
      metadata: {
        symbol: 'BTC/USD',
        price: 52500,
        volume: 1250.5
      },
      timestamp: now - (hourInMs * 12)
    },
    {
      type: 'market_data',
      content: 'ETH/USD showing strong correlation with BTC/USD movements over the past 24 hours.',
      importance: 0.6,
      metadata: {
        symbol: 'ETH/USD',
        correlated_with: 'BTC/USD',
        correlation_strength: 0.85
      },
      timestamp: now - (hourInMs * 10)
    },
    {
      type: 'system_event',
      content: 'Market volatility alert: VIX spiking above 25, indicating increased market uncertainty.',
      importance: 0.8,
      metadata: {
        indicator: 'VIX',
        value: 26.5,
        threshold: 25
      },
      timestamp: now - (hourInMs * 8)
    },
    {
      type: 'order',
      content: 'Placed limit buy order for 0.5 BTC at $51,200, order filled successfully.',
      importance: 0.9,
      metadata: {
        order_type: 'limit',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.5,
        price: 51200,
        status: 'filled'
      },
      timestamp: now - (hourInMs * 6)
    },
    {
      type: 'trade',
      content: 'Sold 0.2 ETH at $3,450 for a 2.3% profit after holding for 48 hours.',
      importance: 0.7,
      metadata: {
        symbol: 'ETH/USD',
        side: 'sell',
        amount: 0.2,
        price: 3450,
        profit_percentage: 2.3,
        holding_period: '48h'
      },
      timestamp: now - (hourInMs * 4)
    },
    {
      type: 'agent_message',
      content: 'Detected potential double-bottom pattern forming on BTC/USD 4-hour chart.',
      importance: 0.75,
      metadata: {
        pattern: 'double-bottom',
        symbol: 'BTC/USD',
        timeframe: '4h',
        confidence: 0.82
      },
      timestamp: now - (hourInMs * 2)
    },
    {
      type: 'market_data',
      content: 'Breaking news: SEC approves spot Ethereum ETF applications, market showing positive reaction.',
      importance: 0.95,
      metadata: {
        news_type: 'regulatory',
        source: 'SEC',
        impact_assets: ['ETH/USD', 'crypto_market'],
        sentiment: 'positive'
      },
      timestamp: now - (hourInMs * 1)
    }
  ];
}

// Sample function to demonstrate memory-based trading decision
async function makeMemoryBasedTradingDecision(
  agentId: number, 
  symbol: string
): Promise<{
  decision: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  supporting_memories: any[];
  market_relationships: any[];
}> {
  const dataService = TradingFarmDataService.getInstance();
  
  // Get relevant memories for the current market context
  const context = `Current market conditions for ${symbol} and potential trading opportunities`;
  const relevantMemories = await dataService.tradingFarmMemory.retrieveRelevantMemories(
    agentId, 
    context,
    { limit: 5 }
  );
  
  // Get market correlations
  const marketCorrelations = await dataService.tradingFarmMemory.getMarketCorrelations('1h');
  
  // Simple example decision logic (in real systems this would be more sophisticated)
  const hasPositiveNews = relevantMemories.some(
    memory => memory.metadata.sentiment === 'positive' && 
    memory.type === 'episodic' && 
    memory.importance > 0.8
  );
  
  const hasPositivePattern = relevantMemories.some(
    memory => memory.metadata.pattern && 
    memory.type === 'semantic' &&
    memory.importance > 0.7
  );
  
  const hasStrongCorrelations = marketCorrelations.some(
    corr => corr.strength > 0.8 && 
    (corr.source === symbol || corr.target === symbol)
  );
  
  // Make decision based on memory and knowledge graph insights
  let decision: 'buy' | 'sell' | 'hold';
  let confidence: number;
  let reasoning: string;
  
  if (hasPositiveNews && (hasPositivePattern || hasStrongCorrelations)) {
    decision = 'buy';
    confidence = 0.85;
    reasoning = 'High confidence buy signal based on positive news and technical pattern recognition, supported by strong market correlations.';
  } else if (hasPositivePattern && hasStrongCorrelations) {
    decision = 'buy';
    confidence = 0.7;
    reasoning = 'Moderate confidence buy signal based on technical pattern and market correlations.';
  } else {
    decision = 'hold';
    confidence = 0.6;
    reasoning = 'Insufficient signals for high-confidence trade, maintaining current position.';
  }
  
  return {
    decision,
    confidence,
    reasoning,
    supporting_memories: relevantMemories,
    market_relationships: marketCorrelations
  };
}

// Run the demo (uncomment to execute)
// runMemoryDemo().catch(console.error);

export { runMemoryDemo };
