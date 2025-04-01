import { EntryCondition, ExitCondition, RiskManagement, StrategyParameters, StrategyType } from "../../integrations/supabase/types";
import { CreateStrategyParams, strategyService } from ".";

/**
 * Represents the input for natural language strategy creation
 */
export interface NLStrategyInput {
  name: string;
  description?: string;
  naturalLanguageDefinition: string;
  isPublic?: boolean;
  customCode?: string;
  tags?: string[];
}

/**
 * Response from the strategy parser
 */
export interface ParsedStrategyResult {
  strategyType: StrategyType;
  entryConditions: EntryCondition[];
  exitConditions: ExitCondition[];
  riskManagement: RiskManagement;
  parameters: StrategyParameters;
  detectedTags?: string[];
  suggestedCode?: string;
  explanation?: string;
}

/**
 * Service for ingesting natural language strategy descriptions and converting them to structured strategy data
 */
export class StrategyIngestionService {
  private async parseNaturalLanguageStrategy(definition: string): Promise<ParsedStrategyResult> {
    // In a real implementation, this would call an AI service or use a library to parse the natural language
    // For this example, we'll implement a simple rule-based parser
    
    const definition_lower = definition.toLowerCase();
    let strategyType: StrategyType = 'custom';
    
    // Detect strategy type based on keywords
    if (definition_lower.includes('momentum') || definition_lower.includes('moving average crossover')) {
      strategyType = 'momentum';
    } else if (definition_lower.includes('mean reversion') || definition_lower.includes('overbought') || definition_lower.includes('oversold')) {
      strategyType = 'mean_reversion';
    } else if (definition_lower.includes('breakout') || definition_lower.includes('support') || definition_lower.includes('resistance')) {
      strategyType = 'breakout';
    } else if (definition_lower.includes('trend') || definition_lower.includes('following')) {
      strategyType = 'trend_following';
    } else if (definition_lower.includes('arbitrage')) {
      strategyType = 'arbitrage';
    } else if (definition_lower.includes('grid')) {
      strategyType = 'grid';
    } else if (definition_lower.includes('martingale') || definition_lower.includes('double down')) {
      strategyType = 'martingale';
    }
    
    // Extract potential entry conditions
    const entryConditions: EntryCondition[] = [];
    if (definition_lower.includes('macd')) {
      entryConditions.push({
        type: 'indicator_crossover',
        params: { indicator: 'MACD', direction: 'bullish' },
        description: 'MACD shows bullish crossover'
      });
    }
    if (definition_lower.includes('rsi') && definition_lower.includes('oversold')) {
      entryConditions.push({
        type: 'indicator_threshold',
        params: { indicator: 'RSI', threshold: 30, comparison: 'below' },
        description: 'RSI is below oversold threshold (30)'
      });
    }
    if (definition_lower.includes('moving average') && definition_lower.includes('cross')) {
      entryConditions.push({
        type: 'moving_average_crossover',
        params: { shortPeriod: 50, longPeriod: 200, direction: 'bullish' },
        description: 'Short-term MA crosses above long-term MA'
      });
    }
    
    // Default entry condition if nothing specific detected
    if (entryConditions.length === 0) {
      entryConditions.push({
        type: 'price_action',
        params: { pattern: 'bullish_reversal' },
        description: 'Price shows bullish reversal pattern'
      });
    }
    
    // Extract potential exit conditions
    const exitConditions: ExitCondition[] = [];
    if (definition_lower.includes('take profit') || definition_lower.includes('profit target')) {
      exitConditions.push({
        type: 'price_target',
        params: { targetType: 'percent', value: 3 },
        description: 'Price reaches 3% gain'
      });
    }
    if (definition_lower.includes('stop loss')) {
      exitConditions.push({
        type: 'stop_loss',
        params: { stopType: 'percent', value: 1.5 },
        description: 'Price hits 1.5% loss'
      });
    }
    if (definition_lower.includes('trailing stop')) {
      exitConditions.push({
        type: 'trailing_stop',
        params: { distance: 1, unit: 'percent' },
        description: 'Trailing stop 1% below peak price'
      });
    }
    
    // Default exit condition if nothing specific detected
    if (exitConditions.length === 0) {
      exitConditions.push({
        type: 'time_based',
        params: { timeframe: '4h', periods: 6 },
        description: 'Exit after holding for 24 hours'
      });
    }
    
    // Extract risk management parameters
    const riskManagement: RiskManagement = {};
    
    if (definition_lower.includes('stop loss')) {
      const stopLossMatch = definition.match(/stop loss[:\s]+(\d+\.?\d*)%?/i);
      riskManagement.stopLoss = stopLossMatch ? parseFloat(stopLossMatch[1]) : 1.5;
    }
    
    if (definition_lower.includes('take profit')) {
      const takeProfitMatch = definition.match(/take profit[:\s]+(\d+\.?\d*)%?/i);
      riskManagement.takeProfit = takeProfitMatch ? parseFloat(takeProfitMatch[1]) : 3;
    }
    
    if (definition_lower.includes('trailing stop')) {
      const trailingStopMatch = definition.match(/trailing stop[:\s]+(\d+\.?\d*)%?/i);
      riskManagement.trailingStop = trailingStopMatch ? parseFloat(trailingStopMatch[1]) : 1;
    }
    
    if (definition_lower.includes('position size') || definition_lower.includes('position sizing')) {
      const positionSizingMatch = definition.match(/position siz(?:e|ing)[:\s]+(\d+\.?\d*)%?/i);
      riskManagement.positionSizing = positionSizingMatch ? `${positionSizingMatch[1]}%` : '2%';
    }
    
    if (definition_lower.includes('max positions')) {
      const maxPositionsMatch = definition.match(/max positions[:\s]+(\d+)/i);
      riskManagement.maxPositions = maxPositionsMatch ? parseInt(maxPositionsMatch[1]) : 5;
    }
    
    // Extract strategy parameters
    const parameters: StrategyParameters = {};
    
    // Timeframe
    if (definition_lower.includes('1 minute') || definition_lower.includes('1min') || definition_lower.includes('1m')) {
      parameters.timeframe = '1m';
    } else if (definition_lower.includes('5 minute') || definition_lower.includes('5min') || definition_lower.includes('5m')) {
      parameters.timeframe = '5m';
    } else if (definition_lower.includes('15 minute') || definition_lower.includes('15min') || definition_lower.includes('15m')) {
      parameters.timeframe = '15m';
    } else if (definition_lower.includes('30 minute') || definition_lower.includes('30min') || definition_lower.includes('30m')) {
      parameters.timeframe = '30m';
    } else if (definition_lower.includes('1 hour') || definition_lower.includes('1h')) {
      parameters.timeframe = '1h';
    } else if (definition_lower.includes('4 hour') || definition_lower.includes('4h')) {
      parameters.timeframe = '4h';
    } else if (definition_lower.includes('daily') || definition_lower.includes('1 day') || definition_lower.includes('1d')) {
      parameters.timeframe = '1d';
    } else if (definition_lower.includes('weekly') || definition_lower.includes('1 week') || definition_lower.includes('1w')) {
      parameters.timeframe = '1w';
    } else {
      // Default timeframe if not specified
      parameters.timeframe = '1h';
    }
    
    // Markets
    const markets: string[] = [];
    if (definition_lower.includes('btc') || definition_lower.includes('bitcoin')) {
      markets.push('BTC-USD');
    }
    if (definition_lower.includes('eth') || definition_lower.includes('ethereum')) {
      markets.push('ETH-USD');
    }
    if (definition_lower.includes('sol') || definition_lower.includes('solana')) {
      markets.push('SOL-USD');
    }
    if (definition_lower.includes('bnb')) {
      markets.push('BNB-USD');
    }
    if (markets.length === 0) {
      // Default market if none specified
      markets.push('BTC-USD');
    }
    parameters.markets = markets;
    
    // Detect and extract indicators
    const indicators: Record<string, any>[] = [];
    if (definition_lower.includes('rsi')) {
      indicators.push({
        name: 'RSI',
        params: { period: 14 }
      });
    }
    if (definition_lower.includes('macd')) {
      indicators.push({
        name: 'MACD',
        params: { fast: 12, slow: 26, signal: 9 }
      });
    }
    if (definition_lower.includes('bollinger')) {
      indicators.push({
        name: 'BollingerBands',
        params: { period: 20, stdDev: 2 }
      });
    }
    if (definition_lower.includes('moving average') || definition_lower.includes('ma ') || definition_lower.includes('ema')) {
      indicators.push({
        name: 'MA',
        params: { type: 'ema', period: 50 }
      });
      indicators.push({
        name: 'MA',
        params: { type: 'ema', period: 200 }
      });
    }
    if (indicators.length > 0) {
      parameters.indicators = indicators;
    }
    
    // Leverage
    if (definition_lower.includes('leverage')) {
      const leverageMatch = definition.match(/leverage[:\s]+(\d+\.?\d*)x?/i);
      parameters.leverage = leverageMatch ? parseFloat(leverageMatch[1]) : 1;
    }
    
    // Extract potential tags
    const detectedTags: string[] = [];
    if (strategyType) {
      detectedTags.push(strategyType);
    }
    
    if (definition_lower.includes('bitcoin') || definition_lower.includes('btc')) {
      detectedTags.push('bitcoin');
    }
    if (definition_lower.includes('ethereum') || definition_lower.includes('eth')) {
      detectedTags.push('ethereum');
    }
    if (definition_lower.includes('altcoin')) {
      detectedTags.push('altcoin');
    }
    if (definition_lower.includes('day trading') || definition_lower.includes('daytrading')) {
      detectedTags.push('day-trading');
    }
    if (definition_lower.includes('swing trading') || definition_lower.includes('swingtrading')) {
      detectedTags.push('swing-trading');
    }
    
    // Generate pseudo-code explanation
    let suggestedCode = '';
    let explanation = '';
    
    if (strategyType === 'momentum') {
      suggestedCode = `
// Momentum strategy pseudo-code
function onBar(bar) {
  // Entry logic
  if (MACD.crossover() === 'bullish') {
    enterLong();
  }
  
  // Exit logic
  if (position && position.profit >= takeProfit) {
    exitPosition();
  }
  
  if (position && position.loss >= stopLoss) {
    exitPosition();
  }
}`;
      
      explanation = `This momentum strategy identifies bullish trends using MACD crossovers. It enters long positions when the MACD line crosses above the signal line, indicating bullish momentum. The strategy exits positions when either the take profit target (${riskManagement.takeProfit}%) or stop loss (${riskManagement.stopLoss}%) is reached.`;
    } else if (strategyType === 'mean_reversion') {
      suggestedCode = `
// Mean reversion strategy pseudo-code
function onBar(bar) {
  // Entry logic
  if (RSI.value < 30) {
    enterLong();
  }
  
  // Exit logic
  if (position && RSI.value > 70) {
    exitPosition();
  }
  
  if (position && position.loss >= stopLoss) {
    exitPosition();
  }
}`;
      
      explanation = `This mean reversion strategy identifies oversold conditions using the RSI indicator. It enters long positions when RSI falls below 30, indicating an oversold condition that may revert to the mean. The strategy exits positions when the RSI rises above 70 (overbought) or when the stop loss (${riskManagement.stopLoss}%) is triggered.`;
    }
    
    return {
      strategyType,
      entryConditions,
      exitConditions,
      riskManagement,
      parameters,
      detectedTags,
      suggestedCode,
      explanation
    };
  }
  
  /**
   * Create a strategy from natural language input
   * @param input Strategy input in natural language
   * @returns Created strategy and parsing metadata
   */
  async createStrategyFromNL(input: NLStrategyInput) {
    // Parse the natural language description
    const parsedStrategy = await this.parseNaturalLanguageStrategy(input.naturalLanguageDefinition);
    
    // Merge detected tags with user-provided tags
    const tags = [...(input.tags || []), ...(parsedStrategy.detectedTags || [])].filter(
      (tag, index, self) => self.indexOf(tag) === index // Remove duplicates
    );
    
    // Create the strategy using the parsed data
    const createParams: CreateStrategyParams = {
      name: input.name,
      description: input.description || 
        `Strategy created from natural language: "${input.naturalLanguageDefinition}"${parsedStrategy.explanation ? '\n\n' + parsedStrategy.explanation : ''}`,
      strategy_type: parsedStrategy.strategyType,
      is_public: input.isPublic || false,
      code: input.customCode || parsedStrategy.suggestedCode,
      entry_conditions: parsedStrategy.entryConditions,
      exit_conditions: parsedStrategy.exitConditions,
      risk_management: parsedStrategy.riskManagement,
      parameters: parsedStrategy.parameters,
      tags
    };
    
    // Create the strategy in the database
    const strategy = await strategyService.createStrategy(createParams);
    
    return {
      strategy,
      parsingMetadata: {
        detectedStrategyType: parsedStrategy.strategyType,
        detectedTags: parsedStrategy.detectedTags,
        generatedCode: parsedStrategy.suggestedCode,
        explanation: parsedStrategy.explanation
      }
    };
  }
  
  /**
   * Enhance an existing strategy with natural language input
   * @param strategyId ID of the strategy to enhance
   * @param naturalLanguageInput Additional natural language instructions
   * @returns Updated strategy
   */
  async enhanceStrategy(strategyId: string, naturalLanguageInput: string) {
    // Get the current strategy
    const existingStrategy = await strategyService.getStrategyById(strategyId);
    if (!existingStrategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    
    // Parse the natural language enhancement
    const parsedEnhancement = await this.parseNaturalLanguageStrategy(naturalLanguageInput);
    
    // Merge the existing strategy with the enhancements
    // Note: This is a simple merge for demo purposes. A real implementation would be more sophisticated
    const updatedStrategy = {
      entry_conditions: [
        ...existingStrategy.entry_conditions,
        ...parsedEnhancement.entryConditions.filter(c => 
          !existingStrategy.entry_conditions.some(ec => ec.type === c.type && JSON.stringify(ec.params) === JSON.stringify(c.params))
        )
      ],
      exit_conditions: [
        ...existingStrategy.exit_conditions,
        ...parsedEnhancement.exitConditions.filter(c => 
          !existingStrategy.exit_conditions.some(ec => ec.type === c.type && JSON.stringify(ec.params) === JSON.stringify(c.params))
        )
      ],
      risk_management: {
        ...existingStrategy.risk_management,
        ...Object.fromEntries(
          Object.entries(parsedEnhancement.riskManagement).filter(([k, v]) => v !== null && v !== undefined)
        )
      },
      parameters: {
        ...existingStrategy.parameters,
        ...Object.fromEntries(
          Object.entries(parsedEnhancement.parameters).filter(([k, v]) => v !== null && v !== undefined)
        )
      }
    };
    
    // Get the current version and increment it
    const currentVersion = existingStrategy.version;
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;
    
    // Create a new version with the enhancements
    await strategyService.createVersion({
      strategy_id: strategyId,
      version: newVersion,
      entry_conditions: updatedStrategy.entry_conditions,
      exit_conditions: updatedStrategy.exit_conditions,
      risk_management: updatedStrategy.risk_management,
      parameters: updatedStrategy.parameters,
      change_notes: `Enhanced strategy with: "${naturalLanguageInput}"`
    });
    
    // Update the main strategy
    const updated = await strategyService.updateStrategy(strategyId, {
      entry_conditions: updatedStrategy.entry_conditions,
      exit_conditions: updatedStrategy.exit_conditions,
      risk_management: updatedStrategy.risk_management,
      parameters: updatedStrategy.parameters,
      version: newVersion
    });
    
    return {
      strategy: updated,
      parsingMetadata: {
        detectedEnhancements: parsedEnhancement,
        newVersion
      }
    };
  }
}

// Export singleton instance
export const strategyIngestionService = new StrategyIngestionService(); 