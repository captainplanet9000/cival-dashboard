/**
 * Real-Time Data Manager
 * 
 * Optimizes real-time data flow through:
 * - Intelligent data batching
 * - Throttling & debouncing
 * - Subscription management
 * - Connection state management
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { localCache } from './local-cache';

type DataHandler<T> = (data: T) => void;
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
type ErrorHandler = (error: Error) => void;

interface StreamStats {
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  lastMessageTime: number;
  connectionTime: number;
  reconnectCount: number;
}

interface RealTimeOptions {
  /** Time interval for data batching in milliseconds */
  batchInterval?: number;
  /** Number of messages to batch before delivery */
  batchSize?: number;
  /** Auto-reconnect on connection loss */
  autoReconnect?: boolean;
  /** Maximum reconnect attempts before giving up */
  maxReconnectAttempts?: number;
  /** Exponential backoff base time (ms) */
  reconnectBaseMs?: number;
  /** Should use local cache for initial data */
  useCache?: boolean;
  /** Debug mode for logging */
  debug?: boolean;
}

/**
 * Class to manage real-time data connections with performance optimizations
 */
export class RealTimeManager<T = any> {
  private socket: WebSocket | null = null;
  private url: string;
  private subscriptions: Map<string, Set<DataHandler<T>>> = new Map();
  private connectionState: ConnectionState = 'disconnected';
  private errorHandlers: Set<ErrorHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private options: Required<RealTimeOptions>;
  private stats: StreamStats = {
    messagesReceived: 0,
    messagesSent: 0,
    bytesReceived: 0,
    lastMessageTime: 0,
    connectionTime: 0,
    reconnectCount: 0,
  };
  
  // Data batching system
  private dataBatches: Map<string, T[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Default options
  private defaultOptions: Required<RealTimeOptions> = {
    batchInterval: 100,
    batchSize: 10,
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectBaseMs: 1000,
    useCache: true,
    debug: false,
  };
  
  constructor(url: string, options: RealTimeOptions = {}) {
    this.url = url;
    this.options = { ...this.defaultOptions, ...options };
    
    // Initialize if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Initialize local cache
      if (this.options.useCache) {
        localCache.initialize();
      }
    }
  }
  
  /**
   * Connect to the WebSocket endpoint
   */
  connect(): void {
    if (typeof window === 'undefined') return;
    if (this.socket?.readyState === WebSocket.OPEN) return;
    
    this.log('Connecting to WebSocket:', this.url);
    this.connectionState = 'connecting';
    
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
    } catch (error) {
      this.handleError(error as Event);
    }
  }
  
  /**
   * Disconnect from the WebSocket endpoint
   */
  disconnect(): void {
    if (!this.socket) return;
    
    this.log('Disconnecting from WebSocket');
    this.clearReconnectTimer();
    
    try {
      this.socket.close();
      this.socket = null;
      this.connectionState = 'disconnected';
    } catch (error) {
      this.log('Error disconnecting:', error);
    }
  }
  
  /**
   * Subscribe to a specific topic/channel
   * @param topic The topic to subscribe to
   * @param handler The handler function for received data
   */
  subscribe(topic: string, handler: DataHandler<T>): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
      
      // If we're connected, send the subscription request
      if (this.isConnected()) {
        this.sendSubscription(topic);
      }
    }
    
    // Add the handler to the subscription set
    this.subscriptions.get(topic)?.add(handler);
    
    // Try to get cached data for initial state
    if (this.options.useCache) {
      const cachedData = localCache.get<T[]>(`ws:${topic}`);
      if (cachedData && cachedData.length > 0) {
        this.log(`Loading ${cachedData.length} cached items for ${topic}`);
        cachedData.forEach(item => handler(item));
      }
    }
    
    // Connect if not already connected
    if (!this.isConnected() && !this.isConnecting()) {
      this.connect();
    }
  }
  
  /**
   * Unsubscribe from a specific topic/channel
   * @param topic The topic to unsubscribe from
   * @param handler The handler function to remove (if omitted, all handlers are removed)
   */
  unsubscribe(topic: string, handler?: DataHandler<T>): void {
    if (!this.subscriptions.has(topic)) return;
    
    if (handler) {
      // Remove specific handler
      this.subscriptions.get(topic)?.delete(handler);
      
      // If no handlers left, remove the topic entirely
      if (this.subscriptions.get(topic)?.size === 0) {
        this.subscriptions.delete(topic);
        this.sendUnsubscription(topic);
      }
    } else {
      // Remove all handlers for this topic
      this.subscriptions.delete(topic);
      this.sendUnsubscription(topic);
    }
    
    // If no subscriptions left, disconnect
    if (this.subscriptions.size === 0) {
      this.disconnect();
    }
  }
  
  /**
   * Add an error handler
   * @param handler The error handler function
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.add(handler);
  }
  
  /**
   * Remove an error handler
   * @param handler The error handler function to remove
   */
  offError(handler: ErrorHandler): void {
    this.errorHandlers.delete(handler);
  }
  
  /**
   * Get the current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }
  
  /**
   * Check if the connection is established
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }
  
  /**
   * Check if the connection is in progress
   */
  isConnecting(): boolean {
    return this.connectionState === 'connecting';
  }
  
  /**
   * Get connection statistics
   */
  getStats(): StreamStats {
    return { ...this.stats };
  }
  
  /**
   * Send data to the WebSocket server
   * @param data The data to send
   */
  send(data: any): void {
    if (!this.isConnected()) {
      this.log('Cannot send data: not connected');
      return;
    }
    
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket?.send(message);
      this.stats.messagesSent++;
    } catch (error) {
      this.log('Error sending data:', error);
      this.notifyErrorHandlers(new Error(`Failed to send data: ${error}`));
    }
  }
  
  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event): void {
    this.log('WebSocket connected');
    this.connectionState = 'connected';
    this.stats.connectionTime = Date.now();
    this.reconnectAttempts = 0;
    
    // Send all subscriptions
    for (const topic of this.subscriptions.keys()) {
      this.sendSubscription(topic);
    }
  }
  
  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    this.stats.messagesReceived++;
    this.stats.lastMessageTime = Date.now();
    this.stats.bytesReceived += event.data.length;
    
    try {
      const data = JSON.parse(event.data);
      
      // Extract topic and actual data
      const topic = this.extractTopic(data);
      const payload = this.extractPayload(data);
      
      if (topic && this.subscriptions.has(topic)) {
        // Add to batch for this topic
        this.addToBatch(topic, payload);
        
        // Cache the latest data for this topic
        if (this.options.useCache) {
          const cachedData = localCache.get<T[]>(`ws:${topic}`) || [];
          cachedData.push(payload);
          // Keep only the latest 100 items
          if (cachedData.length > 100) {
            cachedData.shift();
          }
          localCache.set(`ws:${topic}`, cachedData);
        }
      }
    } catch (error) {
      this.log('Error processing message:', error);
    }
  }
  
  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    this.log('WebSocket error:', event);
    this.connectionState = 'error';
    
    const error = new Error('WebSocket error');
    this.notifyErrorHandlers(error);
  }
  
  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.log(`WebSocket closed: ${event.code} ${event.reason}`);
    this.connectionState = 'disconnected';
    this.socket = null;
    
    // Attempt to reconnect if enabled
    if (this.options.autoReconnect && this.subscriptions.size > 0) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Attempt to reconnect using exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.log('Maximum reconnect attempts reached');
      this.notifyErrorHandlers(
        new Error(`Failed to reconnect after ${this.options.maxReconnectAttempts} attempts`)
      );
      return;
    }
    
    // Calculate backoff time with exponential increase and some jitter
    const backoffMs = Math.min(
      30000, // Max 30 seconds
      this.options.reconnectBaseMs * Math.pow(2, this.reconnectAttempts) * 
      (0.8 + Math.random() * 0.4) // Add 20% jitter
    );
    
    this.log(`Reconnecting in ${Math.round(backoffMs / 1000)}s (attempt ${this.reconnectAttempts + 1}/${this.options.maxReconnectAttempts})`);
    
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.stats.reconnectCount++;
      this.connect();
    }, backoffMs);
  }
  
  /**
   * Clear the reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  /**
   * Extract the topic from the message data
   */
  private extractTopic(data: any): string | null {
    // This needs to be implemented based on the specific WebSocket API structure
    // Example implementation:
    if (data && data.channel) {
      return data.channel;
    }
    if (data && data.topic) {
      return data.topic;
    }
    if (data && data.stream) {
      return data.stream;
    }
    return null;
  }
  
  /**
   * Extract the payload from the message data
   */
  private extractPayload(data: any): T {
    // This needs to be implemented based on the specific WebSocket API structure
    // Example implementation:
    if (data && data.data) {
      return data.data as T;
    }
    return data as T;
  }
  
  /**
   * Send a subscription request for a specific topic
   */
  private sendSubscription(topic: string): void {
    // This needs to be implemented based on the specific WebSocket API structure
    // Example implementation:
    this.send({
      action: 'subscribe',
      channel: topic
    });
  }
  
  /**
   * Send an unsubscription request for a specific topic
   */
  private sendUnsubscription(topic: string): void {
    // This needs to be implemented based on the specific WebSocket API structure
    // Example implementation:
    this.send({
      action: 'unsubscribe',
      channel: topic
    });
  }
  
  /**
   * Add data to the batch for a specific topic
   */
  private addToBatch(topic: string, data: T): void {
    // Initialize batch if needed
    if (!this.dataBatches.has(topic)) {
      this.dataBatches.set(topic, []);
    }
    
    // Add data to batch
    const batch = this.dataBatches.get(topic)!;
    batch.push(data);
    
    // Process batch if it reaches the size threshold
    if (batch.length >= this.options.batchSize) {
      this.processBatch(topic);
      return;
    }
    
    // Set up a timer to process the batch if not already set
    if (!this.batchTimers.has(topic)) {
      const timer = setTimeout(() => {
        this.processBatch(topic);
      }, this.options.batchInterval);
      
      this.batchTimers.set(topic, timer);
    }
  }
  
  /**
   * Process and deliver a batch of data for a specific topic
   */
  private processBatch(topic: string): void {
    // Clear the timer
    if (this.batchTimers.has(topic)) {
      clearTimeout(this.batchTimers.get(topic)!);
      this.batchTimers.delete(topic);
    }
    
    // Get the batch
    const batch = this.dataBatches.get(topic);
    if (!batch || batch.length === 0) return;
    
    // Clear the batch
    this.dataBatches.set(topic, []);
    
    // Notify all handlers for this topic
    const handlers = this.subscriptions.get(topic);
    if (handlers) {
      batch.forEach(item => {
        handlers.forEach(handler => {
          try {
            handler(item);
          } catch (error) {
            this.log(`Error in handler for topic ${topic}:`, error);
          }
        });
      });
    }
  }
  
  /**
   * Notify all error handlers of an error
   */
  private notifyErrorHandlers(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        this.log('Error in error handler:', e);
      }
    });
  }
  
  /**
   * Log messages if debug mode is enabled
   */
  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log('[RealTimeManager]', ...args);
    }
  }
}

/**
 * React hook for using the RealTimeManager
 */
export function useRealTimeData<T = any>(
  url: string,
  topic: string,
  options: RealTimeOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const managerRef = useRef<RealTimeManager<T> | null>(null);
  
  // Initialize the manager
  useEffect(() => {
    if (!url || !topic) return;
    
    managerRef.current = new RealTimeManager<T>(url, options);
    
    const manager = managerRef.current;
    
    // Set up error handler
    manager.onError(setError);
    
    // Track connection state
    const checkConnectionState = () => {
      setConnectionState(manager.getConnectionState());
    };
    
    const interval = setInterval(checkConnectionState, 1000);
    
    return () => {
      clearInterval(interval);
      manager.offError(setError);
      manager.disconnect();
      managerRef.current = null;
    };
  }, [url, options]);
  
  // Subscribe to the topic
  useEffect(() => {
    if (!managerRef.current || !topic) return;
    
    const dataHandler = (newData: T) => {
      setData(prev => [...prev, newData].slice(-100)); // Keep only latest 100 items
    };
    
    managerRef.current.subscribe(topic, dataHandler);
    
    return () => {
      managerRef.current?.unsubscribe(topic, dataHandler);
    };
  }, [topic]);
  
  // Helper function to send data
  const sendData = useCallback((data: any) => {
    managerRef.current?.send(data);
  }, []);
  
  // Helper function to clear data
  const clearData = useCallback(() => {
    setData([]);
  }, []);
  
  return {
    data,
    connectionState,
    error,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    send: sendData,
    clearData,
  };
}
