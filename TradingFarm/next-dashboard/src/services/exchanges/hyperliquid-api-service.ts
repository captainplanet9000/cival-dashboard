/**
 * Hyperliquid API Service
 * Provides functionality for interacting with the Hyperliquid exchange API
 */
import crypto from 'crypto';
import { ExchangeService, MarketDataParams, OrderParams } from '../exchange-service';

interface HyperliquidCredentials {
  wallet_address: string;
  private_key: string;
}

export class HyperliquidApiService implements ExchangeService {
  private readonly baseUrl: string = 'https://api.hyperliquid.xyz';
  private readonly walletAddress: string;
  private readonly privateKey: string;

  constructor(credentials: HyperliquidCredentials | null) {
    // If credentials are provided, use them; otherwise, use environment variables
    this.walletAddress = credentials?.wallet_address || process.env.HYPERLIQUID_WALLET_ADDRESS || '';
    this.privateKey = credentials?.private_key || process.env.HYPERLIQUID_PRIVATE_KEY || '';
  }

  /**
   * Sign a message with the private key to authenticate with Hyperliquid
   */
  private signMessage(message: string): string {
    // Create an Ethereum-compliant message hash
    const messageHash = crypto.createHash('keccak256')
      .update(`\\x19Ethereum Signed Message:\\n${message.length}${message}`)
      .digest();
    
    // Sign the hash with the private key
    // Note: In a production environment, you should use ethers.js or similar
    // for proper Ethereum signature handling
    try {
      // This is a simplified example - actual implementation would require
      // proper Ethereum signature functions
      const { r, s, v } = this.simulateEthereumSignature(messageHash);
      return `0x${r}${s}${v.toString(16).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error signing message:', error);
      throw new Error('Failed to sign Hyperliquid message');
    }
  }

  /**
   * Simulate Ethereum signature - in production use ethers.js or similar
   */
  private simulateEthereumSignature(hash: Buffer): { r: string, s: string, v: number } {
    // This is a placeholder - in production, use a proper Ethereum library
    if (!this.privateKey.startsWith('0x')) {
      throw new Error('Private key must be a hex string starting with 0x');
    }
    
    // In production, you would use the actual private key to sign
    // For now, we'll just return a placeholder signature
    return {
      r: '0000000000000000000000000000000000000000000000000000000000000000',
      s: '0000000000000000000000000000000000000000000000000000000000000000',
      v: 27
    };
  }

  /**
   * Make a request to the Hyperliquid API
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params: Record<string, any> = {},
    requiresAuth: boolean = false
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // If authentication is required, sign the request
      if (requiresAuth && this.walletAddress && this.privateKey) {
        const timestamp = Date.now().toString();
        const message = timestamp + JSON.stringify(params);
        const signature = this.signMessage(message);
        
        headers['HL-Signature'] = signature;
        headers['HL-Timestamp'] = timestamp;
        headers['HL-Address'] = this.walletAddress;
      }
      
      const requestOptions: RequestInit = {
        method,
        headers,
        body: method !== 'GET' && Object.keys(params).length > 0
          ? JSON.stringify(params)
          : undefined
      };
      
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`Hyperliquid API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error making Hyperliquid API request:', error);
      throw error;
    }
  }

  /**
   * Get market data (candles) for a given symbol
   */
  async getMarketData(params: MarketDataParams): Promise<any> {
    const interval = params.interval || '1h';
    const limit = params.limit || 200;
    
    const queryParams = {
      coin: params.symbol,
      interval,
      limit
    };
    
    return this.makeRequest('/info/candles', 'GET', queryParams);
  }

  /**
   * Get the order book for a given symbol
   */
  async getOrderBook(symbol: string): Promise<any> {
    return this.makeRequest('/info/l2snapshot', 'GET', { coin: symbol });
  }

  /**
   * Get the account balance
   */
  async getAccountBalance(): Promise<any> {
    if (!this.walletAddress) {
      throw new Error('Wallet address is required for getting account balance');
    }
    
    return this.makeRequest('/info/user-state', 'GET', { user: this.walletAddress });
  }

  /**
   * Place an order on the exchange
   */
  async placeOrder(params: OrderParams): Promise<any> {
    if (!this.walletAddress || !this.privateKey) {
      throw new Error('Wallet address and private key are required for placing orders');
    }
    
    const orderParams = {
      coin: params.symbol,
      is_buy: params.side === 'Buy',
      sz: params.quantity,
      limit_px: params.price,
      order_type: params.orderType.toLowerCase(),
      reduce_only: params.reduceOnly || false
    };
    
    return this.makeRequest('/exchange/order', 'POST', orderParams, true);
  }

  /**
   * Cancel an order on the exchange
   */
  async cancelOrder(orderId: string, symbol: string): Promise<any> {
    if (!this.walletAddress || !this.privateKey) {
      throw new Error('Wallet address and private key are required for canceling orders');
    }
    
    const cancelParams = {
      coin: symbol,
      order_id: orderId
    };
    
    return this.makeRequest('/exchange/cancel', 'POST', cancelParams, true);
  }

  /**
   * Get active orders on the exchange
   */
  async getActiveOrders(symbol?: string): Promise<any> {
    if (!this.walletAddress) {
      throw new Error('Wallet address is required for getting active orders');
    }
    
    const queryParams: Record<string, any> = { user: this.walletAddress };
    if (symbol) queryParams.coin = symbol;
    
    return this.makeRequest('/info/user-orders', 'GET', queryParams);
  }

  /**
   * Get order history from the exchange
   */
  async getOrderHistory(symbol?: string): Promise<any> {
    if (!this.walletAddress) {
      throw new Error('Wallet address is required for getting order history');
    }
    
    const queryParams: Record<string, any> = { user: this.walletAddress };
    if (symbol) queryParams.coin = symbol;
    
    return this.makeRequest('/info/fills', 'GET', queryParams);
  }

  /**
   * Get exchange info including symbol information
   */
  async getExchangeInfo(): Promise<any> {
    const exchangeInfo = await this.makeRequest('/info/meta', 'GET');
    
    return {
      symbols: exchangeInfo.universe.map((coin: any) => ({
        symbol: coin.name,
        baseAsset: coin.name,
        quoteAsset: 'USD',
        status: 'TRADING'
      }))
    };
  }

  /**
   * Get the server time from the exchange
   */
  async getServerTime(): Promise<any> {
    // Hyperliquid doesn't have a dedicated server time endpoint
    // So we'll just return the current time
    return { serverTime: Date.now() };
  }
}
