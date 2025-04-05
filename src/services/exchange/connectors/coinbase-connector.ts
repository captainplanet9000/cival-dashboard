import axios from 'axios';
import * as crypto from 'crypto';
import { OrderSide, OrderType, TimeInForce, OrderBook, ExchangeBalances } from '../../../types/exchange-types';

export class CoinbaseConnector {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://api.exchange.coinbase.com';
  
  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }
  
  /**
   * Creates signature for authenticated requests
   */
  private generateSignature(
    timestamp: number,
    method: string,
    requestPath: string,
    body: string = ''
  ): string {
    const message = timestamp + method + requestPath + body;
    
    const key = Buffer.from(this.apiSecret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    const signature = hmac.update(message).digest('base64');
    
    return signature;
  }
  
  /**
   * Makes an authenticated request to Coinbase API
   */
  private async makeAuthRequest(
    method: string,
    endpoint: string,
    data: Record<string, any> = {}
  ) {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = method === 'GET' ? '' : JSON.stringify(data);
    
    const signature = this.generateSignature(
      timestamp,
      method,
      endpoint,
      body
    );
    
    const headers = {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp.toString(),
      'CB-ACCESS-PASSPHRASE': 'tradingfarm', // Default passphrase, should be config
      'Content-Type': 'application/json'
    };
    
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers,
        data: method === 'GET' ? undefined : data
      });
      
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          throw new Error(`Coinbase API error: ${axiosError.response.data.message}`);
        }
      }
      throw error;
    }
  }
  
  /**
   * Gets the order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 50): Promise<OrderBook> {
    // Format symbol for Coinbase (e.g., BTC-USD)
    const cbSymbol = symbol.includes('-') ? symbol : `${symbol.slice(0, 3)}-${symbol.slice(3)}`;
    
    try {
      const response = await axios.get(`${this.baseUrl}/products/${cbSymbol}/book`, {
        params: { level: 2 } // Level 2 provides top 50 bids and asks
      });
      
      return {
        bids: response.data.bids.slice(0, limit).map((item: [string, string, number]) => ({
          price: parseFloat(item[0]),
          quantity: parseFloat(item[1])
        })),
        asks: response.data.asks.slice(0, limit).map((item: [string, string, number]) => ({
          price: parseFloat(item[0]),
          quantity: parseFloat(item[1])
        }))
      };
    } catch (error: unknown) {
      console.error('Error fetching Coinbase orderbook:', error);
      throw error;
    }
  }
  
  /**
   * Places an order on Coinbase
   */
  async placeOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    type: OrderType;
    price?: number;
    timeInForce?: TimeInForce;
  }) {
    // Format symbol for Coinbase
    const cbSymbol = params.symbol.includes('-') ? params.symbol : `${params.symbol.slice(0, 3)}-${params.symbol.slice(3)}`;
    
    const orderData: Record<string, any> = {
      product_id: cbSymbol,
      side: params.side === OrderSide.BUY ? 'buy' : 'sell',
      type: this.mapOrderType(params.type),
    };
    
    // For market orders, use 'size' for quantity
    if (params.type === OrderType.MARKET) {
      orderData.size = params.quantity.toString();
    }
    // For limit orders, include price and size
    else if (params.type === OrderType.LIMIT && params.price) {
      orderData.price = params.price.toString();
      orderData.size = params.quantity.toString();
    }
    
    // Add time in force for limit orders
    if (params.type === OrderType.LIMIT && params.timeInForce) {
      orderData.time_in_force = this.mapTimeInForce(params.timeInForce);
    }
    
    try {
      return await this.makeAuthRequest('POST', '/orders', orderData);
    } catch (error: unknown) {
      console.error('Error placing Coinbase order:', error);
      throw error;
    }
  }
  
  /**
   * Maps internal order type to Coinbase order type
   */
  private mapOrderType(type: OrderType): string {
    switch (type) {
      case OrderType.LIMIT:
        return 'limit';
      case OrderType.MARKET:
        return 'market';
      case OrderType.STOP:
        return 'stop';
      case OrderType.STOP_LIMIT:
        return 'limit';  // Coinbase implements stop limits as 'limit' with stop param
      default:
        return 'market';
    }
  }
  
  /**
   * Maps internal time in force to Coinbase time in force
   */
  private mapTimeInForce(timeInForce: TimeInForce): string {
    switch (timeInForce) {
      case TimeInForce.GTC:
        return 'GTC';
      case TimeInForce.IOC:
        return 'IOC';
      case TimeInForce.FOK:
        return 'FOK';
      case TimeInForce.PO:
        return 'GTT';  // Coinbase doesn't directly support post-only
      default:
        return 'GTC';
    }
  }
  
  /**
   * Gets account balances
   */
  async getBalances(): Promise<ExchangeBalances> {
    try {
      const accounts = await this.makeAuthRequest('GET', '/accounts');
      
      const balances: ExchangeBalances = {};
      
      for (const account of accounts) {
        const available = parseFloat(account.available);
        const hold = parseFloat(account.hold);
        const balance = available + hold;
        
        if (balance > 0) {
          balances[account.currency] = {
            free: available,
            locked: hold,
            total: balance
          };
        }
      }
      
      return balances;
    } catch (error: unknown) {
      console.error('Error fetching Coinbase balances:', error);
      throw error;
    }
  }
  
  /**
   * Test connection by retrieving account information
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeAuthRequest('GET', '/accounts');
      return true;
    } catch (error) {
      console.error('Coinbase connection test failed:', error);
      return false;
    }
  }
} 