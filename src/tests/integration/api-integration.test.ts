import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiGateway, ApiServiceType } from '../../services/api-gateway';
import { ValidationService } from '../../services/validation/validator';
import { marketDataSchema } from '../../services/validation/api-schemas';
import { CircuitBreaker } from '../../services/resilience/circuit-breaker';
import { ApiCache } from '../../services/cache/api-cache';
import { MonitoringService } from '../../services/monitoring-service';
import { RequestSigner } from '../../services/security/request-signing';
import { ApiInspector } from '../../utils/api-inspector';

// Mock fetch
global.fetch = vi.fn();

// Mock monitoring service
vi.mock('../../services/monitoring-service', () => ({
  MonitoringService: {
    logEvent: vi.fn(),
    trackMetric: vi.fn(),
    getInstance: vi.fn().mockReturnValue({
      logEvent: vi.fn(),
      trackMetric: vi.fn()
    })
  }
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  },
  writable: true
});

describe('API Integration Tests', () => {
  let apiGateway: ApiGateway;
  
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Reset singletons
    // @ts-ignore - Accessing private property for tests
    ApiGateway.instance = undefined;
    
    // Get fresh gateway instance
    apiGateway = ApiGateway.getInstance();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('API Gateway', () => {
    it('should make successful API requests', async () => {
      const mockResponse = {
        data: { test: 'success' },
        error: null,
        status: 200
      };
      
      // Mock fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });
      
      const response = await apiGateway.request('/api/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET'
        })
      );
      
      expect(response).toEqual({
        data: { test: 'success' },
        error: null,
        status: 200
      });
    });
    
    it('should handle network errors with retry', async () => {
      const error = new Error('Network error');
      const mockResponse = {
        data: { test: 'success-after-retry' },
        error: null,
        status: 200
      };
      
      // First call fails, second succeeds
      (global.fetch as any)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse
        });
      
      const response = await apiGateway.request('/api/test', {
        retries: 1
      });
      
      // Should be called twice (original + 1 retry)
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      expect(response).toEqual({
        data: { test: 'success-after-retry' },
        error: null,
        status: 200
      });
      
      // Logging should capture retry
      expect(MonitoringService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: expect.stringContaining('Retrying')
        })
      );
    });
  });
  
  describe('Data Validation', () => {
    it('should validate data against schemas', () => {
      const validData = {
        symbol: 'BTC/USD',
        timestamp: 1625097600000,
        datetime: '2021-07-01T00:00:00.000Z',
        open: 33000,
        high: 35000,
        low: 32000,
        close: 34500,
        volume: 1000,
      };
      
      const result = ValidationService.validate(marketDataSchema, validData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });
    
    it('should reject invalid data with detailed errors', () => {
      const invalidData = {
        symbol: 'BTC/USD',
        // Missing required fields
        timestamp: '1625097600000', // Wrong type - should be number
        open: 33000,
        high: 35000,
        low: 32000,
      };
      
      const result = ValidationService.validate(marketDataSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.timestamp).toBeDefined();
      expect(result.errors?.datetime).toBeDefined();
      expect(result.errors?.close).toBeDefined();
      expect(result.errors?.volume).toBeDefined();
    });
  });
  
  describe('Circuit Breaker', () => {
    it('should open circuit after failures', () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3
      });
      
      // Initial state should be closed
      expect(circuitBreaker.getState()).toBe('CLOSED');
      
      // Record failures
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      
      // Should still be closed
      expect(circuitBreaker.getState()).toBe('CLOSED');
      
      // One more failure should open circuit
      circuitBreaker.recordFailure();
      
      // Should be open
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Requests should be blocked
      expect(circuitBreaker.canRequest()).toBe(false);
    });
    
    it('should transition to half-open after timeout', () => {
      vi.useFakeTimers();
      
      const resetTimeout = 1000; // 1 second for test
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout
      });
      
      // Open the circuit
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      
      // Should be open
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Advance time
      vi.advanceTimersByTime(resetTimeout + 1);
      
      // Should transition to half-open
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      
      // Requests should be allowed
      expect(circuitBreaker.canRequest()).toBe(true);
      
      vi.useRealTimers();
    });
    
    it('should close circuit after successful test requests', () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        halfOpenSuccessThreshold: 2
      });
      
      // Open the circuit
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      
      // Should be open
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Manually transition to half-open for testing
      // @ts-ignore - Accessing private method for tests
      circuitBreaker.transitionTo('HALF_OPEN');
      
      // Record successful test requests
      circuitBreaker.recordSuccess();
      
      // Should still be half-open
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      
      // One more success should close it
      circuitBreaker.recordSuccess();
      
      // Should be closed
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });
  
  describe('API Caching', () => {
    it('should cache and retrieve values', () => {
      const cache = new ApiCache();
      const key = 'test-key';
      const value = { id: 1, name: 'test' };
      
      // Initially should not be cached
      expect(cache.get(key)).toBeNull();
      
      // Set value
      cache.set(key, value);
      
      // Should retrieve value
      expect(cache.get(key)).toEqual(value);
      
      // Delete value
      cache.delete(key);
      
      // Should no longer be cached
      expect(cache.get(key)).toBeNull();
    });
    
    it('should respect TTL (time to live)', () => {
      vi.useFakeTimers();
      
      const cache = new ApiCache();
      const key = 'test-key';
      const value = { id: 1, name: 'test' };
      
      // Set with short TTL
      cache.set(key, value, { ttl: 1000 }); // 1 second
      
      // Should be cached
      expect(cache.get(key)).toEqual(value);
      
      // Advance time
      vi.advanceTimersByTime(1100);
      
      // Should expire
      expect(cache.get(key)).toBeNull();
      
      vi.useRealTimers();
    });
    
    it('should invalidate by group', () => {
      const cache = new ApiCache();
      
      // Set values with group
      cache.set('key1', 'value1', { group: 'group1' });
      cache.set('key2', 'value2', { group: 'group1' });
      cache.set('key3', 'value3', { group: 'group2' });
      
      // All should be cached
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      
      // Invalidate group
      const count = cache.invalidateGroup('group1');
      
      // Should have invalidated 2 items
      expect(count).toBe(2);
      
      // Group 1 items should be gone
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      
      // Group 2 items should remain
      expect(cache.get('key3')).toBe('value3');
    });
  });
  
  describe('Request Signing', () => {
    it('should sign requests with appropriate signatures', () => {
      const config = {
        key: 'test-api-key',
        secret: 'test-api-secret'
      };
      
      const request = {
        method: 'POST',
        path: '/api/order',
        body: { symbol: 'BTC/USD', side: 'buy', amount: 1 }
      };
      
      // Test Bybit signing
      const bybitSigned = RequestSigner.signBybit(config, request);
      
      expect(bybitSigned.headers).toBeDefined();
      expect(bybitSigned.queryParams).toBeDefined();
      expect(bybitSigned.queryParams?.api_key).toBe(config.key);
      expect(bybitSigned.queryParams?.sign).toBeDefined();
      
      // Test Binance signing
      const binanceSigned = RequestSigner.signBinance(config, request);
      
      expect(binanceSigned.headers?.['X-MBX-APIKEY']).toBe(config.key);
      expect(binanceSigned.queryParams?.signature).toBeDefined();
    });
  });
  
  describe('API Inspector', () => {
    it('should capture and log API requests and responses', () => {
      const inspector = ApiInspector.getInstance();
      
      // Initially no logs
      expect(inspector.getLogs().length).toBe(0);
      
      // Capture request
      const requestId = inspector.captureRequest({
        method: 'GET',
        url: '/api/test',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Should have one log
      expect(inspector.getLogs().length).toBe(1);
      
      // Capture response
      inspector.captureResponse(requestId, 200, { success: true });
      
      // Should update the log
      const log = inspector.getLogById(requestId);
      
      expect(log).toBeDefined();
      expect(log?.status).toBe(200);
      expect(log?.response).toEqual({ success: true });
      expect(log?.duration).toBeDefined();
      
      // Clear logs
      inspector.clearLogs();
      
      // Should have no logs
      expect(inspector.getLogs().length).toBe(0);
    });
  });
}); 