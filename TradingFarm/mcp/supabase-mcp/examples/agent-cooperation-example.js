/**
 * Agent Cooperation Example
 * 
 * Demonstrates how multiple agents can cooperate using the message queue and coordinator.
 * This example shows two agents working together on market analysis and trade execution.
 */

const AgentClient = require('./agent-client');

// Create two specialized agents
const marketAnalysisAgent = new AgentClient({
  baseUrl: 'http://localhost:3007',
  agentId: 'agent_market_1',
  agentName: 'Market Analysis Agent',
  specialization: 'market_analysis'
});

const executionAgent = new AgentClient({
  baseUrl: 'http://localhost:3007',
  agentId: 'agent_execution_1',
  agentName: 'Trade Execution Agent',
  specialization: 'execution'
});

/**
 * Initialize the agents
 */
async function initializeAgents() {
  console.log('Initializing agents...');
  
  // Initialize both agents
  await marketAnalysisAgent.initialize();
  await executionAgent.initialize();
  
  // Subscribe to specialized topics
  await marketAnalysisAgent.subscribeToTopic('market.analysis');
  await marketAnalysisAgent.subscribeToTopic('market.opportunities');
  
  await executionAgent.subscribeToTopic('trade.execution');
  await executionAgent.subscribeToTopic('trade.orders');
  
  console.log('Agents initialized and subscribed to topics');
}

/**
 * Market analysis agent workflow
 */
async function startMarketAnalysisAgent() {
  console.log('Starting market analysis agent...');
  
  // Start message processing loop
  await marketAnalysisAgent.startMessageProcessingLoop(async (message) => {
    console.log(`[Market Agent] Received message: ${message.message_type}`);
    
    // Handle cooperation requests
    if (message.message_type === 'COOPERATION_REQUEST') {
      if (message.payload.cooperation_type === 'ANALYSIS_REQUEST') {
        // Process analysis request
        console.log(`[Market Agent] Processing analysis request from ${message.sender_id}`);
        
        // Simulate analysis
        const analysis = {
          symbol: message.payload.details.symbol,
          timestamp: new Date().toISOString(),
          trend: Math.random() > 0.5 ? 'bullish' : 'bearish',
          strength: Math.random() * 100,
          indicators: {
            rsi: 30 + Math.random() * 40,
            macd: Math.random() > 0.5 ? 'positive' : 'negative'
          },
          price_targets: {
            support: message.payload.details.current_price * (0.9 + Math.random() * 0.05),
            resistance: message.payload.details.current_price * (1.05 + Math.random() * 0.05)
          }
        };
        
        // Respond to the request with analysis
        await marketAnalysisAgent.respondToCooperation(message, true, {
          analysis: analysis
        });
        
        console.log(`[Market Agent] Sent analysis response for ${message.payload.details.symbol}`);
      }
    }
  });
  
  // Simulate market opportunity detection
  setInterval(async () => {
    // Random market opportunity
    const opportunity = {
      symbol: ['BTC/USD', 'ETH/USD', 'SOL/USD'][Math.floor(Math.random() * 3)],
      opportunity_type: Math.random() > 0.5 ? 'reversal' : 'breakout',
      detected_at: new Date().toISOString(),
      confidence: 0.5 + Math.random() * 0.5,
      current_price: 1000 + Math.random() * 1000,
      volume_change: Math.random() > 0.5 ? Math.random() * 20 : -Math.random() * 10
    };
    
    // Publish to market opportunities topic
    await marketAnalysisAgent.publishToTopic('market.opportunities', 'MARKET_DATA', {
      opportunity: opportunity
    });
    
    console.log(`[Market Agent] Published market opportunity for ${opportunity.symbol}`);
  }, 15000); // Every 15 seconds
}

/**
 * Execution agent workflow
 */
async function startExecutionAgent() {
  console.log('Starting execution agent...');
  
  // Subscribe to market opportunities
  await executionAgent.subscribeToTopic('market.opportunities');
  
  // Start message processing loop
  await executionAgent.startMessageProcessingLoop(async (message) => {
    console.log(`[Execution Agent] Received message: ${message.message_type}`);
    
    // Handle market data messages
    if (message.message_type === 'MARKET_DATA') {
      if (message.payload.opportunity) {
        // Found a market opportunity from market analysis agent
        const opportunity = message.payload.opportunity;
        
        // Request additional analysis
        console.log(`[Execution Agent] Requesting detailed analysis for ${opportunity.symbol}`);
        
        const response = await executionAgent.requestCooperation(
          marketAnalysisAgent.agentId,
          'ANALYSIS_REQUEST',
          {
            symbol: opportunity.symbol,
            opportunity_type: opportunity.opportunity_type,
            current_price: opportunity.current_price
          }
        );
        
        console.log(`[Execution Agent] Sent analysis request for ${opportunity.symbol}`);
      }
    }
    
    // Handle cooperation responses
    if (message.message_type === 'COOPERATION_RESPONSE') {
      if (message.payload.cooperation_type === 'ANALYSIS_REQUEST' && message.payload.accepted) {
        // Got analysis response
        const analysis = message.payload.response.analysis;
        console.log(`[Execution Agent] Received analysis for ${analysis.symbol} - trend: ${analysis.trend}`);
        
        // Make trading decision based on analysis
        if (analysis.trend === 'bullish' && analysis.indicators.rsi < 70) {
          // Simulate executing a trade
          const order = {
            symbol: analysis.symbol,
            side: 'buy',
            type: 'limit',
            quantity: 1 + Math.random() * 10,
            price: analysis.price_targets.support + (analysis.price_targets.resistance - analysis.price_targets.support) * 0.3,
            reason: 'Following bullish trend signal from market analysis agent'
          };
          
          // Broadcast trade to everyone
          await executionAgent.broadcastMessage('EXECUTION', {
            order: order,
            execution_time: new Date().toISOString(),
            executor: executionAgent.agentName,
            analysis_source: message.sender_id
          });
          
          console.log(`[Execution Agent] Executed ${order.side} order for ${order.quantity} ${order.symbol} at ${order.price}`);
        } else if (analysis.trend === 'bearish' && analysis.indicators.rsi > 30) {
          // Simulate executing a trade
          const order = {
            symbol: analysis.symbol,
            side: 'sell',
            type: 'limit',
            quantity: 1 + Math.random() * 5,
            price: analysis.price_targets.resistance - (analysis.price_targets.resistance - analysis.price_targets.support) * 0.3,
            reason: 'Following bearish trend signal from market analysis agent'
          };
          
          // Broadcast trade to everyone
          await executionAgent.broadcastMessage('EXECUTION', {
            order: order,
            execution_time: new Date().toISOString(),
            executor: executionAgent.agentName,
            analysis_source: message.sender_id
          });
          
          console.log(`[Execution Agent] Executed ${order.side} order for ${order.quantity} ${order.symbol} at ${order.price}`);
        } else {
          console.log(`[Execution Agent] No trade executed for ${analysis.symbol} - conditions not met`);
        }
      }
    }
  });
}

/**
 * Run the example
 */
async function runAgentCooperationExample() {
  try {
    await initializeAgents();
    await startMarketAnalysisAgent();
    await startExecutionAgent();
    
    console.log('Agent cooperation example running. Press Ctrl+C to stop.');
  } catch (error) {
    console.error(`Error running example: ${error.message}`);
  }
}

// Run the example
runAgentCooperationExample(); 