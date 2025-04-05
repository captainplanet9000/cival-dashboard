import axios from 'axios';
import * as crypto from 'crypto';
import { OrderSide, OrderType, TimeInForce, OrderBook, ExchangeBalances } from '../../../types/exchange-types';

export class BinanceConnector {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://api.binance.com';
  
  constructor(apiKey: string, apiSecret: string, testnet: boolean = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    
    if (testnet) {
      this.baseUrl = 'https://testnet.binance.vision';
    }
  }
  
  /**
   * Creates signature for authenticated requests
   */
  private generateSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }
  
  /**
   * Makes an authenticated request to Binance API
   */
  private async makeAuthRequest(
    method: string,
    endpoint: string,
    params: Record<string, any> = {}
  ) {
    const timestamp = Date.now();
    let queryString = `timestamp=${timestamp}`;
    
    // Add all parameters to query string
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryString += `&${key}=${value}`;
      }
    }
    
    // Generate signature
    const signature = this.generateSignature(queryString);
    queryString += `&signature=${signature}`;
    
    const headers = {
      'X-MBX-APIKEY': this.apiKey,
      'Content-Type': 'application/json'
    };
    
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}?${queryString}`,
        headers
      });
      
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { msg?: string } } };
        if (axiosError.response?.data?.msg) {
          throw new Error(`Binance API error: ${axiosError.response.data.msg}`);
        }
      }
      throw error;
    }
  }
  
  /**
   * Gets the order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/depth`, {
        params: { symbol, limit }
      });
      
      return {
        bids: response.data.bids.map((item: [string, string]) => ({ 
          price: parseFloat(item[0]), 
          quantity: parseFloat(item[1]) 
        })),
        asks: response.data.asks.map((item: [string, string]) => ({ 
          price: parseFloat(item[0]), 
          quantity: parseFloat(item[1]) 
        }))
      };
    } catch (error: unknown) {
      console.error('Error fetching Binance orderbook:', error);
      throw error;
    }
  }
  
  /**
   * Places an order on Binance
   */
  async placeOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    type: OrderType;
    price?: number;
    timeInForce?: TimeInForce;
  }) {
    const endpoint = '/api/v3/order';
    
    const orderParams: Record<string, any> = {
      symbol: params.symbol,
      side: params.side === OrderSide.BUY ? 'BUY' : 'SELL',
      type: this.mapOrderType(params.type),
      quantity: params.quantity,
    };
    
    if (params.type !== OrderType.MARKET) {
      orderParams.timeInForce = params.timeInForce || TimeInForce.GTC;
    }
    
    if (params.type !== OrderType.MARKET && params.price) {
      orderParams.price = params.price;
    }
    
    try {
      return await this.makeAuthRequest('POST', endpoint, orderParams);
    } catch (error: unknown) {
      console.error('Error placing Binance order:', error);
      throw error;
    }
  }
  
  /**
   * Maps internal order type to Binance order type
   */
  private mapOrderType(type: OrderType): string {
    switch (type) {
      case OrderType.LIMIT:
        return 'LIMIT';
      case OrderType.MARKET:
        return 'MARKET';
      case OrderType.STOP:
        return 'STOP_LOSS';
      case OrderType.STOP_LIMIT:
        return 'STOP_LOSS_LIMIT';
      default:
        return 'MARKET';
    }
  }
  
  /**
   * Gets account balances
   */
  async getBalances(): Promise<ExchangeBalances> {
    const endpoint = '/api/v3/account';
    
    try {
      const accountInfo = await this.makeAuthRequest('GET', endpoint);
      
      const balances: ExchangeBalances = {};
      for (const asset of accountInfo.balances) {
        const free = parseFloat(asset.free);
        const locked = parseFloat(asset.locked);
        
        if (free > 0 || locked > 0) {
          balances[asset.asset] = {
            free,
            locked,
            total: free + locked
          };
        }
      }
      
      return balances;
    } catch (error: unknown) {
      console.error('Error fetching Binance balances:', error);
      throw error;
    }
  }
} 