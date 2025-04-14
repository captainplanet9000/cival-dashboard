import { TradingSystem, OrderParams, TradeParams, PositionUpdateParams, RiskCheckParams } from '../supabase/trading-system';
import { elizaOSMessagingAdapter } from './messaging-adapter';

/**
 * ElizaOS Trading Adapter
 * 
 * This adapter connects ElizaOS agents with the Trading Farm trading system.
 * It allows agents to execute trading operations and receive market data.
 */
export class ElizaOSTradingAdapter {
  /**
   * Sends a trading command from an agent to the trading system
   */
  static async executeTradeCommand(
    agentId: string,
    farmId: string,
    command: {
      action: 'buy' | 'sell' | 'cancel' | 'query',
      symbol: string,
      quantity?: number,
      price?: number,
      orderType?: string,
      exchangeId?: string,
      orderId?: string,
      metadata?: Record<string, any>
    }
  ): Promise<{
    success: boolean,
    message: string,
    data?: any,
    error?: string
  }> {
    try {
      // Validate command
      if (!command.action) {
        return { 
          success: false, 
          message: 'Missing required action parameter',
          error: 'INVALID_COMMAND'
        };
      }

      if (!command.symbol && command.action !== 'cancel' && command.action !== 'query') {
        return { 
          success: false, 
          message: 'Missing required symbol parameter',
          error: 'INVALID_COMMAND'
        };
      }

      // Get exchange connection if not specified
      let exchangeConnectionId = command.exchangeId;
      if (!exchangeConnectionId) {
        const connections = await TradingSystem.getExchangeConnections(farmId);
        if (!connections || connections.length === 0) {
          return {
            success: false,
            message: 'No exchange connections available',
            error: 'NO_EXCHANGE_CONNECTION'
          };
        }
        exchangeConnectionId = connections[0].id;
      }

      // Execute different actions based on command
      switch (command.action) {
        case 'buy':
        case 'sell':
          if (!command.quantity) {
            return {
              success: false,
              message: 'Missing required quantity parameter',
              error: 'INVALID_COMMAND'
            };
          }

          // Perform risk check
          const riskCheckParams: RiskCheckParams = {
            farmId: farmId,
            symbol: command.symbol,
            side: command.action,
            quantity: command.quantity,
            price: command.price || 0, // Will be updated with market price if not provided
          };

          const riskCheck = await TradingSystem.performRiskCheck(riskCheckParams);
          
          if (!riskCheck.passed) {
            // Send risk check failure notification message back to the agent
            await elizaOSMessagingAdapter.sendMessage(
              'system',
              agentId,
              {
                type: 'trading_risk_alert',
                content: `Risk check failed: ${riskCheck.errors.join(', ')}`,
                data: riskCheck.details
              }
            );

            return {
              success: false,
              message: `Risk check failed: ${riskCheck.errors.join(', ')}`,
              data: riskCheck.details,
              error: 'RISK_CHECK_FAILED'
            };
          }

          // Create order
          const orderParams: OrderParams = {
            farmId: farmId,
            exchangeConnectionId: exchangeConnectionId,
            agentId: agentId,
            symbol: command.symbol,
            orderType: (command.orderType as any) || 'market',
            side: command.action,
            quantity: command.quantity,
            price: command.price,
            additionalParams: command.metadata
          };

          const order = await TradingSystem.createOrder(orderParams);

          // Return successful response
          return {
            success: true,
            message: `${command.action.toUpperCase()} order created successfully`,
            data: { orderId: order.id, order }
          };

        case 'cancel':
          if (!command.orderId) {
            return {
              success: false,
              message: 'Missing required orderId parameter for cancel operation',
              error: 'INVALID_COMMAND'
            };
          }

          // Cancel order implementation would go here
          // This would involve calling an exchange API
          
          return {
            success: true,
            message: 'Order cancellation requested',
            data: { orderId: command.orderId }
          };

        case 'query':
          // Query can be for orders, positions, or market data
          if (command.orderId) {
            // Query specific order
            // Implementation would go here
            return {
              success: true,
              message: 'Order query executed',
              data: { /* order data */ }
            };
          } else if (command.symbol) {
            // Query positions for symbol
            const positions = await TradingSystem.getPositions(farmId, {
              symbol: command.symbol
            });

            return {
              success: true,
              message: 'Position query executed',
              data: { positions }
            };
          } else {
            // Query all open positions
            const positions = await TradingSystem.getPositions(farmId, {
              status: 'open'
            });

            return {
              success: true,
              message: 'Positions query executed',
              data: { positions }
            };
          }

        default:
          return {
            success: false,
            message: `Unknown action: ${command.action}`,
            error: 'INVALID_ACTION'
          };
      }
    } catch (error) {
      console.error('Error executing trade command:', error);
      return {
        success: false,
        message: `Error executing trade command: ${error.message}`,
        error: 'EXECUTION_ERROR'
      };
    }
  }

  /**
   * Process market data and send relevant updates to agents
   */
  static async processMarketData(
    farmId: string, 
    data: {
      symbol: string,
      price: number,
      bid?: number,
      ask?: number,
      volume?: number,
      timestamp: Date
    }
  ) {
    try {
      // Find agents subscribed to this market data
      // This would need to be implemented based on your agent subscription system
      
      // Update positions with current prices
      const positions = await TradingSystem.getPositions(farmId, {
        symbol: data.symbol,
        status: 'open'
      });

      for (const position of positions) {
        // Calculate unrealized PNL
        const entryPrice = position.entry_price;
        const quantity = position.quantity;
        const currentPrice = data.price;
        
        let unrealizedPnl = 0;
        if (position.side === 'long') {
          unrealizedPnl = quantity * (currentPrice - entryPrice);
        } else {
          unrealizedPnl = quantity * (entryPrice - currentPrice);
        }

        // Update position
        await TradingSystem.updatePosition({
          id: position.id,
          farmId: position.farm_id,
          exchangeConnectionId: position.exchange_connection_id,
          strategyId: position.strategy_id,
          symbol: position.symbol,
          side: position.side,
          quantity: position.quantity,
          entryPrice: position.entry_price,
          currentPrice: currentPrice,
          unrealizedPnl: unrealizedPnl
        });

        // Check if any risk thresholds have been crossed
        // This would be implemented based on your risk management requirements
      }

      return {
        success: true,
        message: 'Market data processed',
        data: { updatedPositions: positions.length }
      };
    } catch (error) {
      console.error('Error processing market data:', error);
      return {
        success: false,
        message: `Error processing market data: ${error.message}`,
        error: 'PROCESSING_ERROR'
      };
    }
  }

  /**
   * Process trade execution and update positions
   */
  static async processTrade(
    farmId: string,
    tradeData: TradeParams
  ) {
    try {
      // Record the trade
      const trade = await TradingSystem.recordTrade(tradeData);

      // Update position based on trade
      const positionSide = tradeData.side === 'buy' ? 'long' : 'short';
      
      await TradingSystem.updatePosition({
        farmId: farmId,
        exchangeConnectionId: tradeData.exchangeConnectionId,
        symbol: tradeData.symbol,
        side: positionSide,
        quantity: tradeData.quantity,
        entryPrice: tradeData.price,
        currentPrice: tradeData.price,
        realizedPnl: tradeData.realizedPnl,
        isPaperTrading: tradeData.isPaperTrading
      });

      // Notify relevant agents about the trade
      if (tradeData.orderId) {
        // Find the order to get the agent ID
        const orders = await TradingSystem.getOrders(farmId, { 
          orderId: tradeData.orderId 
        });

        if (orders && orders.length > 0) {
          const order = orders[0];
          if (order.agent_id) {
            await elizaOSMessagingAdapter.sendMessage(
              'system',
              order.agent_id,
              {
                type: 'trade_execution',
                content: `Trade executed: ${tradeData.side} ${tradeData.quantity} ${tradeData.symbol} @ ${tradeData.price}`,
                data: trade
              }
            );
          }
        }
      }

      return {
        success: true,
        message: 'Trade processed successfully',
        data: { trade }
      };
    } catch (error) {
      console.error('Error processing trade:', error);
      return {
        success: false,
        message: `Error processing trade: ${error.message}`,
        error: 'PROCESSING_ERROR'
      };
    }
  }
}
