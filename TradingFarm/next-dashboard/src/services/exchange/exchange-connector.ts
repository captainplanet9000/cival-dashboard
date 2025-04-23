/**
 * Exchange Connector Interface for Trading Farm
 * 
 * This module defines the standard interface that all exchange connectors must implement
 * to provide a consistent API for the trading system.
 */

import { MarketData, Order, OrderParams, OrderResult, AccountInfo, ExchangeCredentials } from '@/types/exchange';

/**
 * Interface defining the required methods for exchange connectivity
 */
export interface IExchangeConnector {
  /**
   * Unique identifier for the exchange
   */
  readonly exchangeId: string;
  
  /**
   * Human-readable name of the exchange
   */
  readonly name: string;
  
  /**
   * Whether this connector represents a testnet connection
   */
  readonly isTestnet: boolean;
  
  /**
   * Connect to the exchange using provided credentials
   * @param credentials Credentials for the exchange API
   * @returns Promise resolving to a boolean indicating success
   */
  connect(credentials: ExchangeCredentials): Promise<boolean>;
  
  /**
   * Disconnect from the exchange
   * @returns Promise resolving to a boolean indicating success
   */
  disconnect(): Promise<boolean>;
  
  /**
   * Check if currently connected to the exchange
   * @returns Boolean indicating connection status
   */
  isConnected(): boolean;
  
  /**
   * Get current market data for a specified symbol
   * @param symbol Trading pair (e.g., 'BTC/USDT')
   * @returns Promise resolving to market data
   */
  getMarketData(symbol: string): Promise<MarketData>;
  
  /**
   * Subscribe to real-time market data updates
   * @param symbol Trading pair to subscribe to
   * @param callback Function to call with updated data
   * @returns Subscription identifier that can be used to unsubscribe
   */
  subscribeMarketData(symbol: string, callback: (data: MarketData) => void): string;
  
  /**
   * Unsubscribe from real-time market data updates
   * @param subscriptionId Identifier returned from subscribeMarketData
   * @returns Boolean indicating success
   */
  unsubscribeMarketData(subscriptionId: string): boolean;
  
  /**
   * Get account information including balances
   * @returns Promise resolving to account information
   */
  getAccountInfo(): Promise<AccountInfo>;
  
  /**
   * Place a new order on the exchange
   * @param params Order parameters
   * @returns Promise resolving to order result
   */
  placeOrder(params: OrderParams): Promise<OrderResult>;
  
  /**
   * Cancel an existing order
   * @param orderId Order identifier to cancel
   * @returns Promise resolving to boolean indicating success
   */
  cancelOrder(orderId: string): Promise<boolean>;
  
  /**
   * Get status and details of an existing order
   * @param orderId Order identifier to check
   * @returns Promise resolving to order information
   */
  getOrder(orderId: string): Promise<Order>;
  
  /**
   * Get all open orders
   * @param symbol Optional trading pair to filter orders
   * @returns Promise resolving to array of orders
   */
  getOpenOrders(symbol?: string): Promise<Order[]>;
  
  /**
   * Get historical trades
   * @param symbol Trading pair
   * @param limit Maximum number of trades to return
   * @param startTime Optional start time in milliseconds
   * @param endTime Optional end time in milliseconds
   * @returns Promise resolving to array of orders
   */
  getOrderHistory(
    symbol: string,
    limit: number,
    startTime?: number,
    endTime?: number
  ): Promise<Order[]>;
}

/**
 * Abstract base class implementing common functionality for exchange connectors
 */
export abstract class BaseExchangeConnector implements IExchangeConnector {
  readonly exchangeId: string;
  readonly name: string;
  readonly isTestnet: boolean;
  protected _isConnected: boolean = false;
  protected credentials: ExchangeCredentials | null = null;
  protected marketDataSubscriptions: Map<string, any> = new Map();
  
  constructor(exchangeId: string, name: string, isTestnet: boolean = false) {
    this.exchangeId = exchangeId;
    this.name = name;
    this.isTestnet = isTestnet;
  }
  
  isConnected(): boolean {
    return this._isConnected;
  }
  
  async connect(credentials: ExchangeCredentials): Promise<boolean> {
    // Store credentials securely (implementations should encrypt these)
    this.credentials = credentials;
    this._isConnected = await this._connect();
    return this._isConnected;
  }
  
  async disconnect(): Promise<boolean> {
    if (!this._isConnected) return true;
    
    // Unsubscribe from all market data streams
    this.marketDataSubscriptions.forEach((_, subscriptionId) => {
      this.unsubscribeMarketData(subscriptionId);
    });
    
    const result = await this._disconnect();
    if (result) {
      this._isConnected = false;
      this.credentials = null;
    }
    return result;
  }

  // Abstract methods that must be implemented by concrete exchange connectors
  protected abstract _connect(): Promise<boolean>;
  protected abstract _disconnect(): Promise<boolean>;
  abstract getMarketData(symbol: string): Promise<MarketData>;
  abstract subscribeMarketData(symbol: string, callback: (data: MarketData) => void): string;
  abstract unsubscribeMarketData(subscriptionId: string): boolean;
  abstract getAccountInfo(): Promise<AccountInfo>;
  abstract placeOrder(params: OrderParams): Promise<OrderResult>;
  abstract cancelOrder(orderId: string): Promise<boolean>;
  abstract getOrder(orderId: string): Promise<Order>;
  abstract getOpenOrders(symbol?: string): Promise<Order[]>;
  abstract getOrderHistory(
    symbol: string,
    limit: number,
    startTime?: number,
    endTime?: number
  ): Promise<Order[]>;
}
