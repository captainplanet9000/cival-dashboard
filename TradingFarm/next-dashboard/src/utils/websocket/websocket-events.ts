/**
 * WebSocket Event System
 * 
 * Centralized event emitter for WebSocket events with typed handlers.
 * This allows components across the application to listen for WebSocket events.
 */

import { WebSocketEvent, WebSocketEventHandler, WebSocketConnection } from './websocket-types';

export class WebSocketEventEmitter {
  private eventHandlers: Map<WebSocketEvent, Set<WebSocketEventHandler>> = new Map();
  private connectedHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();

  /**
   * Register a handler for a specific WebSocket event
   */
  on(event: WebSocketEvent, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)?.add(handler);
    
    // Return function to remove the handler
    return () => this.off(event, handler);
  }

  /**
   * Register a handler for a specific connection ID
   * This allows listening to events from only a specific connection
   */
  onConnection(connectionId: string, event: WebSocketEvent, handler: WebSocketEventHandler): () => void {
    const key = `${connectionId}:${event}`;
    
    if (!this.connectedHandlers.has(key)) {
      this.connectedHandlers.set(key, new Set());
    }
    
    this.connectedHandlers.get(key)?.add(handler);
    
    // Return function to remove the handler
    return () => this.offConnection(connectionId, event, handler);
  }

  /**
   * Remove a specific event handler
   */
  off(event: WebSocketEvent, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Remove a specific connection event handler
   */
  offConnection(connectionId: string, event: WebSocketEvent, handler: WebSocketEventHandler): void {
    const key = `${connectionId}:${event}`;
    const handlers = this.connectedHandlers.get(key);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Remove all handlers for a specific event
   */
  removeAllListeners(event?: WebSocketEvent): void {
    if (event) {
      this.eventHandlers.delete(event);
      
      // Also remove connection-specific handlers for this event
      for (const key of this.connectedHandlers.keys()) {
        if (key.endsWith(`:${event}`)) {
          this.connectedHandlers.delete(key);
        }
      }
    } else {
      this.eventHandlers.clear();
      this.connectedHandlers.clear();
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  emit(event: WebSocketEvent, data: any, connection?: WebSocketConnection): void {
    // Call general event handlers
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data, connection);
        } catch (error) {
          console.error(`[WebSocketEvent] Error in event handler for ${event}:`, error);
        }
      }
    }
    
    // Call connection-specific handlers if a connection was provided
    if (connection) {
      const connectionKey = `${connection.id}:${event}`;
      const connectionHandlers = this.connectedHandlers.get(connectionKey);
      
      if (connectionHandlers) {
        for (const handler of connectionHandlers) {
          try {
            handler(data, connection);
          } catch (error) {
            console.error(`[WebSocketEvent] Error in connection event handler for ${connectionKey}:`, error);
          }
        }
      }
    }
  }

  /**
   * Get the number of listeners for a specific event
   */
  listenerCount(event: WebSocketEvent): number {
    return (this.eventHandlers.get(event)?.size || 0);
  }

  /**
   * Get the number of connection-specific listeners
   */
  connectionListenerCount(connectionId: string, event: WebSocketEvent): number {
    const key = `${connectionId}:${event}`;
    return (this.connectedHandlers.get(key)?.size || 0);
  }
}
