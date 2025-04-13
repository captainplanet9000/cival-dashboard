import { createServerClient } from '@/utils/supabase/server';
import { OrderType, OrderSide, OrderStatus, TimeInForce } from '@/types/trading';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

interface PaperTradingConfig {
  initialBalance: { [asset: string]: number };
  slippage: number; // Simulated slippage in percentage
  executionDelay: number; // Simulated delay in ms
  priceDataSource: 'real_time' | 'historical';
  enablePartialFills: boolean;
  simulateErrors: boolean;
  errorRate: number; // 0-100%
}

interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
}

interface PaperOrder {
  id: string;
  userId: string;
  agentId: string | null;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number | null;
  quantity: number;
  quoteQuantity: number | null;
  filledQuantity: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
  timeInForce: TimeInForce;
  clientOrderId: string | null;
}

interface PaperPosition {
  userId: string;
  agentId: string | null;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  updatedAt: number;
}

export class PaperTradingService {
  private supabase: SupabaseClient<Database>;
  private defaultConfig: PaperTradingConfig = {
    initialBalance: { USD: 10000, USDT: 10000 },
    slippage: 0.05,
    executionDelay: 500,
    priceDataSource: 'real_time',
    enablePartialFills: true,
    simulateErrors: false,
    errorRate: 5
  };

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
  }

  /**
   * Static factory method to create the service
   */
  public static async create(): Promise<PaperTradingService> {
    const supabase = await createServerClient();
    return new PaperTradingService(supabase);
  }

  /**
   * Initialize paper trading for a user
   */
  public async initializePaperTrading(
    userId: string,
    config?: Partial<PaperTradingConfig>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Merge default config with provided config
      const mergedConfig = {
        ...this.defaultConfig,
        ...config
      };

      // Check if user already has paper trading initialized
      const { data: existing } = await this.supabase
        .from('paper_trading_accounts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing config
        await this.supabase
          .from('paper_trading_accounts')
          .update({
            configuration: mergedConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new paper trading account
        await this.supabase
          .from('paper_trading_accounts')
          .insert({
            user_id: userId,
            configuration: mergedConfig,
            balances: mergedConfig.initialBalance,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error initializing paper trading:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new paper order
   */
  public async createOrder(
    userId: string,
    orderRequest: {
      agentId?: string;
      symbol: string;
      side: OrderSide;
      type: OrderType;
      price?: number;
      quantity?: number;
      quoteQuantity?: number;
      timeInForce?: TimeInForce;
      clientOrderId?: string;
    }
  ): Promise<{ success: boolean; order?: PaperOrder; error?: string }> {
    try {
      // Validate order request
      if (!orderRequest.symbol) {
        return { success: false, error: 'Symbol is required' };
      }

      if (!orderRequest.side) {
        return { success: false, error: 'Order side is required' };
      }

      if (!orderRequest.type) {
        return { success: false, error: 'Order type is required' };
      }

      if (orderRequest.type === 'LIMIT' && !orderRequest.price) {
        return { success: false, error: 'Price is required for LIMIT orders' };
      }

      if (!orderRequest.quantity && !orderRequest.quoteQuantity) {
        return { success: false, error: 'Either quantity or quoteQuantity is required' };
      }

      // Get current market data for the symbol
      const marketData = await this.getMarketData(orderRequest.symbol);
      if (!marketData) {
        return { success: false, error: `Could not get market data for ${orderRequest.symbol}` };
      }

      // Get user's paper trading configuration
      const { data: account } = await this.supabase
        .from('paper_trading_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!account) {
        return { success: false, error: 'Paper trading not initialized for this user' };
      }

      // Check if we should simulate an error
      if (account.configuration.simulateErrors) {
        const random = Math.random() * 100;
        if (random < account.configuration.errorRate) {
          return { 
            success: false, 
            error: `Simulated exchange error: ${this.getRandomExchangeError()}`
          };
        }
      }

      // Calculate order details
      const timestamp = Date.now();
      const orderId = uuidv4();
      
      // Determine execution price with slippage
      let executionPrice = marketData.price;
      if (orderRequest.side === 'BUY') {
        executionPrice *= (1 + account.configuration.slippage / 100);
      } else {
        executionPrice *= (1 - account.configuration.slippage / 100);
      }

      // Determine quantity
      let quantity = orderRequest.quantity || 0;
      if (orderRequest.quoteQuantity && !orderRequest.quantity) {
        quantity = orderRequest.quoteQuantity / executionPrice;
      }

      // Create order object
      const newOrder: PaperOrder = {
        id: orderId,
        userId,
        agentId: orderRequest.agentId || null,
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        type: orderRequest.type,
        price: orderRequest.price || null,
        quantity,
        quoteQuantity: orderRequest.quoteQuantity || null,
        filledQuantity: 0,
        status: 'NEW',
        createdAt: timestamp,
        updatedAt: timestamp,
        closedAt: null,
        timeInForce: orderRequest.timeInForce || 'GTC',
        clientOrderId: orderRequest.clientOrderId || null
      };

      // Save the order to the database
      await this.supabase
        .from('paper_trading_orders')
        .insert({
          id: newOrder.id,
          user_id: userId,
          agent_id: newOrder.agentId,
          symbol: newOrder.symbol,
          side: newOrder.side,
          type: newOrder.type,
          price: newOrder.price,
          quantity: newOrder.quantity,
          quote_quantity: newOrder.quoteQuantity,
          filled_quantity: newOrder.filledQuantity,
          status: newOrder.status,
          time_in_force: newOrder.timeInForce,
          client_order_id: newOrder.clientOrderId,
          created_at: new Date(newOrder.createdAt).toISOString(),
          updated_at: new Date(newOrder.updatedAt).toISOString()
        });

      // Process the order asynchronously
      setTimeout(() => {
        this.processOrder(userId, newOrder, account.configuration).catch(error => {
          console.error(`Error processing paper order ${newOrder.id}:`, error);
        });
      }, account.configuration.executionDelay);

      return { success: true, order: newOrder };
    } catch (error: any) {
      console.error('Error creating paper order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's paper trading account details
   */
  public async getAccount(userId: string): Promise<{ 
    account: any; 
    balances: { [asset: string]: number };
    positions: PaperPosition[];
    orders: PaperOrder[];
  } | { error: string }> {
    try {
      // Get account details
      const { data: account, error } = await this.supabase
        .from('paper_trading_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !account) {
        return { error: 'Paper trading account not found' };
      }

      // Get open positions
      const { data: positions } = await this.supabase
        .from('paper_trading_positions')
        .select('*')
        .eq('user_id', userId);

      // Get recent orders
      const { data: orders } = await this.supabase
        .from('paper_trading_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      return {
        account,
        balances: account.balances,
        positions: (positions || []).map(this.mapPositionFromDb),
        orders: (orders || []).map(this.mapOrderFromDb)
      };
    } catch (error: any) {
      console.error('Error fetching paper trading account:', error);
      return { error: error.message };
    }
  }

  /**
   * Process a paper order
   */
  private async processOrder(
    userId: string, 
    order: PaperOrder, 
    config: PaperTradingConfig
  ): Promise<void> {
    try {
      // Get latest market data
      const marketData = await this.getMarketData(order.symbol);
      if (!marketData) {
        await this.updateOrderStatus(order.id, 'REJECTED', 'Could not get market data');
        return;
      }

      // Determine if order should be filled based on type and price
      let shouldFill = false;
      let fillPrice = 0;

      if (order.type === 'MARKET') {
        shouldFill = true;
        fillPrice = order.side === 'BUY' ? marketData.ask : marketData.bid;
        
        // Apply simulated slippage
        fillPrice = order.side === 'BUY' 
          ? fillPrice * (1 + config.slippage / 100)
          : fillPrice * (1 - config.slippage / 100);
      } else if (order.type === 'LIMIT' && order.price) {
        if (order.side === 'BUY' && marketData.ask <= order.price) {
          shouldFill = true;
          fillPrice = order.price;
        } else if (order.side === 'SELL' && marketData.bid >= order.price) {
          shouldFill = true;
          fillPrice = order.price;
        }
      }

      if (!shouldFill) {
        // For GTC orders, keep them open
        if (order.timeInForce === 'GTC') {
          await this.updateOrderStatus(order.id, 'OPEN');
        } else {
          await this.updateOrderStatus(order.id, 'EXPIRED', 'Order expired without being filled');
        }
        return;
      }

      // Calculate fill quantity
      let fillQuantity = order.quantity;
      
      // Simulate partial fills if enabled
      if (config.enablePartialFills && Math.random() > 0.7) {
        fillQuantity = order.quantity * (0.5 + Math.random() * 0.5);
      }

      // Validate balance for BUY orders
      if (order.side === 'BUY') {
        const { data: account } = await this.supabase
          .from('paper_trading_accounts')
          .select('balances')
          .eq('user_id', userId)
          .single();

        if (!account) {
          await this.updateOrderStatus(order.id, 'REJECTED', 'Account not found');
          return;
        }

        const quoteAsset = order.symbol.split('/')[1] || 'USDT';
        const requiredBalance = fillQuantity * fillPrice;
        
        if (!account.balances[quoteAsset] || account.balances[quoteAsset] < requiredBalance) {
          await this.updateOrderStatus(order.id, 'REJECTED', 'Insufficient balance');
          return;
        }

        // Update balance
        const newBalance = {
          ...account.balances,
          [quoteAsset]: account.balances[quoteAsset] - requiredBalance
        };

        const baseAsset = order.symbol.split('/')[0];
        if (!newBalance[baseAsset]) {
          newBalance[baseAsset] = 0;
        }
        newBalance[baseAsset] += fillQuantity;

        await this.supabase
          .from('paper_trading_accounts')
          .update({
            balances: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else if (order.side === 'SELL') {
        // Check if user has enough of the asset to sell
        const { data: account } = await this.supabase
          .from('paper_trading_accounts')
          .select('balances')
          .eq('user_id', userId)
          .single();

        if (!account) {
          await this.updateOrderStatus(order.id, 'REJECTED', 'Account not found');
          return;
        }

        const baseAsset = order.symbol.split('/')[0];
        if (!account.balances[baseAsset] || account.balances[baseAsset] < fillQuantity) {
          await this.updateOrderStatus(order.id, 'REJECTED', 'Insufficient balance');
          return;
        }

        // Update balance
        const quoteAsset = order.symbol.split('/')[1] || 'USDT';
        const newBalance = {
          ...account.balances,
          [baseAsset]: account.balances[baseAsset] - fillQuantity
        };

        if (!newBalance[quoteAsset]) {
          newBalance[quoteAsset] = 0;
        }
        newBalance[quoteAsset] += fillQuantity * fillPrice;

        await this.supabase
          .from('paper_trading_accounts')
          .update({
            balances: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }

      // Update order status
      const status = Math.abs(fillQuantity - order.quantity) < 0.000001 ? 'FILLED' : 'PARTIALLY_FILLED';
      await this.updateOrderStatus(
        order.id, 
        status, 
        undefined, 
        fillQuantity,
        status === 'FILLED' ? Date.now() : undefined
      );

      // Update or create position
      await this.updatePosition(userId, order.agentId, order.symbol, order.side, fillQuantity, fillPrice);

      // Create trade record
      await this.supabase
        .from('paper_trading_trades')
        .insert({
          order_id: order.id,
          user_id: userId,
          agent_id: order.agentId,
          symbol: order.symbol,
          side: order.side,
          price: fillPrice,
          quantity: fillQuantity,
          quote_quantity: fillQuantity * fillPrice,
          fee: 0, // No fees in paper trading, but could be simulated
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error(`Error processing paper order ${order.id}:`, error);
      await this.updateOrderStatus(order.id, 'REJECTED', `Processing error: ${error}`);
    }
  }

  /**
   * Update order status
   */
  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    reason?: string,
    filledQuantity?: number,
    closedAt?: number
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (reason) {
      updates.reason = reason;
    }

    if (filledQuantity !== undefined) {
      updates.filled_quantity = filledQuantity;
    }

    if (closedAt) {
      updates.closed_at = new Date(closedAt).toISOString();
    }

    await this.supabase
      .from('paper_trading_orders')
      .update(updates)
      .eq('id', orderId);
  }

  /**
   * Update position
   */
  private async updatePosition(
    userId: string,
    agentId: string | null,
    symbol: string,
    side: OrderSide,
    quantity: number,
    price: number
  ): Promise<void> {
    try {
      // Get current position if it exists
      const { data: existingPosition } = await this.supabase
        .from('paper_trading_positions')
        .select('*')
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .eq('agent_id', agentId || '')
        .maybeSingle();

      if (existingPosition) {
        // Update existing position
        let newQuantity = existingPosition.quantity;
        let newEntryPrice = existingPosition.entry_price;
        let newRealizedPnl = existingPosition.realized_pnl || 0;

        if (side === 'BUY') {
          // Increase position
          const positionCost = existingPosition.quantity * existingPosition.entry_price;
          const newCost = quantity * price;
          const totalCost = positionCost + newCost;
          const totalQuantity = existingPosition.quantity + quantity;
          
          newQuantity = totalQuantity;
          newEntryPrice = totalCost / totalQuantity;
        } else {
          // Decrease position or flip
          if (quantity < existingPosition.quantity) {
            // Partial sell - calculate realized P&L
            const realizedPnl = (price - existingPosition.entry_price) * quantity;
            newRealizedPnl += realizedPnl;
            newQuantity = existingPosition.quantity - quantity;
          } else if (quantity === existingPosition.quantity) {
            // Full sell - calculate realized P&L
            const realizedPnl = (price - existingPosition.entry_price) * quantity;
            newRealizedPnl += realizedPnl;
            newQuantity = 0;
          } else {
            // Selling more than current position (short)
            const realizedPnl = (price - existingPosition.entry_price) * existingPosition.quantity;
            newRealizedPnl += realizedPnl;
            newQuantity = -(quantity - existingPosition.quantity);
            newEntryPrice = price;
          }
        }

        if (Math.abs(newQuantity) < 0.000001) {
          // Close position if quantity is effectively zero
          await this.supabase
            .from('paper_trading_positions')
            .delete()
            .eq('id', existingPosition.id);
        } else {
          // Update position
          await this.supabase
            .from('paper_trading_positions')
            .update({
              quantity: newQuantity,
              entry_price: newEntryPrice,
              current_price: price,
              unrealized_pnl: newQuantity * (price - newEntryPrice),
              realized_pnl: newRealizedPnl,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPosition.id);
        }
      } else if (quantity > 0) {
        // Create new position
        await this.supabase
          .from('paper_trading_positions')
          .insert({
            user_id: userId,
            agent_id: agentId,
            symbol,
            quantity: side === 'BUY' ? quantity : -quantity,
            entry_price: price,
            current_price: price,
            unrealized_pnl: 0,
            realized_pnl: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error(`Error updating position for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get market data for a symbol
   */
  private async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      // In a real implementation, this would fetch from a price feed service
      // For now, use a mock implementation
      const price = this.getMockPrice(symbol);
      
      return {
        symbol,
        price,
        bid: price * 0.999,
        ask: price * 1.001,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error getting market data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get a mock price for a symbol
   */
  private getMockPrice(symbol: string): number {
    // These would be replaced with actual price feeds in production
    const mockPrices: Record<string, number> = {
      'BTC/USDT': 50000 + (Math.random() * 1000 - 500),
      'ETH/USDT': 2000 + (Math.random() * 100 - 50),
      'SOL/USDT': 100 + (Math.random() * 10 - 5),
      'XRP/USDT': 0.5 + (Math.random() * 0.05 - 0.025),
      'BNB/USDT': 300 + (Math.random() * 20 - 10),
      'ADA/USDT': 0.4 + (Math.random() * 0.04 - 0.02),
      'DOGE/USDT': 0.1 + (Math.random() * 0.01 - 0.005)
    };

    return mockPrices[symbol] || 100; // Default price for unknown symbols
  }

  /**
   * Map DB order to PaperOrder
   */
  private mapOrderFromDb(dbOrder: any): PaperOrder {
    return {
      id: dbOrder.id,
      userId: dbOrder.user_id,
      agentId: dbOrder.agent_id,
      symbol: dbOrder.symbol,
      side: dbOrder.side,
      type: dbOrder.type,
      price: dbOrder.price,
      quantity: dbOrder.quantity,
      quoteQuantity: dbOrder.quote_quantity,
      filledQuantity: dbOrder.filled_quantity,
      status: dbOrder.status,
      createdAt: new Date(dbOrder.created_at).getTime(),
      updatedAt: new Date(dbOrder.updated_at).getTime(),
      closedAt: dbOrder.closed_at ? new Date(dbOrder.closed_at).getTime() : null,
      timeInForce: dbOrder.time_in_force,
      clientOrderId: dbOrder.client_order_id
    };
  }

  /**
   * Map DB position to PaperPosition
   */
  private mapPositionFromDb(dbPosition: any): PaperPosition {
    return {
      userId: dbPosition.user_id,
      agentId: dbPosition.agent_id,
      symbol: dbPosition.symbol,
      quantity: dbPosition.quantity,
      entryPrice: dbPosition.entry_price,
      currentPrice: dbPosition.current_price,
      unrealizedPnl: dbPosition.unrealized_pnl,
      realizedPnl: dbPosition.realized_pnl,
      updatedAt: new Date(dbPosition.updated_at).getTime()
    };
  }

  /**
   * Get a random exchange error message for simulation
   */
  private getRandomExchangeError(): string {
    const errors = [
      'INSUFFICIENT_FUNDS',
      'MARKET_CLOSED',
      'PRICE_OUTSIDE_ALLOWED_RANGE',
      'RATE_LIMIT_EXCEEDED',
      'TIMEOUT',
      'NETWORK_ERROR',
      'INVALID_PARAMETER',
      'UNKNOWN_ORDER_ID',
      'SYSTEM_OVERLOADED'
    ];

    return errors[Math.floor(Math.random() * errors.length)];
  }
}
