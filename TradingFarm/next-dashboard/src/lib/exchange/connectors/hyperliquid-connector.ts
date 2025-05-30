/**
 * Hyperliquid Exchange Connector
 * 
 * Implementation of the Exchange Connector interface for Hyperliquid.
 * Handles Hyperliquid API operations for trading and market data.
 * @reference https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
 */

import { 
  BaseExchangeConnector 
} from '../base-connector';
import { 
  MarketData, 
  OrderParams, 
  OrderResult, 
  AccountInfo, 
  ExchangeCredentials,
  OrderStatus
} from '../types';
import { handleExchangeError } from '../error-handling';
import { createHmac } from 'crypto';

// Hyperliquid API URLs
const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz';
const HYPERLIQUID_TESTNET_API_URL = 'https://api.testnet.hyperliquid.xyz';

// Interface for Hyperliquid specific types
interface HyperliquidMetadata {
  chainId: number;
  time: number;
  universe: string;
}

interface HyperliquidAsset {
  name: string;
  ticker: string;
  currency: string;
  index: number;
  oraclePrice: string;
  fundingRate: string;
  openInterest: string;
  // Add more fields as needed
}

export class HyperliquidConnector extends BaseExchangeConnector {
  private apiUrl: string;
  private useTestnet: boolean;
  private universe: string = 'main';
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  // Rate limit settings
  private maxRequestsPerSecond: number = 10;
  private requestResetIntervalMs: number = 1000; // 1 second
  
  name: string = 'Hyperliquid';
  
  constructor(useTestnet: boolean = false, universe: string = 'main') {
    super();
    this.useTestnet = useTestnet;
    this.apiUrl = useTestnet ? HYPERLIQUID_TESTNET_API_URL : HYPERLIQUID_API_URL;
    this.universe = universe;
    
    // Set up automatic rate limit reset
    setInterval(() => {
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    }, this.requestResetIntervalMs);
  }
  
  /**
   * Perform connection to Hyperliquid
   */
  protected async performConnect(credentials: ExchangeCredentials): Promise<boolean> {
    try {
      // Validate credentials by making a simple API call
      // For Hyperliquid, we'll check user info
      const response = await this.fetchUserState(credentials);
      
      // If no error is thrown, the connection is successful
      return true;
    } catch (error) {
      throw handleExchangeError(error, 'Failed to connect to Hyperliquid');
    }
  }
  
  /**
   * Perform disconnection from Hyperliquid
   */
  protected async performDisconnect(): Promise<boolean> {
    // For REST API, there's no actual disconnection needed
    this._credentials = undefined;
    return true;
  }
  
  /**
   * Get market data for a symbol
   */
  protected async performGetMarketData(symbol: string): Promise<MarketData> {
    try {
      // Normalize the symbol format to Hyperliquid format (remove any trailing digits)
      const hyperliquidSymbol = this.formatSymbolForHyperliquid(symbol);
      
      // Get metadata
      const metaResponse = await this.fetchMetadata();
      
      // Get all assets info
      const assetsResponse = await this.fetchAllAssets();
      
      // Find the specific asset
      const asset = assetsResponse.find((a: HyperliquidAsset) => 
        a.ticker.toLowerCase() === hyperliquidSymbol.toLowerCase()
      );
      
      if (!asset) {
        throw new Error(`Asset ${symbol} not found on Hyperliquid`);
      }
      
      // Get L2 orderbook to extract best bid/ask
      const orderBookData = await this.fetchOrderBook(asset.name);
      const bestBid = orderBookData.levels.bids.length > 0 ? 
        parseFloat(orderBookData.levels.bids[0].px) : 0;
      const bestAsk = orderBookData.levels.asks.length > 0 ? 
        parseFloat(orderBookData.levels.asks[0].px) : 0;
      
      return {
        symbol,
        exchange: this.name,
        price: parseFloat(asset.oraclePrice),
        bid: bestBid,
        ask: bestAsk,
        volume24h: 0, // Not directly available from API, would need to calculate from trades
        change24h: 0, // Not directly available from API
        high24h: 0, // Not directly available from API
        low24h: 0, // Not directly available from API
        timestamp: metaResponse.time
      };
    } catch (error) {
      throw handleExchangeError(error, `Failed to get market data for ${symbol}`);
    }
  }
  
  /**
   * Get the order book for a symbol
   */
  protected async performGetOrderBook(symbol: string, limit: number = 10): Promise<{
    bids: [number, number][];
    asks: [number, number][];
    timestamp: number;
  }> {
    try {
      // Normalize the symbol format
      const hyperliquidSymbol = this.formatSymbolForHyperliquid(symbol);
      
      // Get all assets to map symbol to name
      const assetsResponse = await this.fetchAllAssets();
      const asset = assetsResponse.find((a: HyperliquidAsset) => 
        a.ticker.toLowerCase() === hyperliquidSymbol.toLowerCase()
      );
      
      if (!asset) {
        throw new Error(`Asset ${symbol} not found on Hyperliquid`);
      }
      
      // Get L2 orderbook
      const orderBookData = await this.fetchOrderBook(asset.name, limit);
      
      // Format response
      return {
        bids: orderBookData.levels.bids
          .slice(0, limit)
          .map((bid: any) => [parseFloat(bid.px), parseFloat(bid.sz)]),
        asks: orderBookData.levels.asks
          .slice(0, limit)
          .map((ask: any) => [parseFloat(ask.px), parseFloat(ask.sz)]),
        timestamp: Date.now() // Use current time as timestamp, not provided in API
      };
    } catch (error) {
      throw handleExchangeError(error, `Failed to get order book for ${symbol}`);
    }
  }
  
  /**
   * Place a new order
   */
  protected async performPlaceOrder(params: OrderParams): Promise<OrderResult> {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      // Normalize the symbol format
      const hyperliquidSymbol = this.formatSymbolForHyperliquid(params.symbol);
      
      // Get all assets to map symbol to name
      const assetsResponse = await this.fetchAllAssets();
      const asset = assetsResponse.find((a: HyperliquidAsset) => 
        a.ticker.toLowerCase() === hyperliquidSymbol.toLowerCase()
      );
      
      if (!asset) {
        throw new Error(`Asset ${params.symbol} not found on Hyperliquid`);
      }
      
      // Build the order action
      const orderAction = {
        a: {
          t: params.type === 'market' ? 'm' : 'l', // m for market, l for limit
          s: params.side === 'buy' ? 'b' : 's', // b for buy, s for sell
          amt: params.quantity.toString(),
          asset: asset.name
        }
      };
      
      // Add limit price if it's a limit order
      if (params.type === 'limit' && params.price) {
        orderAction.a.lim = params.price.toString();
      }
      
      // Add reduce only flag if needed
      // orderAction.a.reduce = false;
      
      // Add client order id if provided
      if (params.clientOrderId) {
        orderAction.a.cloid = params.clientOrderId;
      }
      
      // Send the order request
      const response = await this.signAndSend(
        '/exchange/v1/order',
        [orderAction],
        this._credentials
      );
      
      // Get the order status
      const orderStatus = await this.fetchOrderStatus(response.statuses[0].oid, asset.name);
      
      // Map to our OrderResult format
      return this.mapHyperliquidOrderToOrderResult(orderStatus, asset.name);
    } catch (error) {
      throw handleExchangeError(error, 'Failed to place order');
    }
  }
  
  /**
   * Cancel an existing order
   */
  protected async performCancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      // Normalize the symbol format
      const hyperliquidSymbol = this.formatSymbolForHyperliquid(symbol);
      
      // Get all assets to map symbol to name
      const assetsResponse = await this.fetchAllAssets();
      const asset = assetsResponse.find((a: HyperliquidAsset) => 
        a.ticker.toLowerCase() === hyperliquidSymbol.toLowerCase()
      );
      
      if (!asset) {
        throw new Error(`Asset ${symbol} not found on Hyperliquid`);
      }
      
      // Build the cancel action
      const cancelAction = {
        a: {
          oid: orderId,
          asset: asset.name
        }
      };
      
      // Send the cancel request
      const response = await this.signAndSend(
        '/exchange/v1/cancel',
        [cancelAction],
        this._credentials
      );
      
      // Check the status
      return response.statuses[0].status === 'ok';
    } catch (error) {
      throw handleExchangeError(error, `Failed to cancel order ${orderId}`);
    }
  }
  
  /**
   * Get the status of an order
   */
  protected async performGetOrderStatus(orderId: string, symbol: string): Promise<OrderResult> {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      // Normalize the symbol format
      const hyperliquidSymbol = this.formatSymbolForHyperliquid(symbol);
      
      // Get all assets to map symbol to name
      const assetsResponse = await this.fetchAllAssets();
      const asset = assetsResponse.find((a: HyperliquidAsset) => 
        a.ticker.toLowerCase() === hyperliquidSymbol.toLowerCase()
      );
      
      if (!asset) {
        throw new Error(`Asset ${symbol} not found on Hyperliquid`);
      }
      
      // Fetch the order status
      const orderStatus = await this.fetchOrderStatus(orderId, asset.name);
      
      // Map to our OrderResult format
      return this.mapHyperliquidOrderToOrderResult(orderStatus, asset.name);
    } catch (error) {
      throw handleExchangeError(error, `Failed to get status for order ${orderId}`);
    }
  }
  
  /**
   * Get all open orders
   */
  protected async performGetOpenOrders(symbol?: string): Promise<OrderResult[]> {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      // Fetch the user state
      const userState = await this.fetchUserState(this._credentials);
      
      // Get all assets info to map names to tickers
      const assetsResponse = await this.fetchAllAssets();
      
      // Filter orders by symbol if provided
      let openOrders = userState.openOrders;
      if (symbol) {
        const hyperliquidSymbol = this.formatSymbolForHyperliquid(symbol);
        const asset = assetsResponse.find((a: HyperliquidAsset) => 
          a.ticker.toLowerCase() === hyperliquidSymbol.toLowerCase()
        );
        
        if (!asset) {
          throw new Error(`Asset ${symbol} not found on Hyperliquid`);
        }
        
        openOrders = openOrders.filter((order: any) => order.asset === asset.name);
      }
      
      // Map to our OrderResult format
      return openOrders.map((order: any) => {
        // Find the asset ticker for this order
        const asset = assetsResponse.find((a: HyperliquidAsset) => a.name === order.asset);
        return this.mapHyperliquidOrderToOrderResult(order, asset?.name || order.asset);
      });
    } catch (error) {
      throw handleExchangeError(error, 'Failed to get open orders');
    }
  }
  
  /**
   * Get account information including balances
   */
  protected async performGetAccountInfo(): Promise<AccountInfo> {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      // Fetch the user state
      const userState = await this.fetchUserState(this._credentials);
      
      // Map to our AccountInfo format
      return {
        balances: [
          {
            asset: 'USD', // Hyperliquid uses USD as the settlement currency
            free: parseFloat(userState.crossMarginSummary.accountValue), // Total account value
            locked: parseFloat(userState.crossMarginSummary.totalMargin || '0') // Amount used as margin
          }
        ],
        permissions: [] // Hyperliquid doesn't provide permissions info
      };
    } catch (error) {
      throw handleExchangeError(error, 'Failed to get account information');
    }
  }
  
  /**
   * Subscribe to real-time price updates (not implemented for REST-only connector)
   */
  protected async performSubscribePriceUpdates(
    symbols: string[],
    callback: (data: MarketData) => void
  ): Promise<boolean> {
    // For REST API connector, use WebSocket manager instead for real-time data
    console.warn('REST API connector does not support real-time price updates. Use WebSocketManager instead.');
    return false;
  }
  
  /**
   * Unsubscribe from price updates (not implemented for REST-only connector)
   */
  protected async performUnsubscribePriceUpdates(symbols: string[]): Promise<boolean> {
    // For REST API connector, use WebSocket manager instead for real-time data
    return false;
  }
  
  // --- Helper methods for Hyperliquid specific API calls ---
  
  /**
   * Fetch metadata from Hyperliquid
   */
  private async fetchMetadata(): Promise<HyperliquidMetadata> {
    try {
      const response = await this.sendPublicRequest('/info/meta', {});
      return response;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Fetch all assets information
   */
  private async fetchAllAssets(): Promise<HyperliquidAsset[]> {
    try {
      const response = await this.sendPublicRequest('/info/allMids', {});
      return response;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Fetch order book for an asset
   */
  private async fetchOrderBook(assetName: string, depth: number = 10) {
    try {
      const response = await this.sendPublicRequest('/orderbook/l2Snapshot', {
        asset: assetName,
        n: depth
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Fetch user state (account info, positions, orders)
   */
  private async fetchUserState(credentials: ExchangeCredentials) {
    try {
      const response = await this.signAndSend(
        '/exchange/v1/userState',
        {},
        credentials
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Fetch status of a specific order
   */
  private async fetchOrderStatus(orderId: string, assetName: string) {
    try {
      if (!this._credentials) {
        throw new Error('Not connected to exchange');
      }
      
      const response = await this.signAndSend(
        '/exchange/v1/order/status',
        {
          oid: orderId,
          asset: assetName
        },
        this._credentials
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Sign and send a request to Hyperliquid
   */
  private async signAndSend(
    endpoint: string,
    payload: any,
    credentials: ExchangeCredentials
  ): Promise<any> {
    try {
      // Generate signature using the Hyperliquid method
      const signature = this.generateHyperliquidSignature(payload, credentials.secretKey);
      
      // Track the request for rate limiting
      this.trackRequest();
      
      // Make the request
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': credentials.apiKey,
          'X-SIGNATURE': signature
        },
        body: JSON.stringify({
          universe: this.universe,
          payload
        })
      });
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Send a public request to the Hyperliquid API
   */
  private async sendPublicRequest(endpoint: string, payload: any): Promise<any> {
    try {
      // Track the request for rate limiting
      this.trackRequest();
      
      // Make the request
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          universe: this.universe,
          ...payload
        })
      });
      
      // Handle response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate a signature for a Hyperliquid API request
   */
  private generateHyperliquidSignature(payload: any, secretKey: string): string {
    const message = JSON.stringify(payload);
    return createHmac('sha256', secretKey)
      .update(message)
      .digest('hex');
  }
  
  /**
   * Track an API request for rate limiting
   */
  private trackRequest(): void {
    const now = Date.now();
    this.requestCount += 1;
    
    // Check if we're approaching rate limits
    if (this.requestCount >= this.maxRequestsPerSecond * 0.8) {
      const remainingTime = this.requestResetIntervalMs - (now - this.lastRequestTime);
      console.warn(`Approaching Hyperliquid rate limit: ${this.requestCount}/${this.maxRequestsPerSecond}. Reset in ${remainingTime}ms`);
    }
    
    // If we hit the rate limit, delay the request
    if (this.requestCount >= this.maxRequestsPerSecond) {
      const remainingTime = this.requestResetIntervalMs - (now - this.lastRequestTime);
      console.warn(`Hyperliquid rate limit hit: ${this.requestCount}/${this.maxRequestsPerSecond}. Waiting ${remainingTime}ms`);
      
      // In a real implementation, we would queue the request here
    }
  }
  
  /**
   * Format a trading pair symbol to Hyperliquid format
   */
  private formatSymbolForHyperliquid(symbol: string): string {
    // Remove any spaces
    symbol = symbol.trim();
    
    // Convert format like "BTC/USD" to "BTC" (Hyperliquid only uses the base asset)
    if (symbol.includes('/')) {
      return symbol.split('/')[0];
    }
    
    return symbol;
  }
  
  /**
   * Map Hyperliquid order to our OrderResult format
   */
  private mapHyperliquidOrderToOrderResult(order: any, assetName: string): OrderResult {
    // Map status
    let status: OrderStatus;
    const orderStatus = order.status || '';
    
    switch (orderStatus.toLowerCase()) {
      case 'open':
      case 'pending':
        status = 'new';
        break;
      case 'partial':
        status = 'partially_filled';
        break;
      case 'filled':
      case 'complete':
        status = 'filled';
        break;
      case 'cancelled':
      case 'canceled':
        status = 'canceled';
        break;
      case 'failed':
      case 'rejected':
        status = 'rejected';
        break;
      default:
        status = 'new';
    }
    
    // For Hyperliquid, we need to determine the order type
    const orderType = order.type === 'm' ? 'market' : 'limit';
    
    // Determine side
    const side = order.side === 'b' ? 'buy' : 'sell';
    
    return {
      id: order.oid || '',
      clientOrderId: order.cloid || '',
      symbol: assetName, // We only have asset name, not the full symbol
      side: side as 'buy' | 'sell',
      type: orderType as 'market' | 'limit' | 'stop' | 'stop_limit',
      status,
      quantity: parseFloat(order.sz || order.amount || '0'),
      price: order.px ? parseFloat(order.px) : undefined,
      stopPrice: undefined, // Hyperliquid doesn't support stop orders in the same way
      executedQuantity: parseFloat(order.filled || '0'),
      executedPrice: order.fillPx ? parseFloat(order.fillPx) : undefined,
      timeInForce: 'GTC', // Hyperliquid defaults to GTC
      createdAt: order.timestamp || Date.now(),
      updatedAt: order.lastUpdate || Date.now()
    };
  }
}
