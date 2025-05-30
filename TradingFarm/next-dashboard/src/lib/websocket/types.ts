/**
 * WebSocket Manager Type Definitions
 * Contains all the interfaces and types used by the WebSocket manager system
 */

/**
 * The status of a websocket connection
 */
export type WebSocketConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

/**
 * The status of a websocket subscription
 */
export type WebSocketSubscriptionStatus = 'pending' | 'subscribed' | 'unsubscribed' | 'error';

/**
 * Event types that can be emitted by the WebSocket manager
 */
export type WebSocketEventType = 
  | 'connection_status_change'
  | 'subscription_status_change'
  | 'message'
  | 'error'
  | 'heartbeat';

/**
 * Configuration for a WebSocket connection
 */
export interface WebSocketConfig {
  /**
   * The unique identifier for this connection
   */
  connectionId: string;
  
  /**
   * The WebSocket URL to connect to
   */
  url: string;
  
  /**
   * Optional authentication parameters
   */
  auth?: {
    apiKey?: string;
    secret?: string;
    passphrase?: string;
  };
  
  /**
   * Reconnection settings
   */
  reconnect?: {
    /**
     * Whether to automatically reconnect on disconnect
     */
    auto: boolean;
    
    /**
     * Maximum number of reconnection attempts
     */
    maxAttempts: number;
    
    /**
     * Delay between reconnection attempts in milliseconds
     */
    delay: number;
    
    /**
     * Whether to use exponential backoff for reconnection delays
     */
    useExponentialBackoff: boolean;
  };
  
  /**
   * Timeout settings in milliseconds
   */
  timeouts?: {
    /**
     * Connection timeout
     */
    connection: number;
    
    /**
     * Time between heartbeats
     */
    heartbeat: number;
    
    /**
     * Response timeout for operations
     */
    response: number;
  };
}

/**
 * WebSocket event payload
 */
export interface WebSocketEvent<T = unknown> {
  /**
   * The type of the event
   */
  type: WebSocketEventType;
  
  /**
   * The exchange that emitted the event
   */
  exchange: string;
  
  /**
   * The connection ID that emitted the event
   */
  connectionId: string;
  
  /**
   * Timestamp of the event
   */
  timestamp: number;
  
  /**
   * The data payload of the event
   */
  data: T;
}

/**
 * Callback function for WebSocket events
 */
export type WebSocketEventCallback<T = unknown> = (event: WebSocketEvent<T>) => void;

/**
 * Subscription request parameters
 */
export interface SubscriptionParams {
  /**
   * The channel to subscribe to (e.g., 'ticker', 'trades', 'orderbook')
   */
  channel: string;
  
  /**
   * The symbols to subscribe to (e.g., 'BTC/USDT', 'ETH/USDT')
   */
  symbols: string[];
  
  /**
   * Additional parameters for the subscription
   */
  params?: Record<string, unknown>;
}

/**
 * WebSocket connection details as stored in the database
 */
export interface WebSocketConnectionRecord {
  id: number;
  user_id: string;
  exchange: string;
  connection_id: string;
  status: WebSocketConnectionStatus;
  connection_url: string;
  last_heartbeat?: string;
  error_message?: string;
  reconnect_attempts: number;
  connected_at?: string;
  disconnected_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * WebSocket subscription details as stored in the database
 */
export interface WebSocketSubscriptionRecord {
  id: number;
  connection_id: number;
  channel: string;
  symbols: string[];
  status: WebSocketSubscriptionStatus;
  error_message?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * WebSocket metrics record as stored in the database
 */
export interface WebSocketMetricsRecord {
  id: number;
  connection_id: number;
  timestamp: string;
  message_count: number;
  error_count: number;
  latency_ms?: number;
  message_size_bytes?: number;
  reconnect_count: number;
}

/**
 * WebSocket message handler function
 */
export type WebSocketMessageHandler = (message: unknown) => void;

/**
 * WebSocket connection for UI representation
 * Used in dashboard and management components
 */
export interface WebSocketConnection {
  /**
   * Database record ID
   */
  id: number;
  
  /**
   * User that owns this connection
   */
  user_id: string;
  
  /**
   * Exchange name (e.g., 'binance', 'coinbase')
   */
  exchange: string;
  
  /**
   * Unique connection identifier
   */
  connection_id: string;
  
  /**
   * Current connection status
   */
  status: WebSocketConnectionStatus;
  
  /**
   * The WebSocket URL
   */
  connection_url: string;
  
  /**
   * Time of the last heartbeat
   */
  last_heartbeat?: string;
  
  /**
   * Error message if status is 'error'
   */
  error_message?: string;
  
  /**
   * Number of reconnection attempts
   */
  reconnect_attempts: number;
  
  /**
   * When the connection was established
   */
  last_connected_at?: string;
  
  /**
   * When the connection was disconnected
   */
  disconnected_at?: string;
  
  /**
   * Creation timestamp
   */
  created_at: string;
  
  /**
   * Last update timestamp
   */
  updated_at: string;
}

/**
 * WebSocket connection metric for UI representation
 * Used for displaying performance metrics
 */
export interface WebSocketConnectionMetric {
  /**
   * Database record ID
   */
  id: number;
  
  /**
   * Connection ID that this metric is for
   */
  connection_id: number;
  
  /**
   * Timestamp of when the metric was collected
   */
  created_at: string;
  
  /**
   * Number of messages received
   */
  messages_received?: number;
  
  /**
   * Number of messages sent
   */
  messages_sent?: number;
  
  /**
   * Number of bytes received
   */
  bytes_received?: number;
  
  /**
   * Number of bytes sent
   */
  bytes_sent?: number;
  
  /**
   * Latency in milliseconds
   */
  latency?: number;
  
  /**
   * Number of errors
   */
  error_count?: number;
  
  /**
   * Number of reconnections
   */
  reconnect_count?: number;
}
