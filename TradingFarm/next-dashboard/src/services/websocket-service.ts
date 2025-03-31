import { toast } from 'sonner';

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

  constructor(url: string = '', options: WebSocketOptions = {}) {
    this.url = url;
    this.reconnectDelay = options.reconnectDelay || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.debug = options.debug || false;
  }

  /**
   * Initialize the WebSocket connection
   */
  initialize(url: string = '') {
    if (url) {
      this.url = url;
    }

    if (!this.url) {
      console.error('WebSocket URL is not set');
      return;
    }

    this.connect();
  }

  /**
   * Create and establish WebSocket connection
   */
  private connect() {
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      this.logDebug('Error creating WebSocket:', error);
      this.scheduleReconnect();
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
   * Send a message to the server
   */
  send(topic: string, message: any): boolean {
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // Store message to send when connection is established
      this.pendingMessages.push({ topic, message });
      this.logDebug(`Message queued for topic: ${topic}`, message);
      return false;
    }

    try {
      this.socket.send(JSON.stringify({ topic, message }));
      this.logDebug(`Message sent on topic: ${topic}`, message);
      return true;
    } catch (error) {
      this.logDebug(`Error sending message on topic: ${topic}`, error);
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
