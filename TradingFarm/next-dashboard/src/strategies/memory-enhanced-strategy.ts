/**
 * Memory-Enhanced Trading Strategy
 * 
 * This module demonstrates how to incorporate memory insights
 * into trading strategies for improved decision making.
 */

import { getTradingFarmMemory, type MemoryType } from '@/data-access/memory';

interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  indicators: {
    rsi: number;
    macd: {
      line: number;
      signal: number;
      histogram: number;
    };
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
}

interface TradeSignal {
  symbol: string;
  direction: 'buy' | 'sell' | 'neutral';
  strength: number; // 0-1
  timestamp: number;
  reason: string;
  metadata: Record<string, any>;
}

interface StrategyConfig {
  agentId: number;
  farmId: number;
  rsiThresholds: {
    oversold: number;
    overbought: number;
  };
  useMemoryEnhancement: boolean;
  confidenceThreshold: number;
}

/**
 * Memory-enhanced trading strategy that combines technical indicators
 * with insights from the agent's memory and market correlations
 */
export class MemoryEnhancedStrategy {
  private memorySystem = getTradingFarmMemory();
  private config: StrategyConfig;
  
  constructor(config: StrategyConfig) {
    this.config = config;
    
    // Initialize memory system
    this.memorySystem.initialize(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example-key',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example-key'
    );
  }
  
  /**
   * Analyze market data and generate trading signals
   */
  public async analyzeMarket(marketData: MarketData): Promise<TradeSignal> {
    // Generate base signal using technical indicators
    const baseSignal = this.generateBaseSignal(marketData);
    
    // If memory enhancement is disabled, return the base signal
    if (!this.config.useMemoryEnhancement) {
      return baseSignal;
    }
    
    try {
      // Enhance signal with memory insights
      return await this.enhanceSignal(baseSignal, marketData);
    } catch (error) {
      console.error('Error enhancing signal with memory:', error);
      // Fall back to the base signal if memory enhancement fails
      return baseSignal;
    }
  }
  
  /**
   * Generate base trading signal using technical indicators
   */
  private generateBaseSignal(marketData: MarketData): TradeSignal {
    const { symbol, price, indicators } = marketData;
    const { rsi, macd, bollingerBands } = indicators;
    
    // RSI signal (oversold/overbought)
    let rsiSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let rsiStrength = 0;
    
    if (rsi <= this.config.rsiThresholds.oversold) {
      rsiSignal = 'buy';
      rsiStrength = 1 - (rsi / this.config.rsiThresholds.oversold);
    } else if (rsi >= this.config.rsiThresholds.overbought) {
      rsiSignal = 'sell';
      rsiStrength = (rsi - this.config.rsiThresholds.overbought) / (100 - this.config.rsiThresholds.overbought);
    }
    
    // MACD signal (crossovers)
    let macdSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let macdStrength = 0;
    
    if (macd.line > macd.signal && macd.histogram > 0) {
      macdSignal = 'buy';
      macdStrength = Math.min(Math.abs(macd.histogram) / 2, 1);
    } else if (macd.line < macd.signal && macd.histogram < 0) {
      macdSignal = 'sell';
      macdStrength = Math.min(Math.abs(macd.histogram) / 2, 1);
    }
    
    // Bollinger Bands signal (price position)
    let bbSignal: 'buy' | 'sell' | 'neutral' = 'neutral';
    let bbStrength = 0;
    
    if (price <= bollingerBands.lower) {
      bbSignal = 'buy';
      bbStrength = Math.min((bollingerBands.lower - price) / (bollingerBands.middle * 0.02), 1);
    } else if (price >= bollingerBands.upper) {
      bbSignal = 'sell';
      bbStrength = Math.min((price - bollingerBands.upper) / (bollingerBands.middle * 0.02), 1);
    }
    
    // Combine signals for overall direction
    const signals = [
      { direction: rsiSignal, strength: rsiStrength, name: 'RSI' },
      { direction: macdSignal, strength: macdStrength, name: 'MACD' },
      { direction: bbSignal, strength: bbStrength, name: 'Bollinger' }
    ].filter(s => s.direction !== 'neutral' && s.strength > 0);
    
    if (signals.length === 0) {
      return {
        symbol,
        direction: 'neutral',
        strength: 0,
        timestamp: Date.now(),
        reason: 'No significant signals detected',
        metadata: { indicators: { rsi, macd, bollingerBands } }
      };
    }
    
    // Determine overall direction (buy/sell with most strength)
    const buySignals = signals.filter(s => s.direction === 'buy');
    const sellSignals = signals.filter(s => s.direction === 'sell');
    
    const totalBuyStrength = buySignals.reduce((sum, s) => sum + s.strength, 0);
    const totalSellStrength = sellSignals.reduce((sum, s) => sum + s.strength, 0);
    
    let direction: 'buy' | 'sell' | 'neutral';
    let strength: number;
    let reason: string;
    
    if (totalBuyStrength > totalSellStrength) {
      direction = 'buy';
      strength = totalBuyStrength / buySignals.length;
      reason = `Buy signal based on ${buySignals.map(s => s.name).join(', ')}`;
    } else if (totalSellStrength > totalBuyStrength) {
      direction = 'sell';
      strength = totalSellStrength / sellSignals.length;
      reason = `Sell signal based on ${sellSignals.map(s => s.name).join(', ')}`;
    } else {
      direction = 'neutral';
      strength = 0;
      reason = 'Conflicting signals, no clear direction';
    }
    
    return {
      symbol,
      direction,
      strength,
      timestamp: Date.now(),
      reason,
      metadata: { 
        indicators: { rsi, macd, bollingerBands },
        signalDetails: signals
      }
    };
  }
  
  /**
   * Enhance trading signal with memory-based insights
   */
  private async enhanceSignal(baseSignal: TradeSignal, marketData: MarketData): Promise<TradeSignal> {
    const { agentId, farmId, confidenceThreshold } = this.config;
    const { symbol } = marketData;
    
    // Retrieve relevant memories for this market context
    const relevantMemories = await this.memorySystem.retrieveRelevantMemories(
      agentId,
      `${symbol} ${baseSignal.direction} signal`
    );
    
    // Get market correlations to identify related markets
    const marketCorrelations = await this.memorySystem.getMarketCorrelations('1h');
    
    // Find relevant correlations for this symbol
    const symbolCorrelations = marketCorrelations.filter(corr => 
      (corr.source === symbol || corr.target === symbol) && corr.strength > 0.7
    );
    
    // Generate insights combining agent memory and market knowledge
    const insights = await this.memorySystem.generateCombinedInsights(agentId, farmId);
    
    // Filter insights relevant to this symbol and with high confidence
    const relevantInsights = insights.filter(insight => 
      insight.relatedMarkets.some(market => market.includes(symbol)) &&
      insight.confidence >= confidenceThreshold
    );
    
    // Determine if memory insights modify the signal
    let modifiedSignal = { ...baseSignal };
    let memoryAdjustment = 0;
    let memoryReasons: string[] = [];
    
    // Factor 1: Check for similar past trades in memory
    const pastTradeMemories = relevantMemories.filter(mem => 
      mem.type === 'agent_message' && 
      mem.metadata?.event_type === 'trade'
    );
    
    if (pastTradeMemories.length > 0) {
      // Calculate success ratio of similar past trades
      const successfulTrades = pastTradeMemories.filter(mem => 
        mem.metadata?.outcome === 'profit' || 
        mem.metadata?.profit_loss > 0
      );
      
      if (pastTradeMemories.length > 0) {
        const successRatio = successfulTrades.length / pastTradeMemories.length;
        
        // Adjust signal based on past success
        if (successRatio > 0.7) {
          memoryAdjustment += 0.2; // Boost signal if similar trades were successful
          memoryReasons.push(`Similar trades were successful ${Math.round(successRatio * 100)}% of the time`);
        } else if (successRatio < 0.3) {
          memoryAdjustment -= 0.2; // Reduce signal if similar trades were unsuccessful
          memoryReasons.push(`Similar trades were unsuccessful ${Math.round((1 - successRatio) * 100)}% of the time`);
        }
      }
    }
    
    // Factor 2: Check market correlations
    if (symbolCorrelations.length > 0) {
      // Check if correlated markets support the signal
      const correlatedMarketSupport = symbolCorrelations.some(corr => {
        const correlatedSymbol = corr.source === symbol ? corr.target : corr.source;
        const correlatedDirection = corr.direction === 'positive' ? baseSignal.direction : 
          (baseSignal.direction === 'buy' ? 'sell' : 'buy');
          
        // Check if we have insights about the correlated market
        return relevantInsights.some(insight => 
          insight.relatedMarkets.includes(correlatedSymbol) &&
          insight.description.toLowerCase().includes(correlatedDirection)
        );
      });
      
      if (correlatedMarketSupport) {
        memoryAdjustment += 0.15; // Boost signal if correlated markets support it
        memoryReasons.push('Correlated markets support this signal');
      }
    }
    
    // Factor 3: Apply relevant insights directly
    if (relevantInsights.length > 0) {
      // Find insights that explicitly support or contradict the signal
      const supportingInsights = relevantInsights.filter(insight =>
        (baseSignal.direction === 'buy' && insight.description.toLowerCase().includes('buy')) ||
        (baseSignal.direction === 'sell' && insight.description.toLowerCase().includes('sell'))
      );
      
      const contradictingInsights = relevantInsights.filter(insight =>
        (baseSignal.direction === 'buy' && insight.description.toLowerCase().includes('sell')) ||
        (baseSignal.direction === 'sell' && insight.description.toLowerCase().includes('buy'))
      );
      
      // Calculate average confidence of supporting and contradicting insights
      const avgSupportConfidence = supportingInsights.length > 0
        ? supportingInsights.reduce((sum, i) => sum + i.confidence, 0) / supportingInsights.length
        : 0;
        
      const avgContradictConfidence = contradictingInsights.length > 0
        ? contradictingInsights.reduce((sum, i) => sum + i.confidence, 0) / contradictingInsights.length
        : 0;
      
      // Apply adjustments based on insights
      if (avgSupportConfidence > 0) {
        memoryAdjustment += avgSupportConfidence * 0.3; // Boost proportional to confidence
        memoryReasons.push(`${supportingInsights.length} insights support this signal`);
      }
      
      if (avgContradictConfidence > 0) {
        memoryAdjustment -= avgContradictConfidence * 0.3; // Reduce proportional to confidence
        memoryReasons.push(`${contradictingInsights.length} insights contradict this signal`);
      }
    }
    
    // Apply the memory adjustment to signal strength
    modifiedSignal.strength = Math.max(0, Math.min(1, baseSignal.strength + memoryAdjustment));
    
    // If adjustment is significant, it may change the signal direction
    if (memoryAdjustment <= -0.5 && baseSignal.direction !== 'neutral') {
      // Reverse the signal direction
      modifiedSignal.direction = baseSignal.direction === 'buy' ? 'sell' : 'buy';
      modifiedSignal.reason = `${baseSignal.reason}, but memory insights suggest the opposite direction due to: ${memoryReasons.join(', ')}`;
    } else if (Math.abs(memoryAdjustment) > 0.1) {
      // Adjust signal strength but keep direction
      modifiedSignal.reason = `${baseSignal.reason}, ${memoryAdjustment > 0 ? 'strengthened' : 'weakened'} by memory insights: ${memoryReasons.join(', ')}`;
    }
    
    // Add memory data to metadata
    modifiedSignal.metadata = {
      ...modifiedSignal.metadata,
      memory: {
        adjustment: memoryAdjustment,
        reasons: memoryReasons,
        relevantMemoriesCount: relevantMemories.length,
        relevantInsightsCount: relevantInsights.length,
        correlationsCount: symbolCorrelations.length
      }
    };
    
    // Store this analysis in the agent's memory
    await this.memorySystem.storeAgentMemory(agentId, {
      type: 'agent_message',
      content: `Generated ${modifiedSignal.direction} signal for ${symbol} with strength ${modifiedSignal.strength.toFixed(2)}`,
      importance: 0.7,
      metadata: {
        symbol,
        signalType: modifiedSignal.direction,
        signalStrength: modifiedSignal.strength,
        baseStrength: baseSignal.strength,
        memoryAdjustment,
        reasons: memoryReasons
      },
      timestamp: Date.now()
    });
    
    return modifiedSignal;
  }
  
  /**
   * Execute a trade based on the signal
   */
  public async executeTrade(signal: TradeSignal): Promise<boolean> {
    // In a real implementation, this would connect to a trading API
    console.log(`Executing ${signal.direction} trade for ${signal.symbol} with strength ${signal.strength}`);
    
    // Store the trade in memory
    await this.memorySystem.storeAgentMemory(this.config.agentId, {
      type: 'trade',
      content: `Executed ${signal.direction} trade for ${signal.symbol} based on ${signal.reason}`,
      importance: 0.9,
      metadata: signal,
      timestamp: Date.now()
    });
    
    return true;
  }
  
  /**
   * Record the outcome of a trade
   */
  public async recordTradeOutcome(
    symbol: string, 
    direction: 'buy' | 'sell', 
    profitLoss: number, 
    metadata: Record<string, any>
  ): Promise<void> {
    const outcome = profitLoss > 0 ? 'profit' : 'loss';
    
    // Store the trade outcome in memory
    await this.memorySystem.storeAgentMemory(this.config.agentId, {
      type: 'trade',
      content: `${direction} trade for ${symbol} resulted in ${outcome} of ${profitLoss}`,
      importance: 0.85,
      metadata: {
        symbol,
        type: direction,
        profit_loss: profitLoss,
        outcome,
        ...metadata
      },
      timestamp: Date.now()
    });
    
    // Consolidate memories periodically to improve retrieval efficiency
    if (Math.random() < 0.1) { // 10% chance to consolidate after recording outcome
      await this.memorySystem.consolidateAgentMemory(this.config.agentId);
    }
  }
}

// Example usage
export async function runMemoryEnhancedStrategy() {
  const strategy = new MemoryEnhancedStrategy({
    agentId: 1,
    farmId: 1,
    rsiThresholds: {
      oversold: 30,
      overbought: 70
    },
    useMemoryEnhancement: true,
    confidenceThreshold: 0.7
  });
  
  // Sample market data
  const marketData: MarketData = {
    symbol: 'BTC/USD',
    price: 72500,
    volume: 345.67,
    timestamp: Date.now(),
    indicators: {
      rsi: 28,
      macd: {
        line: 25.5,
        signal: 24.2,
        histogram: 1.3
      },
      bollingerBands: {
        upper: 73500,
        middle: 71000,
        lower: 68500
      }
    }
  };
  
  // Generate signal
  const signal = await strategy.analyzeMarket(marketData);
  console.log('Memory-enhanced signal:', signal);
  
  // Execute trade based on signal
  if (signal.direction !== 'neutral' && signal.strength > 0.6) {
    await strategy.executeTrade(signal);
    
    // In a real system, we would wait for the trade outcome
    // For demonstration, we'll simulate an outcome
    setTimeout(async () => {
      const profitLoss = signal.direction === 'buy' ? 250 : -125;
      await strategy.recordTradeOutcome(
        marketData.symbol,
        signal.direction,
        profitLoss,
        { exit_price: marketData.price * (signal.direction === 'buy' ? 1.02 : 0.98) }
      );
    }, 5000);
  }
}
