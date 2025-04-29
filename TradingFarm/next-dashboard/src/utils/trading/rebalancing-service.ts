/**
 * Rebalancing Trading Service
 * 
 * Handles the execution of rebalancing transactions on real exchanges.
 * Uses the exchange connectors to place actual orders on exchanges.
 */

import { createServerClient } from '@/utils/supabase/server';
import { ExchangeConnector } from '../exchanges/exchange-connector';
import { BinanceConnector } from '../exchanges/connectors/binance-connector';
import { OrderParams, OrderSide, OrderType, ExchangeConfig } from '../exchanges/exchange-types';
import { RebalancingTransaction } from '@/types/portfolio';

// Factory to create the appropriate exchange connector based on exchange name
const createExchangeConnector = (exchange: string, apiKey: string, apiSecret: string): ExchangeConnector | null => {
  try {
    switch (exchange.toLowerCase()) {
      case 'binance':
        return new BinanceConnector({
          exchange: 'binance',
          credentials: { apiKey, apiSecret },
          defaultOptions: { recvWindow: 60000 }
        } as ExchangeConfig);
      // Add more exchanges as they become supported
      default:
        console.error(`Unsupported exchange: ${exchange}`);
        return null;
    }
  } catch (error) {
    console.error(`Failed to create exchange connector for ${exchange}:`, error);
    return null;
  }
};

export interface ExecutionResult {
  success: boolean;
  transactionId: string;
  orderId?: string;
  message?: string;
  error?: any;
  executionPrice?: number;
  executionQuantity?: number;
  fee?: { cost: number; currency: string };
}

export class RebalancingService {
  /**
   * Execute a rebalancing transaction on an exchange
   */
  static async executeTransaction(
    transaction: RebalancingTransaction,
    apiKey: string,
    apiSecret: string
  ): Promise<ExecutionResult> {
    try {
      // Validate transaction
      if (!transaction.strategies?.exchange || !transaction.strategies?.market) {
        throw new Error('Invalid transaction: missing exchange or market information');
      }

      // Create exchange connector
      const connector = createExchangeConnector(
        transaction.strategies.exchange,
        apiKey,
        apiSecret
      );

      if (!connector) {
        throw new Error(`Failed to create connector for ${transaction.strategies.exchange}`);
      }

      // Connect to exchange
      const connected = await connector.connect();
      if (!connected) {
        throw new Error(`Failed to connect to ${transaction.exchange}`);
      }

      // Determine order side based on transaction action
      const side = transaction.action === 'buy' 
        ? OrderSide.BUY 
        : OrderSide.SELL;

      // Calculate quantity based on amount if not directly provided
      const estimatedPrice = 0; // In a real implementation, we'd get current market price
      const quantity = transaction.amount / estimatedPrice;

      // Create order parameters
      const orderParams: OrderParams = {
        symbol: transaction.strategies.market,
        type: OrderType.MARKET, // Using market orders for immediate execution
        side: side,
        amount: quantity, // Calculate quantity from amount
        price: estimatedPrice, // For market orders, price is used as estimate only
      };

      // Place the order
      const result = await connector.placeOrder(orderParams);

      // Return successful execution result
      return {
        success: true,
        transactionId: transaction.id,
        orderId: result.id,
        executionPrice: result.price,
        executionQuantity: result.filled,
        fee: result.fee,
      };
    } catch (error: any) {
      console.error(`Failed to execute transaction ${transaction.id}:`, error);
      
      // Return error result
      return {
        success: false,
        transactionId: transaction.id,
        message: error.message || 'Failed to execute transaction',
        error: error
      };
    }
  }

  /**
   * Update transaction status in the database
   */
  static async updateTransactionStatus(
    transactionId: string,
    status: 'completed' | 'failed',
    details: {
      orderId?: string;
      executionPrice?: number;
      executionQuantity?: number;
      error?: string;
      fee?: { cost: number; currency: string };
    }
  ): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      
      // Only update fields that exist in the database schema
      const updateData: any = {
        status: status,
        executed_at: new Date().toISOString(),
        error_message: details.error
      };
      
      // Add optional fields if they are provided
      if (details.orderId) updateData.order_id = details.orderId;
      if (details.executionPrice) updateData.execution_price = details.executionPrice;
      if (details.executionQuantity) updateData.execution_quantity = details.executionQuantity;
      
      const { error } = await supabase
        .from('rebalancing_transactions')
        .update(updateData)
        .eq('id', transactionId);

      if (error) {
        console.error(`Failed to update transaction ${transactionId}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Failed to update transaction ${transactionId}:`, error);
      return false;
    }
  }

  /**
   * Update portfolio allocation after successful transaction
   */
  static async updatePortfolioAllocation(
    portfolioId: string,
    strategyId: string,
    newAllocation: number
  ): Promise<boolean> {
    try {
      const supabase = await createServerClient();
      
      // First check if the allocation exists
      const { data } = await supabase
        .from('portfolio_allocations')
        .select('id')
        .eq('portfolio_id', portfolioId)
        .eq('strategy_id', strategyId)
        .single();
        
      if (data) {
        // Update existing allocation
        const { error } = await supabase
          .from('portfolio_allocations')
          .update({
            allocation_percentage: newAllocation,
            actual_percentage: newAllocation,
            drift: 0,
            updated_at: new Date().toISOString()
          })
          .eq('portfolio_id', portfolioId)
          .eq('strategy_id', strategyId);
  
        if (error) {
          console.error(`Failed to update portfolio allocation:`, error);
          return false;
        }
      } else {
        // Create new allocation
        const { error } = await supabase
          .from('portfolio_allocations')
          .insert({
            portfolio_id: portfolioId,
            strategy_id: strategyId,
            allocation_percentage: newAllocation,
            actual_percentage: newAllocation,
            drift: 0
          });
          
        if (error) {
          console.error(`Failed to create portfolio allocation:`, error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Failed to update portfolio allocation:`, error);
      return false;
    }
  }

  /**
   * Execute multiple rebalancing transactions
   */
  static async executeBatch(
    transactions: RebalancingTransaction[],
    exchangeCredentials: { exchange: string; apiKey: string; apiSecret: string }[]
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    // Group transactions by exchange to minimize connection overhead
    const transactionsByExchange = transactions.reduce((groups, tx) => {
      const exchange = tx.strategies?.exchange || 'unknown';
      if (!groups[exchange]) {
        groups[exchange] = [];
      }
      groups[exchange].push(tx);
      return groups;
    }, {} as Record<string, RebalancingTransaction[]>);

    // Process each exchange's transactions
    for (const [exchange, exchangeTxs] of Object.entries(transactionsByExchange)) {
      // Find credentials for this exchange
      const creds = exchangeCredentials.find(c => c.exchange.toLowerCase() === exchange.toLowerCase());
      
      if (!creds) {
        // Add failure results for all transactions of this exchange
        exchangeTxs.forEach(tx => {
          results.push({
            success: false,
            transactionId: tx.id || '',
            message: `No credentials found for exchange ${exchange}`
          });
        });
        continue;
      }

      // Execute each transaction for this exchange
      for (const tx of exchangeTxs) {
        const result = await this.executeTransaction(tx, creds.apiKey, creds.apiSecret);
        results.push(result);
        
        // Update the transaction status in the database
        if (result.success) {
          await this.updateTransactionStatus(tx.id, 'completed', {
            orderId: result.orderId,
            executionPrice: result.executionPrice,
            executionQuantity: result.executionQuantity,
            fee: result.fee
          });
          
          // If we have strategy and portfolio info, update the allocation
          if (tx.portfolio_id && tx.strategy_id && tx.new_allocation !== undefined) {
            await this.updatePortfolioAllocation(
              tx.portfolio_id,
              tx.strategy_id,
              tx.new_allocation
            );
          }
        } else {
          await this.updateTransactionStatus(tx.id, 'failed', {
            error: result.message
          });
        }
      }
    }

    return results;
  }
}
