import { Strategy, StrategyParams, StrategySignal, MarketData } from './strategy-interface';
import { OrderService } from './order-service';
import { MarketDataService } from './market-data-service';
import { StrategyExecution, Position, Order, TimeFrame } from '@/types/trading.types';
import { createServerClient } from '@/utils/supabase/server';
import { pusherServer } from '@/lib/pusher';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for the strategy execution service
 */
export interface StrategyExecutionConfig {
  executionInterval: number; // Milliseconds between strategy executions
  maxConcurrentExecutions: number; // Maximum number of strategies to run concurrently
  signalValidityPeriod: number; // How long signals are valid for in milliseconds
  paperTrading: boolean; // Whether to use paper trading (simulated) or real trading
}

/**
 * Service responsible for executing strategies and generating trade signals
 */
export class StrategyExecutionService {
  private strategies: Map<string, Strategy> = new Map();
  private executions: Map<string, StrategyExecution> = new Map();
  private marketDataService: MarketDataService;
  private orderService: OrderService;
  private config: StrategyExecutionConfig;
  private executionIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  
  constructor(
    marketDataService: MarketDataService,
    orderService: OrderService,
    config: StrategyExecutionConfig
  ) {
    this.marketDataService = marketDataService;
    this.orderService = orderService;
    this.config = config;
  }
  
  /**
   * Register a strategy with the execution service
   */
  registerStrategy(strategy: Strategy): void {
    this.strategies.set(strategy.getId(), strategy);
  }
  
  /**
   * Unregister a strategy from the execution service
   */
  unregisterStrategy(strategyId: string): void {
    // Stop any active executions first
    this.stopStrategyExecution(strategyId);
    
    // Remove the strategy
    this.strategies.delete(strategyId);
  }
  
  /**
   * Start executing a strategy
   */
  async startStrategyExecution(
    strategyId: string, 
    params: StrategyParams,
    userId: string
  ): Promise<StrategyExecution | null> {
    // Check if the strategy exists
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      console.error(`Strategy ${strategyId} not found`);
      return null;
    }
    
    // Configure the strategy with the provided parameters
    strategy.configure(params);
    
    // Check if the strategy is already running
    const existingExecution = this.executions.get(strategyId);
    if (existingExecution) {
      return existingExecution;
    }
    
    // Create a new execution
    const execution: StrategyExecution = {
      id: uuidv4(),
      strategyId,
      name: strategy.getName(),
      status: 'active',
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      signals: 0,
      orders: 0,
      pnl: 0,
      pnlPercent: 0,
      parameters: params.parameters,
      userId,
      metadata: {
        config: this.config,
        symbols: params.symbols,
        timeframe: params.timeframe
      }
    };
    
    // Store the execution
    this.executions.set(strategyId, execution);
    
    // Save the execution in the database
    try {
      const supabase = createServerClient();
      await supabase
        .from('elizaos_strategy_executions')
        .insert([{
          id: execution.id,
          strategy_id: execution.strategyId,
          name: execution.name,
          status: execution.status,
          start_time: execution.startTime,
          last_update_time: execution.lastUpdateTime,
          signals: execution.signals,
          orders: execution.orders,
          pnl: execution.pnl,
          pnl_percent: execution.pnlPercent,
          parameters: execution.parameters,
          user_id: execution.userId,
          metadata: execution.metadata
        }]);
    } catch (error) {
      console.error('Error saving strategy execution to database:', error);
      // Continue despite the error - this will just mean it's not persisted
    }
    
    // Schedule the strategy execution
    this.scheduleStrategyExecution(strategyId);
    
    // Notify via WebSocket
    this.notifyStrategyEvent('started', execution);
    
    return execution;
  }
  
  /**
   * Stop executing a strategy
   */
  async stopStrategyExecution(strategyId: string): Promise<boolean> {
    // Check if the strategy is running
    const execution = this.executions.get(strategyId);
    if (!execution) {
      return false;
    }
    
    // Clear the execution interval
    const interval = this.executionIntervals.get(strategyId);
    if (interval) {
      clearInterval(interval);
      this.executionIntervals.delete(strategyId);
    }
    
    // Update execution status
    execution.status = 'stopped';
    execution.lastUpdateTime = new Date().toISOString();
    
    // Update the execution in the database
    try {
      const supabase = createServerClient();
      await supabase
        .from('elizaos_strategy_executions')
        .update({
          status: execution.status,
          last_update_time: execution.lastUpdateTime
        })
        .eq('id', execution.id);
    } catch (error) {
      console.error('Error updating strategy execution in database:', error);
    }
    
    // Notify via WebSocket
    this.notifyStrategyEvent('stopped', execution);
    
    return true;
  }
  
  /**
   * Pause a strategy execution
   */
  async pauseStrategyExecution(strategyId: string): Promise<boolean> {
    // Check if the strategy is running
    const execution = this.executions.get(strategyId);
    if (!execution || execution.status !== 'active') {
      return false;
    }
    
    // Clear the execution interval
    const interval = this.executionIntervals.get(strategyId);
    if (interval) {
      clearInterval(interval);
      this.executionIntervals.delete(strategyId);
    }
    
    // Update execution status
    execution.status = 'paused';
    execution.lastUpdateTime = new Date().toISOString();
    
    // Update the execution in the database
    try {
      const supabase = createServerClient();
      await supabase
        .from('elizaos_strategy_executions')
        .update({
          status: execution.status,
          last_update_time: execution.lastUpdateTime
        })
        .eq('id', execution.id);
    } catch (error) {
      console.error('Error updating strategy execution in database:', error);
    }
    
    // Notify via WebSocket
    this.notifyStrategyEvent('paused', execution);
    
    return true;
  }
  
  /**
   * Get all active strategy executions
   */
  getActiveExecutions(): StrategyExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.status === 'active');
  }
  
  /**
   * Get a specific strategy execution
   */
  getStrategyExecution(strategyId: string): StrategyExecution | null {
    return this.executions.get(strategyId) || null;
  }
  
  /**
   * Start the execution service
   */
  start(): void {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Resume any active executions
    this.executions.forEach((execution, strategyId) => {
      if (execution.status === 'active' && !this.executionIntervals.has(strategyId)) {
        this.scheduleStrategyExecution(strategyId);
      }
    });
  }
  
  /**
   * Stop the execution service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    // Clear all execution intervals
    this.executionIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.executionIntervals.clear();
    
    // Update all executions to stopped
    for (const [strategyId, execution] of this.executions.entries()) {
      if (execution.status === 'active') {
        await this.stopStrategyExecution(strategyId);
      }
    }
    
    this.isRunning = false;
  }
  
  /**
   * Schedule a strategy for periodic execution
   */
  private scheduleStrategyExecution(strategyId: string): void {
    // Check if already scheduled
    if (this.executionIntervals.has(strategyId)) {
      return;
    }
    
    // Schedule periodic execution
    const interval = setInterval(
      () => this.executeStrategy(strategyId),
      this.config.executionInterval
    );
    
    // Store the interval for cleanup
    this.executionIntervals.set(strategyId, interval);
  }
  
  /**
   * Execute a single strategy iteration
   */
  private async executeStrategy(strategyId: string): Promise<void> {
    // Get the strategy and execution
    const strategy = this.strategies.get(strategyId);
    const execution = this.executions.get(strategyId);
    
    if (!strategy || !execution || execution.status !== 'active') {
      // Strategy not found or not active, stop execution
      const interval = this.executionIntervals.get(strategyId);
      if (interval) {
        clearInterval(interval);
        this.executionIntervals.delete(strategyId);
      }
      return;
    }
    
    try {
      // Get the required market data
      const requiredData = strategy.getRequiredMarketData();
      const marketData = await this.fetchMarketData(
        requiredData.symbols,
        requiredData.timeframes
      );
      
      // Get current positions
      const positions = await this.getPositions(execution.userId);
      
      // Process market data to generate signals
      const marketSignals = strategy.processMarketData(marketData);
      
      // Process positions to generate exit signals
      const positionSignals = strategy.processPositions(positions);
      
      // Combine signals
      const signals = [...marketSignals, ...positionSignals];
      
      // Update execution statistics
      execution.signals += signals.length;
      execution.lastUpdateTime = new Date().toISOString();
      
      // Execute signals if any
      if (signals.length > 0) {
        await this.executeSignals(signals, execution);
      }
      
      // Notify progress via WebSocket
      this.notifyStrategyEvent('executed', execution);
      
      // Update the execution in the database
      try {
        const supabase = createServerClient();
        await supabase
          .from('elizaos_strategy_executions')
          .update({
            signals: execution.signals,
            orders: execution.orders,
            pnl: execution.pnl,
            pnl_percent: execution.pnlPercent,
            last_update_time: execution.lastUpdateTime
          })
          .eq('id', execution.id);
      } catch (error) {
        console.error('Error updating strategy execution in database:', error);
      }
    } catch (error) {
      console.error(`Error executing strategy ${strategyId}:`, error);
      
      // Update execution status to error
      execution.status = 'error';
      execution.lastUpdateTime = new Date().toISOString();
      execution.metadata = {
        ...execution.metadata,
        lastError: {
          message: error.message,
          timestamp: new Date().toISOString()
        }
      };
      
      // Notify error via WebSocket
      this.notifyStrategyEvent('error', execution);
      
      // Update the execution in the database
      try {
        const supabase = createServerClient();
        await supabase
          .from('elizaos_strategy_executions')
          .update({
            status: execution.status,
            last_update_time: execution.lastUpdateTime,
            metadata: execution.metadata
          })
          .eq('id', execution.id);
      } catch (dbError) {
        console.error('Error updating strategy execution in database:', dbError);
      }
    }
  }
  
  /**
   * Fetch market data for the strategy
   */
  private async fetchMarketData(
    symbols: string[],
    timeframes: TimeFrame[]
  ): Promise<MarketData> {
    // Simplified implementation - in production would fetch from real market data sources
    // For each symbol and timeframe, get candle data
    
    // Get the first symbol and timeframe for now
    const symbol = symbols[0];
    const timeframe = timeframes[0];
    
    try {
      const candles = await this.marketDataService.getCandles(symbol, timeframe, 200);
      
      return {
        candles: {
          symbol,
          timeframe,
          open: candles.map(c => c.open),
          high: candles.map(c => c.high),
          low: candles.map(c => c.low),
          close: candles.map(c => c.close),
          volume: candles.map(c => c.volume),
          timestamp: candles.map(c => c.timestamp)
        }
      };
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      
      // Return empty data structure if fetch fails
      return {
        candles: {
          symbol,
          timeframe,
          open: [],
          high: [],
          low: [],
          close: [],
          volume: [],
          timestamp: []
        }
      };
    }
  }
  
  /**
   * Get current positions for the user
   */
  private async getPositions(userId: string): Promise<Position[]> {
    try {
      // In production, would fetch from database or exchange API
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting positions:', error);
      return [];
    }
  }
  
  /**
   * Execute strategy signals by creating orders
   */
  private async executeSignals(
    signals: StrategySignal[],
    execution: StrategyExecution
  ): Promise<void> {
    for (const signal of signals) {
      try {
        // Create an order from the signal
        const order = await this.orderService.createOrder({
          symbol: signal.symbol,
          side: signal.side,
          type: 'market', // Could be configurable in the future
          quantity: 0, // Will be calculated by the order service based on risk
          price: signal.price,
          strategyId: execution.strategyId,
          userId: execution.userId,
          metadata: {
            signal,
            executionId: execution.id,
            stopLoss: signal.stopLoss,
            takeProfit: signal.targetPrice
          }
        });
        
        // Update execution statistics
        execution.orders += 1;
        
        // Notify the signal and order via WebSocket
        this.notifyStrategySignal(signal, order, execution);
      } catch (error) {
        console.error(`Error executing signal for ${signal.symbol}:`, error);
      }
    }
  }
  
  /**
   * Send a WebSocket notification for a strategy event
   */
  private async notifyStrategyEvent(
    event: 'started' | 'stopped' | 'paused' | 'executed' | 'error',
    execution: StrategyExecution
  ): Promise<void> {
    try {
      const channel = `user-${execution.userId}`;
      
      await pusherServer.trigger(channel, 'STRATEGY_EVENT', {
        event,
        execution,
        timestamp: new Date().toISOString()
      });
      
      // Also notify the farm if applicable
      if (execution.metadata?.farmId) {
        const farmChannel = `farm-${execution.metadata.farmId}`;
        
        await pusherServer.trigger(farmChannel, 'STRATEGY_EVENT', {
          event,
          execution,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending WebSocket notification for strategy event:', error);
    }
  }
  
  /**
   * Send a WebSocket notification for a strategy signal
   */
  private async notifyStrategySignal(
    signal: StrategySignal,
    order: Order,
    execution: StrategyExecution
  ): Promise<void> {
    try {
      const channel = `user-${execution.userId}`;
      
      await pusherServer.trigger(channel, 'STRATEGY_SIGNAL', {
        signal,
        order,
        execution: {
          id: execution.id,
          strategyId: execution.strategyId,
          name: execution.name
        },
        timestamp: new Date().toISOString()
      });
      
      // Also notify the farm if applicable
      if (execution.metadata?.farmId) {
        const farmChannel = `farm-${execution.metadata.farmId}`;
        
        await pusherServer.trigger(farmChannel, 'STRATEGY_SIGNAL', {
          signal,
          order,
          execution: {
            id: execution.id,
            strategyId: execution.strategyId,
            name: execution.name
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending WebSocket notification for strategy signal:', error);
    }
  }
}
