/**
 * Position Management System
 * 
 * Handles tracking and management of trading positions across multiple exchanges.
 * Provides functionality for position monitoring, risk assessment, and management.
 */

import { createServerClient } from '@/utils/supabase/server';
import { ExchangeConnector } from '../exchanges/exchange-connector';
import { BinanceConnector } from '../exchanges/connectors/binance-connector';
import { Order, OrderSide, OrderType } from '../exchanges/exchange-types';

// Position interface to track holdings
export interface Position {
  id?: string;
  portfolioId: string;
  strategyId: string;
  exchange: string;
  symbol: string;
  assetType: 'spot' | 'futures' | 'margin';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  valueInUSD: number;
  lastUpdated: string;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number; // For margin/futures positions
  liquidationPrice?: number; // For margin/futures positions
  openOrders?: Order[];
}

// Risk metrics for positions and portfolios
export interface RiskMetrics {
  totalExposure: number; // Total position value
  maxDrawdown: number; // Maximum historical drawdown
  dailyVolatility: number;
  sharpeRatio: number;
  valueatRisk: number; // 95% VaR
  largestPosition: {
    symbol: string;
    percentage: number;
  };
  exposurePerExchange: Record<string, number>;
  exposurePerAsset: Record<string, number>;
}

export class PositionManager {
  /**
   * Get all positions for a portfolio
   */
  static async getPositions(portfolioId: string): Promise<Position[]> {
    try {
      const supabase = await createServerClient();
      
      // Get positions from database
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('portfolio_id', portfolioId);
        
      if (error) {
        console.error('Error fetching positions:', error);
        return [];
      }
      
      return data.map(position => ({
        id: position.id,
        portfolioId: position.portfolio_id,
        strategyId: position.strategy_id,
        exchange: position.exchange,
        symbol: position.symbol,
        assetType: position.asset_type,
        quantity: position.quantity,
        entryPrice: position.entry_price,
        currentPrice: position.current_price,
        unrealizedPnl: position.unrealized_pnl,
        unrealizedPnlPercent: position.unrealized_pnl_percent,
        valueInUSD: position.value_usd,
        lastUpdated: position.last_updated,
        stopLoss: position.stop_loss,
        takeProfit: position.take_profit,
        leverage: position.leverage,
        liquidationPrice: position.liquidation_price,
      }));
    } catch (error) {
      console.error('Failed to get positions:', error);
      return [];
    }
  }

  /**
   * Update position with current market price and metrics
   */
  static async updatePositionMetrics(position: Position): Promise<Position> {
    try {
      // Create exchange connector to get current price
      const connector = this.createExchangeConnector(position.exchange);
      if (!connector) {
        throw new Error(`Unsupported exchange: ${position.exchange}`);
      }
      
      await connector.connect();
      
      // Get current market price
      const marketData = await connector.getMarketData(position.symbol);
      if (!marketData) {
        throw new Error(`Failed to get market data for ${position.symbol}`);
      }
      
      // Calculate position metrics
      const currentPrice = marketData.last || marketData.close;
      const entryValue = position.quantity * position.entryPrice;
      const currentValue = position.quantity * currentPrice;
      const unrealizedPnl = currentValue - entryValue;
      const unrealizedPnlPercent = (unrealizedPnl / entryValue) * 100;
      
      // Update position with new metrics
      const updatedPosition = {
        ...position,
        currentPrice,
        unrealizedPnl,
        unrealizedPnlPercent,
        valueInUSD: currentValue,
        lastUpdated: new Date().toISOString()
      };
      
      // Update position in database
      if (position.id) {
        const supabase = await createServerClient();
        await supabase
          .from('positions')
          .update({
            current_price: currentPrice,
            unrealized_pnl: unrealizedPnl,
            unrealized_pnl_percent: unrealizedPnlPercent,
            value_usd: currentValue,
            last_updated: new Date().toISOString()
          })
          .eq('id', position.id);
      }
      
      return updatedPosition;
    } catch (error) {
      console.error(`Failed to update position metrics for ${position.symbol}:`, error);
      return position;
    }
  }

  /**
   * Calculate risk metrics for a set of positions
   */
  static calculateRiskMetrics(positions: Position[]): RiskMetrics {
    // Calculate total exposure
    const totalExposure = positions.reduce((sum, pos) => sum + pos.valueInUSD, 0);
    
    // Calculate exposure per exchange
    const exposurePerExchange = positions.reduce((result, pos) => {
      const exchange = pos.exchange;
      result[exchange] = (result[exchange] || 0) + pos.valueInUSD;
      return result;
    }, {} as Record<string, number>);
    
    // Calculate exposure per asset
    const exposurePerAsset = positions.reduce((result, pos) => {
      // Extract base asset from symbol (e.g., BTC from BTC/USDT)
      const baseAsset = pos.symbol.split('/')[0];
      result[baseAsset] = (result[baseAsset] || 0) + pos.valueInUSD;
      return result;
    }, {} as Record<string, number>);
    
    // Find largest position
    let largestPosition = { symbol: '', percentage: 0 };
    if (totalExposure > 0) {
      for (const pos of positions) {
        const percentage = (pos.valueInUSD / totalExposure) * 100;
        if (percentage > largestPosition.percentage) {
          largestPosition = { symbol: pos.symbol, percentage };
        }
      }
    }
    
    // For simplicity, using placeholders for some advanced metrics
    // In a production system, these would be calculated from historical data
    return {
      totalExposure,
      maxDrawdown: 0, // Requires historical data
      dailyVolatility: 0, // Requires historical data
      sharpeRatio: 0, // Requires historical data
      valueatRisk: totalExposure * 0.05, // Simplified 5% VaR estimate
      largestPosition,
      exposurePerExchange,
      exposurePerAsset
    };
  }

  /**
   * Apply a stop-loss order to a position
   */
  static async applyStopLoss(
    position: Position,
    percentage: number,
    apiKey: string,
    apiSecret: string
  ): Promise<boolean> {
    try {
      // Calculate stop loss price
      const stopLossPrice = position.entryPrice * (1 - percentage / 100);
      
      // Create exchange connector
      const connector = this.createExchangeConnector(position.exchange, apiKey, apiSecret);
      if (!connector) {
        throw new Error(`Unsupported exchange: ${position.exchange}`);
      }
      
      await connector.connect();
      
      // Place stop loss order
      const order = await connector.placeOrder({
        symbol: position.symbol,
        type: OrderType.STOP_LOSS,
        side: OrderSide.SELL,
        amount: position.quantity,
        price: stopLossPrice,
        params: {
          stopPrice: stopLossPrice
        }
      });
      
      if (!order) {
        throw new Error('Failed to place stop loss order');
      }
      
      // Update position in database
      if (position.id) {
        const supabase = await createServerClient();
        await supabase
          .from('positions')
          .update({
            stop_loss: stopLossPrice
          })
          .eq('id', position.id);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to apply stop loss for ${position.symbol}:`, error);
      return false;
    }
  }

  /**
   * Apply a take-profit order to a position
   */
  static async applyTakeProfit(
    position: Position,
    percentage: number,
    apiKey: string,
    apiSecret: string
  ): Promise<boolean> {
    try {
      // Calculate take profit price
      const takeProfitPrice = position.entryPrice * (1 + percentage / 100);
      
      // Create exchange connector
      const connector = this.createExchangeConnector(position.exchange, apiKey, apiSecret);
      if (!connector) {
        throw new Error(`Unsupported exchange: ${position.exchange}`);
      }
      
      await connector.connect();
      
      // Place take profit order
      const order = await connector.placeOrder({
        symbol: position.symbol,
        type: OrderType.TAKE_PROFIT,
        side: OrderSide.SELL,
        amount: position.quantity,
        price: takeProfitPrice,
        params: {
          stopPrice: takeProfitPrice
        }
      });
      
      if (!order) {
        throw new Error('Failed to place take profit order');
      }
      
      // Update position in database
      if (position.id) {
        const supabase = await createServerClient();
        await supabase
          .from('positions')
          .update({
            take_profit: takeProfitPrice
          })
          .eq('id', position.id);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to apply take profit for ${position.symbol}:`, error);
      return false;
    }
  }

  /**
   * Create exchange connector for a specific exchange
   */
  private static createExchangeConnector(
    exchange: string,
    apiKey?: string,
    apiSecret?: string
  ): ExchangeConnector | null {
    try {
      const credentials = apiKey && apiSecret 
        ? { apiKey, apiSecret } 
        : { apiKey: '', apiSecret: '' };
        
      switch (exchange.toLowerCase()) {
        case 'binance':
          return new BinanceConnector({
            exchange: 'binance',
            credentials,
            defaultOptions: { recvWindow: 60000 }
          });
        // Add more exchanges as they become supported
        default:
          console.error(`Unsupported exchange: ${exchange}`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to create exchange connector for ${exchange}:`, error);
      return null;
    }
  }
}
