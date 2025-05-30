/**
 * Binance WebSocket Adapter
 * 
 * Implementation of the Exchange WebSocket Adapter interface for Binance.
 * Handles Binance-specific WebSocket connection, subscriptions, and message formats.
 */

import { BaseExchangeAdapter } from './exchange-adapter';
import { SubscriptionParams, WebSocketConfig } from '../types';

/**
 * Binance WebSocket endpoints
 */
const BINANCE_ENDPOINTS = {
  SPOT: 'wss://stream.binance.com:9443/ws',
  FUTURES: 'wss://fstream.binance.com/ws',
  SPOT_COMBINED: 'wss://stream.binance.com:9443/stream',
  FUTURES_COMBINED: 'wss://fstream.binance.com/stream',
};

/**
 * Binance WebSocket adapter implementation
 */
export class BinanceWebSocketAdapter extends BaseExchangeAdapter {
  /**
   * ID counter for Binance API requests
   */
  private requestId = 1;

  /**
   * Connect to the Binance WebSocket API
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
        
        // Use provided URL or default to spot combined endpoint
        const url = this.config.url || BINANCE_ENDPOINTS.SPOT_COMBINED;
        
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
        this.socket.onopen = () => {
          clearTimeout(connectionTimeout);
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
          this.handleBinanceMessage(event);
        };
      } catch (error) {
        this.handleError(error);
        resolve(false);
      }
    });
  }

  /**
   * Subscribe to a Binance channel for specific symbols
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
      
      // Binance-specific subscription message
      const subscriptionMessage = this.createBinanceSubscriptionMessage(channel, symbols);
      
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
   * Unsubscribe from a Binance channel for specific symbols
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
      
      // Binance-specific unsubscription message
      const unsubscriptionMessage = this.createBinanceUnsubscriptionMessage(channel, symbolsToUnsubscribe);
      
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
   * Send a heartbeat (ping) message to the Binance WebSocket
   * 
   * @returns Promise resolving to a boolean indicating success
   */
  public async sendHeartbeat(): Promise<boolean> {
    if (!this.socket || this.status !== 'connected') {
      return false;
    }
    
    try {
      // Binance-specific ping message
      const pingMessage = {
        method: 'ping',
        id: this.requestId++
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
   * Handle Binance-specific messages from the WebSocket
   * 
   * @param event - The message event from the WebSocket
   */
  private handleBinanceMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data.toString());
      
      // Handle ping/pong messages
      if (data.result === null && data.id) {
        // This is a response to a method call
        return;
      }
      
      if (data.e === 'ping' || data.op === 'ping') {
        // Respond to ping with pong
        if (this.socket && this.status === 'connected') {
          const pongMessage = { 
            method: 'pong',
            id: this.requestId++
          };
          this.socket.send(JSON.stringify(pongMessage));
        }
        return;
      }
      
      if (data.e === 'pong' || data.op === 'pong') {
        // Update heartbeat timestamp
        this.emitEvent('heartbeat', { timestamp: Date.now() });
        return;
      }
      
      // Handle subscription success/error
      if (data.result !== undefined) {
        if (data.id) {
          // This is a response to a subscription request
          const success = Array.isArray(data.result);
          this.emitEvent(success ? 'subscription_status_change' : 'error', {
            status: success ? 'subscribed' : 'error',
            result: data.result,
            request_id: data.id
          });
        }
        return;
      }
      
      // Handle regular data messages
      this.emitEvent('message', data);
      
    } catch (error) {
      console.error('Error handling Binance message:', error);
    }
  }

  /**
   * Create a Binance-specific subscription message
   * 
   * @param channel - The channel to subscribe to
   * @param symbols - The symbols to subscribe to
   * @returns The subscription message object
   */
  private createBinanceSubscriptionMessage(channel: string, symbols: string[]): unknown {
    // Format: {method: "SUBSCRIBE", params: ["btcusdt@trade", "ethusdt@trade"], id: 1}
    // Channel format is typically {symbol}@{channel} (lowercase)
    
    // Normalize symbols (Binance uses lowercase and no '/' separator)
    const normalizedSymbols = symbols.map(s => {
      // Remove '/' and convert to lowercase (BTC/USDT -> btcusdt)
      return s.replace('/', '').toLowerCase();
    });
    
    // Create params array with format symbol@channel
    const params = normalizedSymbols.map(symbol => `${symbol}@${channel}`);
    
    return {
      method: 'SUBSCRIBE',
      params,
      id: this.requestId++
    };
  }

  /**
   * Create a Binance-specific unsubscription message
   * 
   * @param channel - The channel to unsubscribe from
   * @param symbols - The symbols to unsubscribe from
   * @returns The unsubscription message object
   */
  private createBinanceUnsubscriptionMessage(channel: string, symbols: string[]): unknown {
    // Format: {method: "UNSUBSCRIBE", params: ["btcusdt@trade", "ethusdt@trade"], id: 1}
    
    // Normalize symbols (Binance uses lowercase and no '/' separator)
    const normalizedSymbols = symbols.map(s => {
      // Remove '/' and convert to lowercase (BTC/USDT -> btcusdt)
      return s.replace('/', '').toLowerCase();
    });
    
    // Create params array with format symbol@channel
    const params = normalizedSymbols.map(symbol => `${symbol}@${channel}`);
    
    return {
      method: 'UNSUBSCRIBE',
      params,
      id: this.requestId++
    };
  }
}
