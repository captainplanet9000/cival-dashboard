import { ExchangeAdapter, ExchangeCredentials, ConnectionResult, Market, Ticker, OrderBook, 
  Subscription, Balance, Position, OrderRequest, Order, Trade, PublicTrade } from './exchange-adapter';
import { createHmac } from 'crypto';

/**
 * Coinbase Exchange Adapter
 * Implements the ExchangeAdapter interface for Coinbase Advanced Trade API
 */
export class CoinbaseAdapter implements ExchangeAdapter {
  private apiKey: string = '';
  private apiSecret: string = '';
  private baseUrl: string = 'https://api.exchange.coinbase.com';
  private websocketUrl: string = 'wss://advanced-trade-ws.coinbase.com';
  private isConnected: boolean = false;
  private websocket: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private apiHeaders: HeadersInit = {};

  /**
   * Connect to Coinbase with API credentials
   */
  async connect(credentials: ExchangeCredentials): Promise<ConnectionResult> {
    try {
      this.apiKey = credentials.apiKey;
      this.apiSecret = credentials.apiSecret;
      
      // Test connection with a simple account request
      const accounts = await this.getBalances();
      
      this.isConnected = true;
      return {
        success: true,
        message: 'Successfully connected to Coinbase',
        permissions: {
          trading: true,
          margin: false, // Coinbase doesn't support margin by default
          futures: false, // Coinbase doesn't support futures by default
          withdrawal: false // Assume no withdrawal permission unless specified
        }
      };
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        message: `Failed to connect to Coinbase: ${error.message}`
      };
    }
  }

  /**
   * Disconnect from Coinbase
   */
  async disconnect(): Promise<void> {
    this.closeWebsocket();
    this.isConnected = false;
    this.apiKey = '';
    this.apiSecret = '';
  }

  /**
   * Check if connected to Coinbase
   */
  async checkConnection(): Promise<boolean> {
    if (!this.isConnected) return false;
    
    try {
      await this.getBalances();
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get available markets from Coinbase
   */
  async getMarkets(): Promise<Market[]> {
    const response = await this.sendRequest('/products', 'GET');
    
    return response.map(product => ({
      symbol: product.id,
      baseCurrency: product.base_currency,
      quoteCurrency: product.quote_currency,
      pricePrecision: product.quote_increment ? Math.log10(1 / parseFloat(product.quote_increment)) : 8,
      quantityPrecision: product.base_increment ? Math.log10(1 / parseFloat(product.base_increment)) : 8,
      minQuantity: parseFloat(product.base_min_size),
      maxQuantity: parseFloat(product.base_max_size),
      minNotional: parseFloat(product.min_market_funds),
      status: product.status === 'online' ? 'active' : 'inactive',
      type: 'spot',
      metadata: {
        trading_disabled: product.status !== 'online',
        post_only: product.post_only,
        limit_only: product.limit_only,
        cancel_only: product.cancel_only
      }
    }));
  }

  /**
   * Get ticker for a symbol
   */
  async getTicker(symbol: string): Promise<Ticker> {
    const response = await this.sendRequest(`/products/${symbol}/ticker`, 'GET');
    
    return {
      symbol: symbol,
      bid: parseFloat(response.bid),
      ask: parseFloat(response.ask),
      last: parseFloat(response.price),
      high: 0, // Not provided in this endpoint
      low: 0, // Not provided in this endpoint
      volume: parseFloat(response.volume),
      quoteVolume: parseFloat(response.volume) * parseFloat(response.price),
      timestamp: new Date(response.time),
      percentChange24h: 0 // Not provided in this endpoint
    };
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol: string, depth: number = 50): Promise<OrderBook> {
    const response = await this.sendRequest(`/products/${symbol}/book?level=2`, 'GET');
    
    return {
      symbol: symbol,
      bids: response.bids.slice(0, depth).map(bid => [parseFloat(bid[0]), parseFloat(bid[1])]),
      asks: response.asks.slice(0, depth).map(ask => [parseFloat(ask[0]), parseFloat(ask[1])]),
      timestamp: new Date()
    };
  }

  /**
   * Subscribe to ticker updates
   */
  async subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): Promise<Subscription> {
    const channelName = 'ticker';
    const subscriptionId = `${channelName}-${symbol}`;
    
    await this.initWebsocket();
    
    const message = {
      type: 'subscribe',
      product_ids: [symbol],
      channels: [channelName]
    };
    
    this.websocket?.send(JSON.stringify(message));
    
    const subscription: Subscription = {
      id: subscriptionId,
      unsubscribe: async () => {
        if (this.websocket?.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({
            type: 'unsubscribe',
            product_ids: [symbol],
            channels: [channelName]
          }));
        }
        this.subscriptions.delete(subscriptionId);
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Handle ticker messages from websocket
    this.handleWebsocketMessage((data) => {
      if (data.type === 'ticker' && data.product_id === symbol) {
        const ticker: Ticker = {
          symbol: data.product_id,
          bid: parseFloat(data.best_bid),
          ask: parseFloat(data.best_ask),
          last: parseFloat(data.price),
          high: 0, // Not provided in ticker stream
          low: 0, // Not provided in ticker stream
          volume: parseFloat(data.volume_24h),
          quoteVolume: 0, // Not provided in ticker stream
          timestamp: new Date(data.time),
          percentChange24h: parseFloat(data.price_change_percentage)
        };
        
        callback(ticker);
      }
    });
    
    return subscription;
  }

  /**
   * Subscribe to order book updates
   */
  async subscribeToOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): Promise<Subscription> {
    const channelName = 'level2';
    const subscriptionId = `${channelName}-${symbol}`;
    
    await this.initWebsocket();
    
    const message = {
      type: 'subscribe',
      product_ids: [symbol],
      channels: [channelName]
    };
    
    this.websocket?.send(JSON.stringify(message));
    
    // Store the current order book
    let currentOrderBook: OrderBook = {
      symbol,
      bids: [],
      asks: [],
      timestamp: new Date()
    };
    
    // Initialize order book with snapshot
    const snapshot = await this.getOrderBook(symbol);
    currentOrderBook = snapshot;
    callback(currentOrderBook);
    
    const subscription: Subscription = {
      id: subscriptionId,
      unsubscribe: async () => {
        if (this.websocket?.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({
            type: 'unsubscribe',
            product_ids: [symbol],
            channels: [channelName]
          }));
        }
        this.subscriptions.delete(subscriptionId);
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Handle order book messages from websocket
    this.handleWebsocketMessage((data) => {
      if (data.type === 'l2update' && data.product_id === symbol) {
        // Update the order book
        const updates = data.changes;
        const timestamp = new Date(data.time);
        
        for (const update of updates) {
          const side = update[0];
          const price = parseFloat(update[1]);
          const size = parseFloat(update[2]);
          
          if (side === 'buy') {
            // Update bids
            const existingBidIndex = currentOrderBook.bids.findIndex(bid => bid[0] === price);
            if (size === 0 && existingBidIndex !== -1) {
              // Remove price level
              currentOrderBook.bids.splice(existingBidIndex, 1);
            } else if (size > 0) {
              if (existingBidIndex !== -1) {
                // Update price level
                currentOrderBook.bids[existingBidIndex] = [price, size];
              } else {
                // Add new price level
                currentOrderBook.bids.push([price, size]);
                // Sort bids in descending order
                currentOrderBook.bids.sort((a, b) => b[0] - a[0]);
              }
            }
          } else if (side === 'sell') {
            // Update asks
            const existingAskIndex = currentOrderBook.asks.findIndex(ask => ask[0] === price);
            if (size === 0 && existingAskIndex !== -1) {
              // Remove price level
              currentOrderBook.asks.splice(existingAskIndex, 1);
            } else if (size > 0) {
              if (existingAskIndex !== -1) {
                // Update price level
                currentOrderBook.asks[existingAskIndex] = [price, size];
              } else {
                // Add new price level
                currentOrderBook.asks.push([price, size]);
                // Sort asks in ascending order
                currentOrderBook.asks.sort((a, b) => a[0] - b[0]);
              }
            }
          }
        }
        
        currentOrderBook.timestamp = timestamp;
        callback(currentOrderBook);
      }
    });
    
    return subscription;
  }

  /**
   * Subscribe to public trades
   */
  async subscribeToTrades(symbol: string, callback: (trade: PublicTrade) => void): Promise<Subscription> {
    const channelName = 'matches';
    const subscriptionId = `${channelName}-${symbol}`;
    
    await this.initWebsocket();
    
    const message = {
      type: 'subscribe',
      product_ids: [symbol],
      channels: [channelName]
    };
    
    this.websocket?.send(JSON.stringify(message));
    
    const subscription: Subscription = {
      id: subscriptionId,
      unsubscribe: async () => {
        if (this.websocket?.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({
            type: 'unsubscribe',
            product_ids: [symbol],
            channels: [channelName]
          }));
        }
        this.subscriptions.delete(subscriptionId);
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Handle trade messages from websocket
    this.handleWebsocketMessage((data) => {
      if (data.type === 'match' && data.product_id === symbol) {
        const trade: PublicTrade = {
          id: data.trade_id.toString(),
          symbol: data.product_id,
          price: parseFloat(data.price),
          quantity: parseFloat(data.size),
          side: data.side === 'buy' ? 'buy' : 'sell',
          timestamp: new Date(data.time)
        };
        
        callback(trade);
      }
    });
    
    return subscription;
  }

  /**
   * Get account balances
   */
  async getBalances(): Promise<Balance[]> {
    const response = await this.sendRequest('/accounts', 'GET');
    
    return response.map(account => ({
      currency: account.currency,
      available: parseFloat(account.available),
      total: parseFloat(account.balance),
      inOrder: parseFloat(account.hold),
      btcValue: 0 // Not provided by Coinbase
    }));
  }

  /**
   * Get open positions (Coinbase doesn't have concept of positions for spot trading)
   */
  async getPositions(symbol?: string): Promise<Position[]> {
    // For spot exchange, we derive positions from balances
    const balances = await this.getBalances();
    const markets = await this.getMarkets();
    const positions: Position[] = [];
    
    // Filter balances with non-zero total
    const nonZeroBalances = balances.filter(balance => balance.total > 0);
    
    for (const balance of nonZeroBalances) {
      const currency = balance.currency;
      
      // Skip fiat currencies for positioning
      if (['USD', 'USDT', 'USDC', 'EUR', 'GBP'].includes(currency)) {
        continue;
      }
      
      // Find all markets where this currency is the base
      const relatedMarkets = markets.filter(market => 
        market.baseCurrency === currency && market.status === 'active'
      );
      
      for (const market of relatedMarkets) {
        // Get current price
        try {
          const ticker = await this.getTicker(market.symbol);
          
          positions.push({
            symbol: market.symbol,
            side: 'long', // Spot positions are always long
            quantity: balance.total,
            entryPrice: 0, // Coinbase doesn't provide average entry price
            markPrice: ticker.last,
            unrealizedPnl: 0, // Cannot calculate without entry price
            timestamp: new Date()
          });
          
          // If we're looking for a specific symbol, break after finding it
          if (symbol && market.symbol === symbol) {
            break;
          }
        } catch (error) {
          console.error(`Error getting ticker for ${market.symbol}:`, error);
        }
      }
    }
    
    // Filter by symbol if provided
    if (symbol) {
      return positions.filter(position => position.symbol === symbol);
    }
    
    return positions;
  }

  /**
   * Place an order on Coinbase
   */
  async placeOrder(params: OrderRequest): Promise<Order> {
    const orderType = this.mapOrderType(params.type);
    
    const orderData: any = {
      product_id: params.symbol,
      side: params.side,
      size: params.quantity.toString()
    };
    
    if (orderType === 'limit') {
      orderData.type = 'limit';
      orderData.price = params.price?.toString() || '0';
      
      if (params.timeInForce) {
        orderData.time_in_force = this.mapTimeInForce(params.timeInForce);
      }
      
      if (params.postOnly) {
        orderData.post_only = true;
      }
    } else {
      orderData.type = 'market';
    }
    
    if (params.clientOrderId) {
      orderData.client_oid = params.clientOrderId;
    }
    
    const response = await this.sendRequest('/orders', 'POST', orderData);
    
    return this.mapCoinbaseOrder(response);
  }

  /**
   * Cancel an order on Coinbase
   */
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      await this.sendRequest(`/orders/${orderId}`, 'DELETE');
      return true;
    } catch (error) {
      if (error.status === 404) {
        // Order not found, consider it already canceled
        return true;
      }
      throw error;
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string, symbol: string): Promise<Order> {
    const response = await this.sendRequest(`/orders/${orderId}`, 'GET');
    return this.mapCoinbaseOrder(response);
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    let endpoint = '/orders?status=open';
    
    if (symbol) {
      endpoint += `&product_id=${symbol}`;
    }
    
    const response = await this.sendRequest(endpoint, 'GET');
    return response.map(this.mapCoinbaseOrder);
  }

  /**
   * Get order history
   */
  async getOrderHistory(symbol?: string, since?: Date, limit: number = 100): Promise<Order[]> {
    let endpoint = `/orders?status=all&limit=${limit}`;
    
    if (symbol) {
      endpoint += `&product_id=${symbol}`;
    }
    
    if (since) {
      endpoint += `&start_date=${since.toISOString()}`;
    }
    
    const response = await this.sendRequest(endpoint, 'GET');
    return response.map(this.mapCoinbaseOrder);
  }

  /**
   * Get trade history
   */
  async getTrades(symbol?: string, since?: Date, limit: number = 100): Promise<Trade[]> {
    if (!symbol) {
      throw new Error('Symbol is required for fetching trade history on Coinbase');
    }
    
    let endpoint = `/orders/${symbol}/fills`;
    
    if (since) {
      endpoint += `?start_date=${since.toISOString()}`;
    }
    
    if (limit) {
      endpoint += `${since ? '&' : '?'}limit=${limit}`;
    }
    
    const response = await this.sendRequest(endpoint, 'GET');
    
    return response.map(fill => ({
      id: fill.trade_id.toString(),
      orderId: fill.order_id,
      symbol: fill.product_id,
      side: fill.side,
      quantity: parseFloat(fill.size),
      price: parseFloat(fill.price),
      fee: parseFloat(fill.fee),
      feeCurrency: 'USD', // Coinbase fees are in USD
      timestamp: new Date(fill.created_at),
      rawExchangeData: fill
    }));
  }

  /**
   * Initialize WebSocket connection
   */
  private async initWebsocket(): Promise<void> {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      this.closeWebsocket();
      
      this.websocket = new WebSocket(this.websocketUrl);
      
      this.websocket.onopen = () => {
        console.log('Coinbase WebSocket connected');
        resolve();
      };
      
      this.websocket.onerror = (error) => {
        console.error('Coinbase WebSocket error:', error);
        reject(error);
      };
      
      this.websocket.onclose = () => {
        console.log('Coinbase WebSocket closed');
      };
    });
  }

  /**
   * Close WebSocket connection
   */
  private closeWebsocket(): void {
    if (this.websocket) {
      try {
        this.websocket.close();
      } catch (error) {
        console.error('Error closing Coinbase WebSocket:', error);
      } finally {
        this.websocket = null;
      }
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebsocketMessage(handler: (data: any) => void): void {
    if (!this.websocket) return;
    
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        handler(data);
      } catch (error) {
        console.error('Error handling Coinbase WebSocket message:', error);
      }
    };
  }

  /**
   * Send API request to Coinbase
   */
  private async sendRequest(endpoint: string, method: string, data?: any): Promise<any> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Coinbase API credentials not set');
    }
    
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const requestPath = `/api${endpoint}`;
    const body = data ? JSON.stringify(data) : '';
    
    const message = timestamp + method + requestPath + body;
    const signature = createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64');
    
    const headers: HeadersInit = {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: data ? body : undefined
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Coinbase API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  }

  /**
   * Map Coinbase order to standardized Order format
   */
  private mapCoinbaseOrder(coinbaseOrder: any): Order {
    return {
      id: coinbaseOrder.id,
      clientOrderId: coinbaseOrder.client_oid,
      symbol: coinbaseOrder.product_id,
      type: this.reverseMapOrderType(coinbaseOrder.type),
      side: coinbaseOrder.side,
      status: this.mapOrderStatus(coinbaseOrder.status),
      quantity: parseFloat(coinbaseOrder.size),
      filledQuantity: parseFloat(coinbaseOrder.filled_size),
      remainingQuantity: parseFloat(coinbaseOrder.size) - parseFloat(coinbaseOrder.filled_size),
      price: coinbaseOrder.price ? parseFloat(coinbaseOrder.price) : undefined,
      avgFillPrice: coinbaseOrder.executed_value && coinbaseOrder.filled_size
        ? parseFloat(coinbaseOrder.executed_value) / parseFloat(coinbaseOrder.filled_size)
        : undefined,
      timestamp: new Date(coinbaseOrder.created_at),
      lastUpdateTime: coinbaseOrder.done_at ? new Date(coinbaseOrder.done_at) : undefined,
      timeInForce: this.reverseMapTimeInForce(coinbaseOrder.time_in_force),
      postOnly: coinbaseOrder.post_only,
      rawExchangeData: coinbaseOrder
    };
  }

  /**
   * Map order type to Coinbase format
   */
  private mapOrderType(type: string): string {
    switch (type) {
      case 'market':
        return 'market';
      case 'limit':
      case 'post_only':
        return 'limit';
      case 'stop':
        return 'stop';
      case 'stop_limit':
        return 'stop_limit';
      default:
        return 'limit';
    }
  }

  /**
   * Reverse map order type from Coinbase format
   */
  private reverseMapOrderType(type: string): string {
    switch (type) {
      case 'market':
        return 'market';
      case 'limit':
        return 'limit';
      case 'stop':
        return 'stop';
      case 'stop_limit':
        return 'stop_limit';
      default:
        return type;
    }
  }

  /**
   * Map time in force to Coinbase format
   */
  private mapTimeInForce(timeInForce: string): string {
    switch (timeInForce) {
      case 'GTC':
        return 'GTC';
      case 'IOC':
        return 'IOC';
      case 'FOK':
        return 'FOK';
      default:
        return 'GTC';
    }
  }

  /**
   * Reverse map time in force from Coinbase format
   */
  private reverseMapTimeInForce(timeInForce: string): string {
    switch (timeInForce) {
      case 'GTC':
        return 'GTC';
      case 'IOC':
        return 'IOC';
      case 'FOK':
        return 'FOK';
      default:
        return timeInForce;
    }
  }

  /**
   * Map order status from Coinbase format
   */
  private mapOrderStatus(status: string): 'new' | 'open' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired' {
    switch (status) {
      case 'pending':
        return 'new';
      case 'open':
        return 'open';
      case 'active':
        return 'open';
      case 'partially_filled':
        return 'partially_filled';
      case 'filled':
        return 'filled';
      case 'done':
        return 'filled';
      case 'canceled':
        return 'canceled';
      case 'rejected':
        return 'rejected';
      default:
        return 'open';
    }
  }
}
