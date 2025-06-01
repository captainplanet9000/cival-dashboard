import axios from 'axios';
import * as crypto from 'crypto';
import { OrderSide, OrderType, TimeInForce, OrderBook, ExchangeBalances } from '../../../types/exchange-types';

export class FTXConnector {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://ftx.com/api';
  private subAccount?: string;
  
  constructor(apiKey: string, apiSecret: string, subAccount?: string, isUS: boolean = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.subAccount = subAccount;
    
    if (isUS) {
      this.baseUrl = 'https://ftx.us/api';
    }
  }
  
  /**
   * Creates signature for authenticated requests
   */
  private generateSignature(
    timestamp: number,
    method: string,
    path: string,
    body: Record<string, any> = {}
  ): string {
    const payload = `${timestamp}${method}/api${path}${
      method === 'GET' ? '' : JSON.stringify(body)
    }`;
    
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
  }
  
  /**
   * Makes an authenticated request to FTX API
   */
  private async makeAuthRequest(
    method: string,
    path: string,
    params: Record<string, any> = {},
    data: Record<string, any> = {}
  ) {
    const timestamp = Date.now();
    const signature = this.generateSignature(
      timestamp,
      method,
      path,
      method === 'POST' ? data : {}
    );
    
    const headers: Record<string, string> = {
      'FTX-KEY': this.apiKey,
      'FTX-TS': timestamp.toString(),
      'FTX-SIGN': signature,
      'Content-Type': 'application/json'
    };
    
    // Add subaccount header if specified
    if (this.subAccount) {
      headers['FTX-SUBACCOUNT'] = encodeURIComponent(this.subAccount);
    }
    
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        params: method === 'GET' ? params : undefined,
        data: method === 'POST' ? data : undefined,
        headers
      });
      
      if (!response.data.success) {
        throw new Error(`FTX API error: ${response.data.error}`);
      }
      
      return response.data.result;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          throw new Error(`FTX API error: ${axiosError.response.data.error}`);
        }
      }
      throw error;
    }
  }
  
  /**
   * Gets the order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    // FTX uses / as separator, e.g., BTC/USD
    const ftxSymbol = symbol.includes('/') ? symbol : symbol.slice(0, 3) + '/' + symbol.slice(3);
    
    try {
      const result = await this.makeAuthRequest('GET', `/markets/${ftxSymbol}/orderbook`, { depth: limit });
      
      return {
        bids: result.bids.map((item: [number, number]) => ({
          price: item[0],
          quantity: item[1]
        })),
        asks: result.asks.map((item: [number, number]) => ({
          price: item[0],
          quantity: item[1]
        }))
      };
    } catch (error: unknown) {
      console.error('Error fetching FTX orderbook:', error);
      throw error;
    }
  }
  
  /**
   * Places an order on FTX
   */
  async placeOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    type: OrderType;
    price?: number;
    timeInForce?: TimeInForce;
  }) {
    // FTX uses / as separator
    const ftxSymbol = params.symbol.includes('/') ? params.symbol : params.symbol.slice(0, 3) + '/' + params.symbol.slice(3);
    
    const orderData: Record<string, any> = {
      market: ftxSymbol,
      side: params.side === OrderSide.BUY ? 'buy' : 'sell',
      type: params.type === OrderType.LIMIT ? 'limit' : 'market',
      size: params.quantity,
    };
    
    // Add price for limit orders
    if (params.type === OrderType.LIMIT && params.price) {
      orderData.price = params.price;
    }
    
    // Add post-only flag
    if (params.timeInForce === TimeInForce.PO) {
      orderData.postOnly = true;
    }
    
    // Add time in force (IOC)
    if (params.timeInForce === TimeInForce.IOC) {
      orderData.ioc = true;
    }
    
    try {
      return await this.makeAuthRequest('POST', '/orders', {}, orderData);
    } catch (error: unknown) {
      console.error('Error placing FTX order:', error);
      throw error;
    }
  }
  
  /**
   * Gets account balances
   */
  async getBalances(): Promise<ExchangeBalances> {
    try {
      const balanceData = await this.makeAuthRequest('GET', '/wallet/balances');
      
      const balances: ExchangeBalances = {};
      
      for (const coin of balanceData) {
        if (coin.total > 0) {
          balances[coin.coin] = {
            free: coin.free,
            locked: coin.total - coin.free,
            total: coin.total
          };
        }
      }
      
      return balances;
    } catch (error: unknown) {
      console.error('Error fetching FTX balances:', error);
      throw error;
    }
  }
} 