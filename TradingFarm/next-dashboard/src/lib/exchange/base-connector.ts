import { 
  IExchangeConnector, 
  MarketData, 
  OrderParams, 
  OrderResult, 
  AccountInfo, 
  ExchangeCredentials 
} from './types';

/**
 * BaseExchangeConnector provides a foundation for implementing exchange-specific connectors
 * with common error handling, logging, and retry logic.
 */
export abstract class BaseExchangeConnector implements IExchangeConnector {
  protected _connected: boolean = false;
  protected _credentials?: ExchangeCredentials;
  protected _lastError?: Error;
  protected _retryCount: number = 3;
  protected _retryDelayMs: number = 1000;
  
  abstract name: string;
  
  /**
   * Connect to the exchange API using provided credentials
   */
  async connect(credentials: ExchangeCredentials): Promise<boolean> {
    try {
      this._credentials = credentials;
      this._connected = await this.performConnect(credentials);
      return this._connected;
    } catch (error) {
      this._lastError = error as Error;
      console.error(`Connection error for ${this.name}:`, error);
      return false;
    }
  }
  
  /**
   * Disconnect from the exchange API
   */
  async disconnect(): Promise<boolean> {
    try {
      if (!this._connected) return true;
      
      const result = await this.performDisconnect();
      if (result) {
        this._connected = false;
        this._credentials = undefined;
      }
      return result;
    } catch (error) {
      this._lastError = error as Error;
      console.error(`Disconnection error for ${this.name}:`, error);
      return false;
    }
  }
  
  /**
   * Get current market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    return this.withRetry(() => this.performGetMarketData(symbol));
  }
  
  /**
   * Get the order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 10) {
    return this.withRetry(() => this.performGetOrderBook(symbol, limit));
  }
  
  /**
   * Place a new order
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    return this.withRetry(() => this.performPlaceOrder(params));
  }
  
  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    return this.withRetry(() => this.performCancelOrder(orderId, symbol));
  }
  
  /**
   * Get the status of an order
   */
  async getOrderStatus(orderId: string, symbol: string): Promise<OrderResult> {
    return this.withRetry(() => this.performGetOrderStatus(orderId, symbol));
  }
  
  /**
   * Get all open orders for an optional symbol
   */
  async getOpenOrders(symbol?: string): Promise<OrderResult[]> {
    return this.withRetry(() => this.performGetOpenOrders(symbol));
  }
  
  /**
   * Get account info including balances
   */
  async getAccountInfo(): Promise<AccountInfo> {
    return this.withRetry(() => this.performGetAccountInfo());
  }
  
  /**
   * Subscribe to real-time price updates
   */
  async subscribePriceUpdates(
    symbols: string[],
    callback: (data: MarketData) => void
  ): Promise<boolean> {
    try {
      return await this.performSubscribePriceUpdates(symbols, callback);
    } catch (error) {
      this._lastError = error as Error;
      console.error(`Subscribe error for ${this.name}:`, error);
      return false;
    }
  }
  
  /**
   * Unsubscribe from price updates
   */
  async unsubscribePriceUpdates(symbols: string[]): Promise<boolean> {
    try {
      return await this.performUnsubscribePriceUpdates(symbols);
    } catch (error) {
      this._lastError = error as Error;
      console.error(`Unsubscribe error for ${this.name}:`, error);
      return false;
    }
  }
  
  /**
   * Get the last error that occurred
   */
  getLastError(): Error | undefined {
    return this._lastError;
  }
  
  /**
   * Check if the connector is connected
   */
  isConnected(): boolean {
    return this._connected;
  }
  
  /**
   * Helper method for implementing retry logic
   */
  protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    if (!this._connected) {
      throw new Error(`Not connected to ${this.name} exchange`);
    }
    
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < this._retryCount; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt + 1}/${this._retryCount} failed for ${this.name}:`, error);
        
        if (attempt < this._retryCount - 1) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this._retryDelayMs));
        }
      }
    }
    
    this._lastError = lastError;
    throw lastError;
  }
  
  // Abstract methods that must be implemented by specific exchange connectors
  protected abstract performConnect(credentials: ExchangeCredentials): Promise<boolean>;
  protected abstract performDisconnect(): Promise<boolean>;
  protected abstract performGetMarketData(symbol: string): Promise<MarketData>;
  protected abstract performGetOrderBook(symbol: string, limit: number): Promise<{
    bids: [number, number][];
    asks: [number, number][];
    timestamp: number;
  }>;
  protected abstract performPlaceOrder(params: OrderParams): Promise<OrderResult>;
  protected abstract performCancelOrder(orderId: string, symbol: string): Promise<boolean>;
  protected abstract performGetOrderStatus(orderId: string, symbol: string): Promise<OrderResult>;
  protected abstract performGetOpenOrders(symbol?: string): Promise<OrderResult[]>;
  protected abstract performGetAccountInfo(): Promise<AccountInfo>;
  protected abstract performSubscribePriceUpdates(
    symbols: string[],
    callback: (data: MarketData) => void
  ): Promise<boolean>;
  protected abstract performUnsubscribePriceUpdates(symbols: string[]): Promise<boolean>;
}
