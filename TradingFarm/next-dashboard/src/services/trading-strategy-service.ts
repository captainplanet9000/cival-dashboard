/**
 * Trading Strategy Service
 * 
 * Manages automated trading strategies for the Trading Farm platform
 * Connects farm logic with exchange APIs for real-time trading
 */
import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { ExchangeType } from './exchange-service';
import exchangeService from './exchange-service';
import { FarmService } from './farm-service';
import websocketService, { WebSocketTopic } from './websocket-service';
import exchangeWebSocketService, { ExchangeDataType } from './exchange-websocket-service';

export type StrategyType = 
  | 'trend_following' 
  | 'mean_reversion' 
  | 'breakout' 
  | 'grid_trading'
  | 'scalping'
  | 'arbitrage'
  | 'custom';

export interface StrategyConfig {
  id?: number;
  name: string;
  description?: string;
  farmId: number;
  strategyType: StrategyType;
  exchange: ExchangeType;
  symbol: string;
  timeframe: string;
  parameters: Record<string, any>;
  isActive: boolean;
  maxDrawdown?: number;
  maxPositionSize?: number;
  stopLoss?: number;
  takeProfit?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StrategySignal {
  id?: number;
  strategyId: number;
  farmId: number;
  exchange: ExchangeType;
  symbol: string;
  direction: 'buy' | 'sell' | 'neutral';
  signalType: 'entry' | 'exit' | 'modify';
  price: number;
  quantity?: number;
  timestamp: string;
  metadata?: Record<string, any>;
  isExecuted: boolean;
  executionData?: Record<string, any>;
  created_at?: string;
}

export interface StrategyInstance {
  config: StrategyConfig;
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  executeSignal: (signal: StrategySignal) => Promise<any>;
}

export class TradingStrategyService {
  private runningStrategies: Map<number, StrategyInstance> = new Map();
  private farmService: FarmService;
  
  constructor(farmService: FarmService) {
    this.farmService = farmService;
    this.setupSignalHandlers();
  }
  
  /**
   * Set up WebSocket listeners for strategy signals
   */
  private setupSignalHandlers() {
    websocketService.subscribe(WebSocketTopic.TRADING, async (message) => {
      if (message.type === 'strategy_signal') {
        // Handle incoming strategy signals
        await this.processStrategySignal(message.signal);
      }
    });
  }
  
  /**
   * Process a strategy signal and execute it if needed
   */
  private async processStrategySignal(signal: StrategySignal): Promise<boolean> {
    try {
      // Get the strategy instance
      const strategy = this.runningStrategies.get(signal.strategyId);
      if (!strategy) {
        console.error(`Strategy ${signal.strategyId} not found for signal`);
        return false;
      }
      
      // Check if farm is active
      const farm = await this.farmService.getFarm(signal.farmId);
      if (!farm || !farm.is_active) {
        console.error(`Farm ${signal.farmId} is not active, can't execute signal`);
        return false;
      }
      
      // Execute the signal
      await strategy.executeSignal(signal);
      
      // Mark signal as executed in database
      const supabase = createServerClient();
      await supabase
        .from('strategy_signals')
        .update({ 
          isExecuted: true,
          executionData: { executedAt: new Date().toISOString() }
        })
        .eq('id', signal.id);
      
      // Broadcast execution
      websocketService.broadcastToTopic(WebSocketTopic.TRADING, {
        type: 'signal_executed',
        signal
      });
      
      return true;
    } catch (error) {
      console.error('Error processing strategy signal:', error);
      return false;
    }
  }
  
  /**
   * Get all trading strategies for a user
   */
  async getUserStrategies(): Promise<StrategyConfig[]> {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user strategies:', error);
      return [];
    }
  }
  
  /**
   * Get trading strategies for a specific farm
   */
  async getFarmStrategies(farmId: number): Promise<StrategyConfig[]> {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('farmId', farmId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching strategies for farm ${farmId}:`, error);
      return [];
    }
  }
  
  /**
   * Get a specific trading strategy
   */
  async getStrategy(strategyId: number): Promise<StrategyConfig | null> {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('id', strategyId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching strategy ${strategyId}:`, error);
      return null;
    }
  }
  
  /**
   * Create a new trading strategy
   */
  async createStrategy(strategy: Omit<StrategyConfig, 'id'>): Promise<StrategyConfig | null> {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('trading_strategies')
        .insert([strategy])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating strategy:', error);
      return null;
    }
  }
  
  /**
   * Update an existing trading strategy
   */
  async updateStrategy(strategyId: number, updates: Partial<StrategyConfig>): Promise<StrategyConfig | null> {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('trading_strategies')
        .update(updates)
        .eq('id', strategyId)
        .select()
        .single();
      
      if (error) throw error;
      
      // If strategy is running and was updated, restart it
      if (this.runningStrategies.has(strategyId)) {
        await this.stopStrategy(strategyId);
        await this.startStrategy(strategyId);
      }
      
      return data;
    } catch (error) {
      console.error(`Error updating strategy ${strategyId}:`, error);
      return null;
    }
  }
  
  /**
   * Delete a trading strategy
   */
  async deleteStrategy(strategyId: number): Promise<boolean> {
    try {
      // Stop strategy if it's running
      if (this.runningStrategies.has(strategyId)) {
        await this.stopStrategy(strategyId);
      }
      
      const supabase = createServerClient();
      const { error } = await supabase
        .from('trading_strategies')
        .delete()
        .eq('id', strategyId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting strategy ${strategyId}:`, error);
      return false;
    }
  }
  
  /**
   * Start a trading strategy
   */
  async startStrategy(strategyId: number): Promise<boolean> {
    try {
      // Check if already running
      if (this.runningStrategies.has(strategyId)) {
        return true;
      }
      
      // Get strategy config
      const config = await this.getStrategy(strategyId);
      if (!config) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      
      // Create strategy instance based on type
      const strategyInstance = this.createStrategyInstance(config);
      
      // Start the strategy
      await strategyInstance.start();
      
      // Add to running strategies
      this.runningStrategies.set(strategyId, strategyInstance);
      
      // Update the database
      const supabase = createServerClient();
      await supabase
        .from('trading_strategies')
        .update({ isActive: true })
        .eq('id', strategyId);
      
      // Broadcast start event
      websocketService.broadcastToTopic(WebSocketTopic.TRADING, {
        type: 'strategy_started',
        strategyId,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error(`Error starting strategy ${strategyId}:`, error);
      return false;
    }
  }
  
  /**
   * Stop a trading strategy
   */
  async stopStrategy(strategyId: number): Promise<boolean> {
    try {
      // Check if running
      const strategyInstance = this.runningStrategies.get(strategyId);
      if (!strategyInstance) {
        return true;
      }
      
      // Stop the strategy
      await strategyInstance.stop();
      
      // Remove from running strategies
      this.runningStrategies.delete(strategyId);
      
      // Update the database
      const supabase = createServerClient();
      await supabase
        .from('trading_strategies')
        .update({ isActive: false })
        .eq('id', strategyId);
      
      // Broadcast stop event
      websocketService.broadcastToTopic(WebSocketTopic.TRADING, {
        type: 'strategy_stopped',
        strategyId,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error(`Error stopping strategy ${strategyId}:`, error);
      return false;
    }
  }
  
  /**
   * Get all running strategy ids
   */
  getRunningStrategyIds(): number[] {
    return Array.from(this.runningStrategies.keys());
  }
  
  /**
   * Check if a strategy is running
   */
  isStrategyRunning(strategyId: number): boolean {
    return this.runningStrategies.has(strategyId);
  }
  
  /**
   * Get signals for a strategy
   */
  async getStrategySignals(strategyId: number, limit = 100): Promise<StrategySignal[]> {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('strategy_signals')
        .select('*')
        .eq('strategyId', strategyId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching signals for strategy ${strategyId}:`, error);
      return [];
    }
  }
  
  /**
   * Create a strategy signal
   */
  async createSignal(signal: Omit<StrategySignal, 'id'>): Promise<StrategySignal | null> {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('strategy_signals')
        .insert([{
          ...signal,
          timestamp: signal.timestamp || new Date().toISOString(),
          isExecuted: false
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Broadcast signal
      websocketService.broadcastToTopic(WebSocketTopic.TRADING, {
        type: 'strategy_signal',
        signal: data
      });
      
      return data;
    } catch (error) {
      console.error('Error creating strategy signal:', error);
      return null;
    }
  }
  
  /**
   * Create a strategy instance based on the configuration
   */
  private createStrategyInstance(config: StrategyConfig): StrategyInstance {
    switch (config.strategyType) {
      case 'trend_following':
        return new TrendFollowingStrategy(config, this);
      case 'mean_reversion':
        return new MeanReversionStrategy(config, this);
      case 'breakout':
        return new BreakoutStrategy(config, this);
      case 'grid_trading':
        return new GridTradingStrategy(config, this);
      case 'scalping':
        return new ScalpingStrategy(config, this);
      case 'arbitrage':
        return new ArbitrageStrategy(config, this);
      case 'custom':
      default:
        return new CustomStrategy(config, this);
    }
  }
}

/**
 * Base class for all strategy implementations
 */
abstract class BaseStrategy implements StrategyInstance {
  protected config: StrategyConfig;
  protected strategyService: TradingStrategyService;
  protected isRunning: boolean = false;
  protected subscriptions: { topic: ExchangeDataType, interval?: string }[] = [];
  
  constructor(config: StrategyConfig, strategyService: TradingStrategyService) {
    this.config = config;
    this.strategyService = strategyService;
  }
  
  /**
   * Start the strategy
   */
  async start(): Promise<boolean> {
    if (this.isRunning) return true;
    
    try {
      // Subscribe to required data feeds
      for (const sub of this.subscriptions) {
        await exchangeWebSocketService.subscribe(this.config.exchange, {
          symbol: this.config.symbol,
          type: sub.topic,
          interval: sub.interval
        });
      }
      
      // Set up WebSocket listeners
      this.setupEventHandlers();
      
      this.isRunning = true;
      return true;
    } catch (error) {
      console.error(`Error starting ${this.config.strategyType} strategy:`, error);
      return false;
    }
  }
  
  /**
   * Stop the strategy
   */
  async stop(): Promise<boolean> {
    if (!this.isRunning) return true;
    
    try {
      // Unsubscribe from data feeds
      for (const sub of this.subscriptions) {
        exchangeWebSocketService.unsubscribe(this.config.exchange, {
          symbol: this.config.symbol,
          type: sub.topic,
          interval: sub.interval
        });
      }
      
      // Clean up WebSocket listeners
      this.cleanupEventHandlers();
      
      this.isRunning = false;
      return true;
    } catch (error) {
      console.error(`Error stopping ${this.config.strategyType} strategy:`, error);
      return false;
    }
  }
  
  /**
   * Execute a trading signal
   */
  async executeSignal(signal: StrategySignal): Promise<any> {
    try {
      const exchangeApi = exchangeService.getExchangeApi(signal.exchange);
      
      // Create order parameters
      const orderParams = {
        symbol: signal.symbol,
        side: signal.direction === 'buy' ? 'Buy' : 'Sell',
        orderType: 'Market', // Default to market order
        quantity: signal.quantity || this.getDefaultQuantity(),
        farm_id: signal.farmId
      };
      
      // Place the order
      const orderResult = await exchangeApi.placeOrder(orderParams);
      
      // Update execution data
      return {
        orderId: orderResult.orderId,
        executedPrice: orderResult.price || signal.price,
        executedQuantity: orderResult.quantity,
        executedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error executing signal for strategy ${signal.strategyId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get default quantity based on strategy parameters
   */
  protected getDefaultQuantity(): number {
    // Default implementation
    return this.config.parameters.quantity || 0.01;
  }
  
  /**
   * Set up event handlers for WebSocket data
   */
  protected abstract setupEventHandlers(): void;
  
  /**
   * Clean up event handlers
   */
  protected abstract cleanupEventHandlers(): void;
  
  /**
   * Generate a trading signal based on strategy logic
   */
  protected abstract generateSignal(data: any): Promise<StrategySignal | null>;
}

/**
 * Trend Following Strategy Implementation
 */
class TrendFollowingStrategy extends BaseStrategy {
  private candleData: any[] = [];
  private readonly lookbackPeriod: number;
  private readonly shortPeriod: number;
  private readonly longPeriod: number;
  
  constructor(config: StrategyConfig, strategyService: TradingStrategyService) {
    super(config, strategyService);
    
    // Set up default parameters if not provided
    this.lookbackPeriod = config.parameters.lookbackPeriod || 20;
    this.shortPeriod = config.parameters.shortPeriod || 9;
    this.longPeriod = config.parameters.longPeriod || 21;
    
    // Define required data subscriptions
    this.subscriptions = [
      { topic: ExchangeDataType.KLINE, interval: config.timeframe }
    ];
  }
  
  protected setupEventHandlers(): void {
    websocketService.subscribe(WebSocketTopic.EXCHANGE, (message) => {
      // Only process messages for our exchange, symbol, and data type
      if (
        message.exchange === this.config.exchange &&
        message.symbol === this.config.symbol &&
        message.type === 'kline' &&
        message.interval === this.config.timeframe
      ) {
        // Add candle to data array
        this.processCandle(message.data);
      }
    });
  }
  
  protected cleanupEventHandlers(): void {
    // Note: The global WebSocket service handles subscription cleanup
  }
  
  private async processCandle(candle: any): Promise<void> {
    // Add candle to data
    this.candleData.push(candle);
    
    // Keep only required lookback period
    if (this.candleData.length > this.lookbackPeriod) {
      this.candleData = this.candleData.slice(-this.lookbackPeriod);
    }
    
    // Wait for enough data
    if (this.candleData.length < this.lookbackPeriod) {
      return;
    }
    
    // Generate signal based on strategy logic
    const signal = await this.generateSignal(this.candleData);
    
    if (signal) {
      // Create signal in database
      await this.strategyService.createSignal(signal);
    }
  }
  
  protected async generateSignal(data: any[]): Promise<StrategySignal | null> {
    // Simple moving average calculation
    const prices = data.map(d => d.close);
    
    // Calculate short and long EMAs
    const shortEMA = this.calculateEMA(prices, this.shortPeriod);
    const longEMA = this.calculateEMA(prices, this.longPeriod);
    
    // Get previous values
    const previousShortEMA = this.calculateEMA(prices.slice(0, -1), this.shortPeriod);
    const previousLongEMA = this.calculateEMA(prices.slice(0, -1), this.longPeriod);
    
    // Generate signal logic: when short EMA crosses above long EMA (golden cross)
    const currentCross = shortEMA > longEMA;
    const previousCross = previousShortEMA > previousLongEMA;
    
    // Current price
    const currentPrice = prices[prices.length - 1];
    
    // Golden cross (buy signal)
    if (currentCross && !previousCross) {
      return {
        strategyId: this.config.id!,
        farmId: this.config.farmId,
        exchange: this.config.exchange,
        symbol: this.config.symbol,
        direction: 'buy',
        signalType: 'entry',
        price: currentPrice,
        quantity: this.getDefaultQuantity(),
        timestamp: new Date().toISOString(),
        metadata: {
          shortEMA,
          longEMA,
          strategy: 'trend_following',
          reason: 'golden_cross'
        },
        isExecuted: false
      };
    }
    
    // Death cross (sell signal)
    if (!currentCross && previousCross) {
      return {
        strategyId: this.config.id!,
        farmId: this.config.farmId,
        exchange: this.config.exchange,
        symbol: this.config.symbol,
        direction: 'sell',
        signalType: 'exit',
        price: currentPrice,
        quantity: this.getDefaultQuantity(),
        timestamp: new Date().toISOString(),
        metadata: {
          shortEMA,
          longEMA,
          strategy: 'trend_following',
          reason: 'death_cross'
        },
        isExecuted: false
      };
    }
    
    return null;
  }
  
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) {
      // Not enough data
      return prices[prices.length - 1];
    }
    
    // Calculate simple moving average as initial EMA
    const sma = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    // Multiplier: (2 / (period + 1))
    const multiplier = 2 / (period + 1);
    
    // Calculate EMA
    let ema = sma;
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }
}

/**
 * Mean Reversion Strategy Implementation
 */
class MeanReversionStrategy extends BaseStrategy {
  private priceData: number[] = [];
  private readonly lookbackPeriod: number;
  private readonly stdDevMultiplier: number;
  
  constructor(config: StrategyConfig, strategyService: TradingStrategyService) {
    super(config, strategyService);
    
    // Set up default parameters if not provided
    this.lookbackPeriod = config.parameters.lookbackPeriod || 20;
    this.stdDevMultiplier = config.parameters.stdDevMultiplier || 2;
    
    // Define required data subscriptions
    this.subscriptions = [
      { topic: ExchangeDataType.TICKER }
    ];
  }
  
  protected setupEventHandlers(): void {
    websocketService.subscribe(WebSocketTopic.EXCHANGE, (message) => {
      // Only process ticker messages for our exchange and symbol
      if (
        message.exchange === this.config.exchange &&
        message.symbol === this.config.symbol &&
        message.type === 'ticker'
      ) {
        // Process price update
        this.processPrice(message.data.last);
      }
    });
  }
  
  protected cleanupEventHandlers(): void {
    // Note: The global WebSocket service handles subscription cleanup
  }
  
  private async processPrice(price: number): Promise<void> {
    // Add price to data
    this.priceData.push(price);
    
    // Keep only required lookback period
    if (this.priceData.length > this.lookbackPeriod) {
      this.priceData = this.priceData.slice(-this.lookbackPeriod);
    }
    
    // Wait for enough data
    if (this.priceData.length < this.lookbackPeriod) {
      return;
    }
    
    // Generate signal based on mean reversion logic
    const signal = await this.generateSignal(this.priceData);
    
    if (signal) {
      // Create signal in database
      await this.strategyService.createSignal(signal);
    }
  }
  
  protected async generateSignal(prices: number[]): Promise<StrategySignal | null> {
    // Calculate mean (average)
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Calculate standard deviation
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate upper and lower bands
    const upperBand = mean + (stdDev * this.stdDevMultiplier);
    const lowerBand = mean - (stdDev * this.stdDevMultiplier);
    
    // Current price
    const currentPrice = prices[prices.length - 1];
    
    // Generate signals based on price relative to bands
    if (currentPrice > upperBand) {
      // Price is above upper band - sell signal (mean reversion)
      return {
        strategyId: this.config.id!,
        farmId: this.config.farmId,
        exchange: this.config.exchange,
        symbol: this.config.symbol,
        direction: 'sell',
        signalType: 'entry',
        price: currentPrice,
        quantity: this.getDefaultQuantity(),
        timestamp: new Date().toISOString(),
        metadata: {
          mean,
          stdDev,
          upperBand,
          lowerBand,
          strategy: 'mean_reversion',
          reason: 'price_above_upper_band'
        },
        isExecuted: false
      };
    } else if (currentPrice < lowerBand) {
      // Price is below lower band - buy signal (mean reversion)
      return {
        strategyId: this.config.id!,
        farmId: this.config.farmId,
        exchange: this.config.exchange,
        symbol: this.config.symbol,
        direction: 'buy',
        signalType: 'entry',
        price: currentPrice,
        quantity: this.getDefaultQuantity(),
        timestamp: new Date().toISOString(),
        metadata: {
          mean,
          stdDev,
          upperBand,
          lowerBand,
          strategy: 'mean_reversion',
          reason: 'price_below_lower_band'
        },
        isExecuted: false
      };
    }
    
    return null;
  }
}

/**
 * Breakout Strategy Implementation
 */
class BreakoutStrategy extends BaseStrategy {
  protected setupEventHandlers(): void {
    // Implementation details omitted for brevity
  }
  
  protected cleanupEventHandlers(): void {
    // Implementation details omitted for brevity
  }
  
  protected async generateSignal(data: any): Promise<StrategySignal | null> {
    // Implementation details omitted for brevity
    return null;
  }
}

/**
 * Grid Trading Strategy Implementation
 */
class GridTradingStrategy extends BaseStrategy {
  protected setupEventHandlers(): void {
    // Implementation details omitted for brevity
  }
  
  protected cleanupEventHandlers(): void {
    // Implementation details omitted for brevity
  }
  
  protected async generateSignal(data: any): Promise<StrategySignal | null> {
    // Implementation details omitted for brevity
    return null;
  }
}

/**
 * Scalping Strategy Implementation
 */
class ScalpingStrategy extends BaseStrategy {
  protected setupEventHandlers(): void {
    // Implementation details omitted for brevity
  }
  
  protected cleanupEventHandlers(): void {
    // Implementation details omitted for brevity
  }
  
  protected async generateSignal(data: any): Promise<StrategySignal | null> {
    // Implementation details omitted for brevity
    return null;
  }
}

/**
 * Arbitrage Strategy Implementation
 */
class ArbitrageStrategy extends BaseStrategy {
  protected setupEventHandlers(): void {
    // Implementation details omitted for brevity
  }
  
  protected cleanupEventHandlers(): void {
    // Implementation details omitted for brevity
  }
  
  protected async generateSignal(data: any): Promise<StrategySignal | null> {
    // Implementation details omitted for brevity
    return null;
  }
}

/**
 * Custom Strategy Implementation (for user-defined strategies)
 */
class CustomStrategy extends BaseStrategy {
  protected setupEventHandlers(): void {
    // Implementation details omitted for brevity
  }
  
  protected cleanupEventHandlers(): void {
    // Implementation details omitted for brevity
  }
  
  protected async generateSignal(data: any): Promise<StrategySignal | null> {
    // Implementation details omitted for brevity
    return null;
  }
}
