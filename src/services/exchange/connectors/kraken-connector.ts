import axios from 'axios';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import { OrderSide, OrderType, TimeInForce, OrderBook, ExchangeBalances } from '../../../types/exchange-types';

export class KrakenConnector {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://api.kraken.com';
  
  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }
  
  /**
   * Creates signature for authenticated requests
   */
  private generateSignature(path: string, nonce: number, postData: string): string {
    const message = postData;
    const secretBuffer = Buffer.from(this.apiSecret, 'base64');
    
    const hash = crypto.createHash('sha256');
    const hmac = crypto.createHmac('sha512', secretBuffer);
    
    const hashDigest = hash.update(nonce + message).digest();
    const hmacDigest = hmac.update(path + hashDigest).digest('base64');
    
    return hmacDigest;
  }
  
  /**
   * Makes an authenticated request to Kraken API
   */
  private async makeAuthRequest(
    endpoint: string,
    params: Record<string, any> = {}
  ) {
    const path = endpoint;
    const nonce = Date.now() * 1000;
    
    const data = {
      nonce,
      ...params
    };
    
    const postData = querystring.stringify(data);
    const signature = this.generateSignature(path, nonce, postData);
    
    const headers = {
      'API-Key': this.apiKey,
      'API-Sign': signature,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    
    try {
      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        postData,
        { headers }
      );
      
      if (response.data.error && response.data.error.length > 0) {
        throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
      }
      
      return response.data.result;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string[] } } };
        if (axiosError.response?.data?.error) {
          throw new Error(`Kraken API error: ${axiosError.response.data.error.join(', ')}`);
        }
      }
      throw error;
    }
  }
  
  /**
   * Makes a public request to Kraken API
   */
  private async makePublicRequest(endpoint: string, params: Record<string, any> = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params
      });
      
      if (response.data.error && response.data.error.length > 0) {
        throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
      }
      
      return response.data.result;
    } catch (error: unknown) {
      console.error('Error making Kraken public request:', error);
      throw error;
    }
  }
  
  /**
   * Gets the order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 25): Promise<OrderBook> {
    try {
      // Kraken uses XBT instead of BTC
      const krakenSymbol = symbol.replace('BTC', 'XBT');
      
      const result = await this.makePublicRequest('/0/public/Depth', {
        pair: krakenSymbol,
        count: limit
      });
      
      // Get the first key in the result (e.g., "XXBTZUSD")
      const pairResult = result[Object.keys(result)[0]];
      
      return {
        bids: pairResult.bids.map((item: [string, string, number]) => ({
          price: parseFloat(item[0]),
          quantity: parseFloat(item[1])
        })),
        asks: pairResult.asks.map((item: [string, string, number]) => ({
          price: parseFloat(item[0]),
          quantity: parseFloat(item[1])
        }))
      };
    } catch (error: unknown) {
      console.error('Error fetching Kraken orderbook:', error);
      throw error;
    }
  }
  
  /**
   * Places an order on Kraken
   */
  async placeOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    type: OrderType;
    price?: number;
    timeInForce?: TimeInForce;
  }) {
    // Kraken uses XBT instead of BTC
    const krakenSymbol = params.symbol.replace('BTC', 'XBT');
    
    const orderParams: Record<string, any> = {
      pair: krakenSymbol,
      type: params.side === OrderSide.BUY ? 'buy' : 'sell',
      ordertype: this.mapOrderType(params.type),
      volume: params.quantity.toString()
    };
    
    // Add price for limit orders
    if (params.type !== OrderType.MARKET && params.price) {
      orderParams.price = params.price.toString();
    }
    
    // Map time in force
    if (params.timeInForce) {
      switch (params.timeInForce) {
        case TimeInForce.IOC:
          orderParams.oflags = 'immediate';
          break;
        case TimeInForce.PO:
          orderParams.oflags = 'post';
          break;
        // GTC is default for Kraken, no flag needed
      }
    }
    
    try {
      return await this.makeAuthRequest('/0/private/AddOrder', orderParams);
    } catch (error: unknown) {
      console.error('Error placing Kraken order:', error);
      throw error;
    }
  }
  
  /**
   * Maps internal order type to Kraken order type
   */
  private mapOrderType(type: OrderType): string {
    switch (type) {
      case OrderType.LIMIT:
        return 'limit';
      case OrderType.MARKET:
        return 'market';
      case OrderType.STOP:
        return 'stop-loss';
      case OrderType.STOP_LIMIT:
        return 'stop-loss-limit';
      default:
        return 'market';
    }
  }
  
  /**
   * Gets account balances
   */
  async getBalances(): Promise<ExchangeBalances> {
    try {
      const balanceData = await this.makeAuthRequest('/0/private/Balance');
      
      const balances: ExchangeBalances = {};
      
      for (const [asset, balanceStr] of Object.entries(balanceData)) {
        const balance = parseFloat(balanceStr as string);
        
        if (balance > 0) {
          // Convert Kraken asset codes to standard ones (e.g., XXBT to BTC)
          let standardAsset = asset;
          if (asset.startsWith('X') && asset !== 'XRP') {
            standardAsset = asset.substring(1);
          }
          
          // Convert XBT to BTC for consistency
          if (standardAsset === 'XBT') {
            standardAsset = 'BTC';
          }
          
          balances[standardAsset] = {
            free: balance, // Kraken doesn't distinguish free/locked in the basic Balance call
            locked: 0,
            total: balance
          };
        }
      }
      
      return balances;
    } catch (error: unknown) {
      console.error('Error fetching Kraken balances:', error);
      throw error;
    }
  }
} 