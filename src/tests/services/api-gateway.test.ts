import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { ApiGateway, ApiServiceType, ApiMethod } from '../../services/api-gateway';
import { marketsResponseSchema } from '../../services/validation/api-schemas';
import { ValidationService } from '../../services/validation/validator';
import { MonitoringService } from '../../services/monitoring-service';

// Mock fetch
global.fetch = vi.fn();
// Mock monitoring service
vi.mock('../../services/monitoring-service', () => ({
  MonitoringService: {
    logEvent: vi.fn(),
    trackMetric: vi.fn(),
    measureExecutionTime: vi.fn((name, fn) => fn()),
  }
}));

describe('ApiGateway', () => {
  let apiGateway: ApiGateway;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Reset API Gateway singleton for each test
    // @ts-ignore - accessing private property for testing
    ApiGateway.instance = undefined;
    
    // Get a fresh instance
    apiGateway = ApiGateway.getInstance();
    
    // Mock AbortController
    global.AbortController = vi.fn().mockImplementation(() => ({
      signal: {},
      abort: vi.fn()
    }));
    
    // Mock setTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('request', () => {
    it('should make a successful GET request', async () => {
      const mockResponse = {
        data: [{ id: 'BTC/USD', symbol: 'BTC/USD' }],
        error: null,
        status: 200
      };
      
      // Mock fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });
      
      const response = await apiGateway.request('/api/markets', {
        method: 'GET',
        headers: { 'x-test': 'test' }
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/markets',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ 'x-test': 'test' })
        })
      );
      
      expect(response).toEqual({
        data: mockResponse.data,
        error: null,
        status: 200
      });
    });
    
    it('should handle network errors and retry', async () => {
      const networkError = new Error('Network error');
      
      // First two calls fail, third succeeds
      (global.fetch as any)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: 'success', error: null, status: 200 })
        });
      
      const response = await apiGateway.request('/api/test', {
        method: 'GET',
        retries: 3
      });
      
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(response).toEqual({
        data: 'success',
        error: null,
        status: 200
      });
      
      // Verify backoff behavior
      expect(MonitoringService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: expect.stringContaining('Retrying')
        })
      );
    });
    
    it('should use the circuit breaker when too many errors occur', async () => {
      // Mock circuit breaker to simulate open state
      const circuitBreaker = {
        canRequest: vi.fn().mockReturnValue(false)
      };
      
      // @ts-ignore - Set circuit breaker for specific endpoint
      apiGateway.circuitBreakers.set('GET:/api/circuit-test', circuitBreaker);
      
      const response = await apiGateway.request('/api/circuit-test', {
        method: 'GET'
      });
      
      expect(global.fetch).not.toHaveBeenCalled();
      expect(response).toEqual({
        data: null,
        error: expect.objectContaining({
          message: expect.stringContaining('circuit breaker open')
        }),
        status: 503
      });
    });
    
    it('should use cache for GET requests when enabled', async () => {
      const mockResponse = {
        data: { test: 'data' },
        error: null,
        status: 200
      };
      
      // First call should make a real request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });
      
      // Make first request with caching enabled
      const firstResponse = await apiGateway.request('/api/cached', {
        method: 'GET',
        useCache: true,
        cacheTime: 60000
      });
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(firstResponse).toEqual({
        data: mockResponse.data,
        error: null,
        status: 200
      });
      
      // Reset mock to verify it's not called again
      (global.fetch as any).mockReset();
      
      // Make the same request again - should use cache
      const secondResponse = await apiGateway.request('/api/cached', {
        method: 'GET',
        useCache: true
      });
      
      expect(global.fetch).not.toHaveBeenCalled();
      expect(secondResponse).toEqual({
        data: mockResponse.data,
        error: null,
        status: 200,
        cached: true
      });
    });
    
    it('should validate responses with schemas when provided', async () => {
      const mockResponse = {
        data: [
          { 
            id: 'BTC/USD', 
            symbol: 'BTC/USD',
            base: 'BTC',
            quote: 'USD',
            active: true,
            precision: { price: 2, amount: 8 },
            limits: { 
              amount: { min: 0.0001, max: null },
              price: { min: 0.01, max: null }
            }
          }
        ],
        error: null,
        status: 200
      };
      
      // Mock fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });
      
      // Add validation spy
      const validateSpy = vi.spyOn(ValidationService, 'validate');
      
      const response = await apiGateway.request('/api/markets', {
        method: 'GET',
        // @ts-ignore - adding for test purposes
        validationSchema: marketsResponseSchema
      });
      
      expect(validateSpy).toHaveBeenCalledWith(
        marketsResponseSchema,
        mockResponse
      );
      
      expect(response).toEqual({
        data: mockResponse.data,
        error: null,
        status: 200
      });
    });
  });
  
  describe('serviceRequest', () => {
    it('should construct the correct URL for a service request', async () => {
      const mockResponse = {
        data: 'service data',
        error: null,
        status: 200
      };
      
      // Mock fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });
      
      await apiGateway.serviceRequest(
        ApiServiceType.EXCHANGE,
        '/markets',
        { method: 'GET' }
      );
      
      // Should call with the correct service URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/exchanges\/markets/),
        expect.any(Object)
      );
    });
  });
  
  describe('Performance monitoring', () => {
    it('should track request performance metrics', async () => {
      // Mock fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test', error: null, status: 200 })
      });
      
      await apiGateway.request('/api/performance-test', { method: 'GET' });
      
      expect(MonitoringService.measureExecutionTime).toHaveBeenCalled();
      expect(MonitoringService.trackMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('api_request'),
          unit: 'ms'
        })
      );
    });
  });
}); 