import { EVENTS, EventHandler, EventHandlerMap, EventType, WebSocketMessage } from './events';

/**
 * ElizaOSWebSocketClient
 * 
 * Manages WebSocket connections for ElizaOS integration, handling real-time
 * communication for agents, commands, and trading events.
 */
export class ElizaOSWebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private isConnected = false;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second delay
  private eventHandlers: EventHandlerMap = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;

  /**
   * Creates a new WebSocket client
   * @param url The WebSocket server URL
   */
  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to the WebSocket server
   * @returns Promise that resolves when connected
   */
  public async connect(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        // Check every 100ms if we're connected
        const checkInterval = setInterval(() => {
          if (this.isConnected) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(this.url);

        // Set connection timeout (5 seconds)
        this.connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.socket?.close();
            this.isConnecting = false;
            resolve(false);
          }
        }, 5000);

        this.socket.onopen = () => {
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startHeartbeat();
          this.flushMessageQueue();
          
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          this.emit(EVENTS.CONNECTION_ESTABLISHED, { url: this.url });
          resolve(true);
        };

        this.socket.onclose = () => {
          this.handleDisconnect();
          resolve(false);
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit(EVENTS.SYSTEM_ERROR, { error: 'WebSocket connection error' });
          
          if (this.isConnecting) {
            this.isConnecting = false;
            resolve(false);
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Send a message to the WebSocket server
   * @param event Event type
   * @param data Event data
   * @param options Additional message options
   */
  public send<T>(
    event: EventType, 
    data: T, 
    options?: { 
      sender?: string;
      target?: string | string[];
      requestId?: string;
      correlationId?: string;
      metadata?: Record<string, any>;
    }
  ): boolean {
    const message: WebSocketMessage = {
      event,
      data,
      timestamp: new Date().toISOString(),
      ...options
    };

    if (!this.isConnected) {
      // Queue the message for later sending
      this.messageQueue.push(message);
      this.connect(); // Attempt to connect
      return false;
    }

    try {
      this.socket?.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      // Queue the message if send fails
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Subscribe to an event
   * @param event Event type to subscribe to
   * @param handler Handler function
   */
  public on(event: EventType, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  /**
   * Unsubscribe from an event
   * @param event Event type to unsubscribe from
   * @param handler Handler function to remove
   */
  public off(event: EventType, handler: EventHandler): void {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
    }
  }

  /**
   * Check if the client is connected
   */
  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Emit an event to all subscribers
   * @param event Event type
   * @param data Event data
   */
  private emit(event: EventType, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param message Received message
   */
  private handleMessage(message: WebSocketMessage): void {
    // Emit the event to subscribers
    this.emit(message.event, message.data);
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnect(): void {
    this.isConnected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.emit(EVENTS.CONNECTION_LOST, { url: this.url });

    // Attempt to reconnect if not at max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(30000, this.reconnectDelay * this.reconnectAttempts); // Cap at 30 seconds
      
      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  /**
   * Start the heartbeat interval to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send(EVENTS.SYSTEM_STATUS, { type: 'heartbeat' });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Send any queued messages after reconnection
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length > 0 && this.isConnected) {
      // Create a copy of the queue to avoid issues with async sending
      const queueCopy = [...this.messageQueue];
      this.messageQueue = [];
      
      queueCopy.forEach(message => {
        try {
          this.socket?.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error sending queued message:', error);
          this.messageQueue.push(message);
        }
      });
    }
  }
}

// Export singleton instance for global use
let wsClient: ElizaOSWebSocketClient | null = null;

export const getWebSocketClient = (url: string = 'wss://elizaos-trading-farm.vercel.app/api/ws'): ElizaOSWebSocketClient => {
  if (!wsClient) {
    wsClient = new ElizaOSWebSocketClient(url);
  }
  return wsClient;
};
