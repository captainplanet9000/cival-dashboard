import { ExchangeAdapter, ExchangeCredentials, ConnectionResult, Market, Ticker, OrderBook, 
  Subscription, Balance, Position, OrderRequest, Order, Trade, PublicTrade } from './exchange-adapter';
import { createHmac } from 'crypto';

/**
 * Hyperliquid Exchange Adapter
 * Implements the ExchangeAdapter interface for Hyperliquid API
 */
export class HyperliquidAdapter implements ExchangeAdapter {
  private apiKey: string = '';
  private apiSecret: string = '';
  private baseUrl: string = 'https://api.hyperliquid.xyz';
  private wsUrl: string = 'wss://api.hyperliquid.xyz/ws';
  private isConnected: boolean = false;
  private websocket: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();

  /**
   * Connect to Hyperliquid with API credentials
   */
  async connect(credentials: ExchangeCredentials): Promise<ConnectionResult> {
    try {
      this.apiKey = credentials.apiKey;
      this.apiSecret = credentials.apiSecret;
      
      // Test connection with a user balance request
      await this.getBalances();
      
      this.isConnected = true;
      return {
        success: true,
        message: 'Successfully connected to Hyperliquid',
        permissions: {
          trading: true,
          margin: true,
          futures: true,
          withdrawal: false // Assume no withdrawal permission unless specified
        }
      };
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        message: `Failed to connect to Hyperliquid: ${error.message}`
      };
    }
  }

  /**
   * Disconnect from Hyperliquid
   */
  async disconnect(): Promise<void> {
    this.closeWebsocket();
    this.isConnected = false;
    this.apiKey = '';
    this.apiSecret = '';
  }

  /**
   * Check if connected to Hyperliquid
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
   * Get available markets from Hyperliquid
   */
  async getMarkets(): Promise<Market[]> {
    const response = await this.sendRequest('/info', 'GET');
    
    const markets: Market[] = [];
    
    for (const meta of response.universe.metas) {
      markets.push({
        symbol: meta.name,
        baseCurrency: meta.name,
        quoteCurrency: 'USD',
        pricePrecision: 6,
        quantityPrecision: 6,
        minQuantity: 0.001,
        maxQuantity: undefined,
        minNotional: 1,
        status: 'active',
        type: 'futures',
        metadata: {
          szDecimals: meta.szDecimals,
          maxLeverage: meta.maxLeverage,
          baseCurrency: meta.name,
          oraclePrice: meta.oraclePriceX18
        }
      });
    }
    
    return markets;
  }

  /**
   * Get ticker for a symbol
   */
  async getTicker(symbol: string): Promise<Ticker> {
    const response = await this.sendRequest('/info', 'GET');
    
    const assetIndex = response.universe.metas.findIndex(meta => meta.name === symbol);
    
    if (assetIndex === -1) {
      throw new Error(`Symbol ${symbol} not found`);
    }
    
    const metadata = response.universe.metas[assetIndex];
    const stateDayData = response.allMids[assetIndex];
    
    // Get 24h trading data
    const nowSeconds = Math.floor(Date.now() / 1000);
    const day24hAgo = nowSeconds - 24 * 60 * 60;
    
    const candleResponse = await this.sendRequest(`/candles`, 'POST', {
      coin: symbol,
      interval: '1h',
      startTime: day24hAgo,
      endTime: nowSeconds
    });
    
    let volume24h = 0;
    let high24h = 0;
    let low24h = Number.MAX_VALUE;
    
    if (candleResponse && candleResponse.length > 0) {
      for (const candle of candleResponse) {
        volume24h += parseFloat(candle.volume);
        high24h = Math.max(high24h, parseFloat(candle.high));
        low24h = Math.min(low24h, parseFloat(candle.low));
      }
    }
    
    // Current price from oracle
    const currentPrice = parseFloat(metadata.oraclePriceX18) / 1e18;
    
    return {
      symbol: symbol,
      bid: currentPrice * 0.9999, // Approximation as Hyperliquid API doesn't provide bid/ask directly
      ask: currentPrice * 1.0001, // Approximation
      last: currentPrice,
      high: high24h || currentPrice,
      low: low24h === Number.MAX_VALUE ? currentPrice : low24h,
      volume: volume24h,
      quoteVolume: volume24h * currentPrice,
      timestamp: new Date(),
      percentChange24h: 0 // Not directly available
    };
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol: string, depth: number = 50): Promise<OrderBook> {
    const response = await this.sendRequest(`/orderbook`, 'POST', {
      coin: symbol
    });
    
    return {
      symbol: symbol,
      bids: response.levels
        .filter(level => level.isBid)
        .slice(0, depth)
        .map(level => [parseFloat(level.px), parseFloat(level.sz)]),
      asks: response.levels
        .filter(level => !level.isBid)
        .slice(0, depth)
        .map(level => [parseFloat(level.px), parseFloat(level.sz)]),
      timestamp: new Date()
    };
  }

  /**
   * Subscribe to ticker updates
   */
  async subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): Promise<Subscription> {
    const topic = `ticker.${symbol}`;
    const subscriptionId = topic;
    
    await this.initWebsocket();
    
    const subscription: Subscription = {
      id: subscriptionId,
      unsubscribe: async () => {
        this.subscriptions.delete(subscriptionId);
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Hyperliquid doesn't have a direct ticker subscription, so we poll for updates
    const tickerInterval = setInterval(async () => {
      try {
        const ticker = await this.getTicker(symbol);
        callback(ticker);
      } catch (error) {
        console.error(`Error fetching ${symbol} ticker:`, error);
      }
    }, 5000);
    
    // Extend unsubscribe to clear interval
    const originalUnsubscribe = subscription.unsubscribe;
    subscription.unsubscribe = async () => {
      clearInterval(tickerInterval);
      await originalUnsubscribe();
    };
    
    return subscription;
  }

  /**
   * Subscribe to order book updates
   */
  async subscribeToOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): Promise<Subscription> {
    const topic = `orderbook.${symbol}`;
    const subscriptionId = topic;
    
    await this.initWebsocket();
    
    // Subscribe to L2 orderbook through WebSocket
    this.websocket?.send(JSON.stringify({
      method: "subscribe",
      subscription: {
        type: "l2Book",
        coin: symbol
      }
    }));
    
    const subscription: Subscription = {
      id: subscriptionId,
      unsubscribe: async () => {
        if (this.websocket?.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({
            method: "unsubscribe",
            subscription: {
              type: "l2Book",
              coin: symbol
            }
          }));
        }
        this.subscriptions.delete(subscriptionId);
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Handle orderbook messages from websocket
    this.handleWebsocketMessage((data) => {
      if (data.type === "l2Book" && data.coin === symbol) {
        const orderBook: OrderBook = {
          symbol: symbol,
          bids: data.data.levels
            .filter(level => level.isBid)
            .map(level => [parseFloat(level.px), parseFloat(level.sz)]),
          asks: data.data.levels
            .filter(level => !level.isBid)
            .map(level => [parseFloat(level.px), parseFloat(level.sz)]),
          timestamp: new Date()
        };
        
        callback(orderBook);
      }
    });
    
    return subscription;
  }

  /**
   * Subscribe to public trades
   */
  async subscribeToTrades(symbol: string, callback: (trade: PublicTrade) => void): Promise<Subscription> {
    const topic = `trades.${symbol}`;
    const subscriptionId = topic;
    
    await this.initWebsocket();
    
    // Subscribe to trades through WebSocket
    this.websocket?.send(JSON.stringify({
      method: "subscribe",
      subscription: {
        type: "trades",
        coin: symbol
      }
    }));
    
    const subscription: Subscription = {
      id: subscriptionId,
      unsubscribe: async () => {
        if (this.websocket?.readyState === WebSocket.OPEN) {
          this.websocket.send(JSON.stringify({
            method: "unsubscribe",
            subscription: {
              type: "trades",
              coin: symbol
            }
          }));
        }
        this.subscriptions.delete(subscriptionId);
      }
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Handle trade messages from websocket
    this.handleWebsocketMessage((data) => {
      if (data.type === "trades" && data.coin === symbol) {
        for (const tradeData of data.data) {
          const trade: PublicTrade = {
            id: tradeData.tid,
            symbol: symbol,
            price: parseFloat(tradeData.px),
            quantity: parseFloat(tradeData.sz),
            side: tradeData.side.toLowerCase(),
            timestamp: new Date(tradeData.time * 1000)
          };
          
          callback(trade);
        }
      }
    });
    
    return subscription;
  }

  /**
   * Get account balances
   */
  async getBalances(): Promise<Balance[]> {
    const response = await this.sendSignedRequest('/user', 'GET');
    
    const usdBalance = parseFloat(response.crossMarginSummary.accountValue) || 0;
    
    // Hyperliquid uses a universal USD-settled margin system
    return [{
      currency: 'USD',
      available: parseFloat(response.crossMarginSummary.accountValue) - parseFloat(response.crossMarginSummary.totalLockedCash),
      total: usdBalance,
      inOrder: parseFloat(response.crossMarginSummary.totalLockedCash) || 0,
      btcValue: 0 // Not directly available
    }];
  }

  /**
   * Get open positions
   */
  async getPositions(symbol?: string): Promise<Position[]> {
    const response = await this.sendSignedRequest('/user', 'GET');
    
    const positions: Position[] = [];
    
    if (response.assetPositions) {
      for (const position of response.assetPositions) {
        // Skip if filtering by symbol and it doesn't match
        if (symbol && position.coin !== symbol) continue;
        
        // Skip empty positions
        if (parseFloat(position.position.szi) === 0) continue;
        
        const posSize = parseFloat(position.position.szi);
        const entryPx = parseFloat(position.position.entryPx);
        const markPx = parseFloat(position.position.markPx);
        const liquidationPx = parseFloat(position.liquidationPx || '0');
        
        const unrealizedPnl = position.position.unrealizedPnl 
          ? parseFloat(position.position.unrealizedPnl) 
          : (posSize * (markPx - entryPx));
        
        positions.push({
          symbol: position.coin,
          side: posSize > 0 ? 'long' : 'short',
          quantity: Math.abs(posSize),
          entryPrice: entryPx,
          markPrice: markPx,
          liquidationPrice: liquidationPx,
          marginType: 'cross', // Hyperliquid uses cross margin
          leverage: parseFloat(position.leverage || '1'),
          unrealizedPnl: unrealizedPnl,
          collateral: parseFloat(position.notional || '0'),
          timestamp: new Date()
        });
      }
    }
    
    return positions;
  }

  /**
   * Place an order on Hyperliquid
   */
  async placeOrder(params: OrderRequest): Promise<Order> {
    const orderData: any = {
      coin: params.symbol,
      is_buy: params.side === 'buy',
      sz: params.quantity.toString(),
      limit_px: params.price ? params.price.toString() : "0"
    };
    
    // Map order type
    if (params.type === 'market') {
      orderData.order_type = {
        market: {}
      };
    } else if (params.type === 'limit') {
      orderData.order_type = {
        limit: {
          tif: params.timeInForce === 'IOC' ? 'Ioc' : 'Gtc'
        }
      };
      
      if (params.postOnly) {
        orderData.order_type.limit.post_only = true;
      }
    } else if (params.type === 'stop') {
      orderData.order_type = {
        trigger: {
          trigger_px: params.stopPrice?.toString() || "0",
          is_market: true,
          tif: "Gtc"
        }
      };
    } else if (params.type === 'stop_limit') {
      orderData.order_type = {
        trigger: {
          trigger_px: params.stopPrice?.toString() || "0",
          is_market: false,
          tif: "Gtc"
        }
      };
    }
    
    if (params.reduceOnly) {
      orderData.reduce_only = true;
    }
    
    const response = await this.sendSignedRequest('/orders', 'POST', {
      action: {
        order: orderData
      }
    });
    
    if (response.status !== 'ok') {
      throw new Error(`Failed to place order: ${response.message || JSON.stringify(response)}`);
    }
    
    // Get the order details (or construct from response)
    return {
      id: response.data?.oid || '',
      clientOrderId: '',
      symbol: params.symbol,
      type: params.type,
      side: params.side,
      status: 'new',
      quantity: params.quantity,
      filledQuantity: 0,
      remainingQuantity: params.quantity,
      price: params.price,
      stopPrice: params.stopPrice,
      timestamp: new Date(),
      timeInForce: params.timeInForce || 'GTC',
      reduceOnly: params.reduceOnly || false,
      postOnly: params.postOnly || false,
      rawExchangeData: response.data
    };
  }

  /**
   * Cancel an order on Hyperliquid
   */
  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    const response = await this.sendSignedRequest('/orders', 'POST', {
      action: {
        cancel: {
          coin: symbol,
          oid: Number(orderId)
        }
      }
    });
    
    return response.status === 'ok';
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string, symbol: string): Promise<Order> {
    const openOrders = await this.getOpenOrders(symbol);
    const matchingOrder = openOrders.find(order => order.id === orderId);
    
    if (matchingOrder) {
      return matchingOrder;
    }
    
    // If not found in open orders, check order history
    const response = await this.sendSignedRequest('/orders/status', 'POST', {
      coin: symbol,
      oid: Number(orderId)
    });
    
    if (response.status !== 'ok' || !response.data) {
      throw new Error(`Order not found: ${orderId}`);
    }
    
    return this.mapHyperliquidOrder(response.data, symbol);
  }

  /**
   * Get open orders
   */
  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const response = await this.sendSignedRequest('/orders/open', 'GET');
    
    const orders: Order[] = [];
    
    if (response.status === 'ok' && response.data) {
      for (const order of response.data) {
        // Skip if filtering by symbol and it doesn't match
        if (symbol && order.coin !== symbol) continue;
        
        orders.push(this.mapHyperliquidOrder(order, order.coin));
      }
    }
    
    return orders;
  }

  /**
   * Get order history
   */
  async getOrderHistory(symbol?: string, since?: Date, limit: number = 50): Promise<Order[]> {
    const response = await this.sendSignedRequest('/orders/history', 'GET');
    
    const orders: Order[] = [];
    
    if (response.status === 'ok' && response.data) {
      for (const order of response.data) {
        // Skip if filtering by symbol and it doesn't match
        if (symbol && order.coin !== symbol) continue;
        
        // Skip if filtering by date
        if (since && new Date(order.time) < since) continue;
        
        orders.push(this.mapHyperliquidOrder(order, order.coin));
        
        // Limit the number of orders returned
        if (orders.length >= limit) break;
      }
    }
    
    return orders;
  }

  /**
   * Get trade history
   */
  async getTrades(symbol?: string, since?: Date, limit: number = 50): Promise<Trade[]> {
    const response = await this.sendSignedRequest('/trades', 'GET');
    
    const trades: Trade[] = [];
    
    if (response.status === 'ok' && response.data) {
      for (const trade of response.data) {
        // Skip if filtering by symbol and it doesn't match
        if (symbol && trade.coin !== symbol) continue;
        
        // Skip if filtering by date
        if (since && new Date(trade.time * 1000) < since) continue;
        
        trades.push({
          id: trade.tid.toString(),
          orderId: trade.oid.toString(),
          symbol: trade.coin,
          side: trade.side === 'B' ? 'buy' : 'sell',
          quantity: parseFloat(trade.sz),
          price: parseFloat(trade.px),
          fee: parseFloat(trade.fee),
          feeCurrency: 'USD',
          timestamp: new Date(trade.time * 1000),
          rawExchangeData: trade
        });
        
        // Limit the number of trades returned
        if (trades.length >= limit) break;
      }
    }
    
    return trades;
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
      
      this.websocket = new WebSocket(this.wsUrl);
      
      this.websocket.onopen = () => {
        console.log('Hyperliquid WebSocket connected');
        resolve();
      };
      
      this.websocket.onerror = (error) => {
        console.error('Hyperliquid WebSocket error:', error);
        reject(error);
      };
      
      this.websocket.onclose = () => {
        console.log('Hyperliquid WebSocket closed');
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
        console.error('Error closing Hyperliquid WebSocket:', error);
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
        console.error('Error handling Hyperliquid WebSocket message:', error);
      }
    };
  }

  /**
   * Send unsigned API request to Hyperliquid
   */
  private async sendRequest(endpoint: string, method: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    return result;
  }

  /**
   * Send signed API request to Hyperliquid
   */
  private async sendSignedRequest(endpoint: string, method: string, data?: any): Promise<any> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Hyperliquid API credentials not set');
    }
    
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(timestamp, endpoint, data);
    
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-HL-API-KEY': this.apiKey,
        'X-HL-TIMESTAMP': timestamp,
        'X-HL-SIGNATURE': signature
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    return result;
  }

  /**
   * Generate signature for Hyperliquid API request
   */
  private generateSignature(timestamp: string, endpoint: string, data?: any): string {
    const payload = timestamp + endpoint + (data ? JSON.stringify(data) : '');
    
    return createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Map Hyperliquid order to standardized Order format
   */
  private mapHyperliquidOrder(hyperliquidOrder: any, symbol: string): Order {
    const isBuy = hyperliquidOrder.side === 'B';
    
    let orderType = 'limit';
    if (hyperliquidOrder.order_type?.market) {
      orderType = 'market';
    } else if (hyperliquidOrder.order_type?.trigger) {
      orderType = hyperliquidOrder.order_type.trigger.is_market ? 'stop' : 'stop_limit';
    }
    
    let orderStatus: 'new' | 'open' | 'partially_filled' | 'filled' | 'canceled' | 'rejected' | 'expired' = 'open';
    if (hyperliquidOrder.status === 'filled') {
      orderStatus = 'filled';
    } else if (hyperliquidOrder.status === 'cancelled') {
      orderStatus = 'canceled';
    } else if (hyperliquidOrder.status === 'rejected') {
      orderStatus = 'rejected';
    } else if (parseFloat(hyperliquidOrder.filled_sz || '0') > 0 && parseFloat(hyperliquidOrder.filled_sz || '0') < parseFloat(hyperliquidOrder.sz)) {
      orderStatus = 'partially_filled';
    } else if (hyperliquidOrder.status === 'open') {
      orderStatus = 'open';
    }
    
    return {
      id: hyperliquidOrder.oid.toString(),
      clientOrderId: '',
      symbol: symbol,
      type: orderType,
      side: isBuy ? 'buy' : 'sell',
      status: orderStatus,
      quantity: parseFloat(hyperliquidOrder.sz),
      filledQuantity: parseFloat(hyperliquidOrder.filled_sz || '0'),
      remainingQuantity: parseFloat(hyperliquidOrder.sz) - parseFloat(hyperliquidOrder.filled_sz || '0'),
      price: parseFloat(hyperliquidOrder.limit_px),
      stopPrice: hyperliquidOrder.order_type?.trigger?.trigger_px ? parseFloat(hyperliquidOrder.order_type.trigger.trigger_px) : undefined,
      avgFillPrice: hyperliquidOrder.avg_px ? parseFloat(hyperliquidOrder.avg_px) : undefined,
      timestamp: new Date(hyperliquidOrder.time * 1000),
      timeInForce: hyperliquidOrder.order_type?.limit?.tif === 'Ioc' ? 'IOC' : 'GTC',
      reduceOnly: !!hyperliquidOrder.reduce_only,
      postOnly: !!hyperliquidOrder.order_type?.limit?.post_only,
      rawExchangeData: hyperliquidOrder
    };
  }
}
