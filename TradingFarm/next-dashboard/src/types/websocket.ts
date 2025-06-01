/**
 * Possible states for a WebSocket connection
 */
export type WebSocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

/**
 * WebSocket message types for the application
 */
export type WebSocketMessageType = 'ping' | 'pong' | 'auth' | 'data' | 'error';

/**
 * Base interface for WebSocket messages
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  timestamp?: string;
}

/**
 * Authentication message for WebSocket
 */
export interface WebSocketAuthMessage extends WebSocketMessage {
  type: 'auth';
  token: string;
}

/**
 * Data message for WebSocket
 */
export interface WebSocketDataMessage extends WebSocketMessage {
  type: 'data';
  channel: string;
  payload: any;
}

/**
 * Error message for WebSocket
 */
export interface WebSocketErrorMessage extends WebSocketMessage {
  type: 'error';
  code: number;
  message: string;
}

/**
 * Ping/Pong message for WebSocket keepalive
 */
export interface WebSocketPingPongMessage extends WebSocketMessage {
  type: 'ping' | 'pong';
}

/**
 * Union of all WebSocket message types
 */
export type WebSocketMessageUnion = 
  | WebSocketAuthMessage
  | WebSocketDataMessage
  | WebSocketErrorMessage
  | WebSocketPingPongMessage;
