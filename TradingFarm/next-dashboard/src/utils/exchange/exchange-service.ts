import { BybitClient } from './bybit-client';
import { getExchangeCredentials } from './exchange-credentials-service';
import { ExchangeConfig, ExchangeCredentials, MarketData, OrderParams, BybitBalance, BybitPosition, BybitOrder, WebSocketMessage } from './types';

// Class to manage exchange connection operations
export class ExchangeService {
  private clients: Map<string, BybitClient> = new Map();
  private exchangeConfigs: Map<string, ExchangeConfig> = new Map();
  private wsCallbacks: Map<string, Map<string, (data: WebSocketMessage) => void>> = new Map();
  
  // Initialize exchange connections
  async initializeExchange(exchangeConfig: ExchangeConfig): Promise<boolean> {
    try {
      // Skip if already initialized
      if (this.clients.has(exchangeConfig.id)) {
        console.log(`Exchange ${exchangeConfig.name} already initialized`);
        return true;
      }
      
      // Get credentials from secure storage
      const credentials = await getExchangeCredentials(exchangeConfig.id);
      
      // Initialize appropriate client based on exchange type
      if (credentials.exchange === 'bybit') {
        const client = new BybitClient(credentials);
        this.clients.set(exchangeConfig.id, client);
        this.exchangeConfigs.set(exchangeConfig.id, exchangeConfig);
        
        // Initialize websocket if exchange is active
        if (exchangeConfig.active) {
          await this.initializeWebSocket(exchangeConfig.id);
        }
        
        console.log(`Exchange ${exchangeConfig.name} initialized successfully`);
        return true;
      } else {
        throw new Error(`Exchange type ${credentials.exchange} not supported yet`);
      }
    } catch (error) {
      console.error(`Failed to initialize exchange ${exchangeConfig.name}:`, error);
      return false;
    }
  }
  
  // Get exchange client 
  private getClient(exchangeId: string): BybitClient {
    const client = this.clients.get(exchangeId);
    if (!client) {
      throw new Error(`Exchange client with ID ${exchangeId} not found or not initialized`);
    }
    return client;
  }
  
  // Initialize WebSocket connection
  async initializeWebSocket(exchangeId: string): Promise<void> {
    try {
      const client = this.getClient(exchangeId);
      
      // Create a map for this exchange's callbacks if it doesn't exist
      if (!this.wsCallbacks.has(exchangeId)) {
        this.wsCallbacks.set(exchangeId, new Map());
      }
      
      // Connect WebSocket
      client.connectWebSocket();
      
      // Subscribe to relevant topics
      client.subscribe([
        'position',
        'order',
        'wallet'
      ]);
      
      console.log(`WebSocket initialized for exchange ${exchangeId}`);
    } catch (error) {
      console.error(`Failed to initialize WebSocket for exchange ${exchangeId}:`, error);
      throw error;
    }
  }
  
  // Register WebSocket callback
  registerWebSocketCallback(
    exchangeId: string, 
    topic: string, 
    callbackId: string, 
    callback: (data: WebSocketMessage) => void
  ): void {
    try {
      const client = this.getClient(exchangeId);
      
      // Ensure callbacks map exists for this exchange
      if (!this.wsCallbacks.has(exchangeId)) {
        this.wsCallbacks.set(exchangeId, new Map());
      }
      
      const exchangeCallbacks = this.wsCallbacks.get(exchangeId)!;
      
      // Register callback with unique ID
      exchangeCallbacks.set(`${topic}-${callbackId}`, callback);
      
      // Register with client
      client.onMessage(topic, (data: WebSocketMessage) => {
        // Forward message to all registered callbacks for this topic
        for (const [key, cb] of exchangeCallbacks.entries()) {
          if (key.startsWith(`${topic}-`)) {
            cb(data);
          }
        }
      });
      
      console.log(`Callback ${callbackId} registered for topic ${topic} on exchange ${exchangeId}`);
    } catch (error) {
      console.error(`Failed to register WebSocket callback:`, error);
    }
  }
  
  // Unregister WebSocket callback
  unregisterWebSocketCallback(exchangeId: string, topic: string, callbackId: string): void {
    try {
      // Get callbacks for this exchange
      const exchangeCallbacks = this.wsCallbacks.get(exchangeId);
      if (!exchangeCallbacks) return;
      
      // Remove callback with this ID
      exchangeCallbacks.delete(`${topic}-${callbackId}`);
      
      console.log(`Callback ${callbackId} unregistered for topic ${topic} on exchange ${exchangeId}`);
    } catch (error) {
      console.error(`Failed to unregister WebSocket callback:`, error);
    }
  }
  
  // Disconnect from exchange
  async disconnectExchange(exchangeId: string): Promise<void> {
    try {
      const client = this.getClient(exchangeId);
      
      // Disconnect WebSocket
      client.disconnectWebSocket();
      
      // Remove client and callbacks
      this.clients.delete(exchangeId);
      this.wsCallbacks.delete(exchangeId);
      this.exchangeConfigs.delete(exchangeId);
      
      console.log(`Exchange ${exchangeId} disconnected`);
    } catch (error) {
      console.error(`Failed to disconnect exchange ${exchangeId}:`, error);
      throw error;
    }
  }
  
  // Get wallet balances
  async getWalletBalances(exchangeId: string): Promise<BybitBalance[]> {
    try {
      const client = this.getClient(exchangeId);
      return await client.getWalletBalance();
    } catch (error) {
      console.error(`Failed to get wallet balances for exchange ${exchangeId}:`, error);
      throw error;
    }
  }
  
  // Get positions
  async getPositions(exchangeId: string, symbol?: string): Promise<BybitPosition[]> {
    try {
      const client = this.getClient(exchangeId);
      return await client.getPositions('linear', symbol);
    } catch (error) {
      console.error(`Failed to get positions for exchange ${exchangeId}:`, error);
      throw error;
    }
  }
  
  // Get active orders
  async getActiveOrders(exchangeId: string, symbol?: string): Promise<BybitOrder[]> {
    try {
      const client = this.getClient(exchangeId);
      return await client.getActiveOrders('linear', symbol);
    } catch (error) {
      console.error(`Failed to get active orders for exchange ${exchangeId}:`, error);
      throw error;
    }
  }
  
  // Get order history
  async getOrderHistory(exchangeId: string, symbol?: string, limit: number = 50): Promise<BybitOrder[]> {
    try {
      const client = this.getClient(exchangeId);
      return await client.getOrderHistory('linear', symbol, limit);
    } catch (error) {
      console.error(`Failed to get order history for exchange ${exchangeId}:`, error);
      throw error;
    }
  }
  
  // Get market data
  async getMarketData(exchangeId: string, symbol?: string): Promise<MarketData[]> {
    try {
      const client = this.getClient(exchangeId);
      return await client.getTickers('linear', symbol);
    } catch (error) {
      console.error(`Failed to get market data for exchange ${exchangeId}:`, error);
      throw error;
    }
  }
  
  // Create order
  async createOrder(exchangeId: string, params: OrderParams): Promise<BybitOrder> {
    try {
      const client = this.getClient(exchangeId);
      return await client.createOrder(params);
    } catch (error) {
      console.error(`Failed to create order for exchange ${exchangeId}:`, error);
      throw error;
    }
  }
  
  // Cancel order
  async cancelOrder(exchangeId: string, symbol: string, orderId: string): Promise<boolean> {
    try {
      const client = this.getClient(exchangeId);
      return await client.cancelOrder('linear', symbol, orderId);
    } catch (error) {
      console.error(`Failed to cancel order for exchange ${exchangeId}:`, error);
      throw error;
    }
  }
  
  // Get exchange config
  getExchangeConfig(exchangeId: string): ExchangeConfig | undefined {
    return this.exchangeConfigs.get(exchangeId);
  }
  
  // Check if exchange is connected
  isExchangeConnected(exchangeId: string): boolean {
    return this.clients.has(exchangeId);
  }
  
  // Get all connected exchange IDs
  getConnectedExchangeIds(): string[] {
    return Array.from(this.clients.keys());
  }
}

// Create singleton instance
export const exchangeService = new ExchangeService();
