/**
 * Unit tests for BinanceWebSocketAdapter
 * 
 * Tests the functionality of the Binance WebSocket adapter implementation.
 */

import { BinanceWebSocketAdapter } from '@/lib/websocket/adapters/binance';
import { WebSocketConfig, WebSocketEvent } from '@/lib/websocket/types';

// Mock WebSocket class
class MockWebSocket {
  url: string;
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  readyState: number = 0;
  
  constructor(url: string) {
    this.url = url;
  }
  
  close(): void {
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
  
  send(data: string): void {
    // Mock implementation
  }
  
  // Helper methods for testing
  emitOpen(): void {
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }
  
  emitClose(): void {
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
  
  emitError(message = 'Error'): void {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', { message }));
    }
  }
  
  emitMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
}

// Mock the global WebSocket class
global.WebSocket = MockWebSocket as any;

describe('BinanceWebSocketAdapter', () => {
  let adapter: BinanceWebSocketAdapter;
  let mockConfig: WebSocketConfig;
  let mockEventCallback: jest.Mock;
  
  beforeEach(() => {
    jest.useFakeTimers();
    
    // Mock configuration
    mockConfig = {
      connectionId: 'binance-test-connection',
      url: 'wss://stream.binance.com:9443/ws',
      reconnect: {
        auto: true,
        maxAttempts: 3,
        delay: 1000,
        useExponentialBackoff: true
      },
      timeouts: {
        connection: 5000,
        heartbeat: 10000,
        response: 5000
      }
    };
    
    // Mock event callback
    mockEventCallback = jest.fn();
    
    // Create adapter instance
    adapter = new BinanceWebSocketAdapter();
    adapter.initialize('binance', mockConfig, 1, mockEventCallback);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });
  
  describe('connect', () => {
    it('should successfully connect to Binance WebSocket', async () => {
      // Start connection
      const connectPromise = adapter.connect();
      
      // Simulate successful connection
      const mockSocket = adapter['socket'] as unknown as MockWebSocket;
      mockSocket.emitOpen();
      
      // Wait for the promise to resolve
      const result = await connectPromise;
      
      // Verify results
      expect(result).toBe(true);
      expect(adapter.getStatus()).toBe('connected');
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'connection_status_change',
        exchange: 'binance',
        data: { status: 'connected' }
      }));
    });
    
    it('should handle connection errors', async () => {
      // Start connection
      const connectPromise = adapter.connect();
      
      // Simulate connection error
      const mockSocket = adapter['socket'] as unknown as MockWebSocket;
      mockSocket.emitError('Connection failed');
      
      // Wait for the promise to resolve
      const result = await connectPromise;
      
      // Verify results
      expect(result).toBe(false);
      expect(adapter.getStatus()).toBe('error');
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        exchange: 'binance'
      }));
    });
    
    it('should handle connection timeout', async () => {
      // Start connection
      const connectPromise = adapter.connect();
      
      // Advance timers to trigger timeout
      jest.advanceTimersByTime(mockConfig.timeouts!.connection + 100);
      
      // Wait for the promise to resolve
      const result = await connectPromise;
      
      // Verify results
      expect(result).toBe(false);
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        exchange: 'binance'
      }));
    });
  });
  
  describe('subscribe', () => {
    beforeEach(async () => {
      // Connect the adapter first
      const connectPromise = adapter.connect();
      const mockSocket = adapter['socket'] as unknown as MockWebSocket;
      mockSocket.emitOpen();
      await connectPromise;
      
      // Clear any events from connection
      mockEventCallback.mockClear();
    });
    
    it('should successfully subscribe to a channel', async () => {
      // Subscribe to a channel
      const result = await adapter.subscribe({
        channel: 'ticker',
        symbols: ['BTC/USDT', 'ETH/USDT']
      }, 1);
      
      // Verify results
      expect(result).toBe(true);
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'subscription_status_change',
        exchange: 'binance',
        data: {
          channel: 'ticker',
          symbols: ['BTC/USDT', 'ETH/USDT'],
          status: 'subscribed'
        }
      }));
    });
    
    it('should fail to subscribe when not connected', async () => {
      // Disconnect the adapter
      await adapter.disconnect();
      mockEventCallback.mockClear();
      
      // Try to subscribe
      const result = await adapter.subscribe({
        channel: 'ticker',
        symbols: ['BTC/USDT']
      }, 1);
      
      // Verify results
      expect(result).toBe(false);
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        exchange: 'binance'
      }));
    });
  });
  
  describe('unsubscribe', () => {
    beforeEach(async () => {
      // Connect the adapter first
      const connectPromise = adapter.connect();
      const mockSocket = adapter['socket'] as unknown as MockWebSocket;
      mockSocket.emitOpen();
      await connectPromise;
      
      // Subscribe to a channel
      await adapter.subscribe({
        channel: 'ticker',
        symbols: ['BTC/USDT', 'ETH/USDT']
      }, 1);
      
      // Clear any events from connection and subscription
      mockEventCallback.mockClear();
    });
    
    it('should successfully unsubscribe from a channel', async () => {
      // Unsubscribe from a channel
      const result = await adapter.unsubscribe('ticker', ['BTC/USDT']);
      
      // Verify results
      expect(result).toBe(true);
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'subscription_status_change',
        exchange: 'binance',
        data: {
          channel: 'ticker',
          symbols: ['BTC/USDT'],
          status: 'unsubscribed'
        }
      }));
    });
    
    it('should remove the entire subscription when all symbols are unsubscribed', async () => {
      // Unsubscribe from all symbols in the channel
      const result = await adapter.unsubscribe('ticker');
      
      // Verify results
      expect(result).toBe(true);
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'subscription_status_change',
        exchange: 'binance',
        data: {
          channel: 'ticker',
          symbols: ['BTC/USDT', 'ETH/USDT'],
          status: 'unsubscribed'
        }
      }));
      
      // Verify the subscription was removed
      expect(adapter['subscriptions'].has('ticker')).toBe(false);
    });
  });
  
  describe('disconnect', () => {
    beforeEach(async () => {
      // Connect the adapter first
      const connectPromise = adapter.connect();
      const mockSocket = adapter['socket'] as unknown as MockWebSocket;
      mockSocket.emitOpen();
      await connectPromise;
      
      // Clear any events from connection
      mockEventCallback.mockClear();
    });
    
    it('should successfully disconnect from WebSocket', async () => {
      // Disconnect from the WebSocket
      const result = await adapter.disconnect();
      
      // Verify results
      expect(result).toBe(true);
      expect(adapter.getStatus()).toBe('disconnected');
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'connection_status_change',
        exchange: 'binance',
        data: { status: 'disconnected' }
      }));
    });
  });
  
  describe('message handling', () => {
    let mockSocket: MockWebSocket;
    
    beforeEach(async () => {
      // Connect the adapter first
      const connectPromise = adapter.connect();
      mockSocket = adapter['socket'] as unknown as MockWebSocket;
      mockSocket.emitOpen();
      await connectPromise;
      
      // Clear any events from connection
      mockEventCallback.mockClear();
    });
    
    it('should handle and emit trade messages', () => {
      // Simulate receiving a trade message
      const tradeMessage = {
        e: 'trade',
        E: 1625239235000,
        s: 'BTCUSDT',
        t: 123456789,
        p: '35000.00',
        q: '0.10',
        b: 987654321,
        a: 123456789,
        T: 1625239235000,
        m: false,
        M: true
      };
      
      mockSocket.emitMessage(tradeMessage);
      
      // Verify the message was handled and emitted correctly
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'message',
        exchange: 'binance',
        data: expect.objectContaining({
          symbol: 'BTCUSDT',
          type: 'trade'
        })
      }));
    });
    
    it('should handle and emit ticker messages', () => {
      // Simulate receiving a ticker message
      const tickerMessage = {
        e: '24hrTicker',
        E: 1625239235000,
        s: 'BTCUSDT',
        p: '1000.00',
        P: '2.5',
        w: '34500.00',
        c: '35000.00',
        Q: '0.01',
        o: '34000.00',
        h: '36000.00',
        l: '33000.00',
        v: '100.00',
        q: '3500000.00',
        O: 1625152835000,
        C: 1625239235000,
        F: 123456700,
        L: 123456789,
        n: 89
      };
      
      mockSocket.emitMessage(tickerMessage);
      
      // Verify the message was handled and emitted correctly
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'message',
        exchange: 'binance',
        data: expect.objectContaining({
          symbol: 'BTCUSDT',
          type: 'ticker'
        })
      }));
    });
  });
  
  describe('heartbeat', () => {
    let mockSocket: MockWebSocket;
    
    beforeEach(async () => {
      // Connect the adapter first
      const connectPromise = adapter.connect();
      mockSocket = adapter['socket'] as unknown as MockWebSocket;
      mockSocket.emitOpen();
      await connectPromise;
      
      // Clear any events from connection
      mockEventCallback.mockClear();
    });
    
    it('should send heartbeat successfully', async () => {
      // Spy on the socket.send method
      const sendSpy = jest.spyOn(mockSocket, 'send');
      
      // Send heartbeat
      const result = await adapter.sendHeartbeat();
      
      // Verify results
      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalled();
      expect(mockEventCallback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'heartbeat',
        exchange: 'binance'
      }));
    });
  });
});
