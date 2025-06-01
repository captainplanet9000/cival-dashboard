/**
 * Bybit WebSocket Adapter
 * 
 * Implementation of the Exchange WebSocket Adapter interface for Bybit.
 * Handles Bybit-specific WebSocket connection, subscriptions, and message formats.
 */

import { BaseExchangeAdapter } from './exchange-adapter';
import { SubscriptionParams } from '../types';
import * as crypto from 'crypto';

/**
 * Bybit WebSocket endpoints
 */
const BYBIT_ENDPOINTS = {
  SPOT: 'wss://stream.bybit.com/spot/public/v3',
  SPOT_PRIVATE: 'wss://stream.bybit.com/spot/private/v3',
  USDT_PERPETUAL: 'wss://stream.bybit.com/contract/usdt/public/v3',
  USDT_PERPETUAL_PRIVATE: 'wss://stream.bybit.com/contract/usdt/private/v3',
  INVERSE_PERPETUAL: 'wss://stream.bybit.com/contract/inverse/public/v3',
  INVERSE_PERPETUAL_PRIVATE: 'wss://stream.bybit.com/contract/inverse/private/v3',
};

/**
 * Type for Bybit market types
 */
type BybitMarketType = 'spot' | 'linear' | 'inverse';

/**
 * Bybit WebSocket adapter implementation
 */
export class BybitWebSocketAdapter extends BaseExchangeAdapter {
  /**
   * Authenticated flag
   */
  private isAuthenticated = false;

  /**
   * Market type: spot, linear, or inverse
   */
  private marketType: BybitMarketType = 'spot';

  /**
   * Request ID counter
   */
  private requestId = 1;

  /**
   * Connect to the Bybit WebSocket API
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
        
        // Determine market type from config or default to spot
        this.marketType = (this.config.params?.marketType as BybitMarketType) || 'spot';
        
        // Use provided URL or determine endpoint based on market type
        let url = this.config.url;
        if (!url) {
          // Use private endpoint if authentication credentials are provided
          if (this.config.auth?.apiKey && this.config.auth?.secret) {
            switch (this.marketType) {
              case 'spot':
                url = BYBIT_ENDPOINTS.SPOT_PRIVATE;
                break;
              case 'linear':
                url = BYBIT_ENDPOINTS.USDT_PERPETUAL_PRIVATE;
                break;
              case 'inverse':
                url = BYBIT_ENDPOINTS.INVERSE_PERPETUAL_PRIVATE;
                break;
            }
          } else {
            // Use public endpoint
            switch (this.marketType) {
              case 'spot':
                url = BYBIT_ENDPOINTS.SPOT;
                break;
              case 'linear':
                url = BYBIT_ENDPOINTS.USDT_PERPETUAL;
                break;
              case 'inverse':
                url = BYBIT_ENDPOINTS.INVERSE_PERPETUAL;
                break;
            }
          }
        }
        
        if (!url) {
          throw new Error('No WebSocket URL provided or determined');
        }
        
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
          this.handleBybitMessage(event);
        };
      } catch (error) {
        this.handleError(error);
        resolve(false);
      }
    });
  }

  /**
   * Subscribe to a Bybit channel for specific symbols
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
      
      // Bybit-specific subscription message
      const subscriptionMessage = this.createBybitSubscriptionMessage(channel, symbols);
      
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
   * Unsubscribe from a Bybit channel for specific symbols
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
      
      // Bybit-specific unsubscription message
      const unsubscriptionMessage = this.createBybitUnsubscriptionMessage(channel, symbolsToUnsubscribe);
      
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
   * Send a heartbeat message to the Bybit WebSocket
   * 
   * @returns Promise resolving to a boolean indicating success
   */
  public async sendHeartbeat(): Promise<boolean> {
    if (!this.socket || this.status !== 'connected') {
      return false;
    }
    
    try {
      // Bybit-specific ping message
      const pingMessage = {
        op: 'ping'
      };
      
      // Send ping
      this.socket.send(JSON.stringify(pingMessage));
      
      // Emit event
      this.emitEvent('heartbeat', { timestamp: Date.now() });
      
      return true;
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      return false;
    }
  }

  /**
   * Authenticate with the Bybit WebSocket API
   * 
   * @returns Promise resolving to a boolean indicating success
   */
  private async authenticate(): Promise<boolean> {
    if (!this.socket || !this.config?.auth?.apiKey || !this.config?.auth?.secret) {
      return false;
    }
    
    try {
      const expires = Date.now() + 10000; // 10 seconds in the future
      
      // Generate signature
      // In production, signature generation should be done server-side
      const signature = this.generateSignature(
        this.config.auth.apiKey,
        this.config.auth.secret,
        expires
      );
      
      const authMessage = {
        op: 'auth',
        args: [this.config.auth.apiKey, expires.toString(), signature]
      };
      
      // Send authentication message
      this.socket.send(JSON.stringify(authMessage));
      
      // For simplicity, assume authentication is successful
      // In production, you would wait for an auth response
      this.isAuthenticated = true;
      
      return true;
    } catch (error) {
      console.error('Error authenticating with Bybit:', error);
      return false;
    }
  }

  /**
   * Generate signature for Bybit authentication
   * 
   * @param apiKey - API key
   * @param apiSecret - API secret
   * @param expires - Expiration timestamp
   * @returns The signature
   */
  private generateSignature(apiKey: string, apiSecret: string, expires: number): string {
    try {
      const signaturePayload = 'GET/realtime' + expires;
      return crypto
        .createHmac('sha256', apiSecret)
        .update(signaturePayload)
        .digest('hex');
    } catch (error) {
      console.error('Error generating signature:', error);
      return '';
    }
  }

  /**
   * Handle Bybit-specific messages from the WebSocket
   * 
   * @param event - The message event from the WebSocket
   */
  private handleBybitMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data.toString());
      
      // Handle pong response
      if (data.op === 'pong') {
        this.emitEvent('heartbeat', { timestamp: Date.now() });
        return;
      }
      
      // Handle authentication response
      if (data.op === 'auth') {
        const success = data.success === true;
        this.isAuthenticated = success;
        
        if (!success) {
          this.emitEvent('error', {
            message: 'Authentication failed',
            details: data.ret_msg
          });
        }
        
        return;
      }
      
      // Handle subscription response
      if (data.op === 'subscribe') {
        const success = data.success === true;
        
        if (!success) {
          this.emitEvent('error', {
            message: 'Subscription failed',
            details: data.ret_msg
          });
        }
        
        return;
      }
      
      // Handle data message
      if (data.topic) {
        this.emitEvent('message', data);
        return;
      }
      
    } catch (error) {
      console.error('Error handling Bybit message:', error);
    }
  }

  /**
   * Create a Bybit-specific subscription message
   * 
   * @param channel - The channel to subscribe to
   * @param symbols - The symbols to subscribe to
   * @returns The subscription message object
   */
  private createBybitSubscriptionMessage(channel: string, symbols: string[]): unknown {
    // Normalize symbols for Bybit format if needed
    // For spot market, Bybit uses format like "BTCUSDT"
    // For derivatives, Bybit uses format like "BTCUSD"
    const normalizedSymbols = symbols.map(s => s.replace('/', ''));

    const topics = normalizedSymbols.map(symbol => `${channel}.${symbol}`);
    
    return {
      op: 'subscribe',
      args: topics,
      req_id: this.requestId++
    };
  }

  /**
   * Create a Bybit-specific unsubscription message
   * 
   * @param channel - The channel to unsubscribe from
   * @param symbols - The symbols to unsubscribe from
   * @returns The unsubscription message object
   */
  private createBybitUnsubscriptionMessage(channel: string, symbols: string[]): unknown {
    // Normalize symbols
    const normalizedSymbols = symbols.map(s => s.replace('/', ''));

    const topics = normalizedSymbols.map(symbol => `${channel}.${symbol}`);
    
    return {
      op: 'unsubscribe',
      args: topics,
      req_id: this.requestId++
    };
  }
}
