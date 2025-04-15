/**
 * Trading Engine Core
 * 
 * Connects strategy signals to exchange adapters with risk management,
 * position tracking, and comprehensive logging.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { ExchangeAdapter } from '@/utils/exchanges/exchange-adapter';
import { OrderRequest, Order, Position, Balance } from '@/types/orders';
import { RiskManager } from './risk-manager';
import { PositionTracker } from './position-tracker';
import { LogManager } from './log-manager';
import { createServerClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';

export type ExecutionMode = 'live' | 'paper';
export type TradingEngineStatus = 'idle' | 'running' | 'paused' | 'error' | 'shutdown';

export interface TradingEngineConfig {
  farmId: string;
  strategyId: string;
  agentId: string;
  exchangeId: string;
  executionMode: ExecutionMode;
  riskParams: RiskParameters;
  allowedSymbols?: string[];
  maxPositions?: number;
  initialFunds?: number; // For paper trading
}

export interface RiskParameters {
  maxPositionSize: number;         // Max position size as % of account
  maxLeverage: number;             // Max leverage allowed
  maxDrawdown: number;             // Max drawdown % before emergency stop
  maxDailyLoss: number;            // Max daily loss % before emergency stop
  maxOrderValue: number;           // Max order value in USD
  slippageTolerance: number;       // Max slippage % allowed
  emergencyStopEnabled: boolean;   // Enable emergency stop on risk breach
  circuitBreakerEnabled: boolean;  // Enable circuit breaker on volatility
}

export interface TradeExecutionResult {
  success: boolean;
  order?: Order;
  error?: string;
  warnings?: string[];
  riskChecks?: {
    passed: boolean;
    details: Record<string, boolean | string>;
  };
}

export class TradingEngine extends EventEmitter {
  private adapter: ExchangeAdapter;
  private riskManager: RiskManager;
  private positionTracker: PositionTracker;
  private logManager: LogManager;
  private config: TradingEngineConfig;
  private status: TradingEngineStatus = 'idle';
  private activeOrders: Map<string, Order> = new Map();
  private executionQueue: Array<{request: OrderRequest, resolve: Function, reject: Function}> = [];
  private processingQueue: boolean = false;
  private supabase: ReturnType<typeof createServerClient>;
  
  constructor(
    adapter: ExchangeAdapter,
    config: TradingEngineConfig,
    supabaseClient?: ReturnType<typeof createServerClient>
  ) {
    super();
    this.adapter = adapter;
    this.config = config;
    this.riskManager = new RiskManager(config.riskParams);
    this.positionTracker = new PositionTracker(
      config.farmId, 
      config.strategyId, 
      config.executionMode === 'paper' ? config.initialFunds || 10000 : undefined
    );
    this.logManager = new LogManager(config.farmId, config.strategyId, config.agentId);
    this.supabase = supabaseClient || createServerClient();
    
    // Setup position syncing interval (every 5 minutes)
    setInterval(() => this.syncPositionsWithDB(), 5 * 60 * 1000);
  }
  
  /**
   * Initialize the trading engine
   */
  async initialize(): Promise<boolean> {
    try {
      this.logManager.info('Trading engine initializing...');
      
      // Load any existing positions from DB
      await this.positionTracker.loadPositionsFromDB(this.supabase);
      
      // Subscribe to order updates
      if (this.config.executionMode === 'live') {
        await this.subscribeToOrderUpdates();
      }
      
      this.status = 'running';
      this.logManager.info(`Trading engine initialized in ${this.config.executionMode} mode`);
      this.emit('initialized', { mode: this.config.executionMode });
      return true;
    } catch (error) {
      this.status = 'error';
      this.logManager.error('Failed to initialize trading engine', error);
      this.emit('error', error);
      return false;
    }
  }
  
  /**
   * Execute a trade order with risk checks
   */
  async executeOrder(orderRequest: OrderRequest): Promise<TradeExecutionResult> {
    // Generate client order ID if not provided
    if (!orderRequest.clientOrderId) {
      orderRequest.clientOrderId = `tf_${uuidv4().substring(0, 8)}_${Date.now()}`;
    }
    
    this.logManager.info(`Processing order request for ${orderRequest.symbol}`, orderRequest);
    
    try {
      // Validate symbol is allowed
      if (this.config.allowedSymbols && 
          this.config.allowedSymbols.length > 0 && 
          !this.config.allowedSymbols.includes(orderRequest.symbol)) {
        return {
          success: false,
          error: `Symbol ${orderRequest.symbol} is not in the allowed list for this trading engine`,
        };
      }
      
      // Perform risk checks
      const riskResult = await this.riskManager.validateOrder(
        orderRequest,
        await this.positionTracker.getPositions(),
        await this.getAccountBalance()
      );
      
      if (!riskResult.passed) {
        this.logManager.warn('Order rejected by risk manager', { orderRequest, riskResult });
        return {
          success: false,
          error: 'Order failed risk validation',
          riskChecks: riskResult
        };
      }
      
      // Paper trading execution
      if (this.config.executionMode === 'paper') {
        const paperOrder = await this.executePaperTrade(orderRequest);
        this.emit('order_executed', paperOrder);
        return {
          success: true,
          order: paperOrder,
          riskChecks: riskResult
        };
      }
      
      // Real trading execution - add to queue
      return await new Promise((resolve, reject) => {
        this.executionQueue.push({ request: orderRequest, resolve, reject });
        this.processExecutionQueue();
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logManager.error('Order execution failed', { orderRequest, error });
      
      return {
        success: false,
        error: `Order execution failed: ${errorMessage}`
      };
    }
  }
  
  /**
   * Process the execution queue to prevent overwhelming the exchange
   */
  private async processExecutionQueue() {
    if (this.processingQueue || this.executionQueue.length === 0) return;
    
    this.processingQueue = true;
    
    try {
      const { request, resolve, reject } = this.executionQueue.shift()!;
      
      // Execute the live trade
      const order = await this.adapter.placeOrder(request);
      
      // Add to active orders
      this.activeOrders.set(order.id, order);
      
      // Store the order in the database
      await this.storeOrderInDB(order);
      
      // If it's a market order, we might get fill immediately
      if (order.status === 'filled') {
        await this.handleOrderFill(order);
      }
      
      this.emit('order_executed', order);
      this.logManager.info(`Order executed: ${order.id}`, order);
      
      resolve({
        success: true,
        order,
        warnings: [] // Include any warnings here if needed
      });
      
    } catch (error) {
      const item = this.executionQueue[0];
      this.logManager.error('Failed to execute order from queue', { 
        request: item?.request, 
        error 
      });
      
      if (item) {
        item.reject({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } finally {
      this.processingQueue = false;
      
      // Process next item if available
      if (this.executionQueue.length > 0) {
        setTimeout(() => this.processExecutionQueue(), 500); // Rate limiting
      }
    }
  }
  
  /**
   * Execute a paper trade (simulated execution)
   */
  private async executePaperTrade(orderRequest: OrderRequest): Promise<Order> {
    // Get current market price
    const ticker = await this.adapter.getTicker(orderRequest.symbol);
    
    // Determine execution price (with simulated slippage)
    const slippage = (this.config.riskParams.slippageTolerance / 100) * ticker.price;
    const executionPrice = orderRequest.side === 'buy' 
      ? ticker.price + (Math.random() * slippage)  // Simulated slippage for buys
      : ticker.price - (Math.random() * slippage); // Simulated slippage for sells
    
    // Create paper order
    const now = new Date();
    const paperOrder: Order = {
      id: `paper_${uuidv4().substring(0, 8)}`,
      clientOrderId: orderRequest.clientOrderId,
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      type: orderRequest.type,
      status: 'filled', // Paper trades are filled immediately
      price: orderRequest.price,
      avgPrice: executionPrice,
      quantity: orderRequest.quantity,
      filledQuantity: orderRequest.quantity,
      remainingQuantity: 0,
      createdAt: now,
      updatedAt: now,
      closePosition: orderRequest.closePosition,
      reduceOnly: orderRequest.reduceOnly,
      stopPrice: orderRequest.stopPrice,
      timeInForce: orderRequest.timeInForce,
    };
    
    // Update position tracker with paper trade
    await this.positionTracker.updatePosition(paperOrder);
    
    // Store the paper order in DB
    await this.storeOrderInDB(paperOrder, true);
    
    // Log the paper trade
    this.logManager.info(`Paper trade executed: ${paperOrder.id}`, { 
      paperOrder, 
      marketPrice: ticker.price 
    });
    
    return paperOrder;
  }
  
  /**
   * Subscribe to order updates for live trading
   */
  private async subscribeToOrderUpdates() {
    try {
      // First get all open orders
      const openOrders = await this.adapter.getOpenOrders();
      
      for (const order of openOrders) {
        this.activeOrders.set(order.id, order);
      }
      
      // Poll for updates every 10 seconds (as a fallback)
      setInterval(async () => {
        if (this.activeOrders.size === 0) return;
        
        try {
          for (const [orderId, order] of this.activeOrders.entries()) {
            const updatedOrder = await this.adapter.getOrder(orderId, order.symbol);
            
            if (updatedOrder.status !== order.status) {
              await this.handleOrderStatusChange(updatedOrder);
            }
          }
        } catch (error) {
          this.logManager.error('Error polling order updates', error);
        }
      }, 10000);
      
    } catch (error) {
      this.logManager.error('Failed to subscribe to order updates', error);
      throw error;
    }
  }
  
  /**
   * Handle order status changes
   */
  private async handleOrderStatusChange(order: Order) {
    this.logManager.info(`Order status changed: ${order.id} -> ${order.status}`, order);
    
    // Update our tracking
    this.activeOrders.set(order.id, order);
    
    // Update in database
    await this.updateOrderInDB(order);
    
    // Handle different statuses
    if (order.status === 'filled' || order.status === 'partially_filled') {
      await this.handleOrderFill(order);
    } else if (order.status === 'canceled' || order.status === 'rejected' || order.status === 'expired') {
      // Remove from active orders
      this.activeOrders.delete(order.id);
    }
    
    // Emit event
    this.emit('order_updated', order);
  }
  
  /**
   * Handle an order fill (complete or partial)
   */
  private async handleOrderFill(order: Order) {
    try {
      // Update positions
      await this.positionTracker.updatePosition(order);
      
      // Sync with DB
      await this.syncPositionsWithDB();
      
      // Check for completed order
      if (order.status === 'filled') {
        this.activeOrders.delete(order.id);
      }
      
      // Log the fill
      this.logManager.info(`Order filled: ${order.id}`, { 
        order, 
        filledQty: order.filledQuantity 
      });
      
      // Emit fill event
      this.emit('order_filled', order);
      
      // Check risk limits after fill
      await this.checkPositionRiskLimits();
      
    } catch (error) {
      this.logManager.error('Error handling order fill', { order, error });
    }
  }
  
  /**
   * Check if current positions exceed risk limits
   */
  private async checkPositionRiskLimits() {
    try {
      const positions = await this.positionTracker.getPositions();
      const riskBreaches = await this.riskManager.checkPositionLimits(positions);
      
      if (riskBreaches.length > 0) {
        this.logManager.warn('Risk limits breached', { riskBreaches });
        
        // Emit risk breach event
        this.emit('risk_breach', riskBreaches);
        
        // If emergency stop is enabled, pause the engine
        if (this.config.riskParams.emergencyStopEnabled) {
          await this.pause('Emergency stop due to risk breach');
          
          // If circuit breaker is enabled, try to close positions
          if (this.config.riskParams.circuitBreakerEnabled) {
            await this.triggerCircuitBreaker(riskBreaches);
          }
        }
      }
    } catch (error) {
      this.logManager.error('Error checking position risk limits', error);
    }
  }
  
  /**
   * Trigger circuit breaker to close positions
   */
  private async triggerCircuitBreaker(riskBreaches: any[]) {
    this.logManager.warn('Circuit breaker triggered', { riskBreaches });
    
    // Emit circuit breaker event
    this.emit('circuit_breaker', riskBreaches);
    
    try {
      // Get all open positions
      const positions = await this.positionTracker.getPositions();
      
      // Close positions that breached risk limits
      for (const position of positions) {
        if (position.quantity === 0) continue;
        
        const breachedPosition = riskBreaches.find(b => 
          b.position && b.position.symbol === position.symbol
        );
        
        if (breachedPosition) {
          // Create close order
          const closeOrder: OrderRequest = {
            symbol: position.symbol,
            side: position.side === 'long' ? 'sell' : 'buy',
            type: 'market', // Use market to ensure execution
            quantity: Math.abs(position.quantity),
            closePosition: true
          };
          
          // Execute emergency close
          if (this.config.executionMode === 'live') {
            await this.adapter.placeOrder(closeOrder);
          } else {
            await this.executePaperTrade(closeOrder);
          }
          
          this.logManager.warn('Emergency position closed by circuit breaker', { 
            position, 
            closeOrder 
          });
        }
      }
    } catch (error) {
      this.logManager.error('Circuit breaker failed to close positions', error);
    }
  }
  
  /**
   * Pause the trading engine
   */
  async pause(reason: string = 'User requested'): Promise<boolean> {
    if (this.status === 'running') {
      this.status = 'paused';
      this.logManager.info(`Trading engine paused: ${reason}`);
      this.emit('paused', { reason });
      return true;
    }
    return false;
  }
  
  /**
   * Resume the trading engine
   */
  async resume(): Promise<boolean> {
    if (this.status === 'paused') {
      this.status = 'running';
      this.logManager.info('Trading engine resumed');
      this.emit('resumed');
      return true;
    }
    return false;
  }
  
  /**
   * Shutdown the trading engine
   */
  async shutdown(): Promise<boolean> {
    try {
      // Cancel all open orders if in live mode
      if (this.config.executionMode === 'live' && this.activeOrders.size > 0) {
        this.logManager.info('Cancelling all open orders before shutdown');
        
        for (const [orderId, order] of this.activeOrders) {
          try {
            await this.adapter.cancelOrder(orderId, order.symbol);
            this.logManager.info(`Order cancelled: ${orderId}`);
          } catch (error) {
            this.logManager.error(`Failed to cancel order ${orderId}`, error);
          }
        }
      }
      
      // Final sync with DB
      await this.syncPositionsWithDB();
      
      this.status = 'shutdown';
      this.logManager.info('Trading engine shut down');
      this.emit('shutdown');
      return true;
    } catch (error) {
      this.logManager.error('Error during trading engine shutdown', error);
      return false;
    }
  }
  
  /**
   * Get the engine's current status
   */
  getStatus(): TradingEngineStatus {
    return this.status;
  }
  
  /**
   * Get account balance from the exchange
   */
  private async getAccountBalance(): Promise<Balance[]> {
    if (this.config.executionMode === 'paper') {
      return this.positionTracker.getPaperBalances();
    } else {
      return await this.adapter.getBalances();
    }
  }
  
  /**
   * Sync positions with the database
   */
  private async syncPositionsWithDB() {
    try {
      const positions = await this.positionTracker.getPositions();
      
      // Store in positions table
      await this.supabase.from('positions').upsert(
        positions.map(position => ({
          farm_id: this.config.farmId,
          strategy_id: this.config.strategyId,
          symbol: position.symbol,
          side: position.side,
          quantity: position.quantity,
          entry_price: position.entryPrice,
          current_price: position.markPrice,
          unrealized_pnl: position.unrealizedPnl,
          liquidation_price: position.liquidationPrice,
          leverage: position.leverage,
          updated_at: new Date().toISOString(),
          margin_type: position.marginType,
          is_paper: this.config.executionMode === 'paper'
        })),
        { onConflict: 'farm_id,strategy_id,symbol,is_paper' }
      );
      
    } catch (error) {
      this.logManager.error('Failed to sync positions with DB', error);
    }
  }
  
  /**
   * Store an order in the database
   */
  private async storeOrderInDB(order: Order, isPaper: boolean = false) {
    try {
      await this.supabase.from('orders').insert({
        id: order.id,
        farm_id: this.config.farmId,
        strategy_id: this.config.strategyId,
        agent_id: this.config.agentId,
        exchange_id: this.config.exchangeId, 
        client_order_id: order.clientOrderId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        status: order.status,
        quantity: order.quantity,
        price: order.price || null,
        stop_price: order.stopPrice || null,
        filled_quantity: order.filledQuantity,
        avg_price: order.avgPrice || null,
        is_paper: isPaper || this.config.executionMode === 'paper',
        created_at: order.createdAt.toISOString(),
        updated_at: order.updatedAt.toISOString(),
        close_position: order.closePosition || false,
        reduce_only: order.reduceOnly || false,
        time_in_force: order.timeInForce || 'GTC'
      });
    } catch (error) {
      this.logManager.error('Failed to store order in DB', { order, error });
    }
  }
  
  /**
   * Update an order in the database
   */
  private async updateOrderInDB(order: Order) {
    try {
      await this.supabase.from('orders').update({
        status: order.status,
        filled_quantity: order.filledQuantity,
        avg_price: order.avgPrice || null,
        updated_at: order.updatedAt.toISOString()
      }).eq('id', order.id);
    } catch (error) {
      this.logManager.error('Failed to update order in DB', { order, error });
    }
  }
}
