/**
 * Unit tests for WebSocketManager
 * 
 * Tests the functionality of the WebSocket manager implementation.
 */

import { WebSocketManager } from '@/lib/websocket/websocket-manager';
import { WebSocketConfig, WebSocketConnectionStatus } from '@/lib/websocket/types';
import { createExchangeAdapter } from '@/lib/websocket/adapters/exchange-adapter';

// Mock the createExchangeAdapter function
jest.mock('@/lib/websocket/adapters/exchange-adapter', () => ({
  createExchangeAdapter: jest.fn()
}));

// Mock the Supabase client
jest.mock('@/utils/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 1 },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: { id: 1 },
            error: null
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 1, status: 'connected' },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('WebSocketManager', () => {
  let manager: WebSocketManager;
  let mockAdapter: any;
  
  beforeEach(() => {
    // Create mock adapter with all required methods
    mockAdapter = {
      initialize: jest.fn(),
      connect: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn().mockResolvedValue(true),
      subscribe: jest.fn().mockResolvedValue(true),
      unsubscribe: jest.fn().mockResolvedValue(true),
      getStatus: jest.fn().mockReturnValue('connected'),
      getConnectionRecordId: jest.fn().mockReturnValue(1),
      sendHeartbeat: jest.fn().mockResolvedValue(true)
    };
    
    // Mock the createExchangeAdapter to return our mock adapter
    (createExchangeAdapter as jest.Mock).mockReturnValue(mockAdapter);
    
    // Initialize the WebSocketManager
    manager = new WebSocketManager();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('connectToExchange', () => {
    const testConfig: WebSocketConfig = {
      connectionId: 'test-connection',
      url: 'wss://test.exchange.com/ws',
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
    
    it('should successfully connect to an exchange', async () => {
      // Connect to exchange
      const result = await manager.connectToExchange('binance', testConfig);
      
      // Verify results
      expect(result).toBe(true);
      expect(createExchangeAdapter).toHaveBeenCalledWith('binance');
      expect(mockAdapter.initialize).toHaveBeenCalledWith(
        'binance', 
        testConfig, 
        expect.any(Number), 
        expect.any(Function)
      );
      expect(mockAdapter.connect).toHaveBeenCalled();
    });
    
    it('should handle connection failure', async () => {
      // Mock the connect method to fail
      mockAdapter.connect.mockResolvedValueOnce(false);
      
      // Connect to exchange
      const result = await manager.connectToExchange('binance', testConfig);
      
      // Verify results
      expect(result).toBe(false);
    });
    
    it('should not create multiple connections for the same exchange and connection ID', async () => {
      // Connect to exchange twice
      await manager.connectToExchange('binance', testConfig);
      await manager.connectToExchange('binance', testConfig);
      
      // Verify adapter was only created once
      expect(createExchangeAdapter).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('disconnectFromExchange', () => {
    const testConfig: WebSocketConfig = {
      connectionId: 'test-connection',
      url: 'wss://test.exchange.com/ws'
    };
    
    beforeEach(async () => {
      // Connect to exchange first
      await manager.connectToExchange('binance', testConfig);
    });
    
    it('should successfully disconnect from an exchange', async () => {
      // Disconnect from exchange
      const result = await manager.disconnectFromExchange('binance', 'test-connection');
      
      // Verify results
      expect(result).toBe(true);
      expect(mockAdapter.disconnect).toHaveBeenCalled();
    });
    
    it('should handle disconnection failure', async () => {
      // Mock the disconnect method to fail
      mockAdapter.disconnect.mockResolvedValueOnce(false);
      
      // Disconnect from exchange
      const result = await manager.disconnectFromExchange('binance', 'test-connection');
      
      // Verify results
      expect(result).toBe(false);
    });
    
    it('should handle non-existent connections', async () => {
      // Disconnect from non-existent connection
      const result = await manager.disconnectFromExchange('coinbase', 'non-existent');
      
      // Verify results
      expect(result).toBe(false);
    });
  });
  
  describe('subscribe', () => {
    const testConfig: WebSocketConfig = {
      connectionId: 'test-connection',
      url: 'wss://test.exchange.com/ws'
    };
    
    beforeEach(async () => {
      // Connect to exchange first
      await manager.connectToExchange('binance', testConfig);
    });
    
    it('should successfully subscribe to a channel', async () => {
      // Subscribe to channel
      const result = await manager.subscribe('binance', 'test-connection', {
        channel: 'ticker',
        symbols: ['BTC/USDT', 'ETH/USDT']
      });
      
      // Verify results
      expect(result).toBe(true);
      expect(mockAdapter.subscribe).toHaveBeenCalledWith(
        {
          channel: 'ticker',
          symbols: ['BTC/USDT', 'ETH/USDT']
        },
        expect.any(Number)
      );
    });
    
    it('should handle subscription failure', async () => {
      // Mock the subscribe method to fail
      mockAdapter.subscribe.mockResolvedValueOnce(false);
      
      // Subscribe to channel
      const result = await manager.subscribe('binance', 'test-connection', {
        channel: 'ticker',
        symbols: ['BTC/USDT']
      });
      
      // Verify results
      expect(result).toBe(false);
    });
    
    it('should handle non-existent connections', async () => {
      // Subscribe to non-existent connection
      const result = await manager.subscribe('coinbase', 'non-existent', {
        channel: 'ticker',
        symbols: ['BTC/USDT']
      });
      
      // Verify results
      expect(result).toBe(false);
    });
  });
  
  describe('unsubscribe', () => {
    const testConfig: WebSocketConfig = {
      connectionId: 'test-connection',
      url: 'wss://test.exchange.com/ws'
    };
    
    beforeEach(async () => {
      // Connect to exchange first
      await manager.connectToExchange('binance', testConfig);
      
      // Subscribe to channel
      await manager.subscribe('binance', 'test-connection', {
        channel: 'ticker',
        symbols: ['BTC/USDT', 'ETH/USDT']
      });
    });
    
    it('should successfully unsubscribe from a channel', async () => {
      // Unsubscribe from channel
      const result = await manager.unsubscribe('binance', 'test-connection', 'ticker', ['BTC/USDT']);
      
      // Verify results
      expect(result).toBe(true);
      expect(mockAdapter.unsubscribe).toHaveBeenCalledWith('ticker', ['BTC/USDT']);
    });
    
    it('should handle unsubscription failure', async () => {
      // Mock the unsubscribe method to fail
      mockAdapter.unsubscribe.mockResolvedValueOnce(false);
      
      // Unsubscribe from channel
      const result = await manager.unsubscribe('binance', 'test-connection', 'ticker');
      
      // Verify results
      expect(result).toBe(false);
    });
    
    it('should handle non-existent connections', async () => {
      // Unsubscribe from non-existent connection
      const result = await manager.unsubscribe('coinbase', 'non-existent', 'ticker');
      
      // Verify results
      expect(result).toBe(false);
    });
  });
  
  describe('getConnectionStatus', () => {
    const testConfig: WebSocketConfig = {
      connectionId: 'test-connection',
      url: 'wss://test.exchange.com/ws'
    };
    
    beforeEach(async () => {
      // Connect to exchange first
      await manager.connectToExchange('binance', testConfig);
    });
    
    it('should return the correct connection status', async () => {
      // Get connection status
      const status = await manager.getConnectionStatus('binance', 'test-connection');
      
      // Verify results
      expect(status).toBe('connected');
      expect(mockAdapter.getStatus).toHaveBeenCalled();
    });
    
    it('should handle non-existent connections', async () => {
      // Get status of non-existent connection
      const status = await manager.getConnectionStatus('coinbase', 'non-existent');
      
      // Verify results
      expect(status).toBe('disconnected');
    });
  });
  
  describe('handleEvent', () => {
    const testConfig: WebSocketConfig = {
      connectionId: 'test-connection',
      url: 'wss://test.exchange.com/ws'
    };
    
    beforeEach(async () => {
      // Connect to exchange first
      await manager.connectToExchange('binance', testConfig);
      
      // Mock the updateConnectionStatus method
      jest.spyOn(manager as any, 'updateConnectionStatus').mockResolvedValue();
      
      // Mock the updateSubscriptionStatus method
      jest.spyOn(manager as any, 'updateSubscriptionStatus').mockResolvedValue();
      
      // Mock the recordMetrics method
      jest.spyOn(manager as any, 'recordMetrics').mockResolvedValue();
    });
    
    it('should handle connection status change events', async () => {
      // Mock manager methods
      const mockUpdateConnectionStatus = jest.spyOn(manager as any, 'updateConnectionStatus');
      
      // Call handleEvent method directly with a connection status event
      await (manager as any).handleEvent({
        type: 'connection_status_change',
        exchange: 'binance',
        connectionId: 'test-connection',
        timestamp: Date.now(),
        data: {
          status: 'disconnected'
        }
      });
      
      // Verify results
      expect(mockUpdateConnectionStatus).toHaveBeenCalledWith(
        'binance',
        'test-connection',
        'disconnected'
      );
    });
    
    it('should handle subscription status change events', async () => {
      // Mock manager methods
      const mockUpdateSubscriptionStatus = jest.spyOn(manager as any, 'updateSubscriptionStatus');
      
      // Call handleEvent method directly with a subscription status event
      await (manager as any).handleEvent({
        type: 'subscription_status_change',
        exchange: 'binance',
        connectionId: 'test-connection',
        timestamp: Date.now(),
        data: {
          channel: 'ticker',
          symbols: ['BTC/USDT'],
          status: 'subscribed'
        }
      });
      
      // Verify results
      expect(mockUpdateSubscriptionStatus).toHaveBeenCalledWith(
        1,
        'ticker',
        ['BTC/USDT'],
        'subscribed'
      );
    });
    
    it('should handle heartbeat events', async () => {
      // Mock manager methods
      const mockRecordMetrics = jest.spyOn(manager as any, 'recordMetrics');
      
      // Call handleEvent method directly with a heartbeat event
      await (manager as any).handleEvent({
        type: 'heartbeat',
        exchange: 'binance',
        connectionId: 'test-connection',
        timestamp: Date.now(),
        data: {
          latency: 50
        }
      });
      
      // Verify results
      expect(mockRecordMetrics).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          latency: 50
        })
      );
    });
  });
});
