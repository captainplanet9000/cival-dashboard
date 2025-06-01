import axios from 'axios';
import * as crypto from 'crypto';
import { OrderSide, OrderType, TimeInForce, OrderBook, ExchangeBalances } from '../../../types/exchange-types';

export class OKXConnector {
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;
  private baseUrl: string = 'https://www.okx.com';
  
  constructor(apiKey: string, apiSecret: string, passphrase: string, testnet: boolean = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
    
    if (testnet) {
      this.baseUrl = 'https://www.okx.com/api/v5/sandbox';
    } else {
      this.baseUrl = 'https://www.okx.com/api/v5';
    }
  }
  
  /**
   * Creates signature for authenticated requests
   */
  private generateSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): string {
    const message = timestamp + method + requestPath + body;
    
    const hmac = crypto.createHmac('sha256', this.apiSecret);
    const signature = hmac.update(message).digest('base64');
    
    return signature;
  }
  
  /**
   * Makes an authenticated request to OKX API
   */
  private async makeAuthRequest(
    method: string,
    endpoint: string,
    data: Record<string, any> = {}
  ) {
    const timestamp = new Date().toISOString();
    const body = method === 'GET' ? '' : JSON.stringify(data);
    
    const signature = this.generateSignature(
      timestamp,
      method,
      endpoint,
      body
    );
    
    const headers = {
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json'
    };
    
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers,
        data: method === 'GET' ? undefined : data
      });
      
      if (response.data.code !== '0') {
        throw new Error(`OKX API error: ${response.data.msg}`);
      }
      
      return response.data.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { msg?: string } } };
        if (axiosError.response?.data?.msg) {
          throw new Error(`OKX API error: ${axiosError.response.data.msg}`);
        }
      }
      throw error;
    }
  }
  
  /**
   * Gets the order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 50): Promise<OrderBook> {
    // Format symbol for OKX (e.g., BTC-USDT)
    const okxSymbol = symbol.includes('-') ? symbol : `${symbol.slice(0, 3)}-${symbol.slice(3)}`;
    
    try {
      const response = await axios.get(`${this.baseUrl}/market/books`, {
        params: { 
          instId: okxSymbol,
          sz: limit 
        }
      });
      
      if (response.data.code !== '0') {
        throw new Error(`OKX API error: ${response.data.msg}`);
      }
      
      const data = response.data.data[0];
      
      return {
        bids: data.bids.map((item: [string, string, string, string]) => ({
          price: parseFloat(item[0]),
          quantity: parseFloat(item[1])
        })),
        asks: data.asks.map((item: [string, string, string, string]) => ({
          price: parseFloat(item[0]),
          quantity: parseFloat(item[1])
        }))
      };
    } catch (error: unknown) {
      console.error('Error fetching OKX orderbook:', error);
      throw error;
    }
  }
  
  /**
   * Places an order on OKX
   */
  async placeOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    type: OrderType;
    price?: number;
    timeInForce?: TimeInForce;
  }) {
    // Format symbol for OKX
    const okxSymbol = params.symbol.includes('-') ? params.symbol : `${params.symbol.slice(0, 3)}-${params.symbol.slice(3)}`;
    
    const orderData: Record<string, any> = {
      instId: okxSymbol,
      tdMode: 'cash',  // Trade mode (cash or margin)
      side: params.side === OrderSide.BUY ? 'buy' : 'sell',
      ordType: this.mapOrderType(params.type),
      sz: params.quantity.toString()
    };
    
    // Add price for limit orders
    if (params.type === OrderType.LIMIT && params.price) {
      orderData.px = params.price.toString();
    }
    
    // Add time in force for limit orders
    if (params.type === OrderType.LIMIT && params.timeInForce) {
      orderData.tgtCcy = this.mapTimeInForce(params.timeInForce);
    }
    
    try {
      return await this.makeAuthRequest('POST', '/trade/order', orderData);
    } catch (error: unknown) {
      console.error('Error placing OKX order:', error);
      throw error;
    }
  }
  
  /**
   * Maps internal order type to OKX order type
   */
  private mapOrderType(type: OrderType): string {
    switch (type) {
      case OrderType.LIMIT:
        return 'limit';
      case OrderType.MARKET:
        return 'market';
      case OrderType.STOP:
        return 'conditional';
      case OrderType.STOP_LIMIT:
        return 'conditional';
      default:
        return 'market';
    }
  }
  
  /**
   * Maps internal time in force to OKX time in force
   */
  private mapTimeInForce(timeInForce: TimeInForce): string {
    switch (timeInForce) {
      case TimeInForce.GTC:
        return 'gtc';
      case TimeInForce.IOC:
        return 'ioc';
      case TimeInForce.FOK:
        return 'fok';
      case TimeInForce.PO:
        return 'post_only';
      default:
        return 'gtc';
    }
  }
  
  /**
   * Gets account balances
   */
  async getBalances(): Promise<ExchangeBalances> {
    try {
      const response = await this.makeAuthRequest('GET', '/account/balance');
      
      const balances: ExchangeBalances = {};
      
      // Parse OKX balance response
      if (response && response.length > 0) {
        const details = response[0].details;
        
        for (const currency of details) {
          const available = parseFloat(currency.availBal);
          const frozen = parseFloat(currency.frozenBal);
          const total = parseFloat(currency.eq);
          
          if (total > 0) {
            balances[currency.ccy] = {
              free: available,
              locked: frozen,
              total: total
            };
          }
        }
      }
      
      return balances;
    } catch (error: unknown) {
      console.error('Error fetching OKX balances:', error);
      throw error;
    }
  }
  
  /**
   * Test connection by retrieving account information
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeAuthRequest('GET', '/account/balance');
      return true;
    } catch (error) {
      console.error('OKX connection test failed:', error);
      return false;
    }
  }
} 