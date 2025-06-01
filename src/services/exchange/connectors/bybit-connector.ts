import axios from 'axios';
import * as crypto from 'crypto';
import { OrderSide, OrderType, TimeInForce } from '../../../types/exchange-types';

export class BybitConnector {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://api.bybit.com';
  
  constructor(apiKey: string, apiSecret: string, testnet: boolean = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    
    if (testnet) {
      this.baseUrl = 'https://api-testnet.bybit.com';
    }
  }
  
  /**
   * Creates signature for authenticated requests
   */
  private generateSignature(
    timestamp: number,
    method: string,
    path: string,
    queryParams: Record<string, any> = {},
    reqBody: Record<string, any> = {}
  ): string {
    // Bybit v5 API signature
    let payload = timestamp + this.apiKey;
    
    if (Object.keys(queryParams).length > 0) {
      const queryString = Object.keys(queryParams)
        .sort()
        .map((key) => `${key}=${queryParams[key]}`)
        .join('&');
      payload += queryString;
    }
    
    if (Object.keys(reqBody).length > 0) {
      payload += JSON.stringify(reqBody);
    }
    
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
  }
  
  /**
   * Makes an authenticated request to Bybit API
   */
  private async makeAuthRequest(
    method: string,
    endpoint: string,
    params: Record<string, any> = {},
    data: Record<string, any> = {}
  ) {
    const timestamp = Date.now();
    const signature = this.generateSignature(
      timestamp,
      method,
      endpoint,
      method === 'GET' ? params : {},
      method === 'POST' ? data : {}
    );
    
    const headers = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-TIMESTAMP': timestamp.toString(),
      'X-BAPI-SIGN': signature,
      'Content-Type': 'application/json'
    };
    
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        params: method === 'GET' ? params : undefined,
        data: method === 'POST' ? data : undefined,
        headers
      });
      
      if (response.data.retCode === 0) {
        return response.data.result;
      } else {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`Bybit API error: ${error.response.data.retMsg}`);
      }
      throw error;
    }
  }
  
  /**
   * Gets the order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 25) {
    const endpoint = '/v5/market/orderbook';
    const params = { symbol, limit };
    
    try {
      const data = await this.makeAuthRequest('GET', endpoint, params);
      return {
        bids: data.b.map(item => ({ price: parseFloat(item[0]), quantity: parseFloat(item[1]) })),
        asks: data.a.map(item => ({ price: parseFloat(item[0]), quantity: parseFloat(item[1]) }))
      };
    } catch (error) {
      console.error('Error fetching Bybit orderbook:', error);
      throw error;
    }
  }
  
  /**
   * Places an order on Bybit
   */
  async placeOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    type: OrderType;
    price?: number;
    timeInForce?: TimeInForce;
  }) {
    const endpoint = '/v5/order/create';
    
    const orderData = {
      category: 'spot',
      symbol: params.symbol,
      side: params.side === OrderSide.BUY ? 'Buy' : 'Sell',
      orderType: this.mapOrderType(params.type),
      qty: params.quantity.toString(),
      timeInForce: params.timeInForce || TimeInForce.GTC,
    };
    
    if (params.type !== OrderType.MARKET && params.price) {
      orderData['price'] = params.price.toString();
    }
    
    try {
      return await this.makeAuthRequest('POST', endpoint, {}, orderData);
    } catch (error) {
      console.error('Error placing Bybit order:', error);
      throw error;
    }
  }
  
  /**
   * Maps internal order type to Bybit order type
   */
  private mapOrderType(type: OrderType): string {
    switch (type) {
      case OrderType.LIMIT:
        return 'Limit';
      case OrderType.MARKET:
        return 'Market';
      case OrderType.STOP:
        return 'Stop';
      case OrderType.STOP_LIMIT:
        return 'StopLimit';
      default:
        return 'Market';
    }
  }
  
  /**
   * Gets account balances
   */
  async getBalances() {
    const endpoint = '/v5/account/wallet-balance';
    const params = { accountType: 'SPOT' };
    
    try {
      const data = await this.makeAuthRequest('GET', endpoint, params);
      
      const balances = {};
      for (const coin of data.coin) {
        if (parseFloat(coin.walletBalance) > 0) {
          balances[coin.coin] = {
            free: parseFloat(coin.available),
            locked: parseFloat(coin.walletBalance) - parseFloat(coin.available),
            total: parseFloat(coin.walletBalance)
          };
        }
      }
      
      return balances;
    } catch (error) {
      console.error('Error fetching Bybit balances:', error);
      throw error;
    }
  }
} 