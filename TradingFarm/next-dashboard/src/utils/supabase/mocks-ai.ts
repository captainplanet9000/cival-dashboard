/**
 * Mock AI Service Data
 * Provides realistic AI analysis and predictions for development and testing
 */

import { mockMarketData } from './mocks-exchanges';

// Mock sentiment analysis data
export const mockMarketSentiments = [
  {
    market_id: 'BTC-USD',
    sentiment: 'bullish',
    score: 78.5,
    analysis: 'Bitcoin shows strong bullish signals based on increasing institutional adoption, reduced selling pressure from miners, and favorable technical indicators. The recent market consolidation at key support levels indicates resilience.',
    sources: ['on-chain metrics', 'social media sentiment', 'exchange flows', 'technical analysis'],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'ETH-USD',
    sentiment: 'bullish',
    score: 72.3,
    analysis: 'Ethereum continues to show bullish momentum driven by strong network usage, increasing total value locked in DeFi protocols, and growing institutional interest. Recent technical upgrades have improved network performance, positively impacting sentiment.',
    sources: ['network metrics', 'defi analytics', 'social sentiment', 'whale wallets'],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'SOL-USD',
    sentiment: 'neutral',
    score: 55.7,
    analysis: 'Solana is exhibiting mixed signals with strong network growth counterbalanced by competitive pressures. Recent performance issues have been resolved, but market participants remain cautious about potential technical challenges.',
    sources: ['network health', 'developer activity', 'social sentiment', 'institutional flows'],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'AVAX-USD',
    sentiment: 'bullish',
    score: 67.8,
    analysis: 'Avalanche shows bullish indicators based on growing subnet adoption, increased cross-chain activity, and expanding DeFi ecosystem. Recent partnerships with traditional financial institutions have strengthened its market position.',
    sources: ['subnet metrics', 'defi analytics', 'developer activity', 'social sentiment'],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'MATIC-USD',
    sentiment: 'neutral',
    score: 58.2,
    analysis: 'Polygon displays a neutral sentiment trend with positive development activity offset by scaling solution competition. Its ecosystem continues to grow but faces pressure from emerging Layer 2 alternatives.',
    sources: ['network metrics', 'developer github', 'social sentiment', 'zkEVM adoption'],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'DOT-USD',
    sentiment: 'bearish',
    score: 42.5,
    analysis: 'Polkadot shows bearish signals due to slower than expected parachain adoption and competitive pressure from alternative Layer 1 blockchains. Despite strong technical fundamentals, market sentiment has weakened due to delayed ecosystem growth.',
    sources: ['parachain metrics', 'developer activity', 'social sentiment', 'institutional flows'],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'XRP-USD',
    sentiment: 'bullish',
    score: 63.7,
    analysis: 'XRP exhibits bullish sentiment following favorable regulatory developments and increased adoption for cross-border payments. The improved clarity has led to renewed interest from financial institutions exploring RippleNet services.',
    sources: ['regulatory news', 'institutional adoption', 'network metrics', 'social sentiment'],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'DOGE-USD',
    sentiment: 'neutral',
    score: 50.3,
    analysis: 'Dogecoin displays neutral market sentiment with social media activity fluctuating based on celebrity endorsements. While payment adoption has increased, the market remains highly sensitive to public figures\' comments rather than fundamental factors.',
    sources: ['social media trends', 'merchant adoption', 'wallet activity', 'exchange flows'],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'LINK-USD',
    sentiment: 'bullish',
    score: 75.6,
    analysis: 'Chainlink shows strong bullish signals based on increasing oracle implementation across DeFi, growing CCIP adoption, and strategic enterprise partnerships. Its critical infrastructure role in the blockchain ecosystem continues to strengthen its market position.',
    sources: ['integration metrics', 'defi analytics', 'enterprise adoption', 'technical analysis'],
    timestamp: '2025-04-01T12:30:00Z'
  }
];

// Mock price predictions
export const mockPricePredictions = [
  {
    market_id: 'BTC-USD',
    timeframe: '24h',
    current_price: 60250,
    predicted_price: 62150,
    change_percent: 3.15,
    confidence: 72.5,
    factors: [
      'positive fund flows',
      'reduced exchange reserves',
      'increasing hash rate',
      'option market sentiment'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'BTC-USD',
    timeframe: '7d',
    current_price: 60250,
    predicted_price: 64800,
    change_percent: 7.55,
    confidence: 65.3,
    factors: [
      'macro economic trends',
      'institutional buying patterns',
      'decreasing miner selling pressure',
      'historical volatility patterns'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'ETH-USD',
    timeframe: '24h',
    current_price: 2005.5,
    predicted_price: 2056.2,
    change_percent: 2.53,
    confidence: 68.7,
    factors: [
      'staking rate increase',
      'gas fee stabilization',
      'dapp usage growth',
      'reduced exchange balances'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'ETH-USD',
    timeframe: '7d',
    current_price: 2005.5,
    predicted_price: 2125.8,
    change_percent: 6.00,
    confidence: 62.1,
    factors: [
      'upcoming protocol upgrades',
      'layer 2 adoption acceleration',
      'institutional fund flows',
      'defi yield trends'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'SOL-USD',
    timeframe: '24h',
    current_price: 122.5,
    predicted_price: 125.8,
    change_percent: 2.69,
    confidence: 63.2,
    factors: [
      'network performance metrics',
      'developer github activity',
      'nft market activity',
      'technical momentum indicators'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'AVAX-USD',
    timeframe: '24h',
    current_price: 35.25,
    predicted_price: 36.15,
    change_percent: 2.55,
    confidence: 61.8,
    factors: [
      'subnet adoption growth',
      'institutional partnerships',
      'cross-chain bridge volume',
      'defi tvl trends'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'MATIC-USD',
    timeframe: '24h',
    current_price: 0.652,
    predicted_price: 0.665,
    change_percent: 1.99,
    confidence: 58.5,
    factors: [
      'zkevm transaction growth',
      'ethereum scaling demands',
      'developer activity metrics',
      'institutional integration news'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'DOT-USD',
    timeframe: '24h',
    current_price: 7.85,
    predicted_price: 7.78,
    change_percent: -0.89,
    confidence: 56.2,
    factors: [
      'parachain auction participation',
      'cross-chain messaging usage',
      'developer activity decline',
      'comparative l1 performance'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'XRP-USD',
    timeframe: '24h',
    current_price: 0.519,
    predicted_price: 0.532,
    change_percent: 2.50,
    confidence: 62.3,
    factors: [
      'regulatory clarity improvements',
      'banking partnership announcements',
      'cross-border payment volume',
      'liquidity metrics'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'DOGE-USD',
    timeframe: '24h',
    current_price: 0.1245,
    predicted_price: 0.1268,
    change_percent: 1.85,
    confidence: 52.8,
    factors: [
      'social media sentiment spikes',
      'celebrity endorsement probability',
      'memecoin market correlation',
      'retail participation indicators'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    market_id: 'LINK-USD',
    timeframe: '24h',
    current_price: 14.65,
    predicted_price: 15.12,
    change_percent: 3.21,
    confidence: 69.7,
    factors: [
      'oracle network growth',
      'ccip adoption acceleration',
      'data provider partnerships',
      'enterprise integration announcements'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  }
];

// Mock market correlations
export const mockMarketCorrelations = [
  {
    primary_market: 'BTC-USD',
    correlations: [
      { market: 'ETH-USD', coefficient: 0.85, strength: 'strong', direction: 'positive' },
      { market: 'SOL-USD', coefficient: 0.72, strength: 'moderate', direction: 'positive' },
      { market: 'XRP-USD', coefficient: 0.65, strength: 'moderate', direction: 'positive' },
      { market: 'AVAX-USD', coefficient: 0.71, strength: 'moderate', direction: 'positive' },
      { market: 'LINK-USD', coefficient: 0.76, strength: 'strong', direction: 'positive' },
      { market: 'DOT-USD', coefficient: 0.68, strength: 'moderate', direction: 'positive' },
      { market: 'MATIC-USD', coefficient: 0.70, strength: 'moderate', direction: 'positive' },
      { market: 'DOGE-USD', coefficient: 0.58, strength: 'moderate', direction: 'positive' }
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    primary_market: 'ETH-USD',
    correlations: [
      { market: 'BTC-USD', coefficient: 0.85, strength: 'strong', direction: 'positive' },
      { market: 'SOL-USD', coefficient: 0.78, strength: 'strong', direction: 'positive' },
      { market: 'AVAX-USD', coefficient: 0.76, strength: 'strong', direction: 'positive' },
      { market: 'MATIC-USD', coefficient: 0.81, strength: 'strong', direction: 'positive' },
      { market: 'DOT-USD', coefficient: 0.72, strength: 'moderate', direction: 'positive' },
      { market: 'LINK-USD', coefficient: 0.79, strength: 'strong', direction: 'positive' },
      { market: 'XRP-USD', coefficient: 0.63, strength: 'moderate', direction: 'positive' },
      { market: 'DOGE-USD', coefficient: 0.56, strength: 'moderate', direction: 'positive' }
    ],
    timestamp: '2025-04-01T12:30:00Z'
  }
];

// Mock news sentiment
export const mockNewsSentiment = [
  {
    keyword: 'Bitcoin',
    sentiment_score: 68.5,
    recent_articles: 1250,
    trending_topics: [
      'institutional adoption',
      'spot ETF inflows',
      'mining hashrate',
      'central bank policy'
    ],
    positive_topics: [
      'institutional buying',
      'retail adoption growth',
      'regulatory clarity'
    ],
    negative_topics: [
      'energy consumption concerns',
      'regulatory uncertainty in emerging markets',
      'market manipulation allegations'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    keyword: 'Ethereum',
    sentiment_score: 72.3,
    recent_articles: 980,
    trending_topics: [
      'protocol upgrades',
      'layer 2 scaling',
      'defi growth',
      'staking yields'
    ],
    positive_topics: [
      'institutional adoption',
      'scaling improvements',
      'developer ecosystem growth'
    ],
    negative_topics: [
      'gas fee spikes',
      'competitor blockchains',
      'security vulnerabilities'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  },
  {
    keyword: 'crypto regulation',
    sentiment_score: 45.2,
    recent_articles: 765,
    trending_topics: [
      'stablecoin regulation',
      'SEC enforcement actions',
      'global regulatory frameworks',
      'CBDC development'
    ],
    positive_topics: [
      'regulatory clarity',
      'institutional framework development',
      'consumer protection improvements'
    ],
    negative_topics: [
      'restrictive policies',
      'inconsistent global approach',
      'innovation concerns'
    ],
    timestamp: '2025-04-01T12:30:00Z'
  }
];

// Helper functions
export function getMarketSentimentById(marketId: string) {
  return mockMarketSentiments.find(sentiment => sentiment.market_id === marketId);
}

export function getPricePredictionById(marketId: string, timeframe: string) {
  return mockPricePredictions.find(
    prediction => prediction.market_id === marketId && prediction.timeframe === timeframe
  );
}

export function getMarketCorrelationsById(marketId: string) {
  return mockMarketCorrelations.find(correlation => correlation.primary_market === marketId);
}

export function getNewsSentimentByKeyword(keyword: string) {
  return mockNewsSentiment.find(news => 
    news.keyword.toLowerCase() === keyword.toLowerCase()
  );
}

// AI Service helper functions
export function analyzeMarketSentiment(marketId: string) {
  // Get the market sentiment or generate a random one if not found
  const sentiment = getMarketSentimentById(marketId);
  
  if (sentiment) {
    return {
      market: marketId,
      sentiment: sentiment.sentiment,
      score: sentiment.score,
      analysis: sentiment.analysis,
      sources: sentiment.sources,
      timestamp: new Date().toISOString()
    };
  }
  
  // If no predefined sentiment exists, generate a random one
  const marketData = mockMarketData.find(market => market.market_id === marketId);
  if (!marketData) {
    throw new Error(`Market ${marketId} not found`);
  }
  
  const sentiments = ['bullish', 'bearish', 'neutral'];
  const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  const randomScore = 40 + Math.random() * 60; // Score between 40 and 100
  
  return {
    market: marketId,
    sentiment: randomSentiment,
    score: randomScore,
    analysis: `AI analysis for ${marketId} indicates a ${randomSentiment} trend based on recent market activity and technical indicators.`,
    sources: ['market data', 'technical analysis', 'trading volumes'],
    timestamp: new Date().toISOString()
  };
}

export function predictPriceMovement(marketId: string, timeframe: string) {
  // Get the price prediction or generate a random one if not found
  const prediction = getPricePredictionById(marketId, timeframe);
  
  if (prediction) {
    return {
      market: marketId,
      currentPrice: prediction.current_price,
      predictedPrice: prediction.predicted_price,
      timeframe: prediction.timeframe,
      confidence: prediction.confidence,
      factors: prediction.factors,
      timestamp: new Date().toISOString()
    };
  }
  
  // If no predefined prediction exists, generate a random one
  const marketData = mockMarketData.find(market => market.market_id === marketId);
  if (!marketData) {
    throw new Error(`Market ${marketId} not found`);
  }
  
  const currentPrice = marketData.last_price;
  const changePercent = (Math.random() * 10) - 4; // Between -4% and +6% (slight bullish bias)
  const predictedPrice = currentPrice * (1 + (changePercent / 100));
  const confidence = 50 + Math.random() * 30; // Between 50% and 80%
  
  return {
    market: marketId,
    currentPrice: currentPrice,
    predictedPrice: predictedPrice,
    timeframe: timeframe,
    confidence: confidence,
    factors: [
      'price movement patterns',
      'volume analysis',
      'market momentum',
      'historical trends'
    ],
    timestamp: new Date().toISOString()
  };
}

// Mock AI model data
const mockAIModels = [
  {
    id: 'gpt-4-turbo',
    provider: 'openai',
    description: 'GPT-4 Turbo with vision capabilities',
    context_length: 128000,
    cost_per_token: 0.00001,
    capabilities: ['text_generation', 'image_understanding', 'code_generation', 'reasoning'],
    best_for: ['complex analysis', 'creative writing', 'code generation', 'multimodal tasks'],
    data_updated: '2025-01-15'
  },
  {
    id: 'claude-3-opus',
    provider: 'anthropic',
    description: 'Anthropic Claude 3 Opus model',
    context_length: 200000,
    cost_per_token: 0.000015,
    capabilities: ['text_generation', 'image_understanding', 'reasoning', 'research'],
    best_for: ['detailed analysis', 'complex reasoning', 'document understanding', 'multimodal tasks'],
    data_updated: '2025-02-01'
  },
  {
    id: 'gemini-pro',
    provider: 'google',
    description: 'Google Gemini Pro multimodal model',
    context_length: 100000,
    cost_per_token: 0.000008,
    capabilities: ['text_generation', 'image_understanding', 'code_generation'],
    best_for: ['content creation', 'educational assistance', 'data analysis', 'multimodal tasks'],
    data_updated: '2025-02-15'
  }
];

/**
 * Mock AI handler functions for Supabase routes
 */
export const mockAIHandlers = {
  // Handler for getting the list of available AI models
  getModelsList: async (req: Request): Promise<Response> => {
    return new Response(
      JSON.stringify({
        data: mockAIModels
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  },

  // Handler for AI market analysis
  analyzeMarket: async (req: Request): Promise<Response> => {
    const body = await req.json();
    const { marketId, timeframe } = body;
    
    // Simulate analysis processing time
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const sentiment = analyzeMarketSentiment(marketId);
    const prediction = predictPriceMovement(marketId, timeframe || '24h');
    
    return new Response(
      JSON.stringify({
        data: {
          sentiment,
          prediction,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  },
  
  // Handler for portfolio optimization
  optimizePortfolio: async (req: Request): Promise<Response> => {
    const body = await req.json();
    const { assets, riskProfile } = body;
    
    // Simulate optimization processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate mock portfolio allocation recommendation
    const totalWeight = 100;
    const assetWeights = {};
    
    if (assets && assets.length > 0) {
      let remainingWeight = totalWeight;
      
      for (let i = 0; i < assets.length - 1; i++) {
        // Allocate a portion based on risk profile (higher risk = more volatile assets)
        const weight = Math.floor(Math.random() * (remainingWeight / 2)) + (remainingWeight / (assets.length * 2));
        assetWeights[assets[i]] = weight;
        remainingWeight -= weight;
      }
      
      // Allocate remaining weight to the last asset
      assetWeights[assets[assets.length - 1]] = remainingWeight;
    }
    
    return new Response(
      JSON.stringify({
        data: {
          allocation: assetWeights,
          riskRating: riskProfile || 'moderate',
          diversificationScore: Math.floor(Math.random() * 30) + 70, // 70-100 score
          rationale: 'Portfolio optimized based on recent market performance, volatility analysis, and correlation metrics.',
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
