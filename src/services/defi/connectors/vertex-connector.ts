import { ProtocolConnectorInterface } from '../protocol-connector-interface';
import { ProtocolAction, ProtocolPosition, ProtocolType } from '../../../types/defi-protocol-types';
import axios from 'axios';
import WebSocket from 'ws';

export class VertexConnector implements ProtocolConnectorInterface {
  private baseRestUrl: string = 'https://gateway.vertex.network/api/v1';
  private baseWsUrl: string = 'wss://gateway.vertex.network/ws';
  private ws: WebSocket | null = null;
  private isAuthenticated: boolean = false;
  private userAddress?: string;
  private chainId: string = 'arbitrum'; // Default to Arbitrum
  
  constructor(chainId?: string) {
    if (chainId) {
      this.chainId = chainId;
      this.updateEndpoints();
    }
  }
  
  private updateEndpoints(): void {
    // Update endpoints based on chain ID
    switch(this.chainId) {
      case 'arbitrum':
        this.baseRestUrl = 'https://gateway-arbitrum.vertex.network/api/v1';
        this.baseWsUrl = 'wss://gateway-arbitrum.vertex.network/ws';
        break;
      case 'base':
        this.baseRestUrl = 'https://gateway-base.vertex.network/api/v1';
        this.baseWsUrl = 'wss://gateway-base.vertex.network/ws';
        break;
      case 'mantle':
        this.baseRestUrl = 'https://gateway-mantle.vertex.network/api/v1';
        this.baseWsUrl = 'wss://gateway-mantle.vertex.network/ws';
        break;
      // Add other chains as they become available
    }
  }
  
  async connect(credentials?: Record<string, string>): Promise<boolean> {
    try {
      if (credentials?.address) {
        this.userAddress = credentials.address;
        
        // Initialize websocket connection
        if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
          this.ws = new WebSocket(this.baseWsUrl);
          
          this.ws.on('open', () => {
            console.log(`Connected to Vertex websocket`);
            this.subscribeToMarketData();
          });
          
          this.ws.on('message', (data) => {
            this.handleWsMessage(data);
          });
          
          this.ws.on('error', (error: Error) => {
            console.error(`Vertex websocket error: ${error.message}`);
          });
          
          this.ws.on('close', () => {
            console.log('Vertex websocket connection closed');
          });
        }
        
        this.isAuthenticated = true;
        console.log(`Connected to Vertex with address: ${this.userAddress}`);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error(`Error connecting to Vertex: ${error.message}`);
      return false;
    }
  }
  
  private handleWsMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      // Process different message types
      if (message.type === 'orderbook') {
        // Handle orderbook updates
      } else if (message.type === 'trade') {
        // Handle trade updates
      }
    } catch (error: any) {
      console.error(`Error handling Vertex websocket message: ${error.message}`);
    }
  }
  
  private subscribeToMarketData(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Subscribe to general market data
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'markets',
      }));
      
      // Subscribe to specific markets if needed
      const popularMarkets = ['BTC-PERP', 'ETH-PERP', 'SOL-PERP'];
      for (const market of popularMarkets) {
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'orderbook',
          market
        }));
      }
    }
  }
  
  isConnected(): boolean {
    return this.isAuthenticated && (this.ws?.readyState === WebSocket.OPEN);
  }
  
  async getUserPositions(address: string): Promise<ProtocolPosition[]> {
    try {
      // Get subaccount info through gateway API
      const response = await axios.get(`${this.baseRestUrl}/gateway/queries/subaccount_info`, {
        params: { subaccount_owner: address }
      });
      
      if (!response.data || response.data.error) {
        throw new Error(`Error fetching positions: ${response.data?.error || 'Unknown error'}`);
      }
      
      const positions: ProtocolPosition[] = [];
      const subaccountInfo = response.data;
      
      // Convert Vertex positions to standardized format
      if (subaccountInfo.positions) {
        for (const position of subaccountInfo.positions) {
          positions.push({
            protocol: ProtocolType.VERTEX,
            positionId: `${address}-${position.productId}`,
            assetIn: position.productId,
            amountIn: parseFloat(position.size),
            status: parseFloat(position.size) === 0 ? 'closed' : 'active',
            timestamp: new Date().toISOString(),
            leverage: position.leverage || 1,
            healthFactor: position.healthFactor || 1,
            metadata: {
              entryPrice: position.entryPrice,
              liquidationPrice: position.liquidationPrice,
              unrealizedPnl: position.unrealizedPnl,
              margin: position.margin
            }
          });
        }
      }
      
      return positions;
    } catch (error: any) {
      console.error(`Error fetching Vertex positions: ${error.message}`);
      return [];
    }
  }
  
  async executeAction(action: ProtocolAction): Promise<any> {
    if (action.protocol !== ProtocolType.VERTEX) {
      throw new Error('Invalid protocol for this connector');
    }
    
    switch (action.actionType) {
      case 'placeOrder':
        return this.executePlaceOrder(action.params);
      case 'cancelOrder':
        return this.executeCancelOrder(action.params);
      case 'getMarketData':
        return this.getMarketData(action.params.symbol);
      case 'withdrawCollateral':
        return this.executeWithdrawCollateral(action.params);
      case 'depositCollateral':
        return this.executeDepositCollateral(action.params);
      default:
        throw new Error(`Unsupported action type: ${action.actionType}`);
    }
  }
  
  async getProtocolData(): Promise<any> {
    try {
      // Get market data
      const symbols = await axios.get(`${this.baseRestUrl}/gateway/queries/symbols`);
      const marketPrices = await axios.get(`${this.baseRestUrl}/gateway/queries/market_prices`);
      
      // Fetch fee tiers
      const feeTiers = await axios.get(`${this.baseRestUrl}/gateway/queries/fee_tiers`);
      
      // Process markets data
      const markets = [];
      
      if (symbols.data && Array.isArray(symbols.data.products)) {
        for (const product of symbols.data.products) {
          const marketPrice = marketPrices.data.prices?.[product.product_id];
          
          markets.push({
            symbol: product.product_id,
            baseToken: product.base_token,
            quoteToken: product.quote_token,
            type: product.product_type,
            minOrderSize: product.min_size,
            tickSize: product.tick_size,
            maker_fee: product.maker_fee,
            taker_fee: product.taker_fee,
            openInterest: product.open_interest,
            fundingRate: product.funding_rate,
            price: marketPrice?.price || 0,
            marketStatus: product.status,
            maxLeverage: product.max_leverage || 10
          });
        }
      }
      
      return {
        markets,
        feeTiers: feeTiers.data,
        rawSymbols: symbols.data,
        rawPrices: marketPrices.data
      };
    } catch (error: any) {
      console.error(`Error fetching Vertex protocol data: ${error.message}`);
      throw error;
    }
  }
  
  // Vertex-specific methods
  private async executePlaceOrder(params: Record<string, any>): Promise<any> {
    try {
      const {
        symbol, 
        side, 
        size, 
        price, 
        orderType = 'limit',
        reduceOnly = false,
        timeInForce = 'GTC'
      } = params;
      
      // For demonstration - in a real integration you'd use the proper Vertex SDK
      // with correct signing and tx submission
      
      // Example API request structure
      const orderParams = {
        owner: this.userAddress,
        product_id: symbol,
        order_type: orderType,
        side: side.toLowerCase(),
        size: size.toString(),
        reduce_only: reduceOnly,
        time_in_force: timeInForce
      };
      
      if (orderType === 'limit' && price) {
        // @ts-ignore
        orderParams.price = price.toString();
      }
      
      // In a real implementation, you'd use the Vertex SDK or API
      // to submit this order with proper signing
      console.log(`Would submit order to Vertex:`, orderParams);
      
      // Mock response - in real implementation, call the actual API
      const response = {
        order_id: `mock-order-${Date.now()}`,
        status: 'open',
        symbol: symbol,
        size: size,
        side: side,
        price: price,
        filled: 0,
        timestamp: Date.now()
      };
      
      return response;
    } catch (error: any) {
      console.error(`Error placing Vertex order: ${error.message}`);
      throw error;
    }
  }
  
  private async executeCancelOrder(params: Record<string, any>): Promise<any> {
    try {
      const { orderId, symbol } = params;
      
      // In a real implementation, call the actual API
      console.log(`Would cancel Vertex order ${orderId} for ${symbol}`);
      
      return {
        success: true,
        orderId,
        symbol,
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error(`Error cancelling Vertex order: ${error.message}`);
      throw error;
    }
  }
  
  private async executeWithdrawCollateral(params: Record<string, any>): Promise<any> {
    try {
      const { token, amount } = params;
      
      // In a real implementation, call the actual API
      console.log(`Would withdraw ${amount} ${token} from Vertex`);
      
      return {
        success: true,
        token,
        amount,
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error(`Error withdrawing collateral from Vertex: ${error.message}`);
      throw error;
    }
  }
  
  private async executeDepositCollateral(params: Record<string, any>): Promise<any> {
    try {
      const { token, amount } = params;
      
      // In a real implementation, call the actual API
      console.log(`Would deposit ${amount} ${token} to Vertex`);
      
      return {
        success: true,
        token,
        amount,
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error(`Error depositing collateral to Vertex: ${error.message}`);
      throw error;
    }
  }
  
  async getMarketData(symbol: string): Promise<any> {
    try {
      // Get market data for a specific symbol
      const response = await axios.get(`${this.baseRestUrl}/gateway/queries/market_data`, {
        params: { product_id: symbol }
      });
      
      if (!response.data || response.data.error) {
        throw new Error(`Error fetching market data: ${response.data?.error || 'Unknown error'}`);
      }
      
      // Get orderbook data
      const orderbookResponse = await axios.get(`${this.baseRestUrl}/gateway/queries/orderbook`, {
        params: { product_id: symbol, depth: 10 }
      });
      
      // Get recent trades
      const tradesResponse = await axios.get(`${this.baseRestUrl}/gateway/queries/trades`, {
        params: { product_id: symbol, limit: 50 }
      });
      
      return {
        marketData: response.data,
        orderbook: orderbookResponse.data,
        recentTrades: tradesResponse.data
      };
    } catch (error: any) {
      console.error(`Error fetching Vertex market data: ${error.message}`);
      throw error;
    }
  }
  
  // Subscription methods for WebSocket
  async subscribeToOrderbook(symbol: string): Promise<boolean> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'orderbook',
        symbol
      }));
      return true;
    }
    
    return false;
  }
} 