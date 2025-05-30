import axios from 'axios';
import { ethers } from 'ethers';
import { OrderSide, OrderType, TimeInForce, OrderBook, ExchangeBalances } from '../../../types/exchange-types';

export class HyperliquidConnector {
  private wallet: ethers.Wallet;
  private address: string;
  private baseUrl: string = 'https://api.hyperliquid.xyz';
  private wsUrl: string = 'wss://api.hyperliquid.xyz/ws';
  private isTestnet: boolean;
  
  constructor(address: string, privateKey: string, isTestnet: boolean = false) {
    this.address = address;
    this.wallet = new ethers.Wallet(privateKey);
    this.isTestnet = isTestnet;
    
    if (isTestnet) {
      this.baseUrl = 'https://api.testnet.hyperliquid.xyz';
      this.wsUrl = 'wss://api.testnet.hyperliquid.xyz/ws';
    }
  }
  
  /**
   * Signs a message for Hyperliquid API authentication
   */
  private async signMessage(message: any): Promise<string> {
    const messageHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(JSON.stringify(message))
    );
    
    const signature = await this.wallet.signMessage(
      ethers.utils.arrayify(messageHash)
    );
    
    return signature;
  }
  
  /**
   * Makes an authenticated request to Hyperliquid API
   */
  private async makeAuthRequest(
    endpoint: string,
    action: string,
    data: Record<string, any> = {}
  ) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const message = {
      action,
      timestamp,
      data
    };
    
    const signature = await this.signMessage(message);
    
    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}`, {
        signature,
        message
      });
      
      if (response.data.error) {
        throw new Error(`Hyperliquid API error: ${response.data.error}`);
      }
      
      return response.data.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          throw new Error(`Hyperliquid API error: ${axiosError.response.data.error}`);
        }
      }
      throw error;
    }
  }
  
  /**
   * Makes a public request to Hyperliquid API
   */
  private async makePublicRequest(endpoint: string, params: Record<string, any> = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params
      });
      
      if (response.data.error) {
        throw new Error(`Hyperliquid API error: ${response.data.error}`);
      }
      
      return response.data.data;
    } catch (error: unknown) {
      console.error('Error making Hyperliquid public request:', error);
      throw error;
    }
  }
  
  /**
   * Gets the order book for a symbol
   */
  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    try {
      const result = await this.makePublicRequest('/orderbook', {
        coin: symbol,
        depth: limit
      });
      
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
      console.error('Error fetching Hyperliquid orderbook:', error);
      throw error;
    }
  }
  
  /**
   * Places an order on Hyperliquid
   */
  async placeOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    type: OrderType;
    price?: number;
    timeInForce?: TimeInForce;
  }) {
    const orderData: Record<string, any> = {
      coin: params.symbol,
      side: params.side === OrderSide.BUY ? 'buy' : 'sell',
      size: params.quantity.toString(),
      orderType: this.mapOrderType(params.type, params.price)
    };
    
    // Add additional parameters based on order type
    if (params.type === OrderType.LIMIT && params.price) {
      orderData.limitPrice = params.price.toString();
    }
    
    // Add time in force settings
    if (params.timeInForce) {
      orderData.timeInForce = this.mapTimeInForce(params.timeInForce);
    }
    
    try {
      return await this.makeAuthRequest('/trade', 'order', orderData);
    } catch (error: unknown) {
      console.error('Error placing Hyperliquid order:', error);
      throw error;
    }
  }
  
  /**
   * Maps internal order type to Hyperliquid order type
   */
  private mapOrderType(type: OrderType, price?: number): string {
    switch (type) {
      case OrderType.LIMIT:
        return 'limit';
      case OrderType.MARKET:
        return 'market';
      case OrderType.STOP:
        return 'stopMarket';
      case OrderType.STOP_LIMIT:
        return 'stopLimit';
      default:
        return price ? 'limit' : 'market';
    }
  }
  
  /**
   * Maps internal time in force to Hyperliquid time in force
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
        return 'postOnly';
      default:
        return 'gtc';
    }
  }
  
  /**
   * Gets account balances
   */
  async getBalances(): Promise<ExchangeBalances> {
    try {
      const accountData = await this.makeAuthRequest('/account', 'info', {
        address: this.address
      });
      
      const balances: ExchangeBalances = {};
      
      // Process balances from account data
      for (const balance of accountData.balances) {
        balances[balance.coin] = {
          free: parseFloat(balance.free),
          locked: parseFloat(balance.locked),
          total: parseFloat(balance.total)
        };
      }
      
      return balances;
    } catch (error: unknown) {
      console.error('Error fetching Hyperliquid balances:', error);
      throw error;
    }
  }
  
  /**
   * Test connection by retrieving account information
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeAuthRequest('/account', 'info', {
        address: this.address
      });
      return true;
    } catch (error) {
      console.error('Hyperliquid connection test failed:', error);
      return false;
    }
  }
} 