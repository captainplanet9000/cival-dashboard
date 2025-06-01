import { QueryClient } from '@tanstack/react-query';
import { 
  createReconnectingWebSocket, 
  handleEntityUpdate, 
  handleMarketUpdate, 
  handleTradeUpdate
} from '@/utils/react-query/websocket-integration';
import { queryKeys } from '@/utils/react-query/query-keys';

// Mock WebSocket
class MockWebSocket {
  url: string;
  onopen: (event: any) => void = () => {};
  onclose: (event: any) => void = () => {};
  onmessage: (event: any) => void = () => {};
  onerror: (event: any) => void = () => {};
  readyState: number = 0;
  CONNECTING: number = 0;
  OPEN: number = 1;
  CLOSING: number = 2;
  CLOSED: number = 3;
  
  constructor(url: string) {
    this.url = url;
  }
  
  send(data: string) {
    // Mock implementation
  }
  
  close() {
    // Mock implementation
    this.readyState = this.CLOSED;
  }
  
  // Helper for testing
  mockOpen() {
    this.readyState = this.OPEN;
    this.onopen({});
  }
  
  mockMessage(data: any) {
    this.onmessage({ data: JSON.stringify(data) });
  }
  
  mockClose() {
    this.readyState = this.CLOSED;
    this.onclose({});
  }
  
  mockError() {
    this.onerror({});
  }
}

// Mock window object
Object.defineProperty(global, 'WebSocket', {
  value: MockWebSocket,
  writable: true
});

// Mock timers
jest.useFakeTimers();

describe('WebSocket Integration', () => {
  let queryClient: QueryClient;
  let wsConnection: ReturnType<typeof createReconnectingWebSocket>;
  let mockWs: MockWebSocket;
  
  beforeEach(() => {
    queryClient = new QueryClient();
    
    // Spy on queryClient methods
    jest.spyOn(queryClient, 'invalidateQueries');
    jest.spyOn(queryClient, 'setQueryData');
    
    // Create the WebSocket connection
    wsConnection = createReconnectingWebSocket('wss://test-api.tradingfarm.io/ws', queryClient);
    
    // Get the mock WebSocket instance
    mockWs = wsConnection.getWebSocket() as unknown as MockWebSocket;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    wsConnection.disconnect();
  });
  
  describe('Connection Management', () => {
    it('should connect to the WebSocket server', () => {
      expect(mockWs.url).toBe('wss://test-api.tradingfarm.io/ws');
      
      // Simulate connection
      mockWs.mockOpen();
      
      expect(wsConnection.isConnected()).toBe(true);
    });
    
    it('should attempt to reconnect when connection is closed', () => {
      // Connect and then close
      mockWs.mockOpen();
      mockWs.mockClose();
      
      // Fast-forward time
      jest.advanceTimersByTime(5000);
      
      // Should create a new WebSocket
      expect(wsConnection.getWebSocket()).not.toBe(mockWs);
    });
    
    it('should handle connection errors', () => {
      // Simulate connection error
      mockWs.mockOpen();
      mockWs.mockError();
      
      // Should disconnect
      expect(wsConnection.isConnected()).toBe(false);
      
      // Fast-forward time for reconnect
      jest.advanceTimersByTime(5000);
      
      // Should create a new WebSocket
      expect(wsConnection.getWebSocket()).not.toBe(mockWs);
    });
    
    it('should stop reconnecting when disconnect is called', () => {
      // Connect and then disconnect
      mockWs.mockOpen();
      wsConnection.disconnect();
      
      // Fast-forward time
      jest.advanceTimersByTime(10000);
      
      // Should not reconnect
      expect(wsConnection.isReconnecting()).toBe(false);
    });
  });
  
  describe('Message Handling', () => {
    it('should handle entity update messages', () => {
      // Mock entity data
      const entityUpdate = {
        type: 'entity_update',
        entityType: 'strategy',
        entityId: 'strategy-123',
        data: {
          id: 'strategy-123',
          name: 'Updated Strategy Name',
          status: 'active'
        }
      };
      
      // Set initial data in cache
      queryClient.setQueryData(
        queryKeys.strategy.detail('strategy-123')._def,
        {
          id: 'strategy-123',
          name: 'Original Strategy Name',
          status: 'paused'
        }
      );
      
      // Simulate connection and message
      mockWs.mockOpen();
      mockWs.mockMessage(entityUpdate);
      
      // Check that cache was updated
      const updatedData = queryClient.getQueryData(
        queryKeys.strategy.detail('strategy-123')._def
      );
      
      expect(updatedData).toEqual(entityUpdate.data);
    });
    
    it('should handle market update messages', () => {
      // Mock market data
      const marketUpdate = {
        type: 'market_update',
        symbol: 'BTCUSDT',
        price: 50000,
        volume: 1200000,
        timestamp: Date.now()
      };
      
      // Set initial market data in cache
      queryClient.setQueryData(
        queryKeys.market.price('BTCUSDT')._def,
        {
          symbol: 'BTCUSDT',
          price: 49500,
          volume: 1100000,
          timestamp: Date.now() - 60000
        }
      );
      
      // Simulate connection and message
      mockWs.mockOpen();
      mockWs.mockMessage(marketUpdate);
      
      // Check that cache was updated
      const updatedData = queryClient.getQueryData(
        queryKeys.market.price('BTCUSDT')._def
      );
      
      expect(updatedData).toEqual(marketUpdate);
    });
    
    it('should handle trade update messages and invalidate related queries', () => {
      // Mock trade data
      const tradeUpdate = {
        type: 'trade_update',
        tradeId: 'trade-456',
        positionId: 'position-789',
        farmId: 'farm-123',
        status: 'closed',
        data: {
          id: 'trade-456',
          entryPrice: 48000,
          exitPrice: 52000,
          profit: 400,
          side: 'long'
        }
      };
      
      // Simulate connection and message
      mockWs.mockOpen();
      mockWs.mockMessage(tradeUpdate);
      
      // Check that related queries were invalidated
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.positions.detail(tradeUpdate.positionId)._def
      });
      
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.trades.list({ farmId: tradeUpdate.farmId })._def
      });
      
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.dashboard.overview(tradeUpdate.farmId)._def
      });
    });
    
    it('should ignore unknown message types', () => {
      // Mock unknown message
      const unknownMessage = {
        type: 'unknown_type',
        data: {
          id: 'some-id',
          value: 'some-value'
        }
      };
      
      // Simulate connection and message
      mockWs.mockOpen();
      mockWs.mockMessage(unknownMessage);
      
      // Check that no updates were made
      expect(queryClient.setQueryData).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });
  });
  
  describe('Individual Handlers', () => {
    it('handleEntityUpdate should update the cache for the specific entity', () => {
      // Setup entity update message
      const entityUpdate = {
        entityType: 'agent',
        entityId: 'agent-456',
        data: {
          id: 'agent-456',
          name: 'Updated Agent',
          status: 'running'
        }
      };
      
      // Call the handler directly
      handleEntityUpdate(queryClient, entityUpdate);
      
      // Check that cache was updated
      expect(queryClient.setQueryData).toHaveBeenCalledWith(
        queryKeys.agent.detail('agent-456')._def,
        entityUpdate.data
      );
    });
    
    it('handleMarketUpdate should update market price data', () => {
      // Setup market update message
      const marketUpdate = {
        symbol: 'ETHUSDT',
        price: 3000,
        volume: 500000,
        timestamp: Date.now()
      };
      
      // Call the handler directly
      handleMarketUpdate(queryClient, marketUpdate);
      
      // Check that cache was updated
      expect(queryClient.setQueryData).toHaveBeenCalledWith(
        queryKeys.market.price('ETHUSDT')._def,
        marketUpdate
      );
    });
    
    it('handleTradeUpdate should invalidate related queries', () => {
      // Setup trade update message
      const tradeUpdate = {
        tradeId: 'trade-789',
        positionId: 'position-123',
        farmId: 'farm-456',
        status: 'opened',
        data: {
          id: 'trade-789',
          entryPrice: 3100,
          side: 'short'
        }
      };
      
      // Call the handler directly
      handleTradeUpdate(queryClient, tradeUpdate);
      
      // Check that related queries were invalidated
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.positions.detail(tradeUpdate.positionId)._def
      });
      
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.trades.list({ farmId: tradeUpdate.farmId })._def
      });
      
      // For new trades, dashboard overview should be invalidated
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.dashboard.overview(tradeUpdate.farmId)._def
      });
    });
  });
});
