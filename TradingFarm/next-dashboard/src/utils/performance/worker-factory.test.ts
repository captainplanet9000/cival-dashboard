/**
 * Unit tests for the worker factory utility
 */
import { createWorkerScript, commonTasks } from './worker-factory';

// Mock Web Worker implementation
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  constructor(public url: string) {}
  
  postMessage(data: any) {
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', {
          data: {
            id: data.id,
            type: data.type,
            result: { success: true, data: 'Test result' },
            performance: { duration: 10 }
          }
        }));
      }
    }, 10);
  }
  
  terminate() {}
}

// Mock URL
class MockURL {
  constructor(public url: string, public base: string) {}
  
  toString() {
    return this.url;
  }
}

// Setup global mocks
global.Worker = MockWorker as any;
global.URL = MockURL as any;
global.URL.createObjectURL = jest.fn().mockReturnValue('blob:test-worker');
global.URL.revokeObjectURL = jest.fn();

describe('Worker Factory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  
  describe('createWorkerScript', () => {
    test('generates valid worker script code', () => {
      // Test task handlers
      const taskHandlers = {
        test: (data: any) => ({ result: data.input * 2 }),
        process: (data: any) => ({ processed: true, value: data.value })
      };
      
      // Generate script
      const script = createWorkerScript(taskHandlers);
      
      // Check for essential parts of the script
      expect(script).toContain('self.onmessage');
      expect(script).toContain('case \'test\'');
      expect(script).toContain('case \'process\'');
      expect(script).toContain('self.postMessage');
      expect(script).toContain('performance.now()');
    });
    
    test('includes all provided task handlers', () => {
      // Test with more handlers
      const taskHandlers = {
        task1: () => ({}),
        task2: () => ({}),
        task3: () => ({}),
        task4: () => ({})
      };
      
      const script = createWorkerScript(taskHandlers);
      
      // Check for all task handlers
      Object.keys(taskHandlers).forEach(taskName => {
        expect(script).toContain(`case '${taskName}':`);
      });
    });
  });
  
  describe('commonTasks', () => {
    test('calculateIndicators calculates RSI correctly', () => {
      // Sample price data
      const prices = [10, 10.5, 10.2, 10.4, 10.8, 10.7, 10.6, 11.0, 11.2, 11.4, 11.2, 11.0, 11.3, 11.5, 11.7, 11.8];
      const volume = Array(prices.length).fill(1000);
      
      // Call the function directly
      const result = commonTasks.calculateIndicators({
        prices,
        volume,
        type: 'rsi',
        period: 5
      });
      
      // Verify RSI is calculated
      expect(result).toHaveProperty('rsi');
      expect(Array.isArray(result.rsi)).toBe(true);
      expect(result.rsi.length).toBeGreaterThan(0);
      
      // Each RSI value should be between 0 and 100
      result.rsi.forEach((value: number) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });
    
    test('calculateIndicators calculates MACD correctly', () => {
      // Sample price data - longer series for MACD
      const prices = Array(50).fill(0).map((_, i) => 100 + Math.sin(i / 5) * 10);
      const volume = Array(prices.length).fill(1000);
      
      // Call the function directly
      const result = commonTasks.calculateIndicators({
        prices,
        volume,
        type: 'macd'
      });
      
      // Verify MACD is calculated
      expect(result).toHaveProperty('macd');
      expect(result.macd).toHaveProperty('macdLine');
      expect(result.macd).toHaveProperty('signalLine');
      expect(result.macd).toHaveProperty('histogram');
      
      // Check array lengths
      expect(Array.isArray(result.macd.macdLine)).toBe(true);
      expect(Array.isArray(result.macd.signalLine)).toBe(true);
      expect(Array.isArray(result.macd.histogram)).toBe(true);
      
      // Signal line should be shorter than macdLine due to additional smoothing
      expect(result.macd.macdLine.length).toEqual(result.macd.signalLine.length);
      expect(result.macd.histogram.length).toEqual(result.macd.signalLine.length);
    });
    
    test('calculateIndicators calculates Bollinger Bands correctly', () => {
      // Sample price data
      const prices = Array(30).fill(0).map((_, i) => 100 + Math.sin(i / 3) * 5);
      const volume = Array(prices.length).fill(1000);
      
      // Call the function directly
      const result = commonTasks.calculateIndicators({
        prices,
        volume,
        type: 'bollinger',
        period: 10
      });
      
      // Verify Bollinger Bands are calculated
      expect(result).toHaveProperty('bollinger');
      expect(result.bollinger).toHaveProperty('middle');
      expect(result.bollinger).toHaveProperty('upper');
      expect(result.bollinger).toHaveProperty('lower');
      
      // Check array lengths
      expect(Array.isArray(result.bollinger.middle)).toBe(true);
      expect(Array.isArray(result.bollinger.upper)).toBe(true);
      expect(Array.isArray(result.bollinger.lower)).toBe(true);
      
      // All arrays should have the same length
      const middleLength = result.bollinger.middle.length;
      expect(result.bollinger.upper.length).toEqual(middleLength);
      expect(result.bollinger.lower.length).toEqual(middleLength);
      
      // Upper band should always be higher than middle, lower always lower
      for (let i = 0; i < middleLength; i++) {
        expect(result.bollinger.upper[i]).toBeGreaterThan(result.bollinger.middle[i]);
        expect(result.bollinger.lower[i]).toBeLessThan(result.bollinger.middle[i]);
      }
    });
    
    test('optimizePortfolio returns valid portfolio allocation', () => {
      // Sample portfolio data
      const assets = [
        {
          id: 'AAPL',
          returns: [0.01, 0.02, -0.01, 0.03, 0.01],
          volatility: 0.15,
          correlation: { 'MSFT': 0.7, 'GOOG': 0.65 }
        },
        {
          id: 'MSFT',
          returns: [0.02, 0.01, 0.01, 0.02, -0.01],
          volatility: 0.14,
          correlation: { 'AAPL': 0.7, 'GOOG': 0.8 }
        },
        {
          id: 'GOOG',
          returns: [0.015, 0.025, 0.01, -0.02, 0.03],
          volatility: 0.18,
          correlation: { 'AAPL': 0.65, 'MSFT': 0.8 }
        }
      ];
      
      // Call the function directly
      const result = commonTasks.optimizePortfolio({
        assets,
        riskTolerance: 0.5,
        constraints: {
          minWeight: { 'AAPL': 0.1 },
          maxWeight: { 'GOOG': 0.4 }
        }
      });
      
      // Verify result structure
      expect(result).toHaveProperty('weights');
      expect(result).toHaveProperty('expectedReturn');
      expect(result).toHaveProperty('expectedRisk');
      expect(result).toHaveProperty('sharpeRatio');
      
      // Check weights add up to approximately 1
      const totalWeight = Object.values(result.weights).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1, 2);
      
      // Check constraints are respected
      expect(result.weights['AAPL']).toBeGreaterThanOrEqual(0.1);
      expect(result.weights['GOOG']).toBeLessThanOrEqual(0.4);
      
      // Check other properties are reasonable
      expect(result.expectedReturn).toBeGreaterThan(0);
      expect(result.expectedRisk).toBeGreaterThan(0);
      expect(result.sharpeRatio).toBeGreaterThan(0);
    });
  });
});

// Note: Testing the actual worker communication (createDedicatedWorker, createInlineWorker, createWorkerPool)
// would require more complex mocking of the web worker functionality.
// In a production environment, consider using a library like 'jest-worker' for more thorough testing.
