/**
 * Stub implementation for isomorphic-ws
 * This is a placeholder to satisfy imports during build
 */

// WebSocket class stub
export default class WebSocket {
  url: string;
  readyState: number;
  CONNECTING: number = 0;
  OPEN: number = 1;
  CLOSING: number = 2;
  CLOSED: number = 3;
  
  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.readyState = this.CLOSED;
    console.warn('Using stub WebSocket implementation. This will not connect to any real services.');
  }

  // Event handlers
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  // Methods
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    console.warn('WebSocket.send called on stub implementation');
  }

  close(code?: number, reason?: string): void {
    console.warn('WebSocket.close called on stub implementation');
    this.readyState = this.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason, wasClean: true });
    }
  }
}

// Include standard WebSocket event types
export interface WebSocketEventMap {
  close: CloseEvent;
  error: Event;
  message: MessageEvent;
  open: Event;
}

// Standard WebSocket events
export class CloseEvent {
  code: number;
  reason: string;
  wasClean: boolean;
  
  constructor(type: string, options?: { code?: number; reason?: string; wasClean?: boolean }) {
    this.code = options?.code || 1000;
    this.reason = options?.reason || '';
    this.wasClean = options?.wasClean || false;
  }
}

export class MessageEvent {
  data: any;
  
  constructor(type: string, options?: { data?: any }) {
    this.data = options?.data || null;
  }
}
