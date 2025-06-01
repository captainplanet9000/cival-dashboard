/**
 * Strategy Framework
 * 
 * A modular framework for defining, testing, and executing trading strategies.
 * Supports both technical and fundamental analysis approaches.
 */

import { MarketDataService } from '../market-data/market-data-service';
import { createServerClient } from '@/utils/supabase/server';
import { RiskManager } from './risk-manager';
import { SignalType, SignalStrength, SignalSource, TradingSignal } from './decision-engine';

// Base strategy interface
export interface Strategy {
  id: string;
  name: string;
  description?: string;
  evaluate(context: StrategyContext): Promise<TradingSignal | null>;
  getRequiredTimeframes(): string[];
  getRequiredSymbols(): string[];
}

// Strategy execution context
export interface StrategyContext {
  portfolioId: string;
  exchange: string;
  symbol: string;
  currentPrice: number;
  timestamp: string;
  timeframe: string;
  historyBars?: any[];
  indicators?: Record<string, any>;
  position?: {
    size: number;
    entryPrice: number;
    unrealizedPnl: number;
    unrealizedPnlPercent: number;
  };
  balance?: {
    total: number;
    available: number;
    reserved: number;
  };
  metadata?: Record<string, any>;
}

// Strategy registry to store and manage strategies
class StrategyRegistry {
  private static strategies: Map<string, Strategy> = new Map();
  
  // Register a strategy
  static register(strategy: Strategy): void {
    this.strategies.set(strategy.id, strategy);
  }
  
  // Get a strategy by ID
  static get(id: string): Strategy | undefined {
    return this.strategies.get(id);
  }
  
  // List all registered strategies
  static list(): Strategy[] {
    return Array.from(this.strategies.values());
  }
  
  // Remove a strategy
  static remove(id: string): boolean {
    return this.strategies.delete(id);
  }
}

// Base class for implementing strategies
abstract class BaseStrategy implements Strategy {
  id: string;
  name: string;
  description?: string;
  
  constructor(id: string, name: string, description?: string) {
    this.id = id;
    this.name = name;
    this.description = description;
  }
  
  abstract evaluate(context: StrategyContext): Promise<TradingSignal | null>;
  
  getRequiredTimeframes(): string[] {
    return ['1h']; // Default timeframe
  }
  
  getRequiredSymbols(): string[] {
    return []; // Should be implemented by concrete strategies
  }
}

// Moving Average Crossover Strategy
class MovingAverageCrossover extends BaseStrategy {
  private shortPeriod: number;
  private longPeriod: number;
  private symbols: string[];
  
  constructor(
    id: string,
    name: string,
    shortPeriod: number = 9, 
    longPeriod: number = 21,
    symbols: string[] = ['BTC/USDT'],
    description?: string
  ) {
    super(id, name, description || `MA Crossover ${shortPeriod}/${longPeriod}`);
    this.shortPeriod = shortPeriod;
    this.longPeriod = longPeriod;
    this.symbols = symbols;
  }
  
  async evaluate(context: StrategyContext): Promise<TradingSignal | null> {
    // Ensure we have enough history data
    if (!context.historyBars || context.historyBars.length < this.longPeriod + 2) {
      console.warn(`Not enough history data for ${context.symbol}`);
      return null;
    }
    
    // Calculate short MA
    const shortMA = this.calculateSMA(context.historyBars, this.shortPeriod);
    
    // Calculate long MA
    const longMA = this.calculateSMA(context.historyBars, this.longPeriod);
    
    // Check for crossover
    const currentShortMA = shortMA[shortMA.length - 1];
    const previousShortMA = shortMA[shortMA.length - 2];
    const currentLongMA = longMA[longMA.length - 1];
    const previousLongMA = longMA[longMA.length - 2];
    
    // Buy signal: Short MA crosses above Long MA
    const buySignal = previousShortMA <= previousLongMA && currentShortMA > currentLongMA;
    
    // Sell signal: Short MA crosses below Long MA
    const sellSignal = previousShortMA >= previousLongMA && currentShortMA < currentLongMA;
    
    if (buySignal && !context.position) {
      // Generate buy signal
      return {
        portfolioId: context.portfolioId,
        strategyId: this.id,
        timestamp: context.timestamp,
        symbol: context.symbol,
        exchange: context.exchange,
        type: SignalType.BUY,
        strength: SignalStrength.MODERATE,
        source: SignalSource.TECHNICAL,
        price: context.currentPrice,
        stopLoss: context.currentPrice * 0.95, // 5% stop loss
        takeProfit: context.currentPrice * 1.15, // 15% take profit
        executed: false,
        metadata: {
          strategy: 'ma_crossover',
          shortMA: currentShortMA,
          longMA: currentLongMA,
          shortPeriod: this.shortPeriod,
          longPeriod: this.longPeriod
        }
      };
    } else if (sellSignal && context.position) {
      // Generate sell signal
      return {
        portfolioId: context.portfolioId,
        strategyId: this.id,
        timestamp: context.timestamp,
        symbol: context.symbol,
        exchange: context.exchange,
        type: SignalType.SELL,
        strength: SignalStrength.MODERATE,
        source: SignalSource.TECHNICAL,
        price: context.currentPrice,
        quantity: context.position.size,
        executed: false,
        metadata: {
          strategy: 'ma_crossover',
          shortMA: currentShortMA,
          longMA: currentLongMA,
          shortPeriod: this.shortPeriod,
          longPeriod: this.longPeriod
        }
      };
    }
    
    return null;
  }
  
  private calculateSMA(data: any[], period: number): number[] {
    const closes = data.map(bar => bar.close || bar[4] || 0);
    const result: number[] = [];
    
    for (let i = period - 1; i < closes.length; i++) {
      const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    
    return result;
  }
  
  getRequiredTimeframes(): string[] {
    return ['1h', '4h', '1d']; // Common timeframes for MA crossover
  }
  
  getRequiredSymbols(): string[] {
    return this.symbols;
  }
}

// RSI Strategy
class RSIStrategy extends BaseStrategy {
  private period: number;
  private oversoldThreshold: number;
  private overboughtThreshold: number;
  private symbols: string[];
  
  constructor(
    id: string,
    name: string,
    period: number = 14,
    oversoldThreshold: number = 30,
    overboughtThreshold: number = 70,
    symbols: string[] = ['BTC/USDT'],
    description?: string
  ) {
    super(id, name, description || `RSI(${period}) Strategy`);
    this.period = period;
    this.oversoldThreshold = oversoldThreshold;
    this.overboughtThreshold = overboughtThreshold;
    this.symbols = symbols;
  }
  
  async evaluate(context: StrategyContext): Promise<TradingSignal | null> {
    // Ensure we have enough history data
    if (!context.historyBars || context.historyBars.length < this.period + 2) {
      console.warn(`Not enough history data for ${context.symbol}`);
      return null;
    }
    
    // Calculate RSI
    const rsi = this.calculateRSI(context.historyBars, this.period);
    const currentRSI = rsi[rsi.length - 1];
    const previousRSI = rsi[rsi.length - 2];
    
    // Buy signal: RSI crosses above oversold threshold
    const buySignal = previousRSI <= this.oversoldThreshold && currentRSI > this.oversoldThreshold;
    
    // Sell signal: RSI crosses below overbought threshold
    const sellSignal = previousRSI >= this.overboughtThreshold && currentRSI < this.overboughtThreshold;
    
    if (buySignal && !context.position) {
      // Generate buy signal
      return {
        portfolioId: context.portfolioId,
        strategyId: this.id,
        timestamp: context.timestamp,
        symbol: context.symbol,
        exchange: context.exchange,
        type: SignalType.BUY,
        strength: SignalStrength.MODERATE,
        source: SignalSource.TECHNICAL,
        price: context.currentPrice,
        stopLoss: context.currentPrice * 0.95, // 5% stop loss
        takeProfit: context.currentPrice * 1.10, // 10% take profit
        executed: false,
        metadata: {
          strategy: 'rsi',
          rsi: currentRSI,
          period: this.period,
          oversoldThreshold: this.oversoldThreshold
        }
      };
    } else if (sellSignal && context.position) {
      // Generate sell signal
      return {
        portfolioId: context.portfolioId,
        strategyId: this.id,
        timestamp: context.timestamp,
        symbol: context.symbol,
        exchange: context.exchange,
        type: SignalType.SELL,
        strength: SignalStrength.MODERATE,
        source: SignalSource.TECHNICAL,
        price: context.currentPrice,
        quantity: context.position.size,
        executed: false,
        metadata: {
          strategy: 'rsi',
          rsi: currentRSI,
          period: this.period,
          overboughtThreshold: this.overboughtThreshold
        }
      };
    }
    
    return null;
  }
  
  private calculateRSI(data: any[], period: number): number[] {
    const closes = data.map(bar => bar.close || bar[4] || 0);
    const result: number[] = [];
    let gains = 0;
    let losses = 0;
    
    // Calculate first average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate first RSI
    let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
    result.push(100 - (100 / (1 + rs)));
    
    // Calculate remaining RSIs
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      let currentGain = 0;
      let currentLoss = 0;
      
      if (change >= 0) {
        currentGain = change;
      } else {
        currentLoss = -change;
      }
      
      // Smooth averages
      avgGain = ((avgGain * (period - 1)) + currentGain) / period;
      avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
      
      rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
      result.push(100 - (100 / (1 + rs)));
    }
    
    return result;
  }
  
  getRequiredTimeframes(): string[] {
    return ['15m', '1h', '4h']; // Common timeframes for RSI
  }
  
  getRequiredSymbols(): string[] {
    return this.symbols;
  }
}

// Strategy loader class to load strategies from the database
class StrategyLoader {
  // Load all strategies from the database
  static async loadStrategies(): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      const { data: strategies, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('is_active', true);
        
      if (error) {
        console.error('Error loading strategies:', error);
        return;
      }
      
      // Clear existing registry
      StrategyRegistry.list().forEach(strategy => {
        StrategyRegistry.remove(strategy.id);
      });
      
      // Register strategies
      for (const strategyData of strategies) {
        try {
          const strategy = this.createStrategyFromData(strategyData);
          if (strategy) {
            StrategyRegistry.register(strategy);
          }
        } catch (err) {
          console.error(`Error creating strategy ${strategyData.id}:`, err);
        }
      }
      
      console.log(`Loaded ${StrategyRegistry.list().length} strategies`);
    } catch (error) {
      console.error('Error in loadStrategies:', error);
    }
  }
  
  // Create a strategy instance from database data
  private static createStrategyFromData(data: any): Strategy | null {
    // Map database strategy type to actual strategy implementation
    switch (data.type) {
      case 'ma_crossover':
        return new MovingAverageCrossover(
          data.id,
          data.name,
          data.parameters?.short_period || 9,
          data.parameters?.long_period || 21,
          data.symbols || ['BTC/USDT'],
          data.description
        );
        
      case 'rsi':
        return new RSIStrategy(
          data.id,
          data.name,
          data.parameters?.period || 14,
          data.parameters?.oversold || 30,
          data.parameters?.overbought || 70,
          data.symbols || ['BTC/USDT'],
          data.description
        );
        
      default:
        console.warn(`Unknown strategy type: ${data.type}`);
        return null;
    }
  }
  
  // Get a specific strategy from database
  static async getStrategy(id: string): Promise<Strategy | null> {
    try {
      // Check if already loaded
      const cachedStrategy = StrategyRegistry.get(id);
      if (cachedStrategy) {
        return cachedStrategy;
      }
      
      const supabase = await createServerClient();
      
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error || !data) {
        console.error('Error loading strategy:', error);
        return null;
      }
      
      const strategy = this.createStrategyFromData(data);
      if (strategy) {
        StrategyRegistry.register(strategy);
      }
      
      return strategy;
    } catch (error) {
      console.error('Error in getStrategy:', error);
      return null;
    }
  }
}

// Strategy Runner to execute strategies against market data
class StrategyRunner {
  private static marketDataService = MarketDataService.getInstance();
  
  // Run a strategy against live market data
  static async runStrategy(
    strategy: Strategy,
    portfolioId: string,
    exchange: string,
    symbol: string,
    timeframe: string = '1h'
  ): Promise<TradingSignal | null> {
    try {
      // Fetch current market data
      const marketData = await this.marketDataService.getTicker(
        exchange as any,
        symbol
      );
      
      if (!marketData) {
        throw new Error(`Failed to get market data for ${symbol} on ${exchange}`);
      }
      
      // Fetch history data (candles)
      const historyBars = await this.marketDataService.getCandles(
        exchange as any,
        symbol,
        timeframe,
        100 // Get 100 bars
      );
      
      // Get position information
      const position = await this.getPositionInfo(portfolioId, exchange, symbol);
      
      // Create strategy context
      const context: StrategyContext = {
        portfolioId,
        exchange,
        symbol,
        currentPrice: marketData.last,
        timestamp: new Date().toISOString(),
        timeframe,
        historyBars,
        position,
        metadata: {
          marketData
        }
      };
      
      // Evaluate strategy
      return await strategy.evaluate(context);
    } catch (error) {
      console.error(`Error running strategy ${strategy.id} for ${symbol}:`, error);
      return null;
    }
  }
  
  // Run all strategies for a portfolio
  static async runAllStrategies(portfolioId: string): Promise<TradingSignal[]> {
    // Make sure strategies are loaded
    await StrategyLoader.loadStrategies();
    
    // Get all registered strategies
    const strategies = StrategyRegistry.list();
    
    // Signals to be generated
    const signals: TradingSignal[] = [];
    
    // Run each strategy
    for (const strategy of strategies) {
      try {
        // Get required symbols for this strategy
        const symbols = strategy.getRequiredSymbols();
        
        // Run strategy for each symbol
        for (const symbol of symbols) {
          // Extract exchange from symbol (assuming format like 'binance:BTC/USDT')
          let exchange = 'binance'; // Default
          let cleanSymbol = symbol;
          
          if (symbol.includes(':')) {
            const parts = symbol.split(':');
            exchange = parts[0];
            cleanSymbol = parts[1];
          }
          
          // Get preferred timeframes
          const timeframes = strategy.getRequiredTimeframes();
          
          // Run for the first preferred timeframe
          const signal = await this.runStrategy(
            strategy,
            portfolioId,
            exchange,
            cleanSymbol,
            timeframes[0]
          );
          
          if (signal) {
            signals.push(signal);
          }
        }
      } catch (error) {
        console.error(`Error processing strategy ${strategy.id}:`, error);
      }
    }
    
    return signals;
  }
  
  // Get position information for a symbol
  private static async getPositionInfo(
    portfolioId: string,
    exchange: string,
    symbol: string
  ): Promise<StrategyContext['position'] | undefined> {
    try {
      // This would be replaced with actual position query from the database
      const supabase = await createServerClient();
      
      const { data: positions, error } = await supabase
        .from('positions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('exchange', exchange)
        .eq('symbol', symbol);
        
      if (error || !positions || positions.length === 0) {
        return undefined;
      }
      
      const position = positions[0];
      
      return {
        size: position.quantity || 0,
        entryPrice: position.entry_price || 0,
        unrealizedPnl: position.unrealized_pnl || 0,
        unrealizedPnlPercent: position.unrealized_pnl ? (position.unrealized_pnl / (position.entry_price * position.quantity) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting position info:', error);
      return undefined;
    }
  }
}

// Add default strategies to registry
const defaultMA = new MovingAverageCrossover(
  'default-ma-9-21',
  'Default MA Crossover 9/21',
  9,
  21,
  ['BTC/USDT', 'ETH/USDT']
);

const defaultRSI = new RSIStrategy(
  'default-rsi-14',
  'Default RSI Strategy',
  14,
  30,
  70,
  ['BTC/USDT', 'ETH/USDT']
);

// Register default strategies
StrategyRegistry.register(defaultMA);
StrategyRegistry.register(defaultRSI);

// Export for usage
export { StrategyRegistry, StrategyLoader, StrategyRunner };
