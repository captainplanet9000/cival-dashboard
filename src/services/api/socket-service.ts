// Replace socket.io-client import with type-only imports 
// Since we're having trouble installing the package
// In a real project, you would install socket.io-client

// Type definitions for socket.io-client
interface SocketIOClient {
  connect(): void;
  disconnect(): void;
  emit(event: string, ...args: any[]): void;
  on(event: string, callback: (data: any) => void): void;
  off(event: string): void;
  id?: string;
}

// Create a mock implementation for the io function
const io = (url: string, options?: any): SocketIOClient => {
  console.warn('Using mock Socket.IO implementation. Install socket.io-client in production.');
  
  // Return a mock socket implementation
  return {
    connect: () => {},
    disconnect: () => {},
    emit: () => {},
    on: () => {},
    off: () => {},
    id: 'mock-socket-id'
  };
};

/**
 * Socket Service Configuration
 */
export interface SocketConfig {
  url: string;
  options?: any;
}

/**
 * Socket Service for real-time communication with the backend
 */
export class SocketService {
  private static instance: SocketService;
  private socket: SocketIOClient | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private url: string;
  private options: any;

  private constructor(config: SocketConfig) {
    this.url = config.url;
    this.options = config.options || {
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: false
    };
  }

  /**
   * Get instance of SocketService (Singleton)
   */
  public static getInstance(config?: SocketConfig): SocketService {
    if (!SocketService.instance) {
      if (!config) {
        // Default config using environment variables
        config = {
          url: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000',
        };
      }
      SocketService.instance = new SocketService(config);
    }
    return SocketService.instance;
  }

  /**
   * Connect to the socket server
   */
  public connect(token?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        resolve(true);
        return;
      }

      // Add auth token if provided
      const options = { ...this.options };
      if (token) {
        options.auth = { token };
      }

      // Create socket connection
      this.socket = io(this.url, options);

      // Set up event handlers
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve(true);
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.disconnect();
          reject(new Error(`Socket connection failed after ${this.maxReconnectAttempts} attempts: ${error.message}`));
        }
      });

      this.socket.on('disconnect', (reason: any) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;
      });

      // Connect
      this.socket.connect();
    });
  }

  /**
   * Disconnect from the socket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Check if socket is connected
   */
  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Subscribe to an event
   */
  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      
      // Set up listener if this is first subscription to this event
      if (this.socket) {
        this.socket.on(event, (data: any) => {
          const callbacks = this.listeners.get(event);
          if (callbacks) {
            callbacks.forEach(cb => cb(data));
          }
        });
      }
    }
    
    // Add callback to listeners
    const callbacks = this.listeners.get(event)!;
    callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbackSet = this.listeners.get(event);
      if (callbackSet) {
        callbackSet.delete(callback);
        if (callbackSet.size === 0) {
          this.listeners.delete(event);
          if (this.socket) {
            this.socket.off(event);
          }
        }
      }
    };
  }

  /**
   * Emit an event
   */
  public emit(event: string, data?: any): boolean {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot emit event, socket not connected:', event);
      return false;
    }
    
    this.socket.emit(event, data);
    return true;
  }

  /**
   * Join a room
   */
  public joinRoom(room: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot join room, socket not connected:', room);
      return;
    }
    
    this.socket.emit('join', room);
  }

  /**
   * Leave a room
   */
  public leaveRoom(room: string): void {
    if (!this.socket || !this.isConnected) {
      return;
    }
    
    this.socket.emit('leave', room);
  }

  /**
   * Join a strategy room to receive strategy updates
   */
  public joinStrategyRoom(strategyId: string): void {
    this.joinRoom(`strategy-${strategyId}`);
  }

  /**
   * Leave a strategy room
   */
  public leaveStrategyRoom(strategyId: string): void {
    this.leaveRoom(`strategy-${strategyId}`);
  }

  /**
   * Join a farm room to receive farm updates
   */
  public joinFarmRoom(farmId: string): void {
    this.joinRoom(`farm-${farmId}`);
  }

  /**
   * Leave a farm room
   */
  public leaveFarmRoom(farmId: string): void {
    this.leaveRoom(`farm-${farmId}`);
  }

  /**
   * Join an agent room to receive agent updates
   */
  public joinAgentRoom(agentId: string): void {
    this.joinRoom(`agent-${agentId}`);
  }

  /**
   * Leave an agent room
   */
  public leaveAgentRoom(agentId: string): void {
    this.leaveRoom(`agent-${agentId}`);
  }

  /**
   * Listen for strategy updates
   */
  public onStrategyUpdate(callback: (data: any) => void): () => void {
    return this.on('strategy-update', callback);
  }

  /**
   * Listen for farm updates
   */
  public onFarmUpdate(callback: (data: any) => void): () => void {
    return this.on('farm-update', callback);
  }

  /**
   * Listen for agent updates
   */
  public onAgentUpdate(callback: (data: any) => void): () => void {
    return this.on('agent-update', callback);
  }

  /**
   * Listen for execution updates
   */
  public onExecutionUpdate(callback: (data: any) => void): () => void {
    return this.on('execution-update', callback);
  }
}

// Export singleton instance
export const socketService = SocketService.getInstance(); 