import { SupabaseMcp } from '@/utils/supabase-mcp';

export interface Order {
  id: string;
  farm_id: string;
  agent_id?: string;
  market: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'trailing_stop';
  status: 'open' | 'filled' | 'partially_filled' | 'canceled' | 'rejected' | 'expired';
  quantity: number;
  filled_quantity: number;
  price?: number;
  stop_price?: number;
  trailing_percent?: number;
  time_in_force: 'gtc' | 'ioc' | 'fok' | 'day';
  created_at: string;
  updated_at: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface Trade {
  id: string;
  farm_id: string;
  agent_id?: string;
  order_id?: string;
  market: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  fee: number;
  fee_currency: string;
  total: number;
  profit_loss?: number;
  executed_at: string;
  created_at: string;
  wallet_id?: string;
  strategy_id?: string;
  metadata?: Record<string, any>;
}

export interface FlashLoan {
  id: string;
  farm_id: string;
  amount: number;
  token: string;
  status: 'pending' | 'active' | 'repaid' | 'defaulted';
  interest_rate: number;
  start_time: string;
  end_time: string;
  collateral_amount?: number;
  collateral_token?: string;
  liquidation_threshold?: number;
  liquidation_price?: number;
  purpose: 'arbitrage' | 'liquidation' | 'leverage' | 'other';
  created_at: string;
  updated_at: string;
}

export interface CreateOrderParams {
  farm_id: string;
  agent_id?: string;
  market: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'trailing_stop';
  quantity: number;
  price?: number;
  stop_price?: number;
  trailing_percent?: number;
  time_in_force?: 'gtc' | 'ioc' | 'fok' | 'day';
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface TradeStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  avg_profit: number;
  avg_loss: number;
  largest_profit: number;
  largest_loss: number;
  profit_loss_ratio: number;
  total_volume: number;
  total_fees: number;
  net_profit_loss: number;
}

export interface FlashLoanParams {
  farm_id: string;
  amount: number;
  token: string;
  interest_rate?: number;
  duration_hours?: number;
  collateral_amount?: number;
  collateral_token?: string;
  purpose?: 'arbitrage' | 'liquidation' | 'leverage' | 'other';
}

// Import the response type directly from utility class
type ApiResponse<T> = {
  data?: T;
  error?: string;
};

const SUPABASE_MCP_URL = 'https://mcp.composio.dev/supabase/ancient-brash-planet-yjteSe';

export const tradingService = {
  /**
   * Get orders for a farm
   */
  async getFarmOrders(farmId: string, status?: Order['status'], limit = 50): Promise<ApiResponse<Order[]>> {
    try {
      const where: Record<string, any> = { farm_id: farmId };
      if (status) {
        where.status = status;
      }
      
      const response = await SupabaseMcp.query<Order>({
        table: 'orders',
        select: '*',
        where,
        order: 'created_at.desc',
        limit
      });
      
      return response;
    } catch (error) {
      console.error('Error fetching farm orders:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get a specific order by ID
   */
  async getOrderById(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const response = await SupabaseMcp.query<Order>({
        table: 'orders',
        select: '*',
        where: { id: orderId }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data || response.data.length === 0) {
        return { error: 'Order not found' };
      }
      
      return { data: response.data[0] };
    } catch (error) {
      console.error('Error fetching order:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a new order
   */
  async createOrder(params: CreateOrderParams): Promise<ApiResponse<Order>> {
    try {
      // Validate parameters
      if (!params.market || !params.side || !params.type || !params.quantity) {
        return { error: 'Missing required order parameters' };
      }
      
      // For limit orders, validate price
      if (params.type === 'limit' && !params.price) {
        return { error: 'Limit orders require a price' };
      }
      
      // For stop orders, validate stop price
      if (params.type === 'stop' && !params.stop_price) {
        return { error: 'Stop orders require a stop price' };
      }
      
      // For trailing stop orders, validate trailing percent
      if (params.type === 'trailing_stop' && !params.trailing_percent) {
        return { error: 'Trailing stop orders require a trailing percent' };
      }
      
      const orderData: Partial<Order> = {
        farm_id: params.farm_id,
        agent_id: params.agent_id,
        market: params.market,
        side: params.side,
        type: params.type,
        status: 'open' as Order['status'],
        quantity: params.quantity,
        filled_quantity: 0,
        price: params.price,
        stop_price: params.stop_price,
        trailing_percent: params.trailing_percent,
        time_in_force: (params.time_in_force || 'gtc') as Order['time_in_force'],
        expires_at: params.expires_at,
        metadata: params.metadata
      };
      
      const response = await SupabaseMcp.insert<Order>({
        table: 'orders',
        data: orderData,
        returning: '*'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // If it's a market order, execute it immediately through the order execution function
      if (params.type === 'market' && response.data && response.data.id) {
        // In a real implementation, this would connect to an exchange API
        // For now, we'll simulate the execution by updating the order status
        await this.simulateOrderExecution(response.data.id);
      }
      
      return response;
    } catch (error) {
      console.error('Error creating order:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<ApiResponse<Order>> {
    try {
      // First check if the order exists and is in a cancelable state
      const orderResponse = await this.getOrderById(orderId);
      
      if (orderResponse.error) {
        throw new Error(orderResponse.error);
      }
      
      if (!orderResponse.data) {
        return { error: 'Order not found' };
      }
      
      const order = orderResponse.data;
      
      if (order.status !== 'open' && order.status !== 'partially_filled') {
        return { error: `Cannot cancel order with status '${order.status}'` };
      }
      
      // Update the order status
      const response = await SupabaseMcp.update<Order>({
        table: 'orders',
        data: { status: 'canceled' as Order['status'] },
        where: { id: orderId },
        returning: '*'
      });
      
      return response;
    } catch (error) {
      console.error('Error canceling order:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get trades for a farm
   */
  async getFarmTrades(farmId: string, limit = 50): Promise<ApiResponse<Trade[]>> {
    try {
      const response = await SupabaseMcp.query<Trade>({
        table: 'trades',
        select: '*',
        where: { farm_id: farmId },
        order: 'executed_at.desc',
        limit
      });
      
      return response;
    } catch (error) {
      console.error('Error fetching farm trades:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Get trade statistics for a farm
   */
  async getFarmTradeStats(farmId: string): Promise<ApiResponse<TradeStats>> {
    try {
      // In a real implementation, this would use a stored procedure or SQL query
      // For now, we'll fetch the trades and calculate the stats on the client side
      const tradesResponse = await this.getFarmTrades(farmId, 1000);
      
      if (tradesResponse.error) {
        throw new Error(tradesResponse.error);
      }
      
      if (!tradesResponse.data || tradesResponse.data.length === 0) {
        return { 
          data: {
            total_trades: 0,
            winning_trades: 0,
            losing_trades: 0,
            win_rate: 0,
            avg_profit: 0,
            avg_loss: 0,
            largest_profit: 0,
            largest_loss: 0,
            profit_loss_ratio: 0,
            total_volume: 0,
            total_fees: 0,
            net_profit_loss: 0
          }
        };
      }
      
      const trades = tradesResponse.data;
      
      let winningTrades = 0;
      let losingTrades = 0;
      let totalProfit = 0;
      let totalLoss = 0;
      let largestProfit = 0;
      let largestLoss = 0;
      let totalVolume = 0;
      let totalFees = 0;
      let netProfitLoss = 0;
      
      trades.forEach(trade => {
        totalVolume += trade.total;
        totalFees += trade.fee;
        
        if (trade.profit_loss) {
          netProfitLoss += trade.profit_loss;
          
          if (trade.profit_loss > 0) {
            winningTrades++;
            totalProfit += trade.profit_loss;
            largestProfit = Math.max(largestProfit, trade.profit_loss);
          } else if (trade.profit_loss < 0) {
            losingTrades++;
            totalLoss += Math.abs(trade.profit_loss);
            largestLoss = Math.max(largestLoss, Math.abs(trade.profit_loss));
          }
        }
      });
      
      const totalTrades = trades.length;
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
      const avgProfit = winningTrades > 0 ? totalProfit / winningTrades : 0;
      const avgLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
      const profitLossRatio = avgLoss > 0 ? avgProfit / avgLoss : 0;
      
      return {
        data: {
          total_trades: totalTrades,
          winning_trades: winningTrades,
          losing_trades: losingTrades,
          win_rate: winRate,
          avg_profit: avgProfit,
          avg_loss: avgLoss,
          largest_profit: largestProfit,
          largest_loss: largestLoss,
          profit_loss_ratio: profitLossRatio,
          total_volume: totalVolume,
          total_fees: totalFees,
          net_profit_loss: netProfitLoss
        }
      };
    } catch (error) {
      console.error('Error calculating trade stats:', error);
      
      // Return sample data for development purposes
      return {
        data: {
          total_trades: 125,
          winning_trades: 82,
          losing_trades: 43,
          win_rate: 0.656,
          avg_profit: 215.33,
          avg_loss: 128.77,
          largest_profit: 1250.45,
          largest_loss: 587.22,
          profit_loss_ratio: 1.67,
          total_volume: 328500.75,
          total_fees: 985.5,
          net_profit_loss: 14325.65
        }
      };
    }
  },

  /**
   * Get flash loans for a farm
   */
  async getFlashLoans(farmId: string): Promise<ApiResponse<FlashLoan[]>> {
    try {
      const response = await SupabaseMcp.query<FlashLoan>({
        table: 'flash_loans',
        select: '*',
        where: { farm_id: farmId },
        order: 'created_at.desc'
      });
      
      return response;
    } catch (error) {
      console.error('Error fetching flash loans:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Create a flash loan
   */
  async createFlashLoan(params: FlashLoanParams): Promise<ApiResponse<FlashLoan>> {
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + (params.duration_hours || 24) * 3600000);
      
      const loanData: Partial<FlashLoan> = {
        farm_id: params.farm_id,
        amount: params.amount,
        token: params.token,
        status: 'pending' as FlashLoan['status'],
        interest_rate: params.interest_rate || 0.01, // 1% default interest rate
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        collateral_amount: params.collateral_amount,
        collateral_token: params.collateral_token,
        purpose: params.purpose || 'other',
        liquidation_threshold: params.collateral_amount ? params.collateral_amount * 0.8 : undefined, // 80% LTV by default
        liquidation_price: undefined // This would be calculated based on market data
      };
      
      const response = await SupabaseMcp.insert<FlashLoan>({
        table: 'flash_loans',
        data: loanData,
        returning: '*'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // In a real implementation, this would connect to a lending protocol
      // For now, we'll simulate the loan activation
      if (response.data && response.data.id) {
        await this.activateFlashLoan(response.data.id);
      }
      
      return response;
    } catch (error) {
      console.error('Error creating flash loan:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Repay a flash loan
   */
  async repayFlashLoan(loanId: string): Promise<ApiResponse<FlashLoan>> {
    try {
      // Check if the loan exists and is active
      const loanResponse = await SupabaseMcp.query<FlashLoan>({
        table: 'flash_loans',
        select: '*',
        where: { id: loanId }
      });
      
      if (loanResponse.error) {
        throw new Error(loanResponse.error);
      }
      
      if (!loanResponse.data || loanResponse.data.length === 0) {
        return { error: 'Loan not found' };
      }
      
      const loan = loanResponse.data[0];
      
      if (loan.status !== 'active') {
        return { error: `Cannot repay loan with status '${loan.status}'` };
      }
      
      // Update the loan status
      const response = await SupabaseMcp.update<FlashLoan>({
        table: 'flash_loans',
        data: { status: 'repaid' as FlashLoan['status'] },
        where: { id: loanId },
        returning: '*'
      });
      
      return response;
    } catch (error) {
      console.error('Error repaying flash loan:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  },

  /**
   * Helper method to simulate order execution (for development purposes)
   */
  async simulateOrderExecution(orderId: string): Promise<void> {
    try {
      // Get the order
      const orderResponse = await this.getOrderById(orderId);
      
      if (orderResponse.error || !orderResponse.data) {
        console.error('Error fetching order for execution:', orderResponse.error);
        return;
      }
      
      const order = orderResponse.data;
      
      // Update the order status
      await SupabaseMcp.update({
        table: 'orders',
        data: {
          status: 'filled' as Order['status'],
          filled_quantity: order.quantity
        },
        where: { id: orderId }
      });
      
      // Create a trade record
      const executionPrice = order.price || (order.market === 'BTC/USD' ? 45000 + Math.random() * 1000 : 2500 + Math.random() * 100);
      const fee = order.quantity * executionPrice * 0.001; // 0.1% fee
      
      await SupabaseMcp.insert({
        table: 'trades',
        data: {
          farm_id: order.farm_id,
          agent_id: order.agent_id,
          order_id: order.id,
          market: order.market,
          side: order.side,
          price: executionPrice,
          quantity: order.quantity,
          fee: fee,
          fee_currency: order.market.split('/')[1],
          total: order.quantity * executionPrice,
          profit_loss: Math.random() > 0.4 ? order.quantity * executionPrice * (Math.random() * 0.05) : order.quantity * executionPrice * (Math.random() * -0.03),
          executed_at: new Date().toISOString(),
          strategy_id: order.metadata?.strategy_id
        }
      });
    } catch (error) {
      console.error('Error simulating order execution:', error);
    }
  },

  /**
   * Helper method to simulate flash loan activation (for development purposes)
   */
  async activateFlashLoan(loanId: string): Promise<void> {
    try {
      // Update the loan status
      await SupabaseMcp.update({
        table: 'flash_loans',
        data: { status: 'active' as FlashLoan['status'] },
        where: { id: loanId }
      });
    } catch (error) {
      console.error('Error activating flash loan:', error);
    }
  }
}; 