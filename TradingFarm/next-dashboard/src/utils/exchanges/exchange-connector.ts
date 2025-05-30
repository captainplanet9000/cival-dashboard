/**
 * Exchange Connector Interface
 * 
 * Defines the standard interface that all exchange connectors must implement.
 * This ensures consistent interaction with different exchanges throughout the application.
 */

import { ExchangeId } from '../websocket/websocket-types';
import { 
  OrderType, 
  OrderSide, 
  TimeInForce, 
  MarketData, 
  OrderParams,
  OrderResult,
  AccountInfo,
  Balance, 
  OrderStatus,
  MarketSymbol,
  ExchangeCapabilities
} from './exchange-types';

export interface ExchangeConnector {
  /**
   * The unique ID of the exchange
   */
  readonly exchangeId: ExchangeId;
  
  /**
   * User-friendly name of the exchange
   */
  readonly name: string;

  /**
   * Connect to the exchange API with credentials
   * @returns True if connection is successful
   */
  connect(): Promise<boolean>;
  
  /**
   * Test API key permissions and connection status
   * @returns Object containing API key permissions and status
   */
  testConnection(): Promise<{
    success: boolean;
    hasTrading: boolean;
    hasMargin: boolean;
    hasFutures: boolean;
    hasWithdraw: boolean;
    message?: string;
  }>;
  
  /**
   * Get current market data for a symbol
   * @param symbol The trading pair to get data for (e.g., "BTC/USDT")
   */
  getMarketData(symbol: string): Promise<MarketData>;
  
  /**
   * Get multiple market data at once
   * @param symbols Array of trading pairs
   */
  getMultipleMarketData(symbols: string[]): Promise<Map<string, MarketData>>;
  
  /**
   * Place an order on the exchange
   * @param params Order parameters
   */
  placeOrder(params: OrderParams): Promise<OrderResult>;
  
  /**
   * Cancel an existing order
   * @param orderId ID of the order to cancel
   * @param symbol Trading pair of the order
   */
  cancelOrder(orderId: string, symbol: string): Promise<boolean>;
  
  /**
   * Get status of an existing order
   * @param orderId ID of the order
   * @param symbol Trading pair of the order
   */
  getOrderStatus(orderId: string, symbol: string): Promise<OrderStatus>;
  
  /**
   * Get all open orders
   * @param symbol Optional trading pair to filter orders
   */
  getOpenOrders(symbol?: string): Promise<OrderStatus[]>;
  
  /**
   * Get historical orders
   * @param symbol Trading pair
   * @param limit Maximum number of orders to return
   * @param since Timestamp to get orders from
   */
  getOrderHistory(symbol?: string, limit?: number, since?: number): Promise<OrderStatus[]>;
  
  /**
   * Get account information including balances
   */
  getAccountInfo(): Promise<AccountInfo>;
  
  /**
   * Get balances for specific currencies
   * @param currencies Array of currency codes
   */
  getBalances(currencies?: string[]): Promise<Map<string, Balance>>;
  
  /**
   * Get available trading pairs from the exchange
   */
  getAvailableSymbols(): Promise<MarketSymbol[]>;
  
  /**
   * Get exchange capabilities and limitations
   */
  getExchangeCapabilities(): ExchangeCapabilities;
  
  /**
   * Calculate trading fees
   * @param symbol Trading pair
   * @param side Buy or sell
   * @param amount Amount to trade
   * @param price Price to trade at
   */
  calculateFees(symbol: string, side: OrderSide, amount: number, price: number): Promise<{
    percentage: number;
    cost: number;
    currency: string;
  }>;
}
