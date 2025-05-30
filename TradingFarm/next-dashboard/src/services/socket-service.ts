import { io, Socket } from 'socket.io-client';
import { TRADING_EVENTS } from '@/constants/socket-events';

// Default WebSocket server URL - can be overridden by environment variables
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';

class SocketService {
  private static instance: SocketService;
  private _socket: Socket | null = null;
  private _isConnected: boolean = false;
  private _reconnectAttempts: number = 0;
  private _maxReconnectAttempts: number = 5;
  private _connectionListeners: ((connected: boolean) => void)[] = [];

  private constructor() {
    this.initializeSocket();
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  private initializeSocket(): void {
    if (!this._socket) {
      // Create socket instance with reconnection options
      this._socket = io(WS_URL, {
        reconnection: true,
        reconnectionAttempts: this._maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
      });

      // Setup event listeners
      this._socket.on('connect', () => {
        console.log('Socket connected');
        this._isConnected = true;
        this._reconnectAttempts = 0;
        this._notifyConnectionListeners(true);
      });

      this._socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${reason}`);
        this._isConnected = false;
        this._notifyConnectionListeners(false);
      });

      this._socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Socket reconnection attempt ${attemptNumber}`);
        this._reconnectAttempts = attemptNumber;
      });

      this._socket.on('reconnect_failed', () => {
        console.log('Socket reconnection failed');
        this._isConnected = false;
      });

      this._socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    }
  }

  private _notifyConnectionListeners(connected: boolean): void {
    this._connectionListeners.forEach(listener => listener(connected));
  }

  public get socket(): Socket | null {
    return this._socket;
  }

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public connect(): void {
    if (this._socket && !this._isConnected) {
      this._socket.connect();
    }
  }

  public disconnect(): void {
    if (this._socket && this._isConnected) {
      this._socket.disconnect();
    }
  }

  public on<T>(event: string, callback: (data: T) => void): () => void {
    if (!this._socket) {
      this.initializeSocket();
    }
    
    this._socket?.on(event, callback);
    
    // Return cleanup function
    return () => {
      this._socket?.off(event, callback);
    };
  }

  public emit<T, R>(event: string, data: T, callback?: (response: R) => void): void {
    if (!this._socket) {
      this.initializeSocket();
    }
    
    if (callback) {
      this._socket?.emit(event, data, callback);
    } else {
      this._socket?.emit(event, data);
    }
  }

  public onConnectionChange(callback: (connected: boolean) => void): () => void {
    this._connectionListeners.push(callback);
    
    // Return cleanup function
    return () => {
      const index = this._connectionListeners.indexOf(callback);
      if (index !== -1) {
        this._connectionListeners.splice(index, 1);
      }
    };
  }
}

export const socketService = SocketService.getInstance();
export const socket = socketService.socket;
