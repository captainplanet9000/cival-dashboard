import { toast } from 'sonner';
import { websocketConfig } from '@/config/app-config';

export type MessageHandler = (message: any) => void;

export enum WebSocketTopic {
  MARKET_DATA = 'market_data',
  ORDER_UPDATES = 'order_updates',
  TRADE_UPDATES = 'trade_updates',
  AGENT_UPDATES = 'agent_updates',
  ALERTS = 'alerts',
  PERFORMANCE = 'performance',
  SYSTEM = 'system'
}

interface WebSocketOptions {
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private connected: boolean = false;
  private reconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectDelay: number;
  private maxReconnectAttempts: number;
  private heartbeatInterval: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private pendingMessages: Array<{ topic: string; message: any }> = [];
  private debug: boolean;
  private url: string;
  private forceFallback: boolean = true; // Use fallback mode to avoid connection errors

  constructor(url: string = '', options: WebSocketOptions = {}) {
    this.url = url || websocketConfig.url;
    this.reconnectDelay = options.reconnectDelay || websocketConfig.reconnectDelay;
    this.maxReconnectAttempts = options.maxReconnectAttempts || websocketConfig.reconnectAttempts;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.debug = options.debug || websocketConfig.debug;
    this.forceFallback = !websocketConfig.enabled || websocketConfig.fallbackMode;
  }

  /**
   * Initialize the WebSocket connection
   */
  initialize(url: string = '') {
    if (url) {
      this.url = url;
    }

    // Always use fallback mode based on config
    if (this.forceFallback) {
      this.logDebug('Using fallback mode instead of WebSocket (disabled in config)');
      this.simulateConnection();
      return;
    }

    if (!this.url) {
      console.error('WebSocket URL is not set');
      this.simulateConnection();
      return;
    }

    // Only attempt connection if explicitly enabled
    if (websocketConfig.enabled) {
      this.connect();
    } else {
      this.simulateConnection();
    }
  }

  /**
   * Check if we should use fallback mode
   */
  private async checkFallbackMode(): Promise<void> {
    // Don't make network requests if already forced by config
    if (this.forceFallback) return;
    
    try {
      // Try to fetch socket_enabled config
      const response = await fetch('/api/config?key=socket_enabled');
      if (response.ok) {
        const data = await response.json();
        this.forceFallback = data.value !== 'true';
      }
    } catch (error) {
      // If we can't fetch the config, default to fallback mode
      this.forceFallback = true;
      this.logDebug('Error fetching socket config, using fallback mode:', error);
    }
  }

  /**
   * Simulate a successful connection in fallback mode
   */
  private simulateConnection(): void {
    this.connected = true;
    this.reconnectAttempts = 0;
    this.reconnecting = false;
    this.logDebug('Using simulated WebSocket connection (fallback mode)');

    // Notify system channel subscribers of simulated connection
    this.notifySubscribers(WebSocketTopic.SYSTEM, {
      type: 'connection',
      status: 'connected',
      fallback: true
    });

    // Set up periodic simulated heartbeats
    this.heartbeatTimer = setInterval(() => {
      this.notifySubscribers(WebSocketTopic.SYSTEM, {
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        fallback: true
      });
    }, this.heartbeatInterval);
  }

  /**
   * Create and establish WebSocket connection
   */
  private connect() {
    try {
      // Don't attempt to connect if we're in fallback mode
      if (this.forceFallback) {
        this.simulateConnection();
        return;
      }

      this.socket = new WebSocket(this.url);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      this.logDebug('Error creating WebSocket:', error);
      
      // Switch to fallback mode after connection failures
      this.forceFallback = true;
      this.simulateConnection();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen() {
    this.connected = true;
    this.reconnectAttempts = 0;
    this.reconnecting = false;
    this.logDebug('WebSocket connection established');

    // Start heartbeat
    this.startHeartbeat();

    // Send any pending messages
    this.sendPendingMessages();

    // Notify system channel subscribers
    this.notifySubscribers(WebSocketTopic.SYSTEM, {
      type: 'connection',
      status: 'connected'
    });
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const { topic, message } = data;

      this.logDebug(`Received message on topic: ${topic}`, message);

      if (topic === 'heartbeat') {
        this.handleHeartbeat();
        return;
      }

      // Notify subscribers of the topic
      this.notifySubscribers(topic, message);

      // For important alerts, also show toast notification
      if (topic === WebSocketTopic.ALERTS) {
        this.handleAlert(message);
      }
    } catch (error) {
      this.logDebug('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent) {
    this.connected = false;
    this.stopHeartbeat();

    this.logDebug(`WebSocket connection closed: ${event.code} ${event.reason}`);

    // Notify system channel subscribers
    this.notifySubscribers(WebSocketTopic.SYSTEM, {
      type: 'connection',
      status: 'disconnected',
      code: event.code,
      reason: event.reason
    });

    if (!this.reconnecting) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event) {
    this.logDebug('WebSocket error:', event);

    // Notify system channel subscribers
    this.notifySubscribers(WebSocketTopic.SYSTEM, {
      type: 'error',
      event
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.logDebug('Max reconnect attempts reached, giving up');
        
        // Notify system channel subscribers
        this.notifySubscribers(WebSocketTopic.SYSTEM, {
          type: 'connection',
          status: 'failed',
          reason: 'Max reconnect attempts reached'
        });
        
        // Show reconnection failed toast
        toast.error('Connection to trading server failed. Please refresh the page.');
      }
      return;
    }

    this.reconnecting = true;
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    this.logDebug(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    // Notify system channel subscribers
    this.notifySubscribers(WebSocketTopic.SYSTEM, {
      type: 'connection',
      status: 'reconnecting',
      attempt: this.reconnectAttempts,
      delay
    });

    setTimeout(() => {
      this.logDebug(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send heartbeat message
   */
  private sendHeartbeat() {
    if (this.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ topic: 'heartbeat', message: { timestamp: Date.now() } }));
      this.logDebug('Heartbeat sent');
    }
  }

  /**
   * Handle heartbeat response
   */
  private handleHeartbeat() {
    this.logDebug('Heartbeat received');
  }

  /**
   * Display alert notification
   */
  private handleAlert(message: any) {
    const { level, title, message: content } = message;

    switch (level) {
      case 'info':
        toast.info(title, { description: content });
        break;
      case 'success':
        toast.success(title, { description: content });
        break;
      case 'warning':
        toast.warning(title, { description: content });
        break;
      case 'error':
        toast.error(title, { description: content });
        break;
      default:
        toast(title, { description: content });
    }
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic: string | WebSocketTopic, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(topic)) {
      this.messageHandlers.set(topic, new Set());
    }

    const handlers = this.messageHandlers.get(topic)!;
    handlers.add(handler);

    this.logDebug(`Subscribed to topic: ${topic}, total subscribers: ${handlers.size}`);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(topic, handler);
    };
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string | WebSocketTopic, handler: MessageHandler): void {
    if (!this.messageHandlers.has(topic)) {
      return;
    }

    const handlers = this.messageHandlers.get(topic)!;
    handlers.delete(handler);

    this.logDebug(`Unsubscribed from topic: ${topic}, remaining subscribers: ${handlers.size}`);

    if (handlers.size === 0) {
      this.messageHandlers.delete(topic);
    }
  }

  /**
   * Notify all subscribers of a topic
   */
  private notifySubscribers(topic: string, message: any): void {
    if (!this.messageHandlers.has(topic)) {
      return;
    }

    const handlers = this.messageHandlers.get(topic)!;
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        this.logDebug(`Error in handler for topic ${topic}:`, error);
      }
    });
  }

  /**
   * Send a message to a topic
   */
  send(topic: string, message: any): boolean {
    if (!topic) {
      this.logDebug('Cannot send message: Topic is required');
      return false;
    }

    // In fallback mode, we just simulate successful sends
    if (this.forceFallback) {
      this.logDebug(`[FALLBACK] Simulated message send to ${topic}:`, message);
      return true;
    }

    if (!this.connected) {
      this.logDebug(`Cannot send message to ${topic}: Not connected`);
      // Store the message to send later when connected
      this.pendingMessages.push({ topic, message });
      return false;
    }

    try {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ topic, message }));
        this.logDebug(`Sent message to ${topic}:`, message);
        return true;
      } else {
        this.logDebug(`Cannot send message to ${topic}: Socket not ready`);
        // Store the message to send later when connection is re-established
        this.pendingMessages.push({ topic, message });
        return false;
      }
    } catch (error) {
      this.logDebug(`Error sending message to ${topic}:`, error);
      return false;
    }
  }

  /**
   * Send all pending messages
   */
  private sendPendingMessages(): void {
    const messages = [...this.pendingMessages];
    this.pendingMessages = [];

    messages.forEach(({ topic, message }) => {
      this.send(topic, message);
    });

    this.logDebug(`Sent ${messages.length} pending messages`);
  }

  /**
   * Close the WebSocket connection
   */
  close(): void {
    this.stopHeartbeat();

    if (this.socket) {
      // Prevent reconnection on intentional close
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }

    this.connected = false;
    this.reconnecting = false;
    this.logDebug('WebSocket connection closed manually');
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connected && !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Log debug messages
   */
  private logDebug(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[WebSocket] ${message}`, data || '');
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
