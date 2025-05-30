/**
 * Coinbase WebSocket Adapter
 * 
 * Implementation of the Exchange WebSocket Adapter interface for Coinbase.
 * Handles Coinbase-specific WebSocket connection, subscriptions, and message formats.
 */

import { BaseExchangeAdapter } from './exchange-adapter';
import { SubscriptionParams } from '../types';

/**
 * Coinbase WebSocket endpoints
 */
const COINBASE_ENDPOINTS = {
  MAIN: 'wss://ws-feed.exchange.coinbase.com',
  SANDBOX: 'wss://ws-feed-public.sandbox.exchange.coinbase.com',
};

/**
 * Type for Coinbase subscription channel
 */
type CoinbaseChannel = 'ticker' | 'level2' | 'matches' | 'full' | 'heartbeat' | 'status';

/**
 * Coinbase WebSocket adapter implementation
 */
export class CoinbaseWebSocketAdapter extends BaseExchangeAdapter {
  /**
   * Authenticated flag
   */
  private isAuthenticated = false;

  /**
   * Connect to the Coinbase WebSocket API
   * 
   * @returns Promise resolving to a boolean indicating success
   */
  public async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!this.config) {
          throw new Error('Adapter not initialized');
        }

        // Update status
        this.status = 'connecting';
        this.emitEvent('connection_status_change', { status: this.status });
        
        // Use provided URL or default to main endpoint
        const url = this.config.url || COINBASE_ENDPOINTS.MAIN;
        
        // Create WebSocket
        this.socket = new WebSocket(url);
        
        // Set timeout for connection
        const connectionTimeout = setTimeout(() => {
          if (this.status === 'connecting') {
            this.handleError(new Error('Connection timeout'));
            resolve(false);
          }
        }, this.config.timeouts?.connection || 10000);
        
        // Set up event handlers
        this.socket.onopen = async () => {
          clearTimeout(connectionTimeout);
          
          // Authenticate if credentials are provided
          if (this.config?.auth?.apiKey && this.config?.auth?.secret) {
            try {
              await this.authenticate();
            } catch (error) {
              this.handleError(error);
              resolve(false);
              return;
            }
          }
          
          this.handleOpen();
          resolve(true);
        };
        
        this.socket.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.handleClose(event);
          if (this.status === 'connecting') {
            resolve(false);
          }
        };
        
        this.socket.onerror = (event) => {
          clearTimeout(connectionTimeout);
          this.handleError(event);
          if (this.status === 'connecting') {
            resolve(false);
          }
        };
        
        this.socket.onmessage = (event) => {
          this.handleCoinbaseMessage(event);
        };
      } catch (error) {
        this.handleError(error);
        resolve(false);
      }
    });
  }

  /**
   * Subscribe to a Coinbase channel for specific symbols
   * 
   * @param params - Subscription parameters
   * @param subscriptionId - Database subscription record ID
   * @returns Promise resolving to a boolean indicating success
   */
  public async subscribe(params: SubscriptionParams, subscriptionId: number): Promise<boolean> {
    try {
      if (!this.socket || this.status !== 'connected') {
        throw new Error('Socket not connected');
      }
      
      const { channel, symbols } = params;
      
      // Coinbase-specific subscription message
      const subscriptionMessage = this.createCoinbaseSubscriptionMessage(
        channel as CoinbaseChannel, 
        symbols
      );
      
      // Send subscription message
      this.socket.send(JSON.stringify(subscriptionMessage));
      
      // Store subscription
      this.subscriptions.set(channel, { 
        symbols, 
        id: subscriptionId 
      });
      
      // Emit event
      this.emitEvent('subscription_status_change', {
        channel,
        symbols,
        status: 'subscribed'
      });
      
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  /**
   * Unsubscribe from a Coinbase channel for specific symbols
   * 
   * @param channel - The channel to unsubscribe from
   * @param symbols - Optional symbols to unsubscribe from
   * @returns Promise resolving to a boolean indicating success
   */
  public async unsubscribe(channel: string, symbols?: string[]): Promise<boolean> {
    try {
      if (!this.socket || this.status !== 'connected') {
        throw new Error('Socket not connected');
      }
      
      const subscription = this.subscriptions.get(channel);
      
      if (!subscription) {
        throw new Error(`Not subscribed to channel ${channel}`);
      }
      
      // If symbols not provided, unsubscribe from all symbols in the channel
      const symbolsToUnsubscribe = symbols || subscription.symbols;
      
      // Coinbase-specific unsubscription message
      const unsubscriptionMessage = this.createCoinbaseUnsubscriptionMessage(
        channel as CoinbaseChannel, 
        symbolsToUnsubscribe
      );
      
      // Send unsubscription message
      this.socket.send(JSON.stringify(unsubscriptionMessage));
      
      // Update subscription
      if (!symbols) {
        // If no symbols provided, remove the entire subscription
        this.subscriptions.delete(channel);
      } else {
        // Otherwise, remove only the specified symbols
        const remainingSymbols = subscription.symbols.filter(s => !symbols.includes(s));
        
        if (remainingSymbols.length === 0) {
          // If no symbols left, remove the entire subscription
          this.subscriptions.delete(channel);
        } else {
          // Otherwise, update the subscription
          this.subscriptions.set(channel, { 
            symbols: remainingSymbols, 
            id: subscription.id 
          });
        }
      }
      
      // Emit event
      this.emitEvent('subscription_status_change', {
        channel,
        symbols: symbolsToUnsubscribe,
        status: 'unsubscribed'
      });
      
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  /**
   * Send a heartbeat message to the Coinbase WebSocket
   * 
   * @returns Promise resolving to a boolean indicating success
   */
  public async sendHeartbeat(): Promise<boolean> {
    if (!this.socket || this.status !== 'connected') {
      return false;
    }
    
    try {
      // For Coinbase, we subscribe to the heartbeat channel for heartbeats
      // No explicit ping/pong mechanism is required
      this.emitEvent('heartbeat', { timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      return false;
    }
  }

  /**
   * Authenticate with the Coinbase WebSocket API
   * 
   * @returns Promise resolving to a boolean indicating success
   */
  private async authenticate(): Promise<boolean> {
    if (!this.socket || !this.config?.auth?.apiKey || !this.config?.auth?.secret) {
      return false;
    }
    
    try {
      // In a production environment, signature would be generated server-side
      // with a secure mechanism using the API secret
      // For the purpose of this implementation, we'll simulate authentication
      
      const timestamp = Math.floor(Date.now() / 1000);
      
      // This is a placeholder - in production, this would be a proper signature
      // generated using the API secret
      const signature = 'PLACEHOLDER_SIGNATURE';
      
      const authMessage = {
        type: 'subscribe',
        channels: ['user'],
        api_key: this.config.auth.apiKey,
        timestamp,
        signature
      };
      
      // Send authentication message
      this.socket.send(JSON.stringify(authMessage));
      
      // For now, assume authentication is successful
      // In production, you would wait for an authentication response
      this.isAuthenticated = true;
      
      return true;
    } catch (error) {
      console.error('Error authenticating with Coinbase:', error);
      return false;
    }
  }

  /**
   * Handle Coinbase-specific messages from the WebSocket
   * 
   * @param event - The message event from the WebSocket
   */
  private handleCoinbaseMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data.toString());
      
      // Handle subscription confirmation
      if (data.type === 'subscriptions') {
        this.emitEvent('subscription_status_change', {
          status: 'subscribed',
          subscriptions: data.channels
        });
        return;
      }
      
      // Handle errors
      if (data.type === 'error') {
        this.emitEvent('error', {
          message: data.message,
          reason: data.reason
        });
        return;
      }
      
      // Handle heartbeat
      if (data.type === 'heartbeat') {
        this.emitEvent('heartbeat', { 
          timestamp: Date.now(),
          sequence: data.sequence,
          last_trade_id: data.last_trade_id
        });
        return;
      }
      
      // Handle regular data messages
      this.emitEvent('message', data);
      
    } catch (error) {
      console.error('Error handling Coinbase message:', error);
    }
  }

  /**
   * Create a Coinbase-specific subscription message
   * 
   * @param channel - The channel to subscribe to
   * @param symbols - The symbols to subscribe to
   * @returns The subscription message object
   */
  private createCoinbaseSubscriptionMessage(channel: CoinbaseChannel, symbols: string[]): unknown {
    // Normalize symbols (Coinbase uses '-' instead of '/' e.g., BTC-USD)
    const normalizedSymbols = symbols.map(s => s.replace('/', '-'));
    
    return {
      type: 'subscribe',
      product_ids: normalizedSymbols,
      channels: [channel]
    };
  }

  /**
   * Create a Coinbase-specific unsubscription message
   * 
   * @param channel - The channel to unsubscribe from
   * @param symbols - The symbols to unsubscribe from
   * @returns The unsubscription message object
   */
  private createCoinbaseUnsubscriptionMessage(channel: CoinbaseChannel, symbols: string[]): unknown {
    // Normalize symbols (Coinbase uses '-' instead of '/' e.g., BTC-USD)
    const normalizedSymbols = symbols.map(s => s.replace('/', '-'));
    
    return {
      type: 'unsubscribe',
      product_ids: normalizedSymbols,
      channels: [channel]
    };
  }
}
