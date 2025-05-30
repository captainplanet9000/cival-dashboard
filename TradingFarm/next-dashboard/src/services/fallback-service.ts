/**
 * Fallback Service
 * 
 * Provides graceful degradation mechanisms for the Trading Farm platform
 * Implements circuit breakers, mock data providers, and service health monitoring
 */

import { MonitoringService } from './monitoring-service';

// Circuit breaker states
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// Mock data generators for different service types
type MockDataGenerator = () => any;

export class FallbackService {
  private static instance: FallbackService;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private mockDataGenerators: Map<string, MockDataGenerator> = new Map();
  private lastFailures: Map<string, number> = new Map();
  private failureCounts: Map<string, number> = new Map();
  private serviceHealthStatus: Map<string, boolean> = new Map();
  
  // Configuration
  private failureThreshold = 5;
  private resetTimeoutMs = 30000; // 30 seconds
  private halfOpenSuccessThreshold = 3;
  private halfOpenSuccessCounts: Map<string, number> = new Map();
  
  private constructor() {
    this.initializeMockDataGenerators();
    this.startHealthChecks();
  }
  
  // Singleton pattern
  public static getInstance(): FallbackService {
    if (!FallbackService.instance) {
      FallbackService.instance = new FallbackService();
    }
    return FallbackService.instance;
  }
  
  /**
   * Initialize mock data generators for different service types
   */
  private initializeMockDataGenerators(): void {
    // Exchange mock data
    this.mockDataGenerators.set('exchange.market_data', () => {
      return {
        symbol: 'BTC/USDT',
        interval: '1h',
        candles: Array(24).fill(0).map((_, i) => ({
          timestamp: Date.now() - (23 - i) * 3600000,
          open: 40000 + Math.random() * 2000,
          high: 40000 + Math.random() * 3000,
          low: 40000 + Math.random() * 1000,
          close: 40000 + Math.random() * 2000,
          volume: 100 + Math.random() * 200
        }))
      };
    });
    
    this.mockDataGenerators.set('exchange.ticker', () => {
      return {
        symbol: 'BTC/USDT',
        price: 40000 + Math.random() * 2000,
        change: (Math.random() * 10) - 5,
        volume: 10000 + Math.random() * 5000,
        timestamp: Date.now()
      };
    });
    
    this.mockDataGenerators.set('exchange.balance', () => {
      return {
        balances: [
          {
            asset: 'BTC',
            free: 0.5 + Math.random() * 0.1,
            locked: Math.random() * 0.05,
            total: 0.5 + Math.random() * 0.15
          },
          {
            asset: 'USDT',
            free: 10000 + Math.random() * 1000,
            locked: Math.random() * 500,
            total: 10000 + Math.random() * 1500
          },
          {
            asset: 'ETH',
            free: 5 + Math.random() * 1,
            locked: Math.random() * 0.5,
            total: 5 + Math.random() * 1.5
          }
        ],
        timestamp: Date.now()
      };
    });
    
    // ElizaOS mock data
    this.mockDataGenerators.set('elizaos.agents', () => {
      return [
        {
          id: 'mock-agent-1',
          userId: 'mock-user',
          config: {
            name: 'Demo Trading Agent',
            description: 'A mock trading agent for demonstration',
            role: 'trader',
            baseModel: 'gpt-4-turbo',
            provider: 'openai',
            temperature: 0.2
          },
          status: 'active',
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          lastActive: new Date(Date.now() - 300000).toISOString()
        },
        {
          id: 'mock-agent-2',
          userId: 'mock-user',
          config: {
            name: 'Market Analyst',
            description: 'A mock agent for market analysis',
            role: 'analyst',
            baseModel: 'claude-3-opus',
            provider: 'anthropic',
            temperature: 0.1
          },
          status: 'active',
          createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
          updatedAt: new Date(Date.now() - 7200000).toISOString(),
          lastActive: new Date(Date.now() - 600000).toISOString()
        }
      ];
    });
    
    this.mockDataGenerators.set('elizaos.messages', () => {
      return [
        {
          id: 'mock-msg-1',
          agentId: 'mock-agent-1',
          role: 'user',
          content: 'What is the current market sentiment for BTC?',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'mock-msg-2',
          agentId: 'mock-agent-1',
          role: 'agent',
          content: 'Based on my analysis, the current market sentiment for Bitcoin is neutral with a slight bullish bias. Trade volumes have been steady, and on-chain metrics suggest accumulation by long-term holders.',
          timestamp: new Date(Date.now() - 3580000).toISOString()
        }
      ];
    });
    
    // Vault Banking mock data
    this.mockDataGenerators.set('vault.accounts', () => {
      return [
        {
          id: 'mock-account-1',
          userId: 'mock-user',
          name: 'Main Trading Account',
          type: 'trading',
          balances: [
            {
              currency: 'BTC',
              available: 1.2,
              locked: 0.3,
              total: 1.5,
              updatedAt: new Date().toISOString()
            },
            {
              currency: 'USDT',
              available: 25000,
              locked: 5000,
              total: 30000,
              updatedAt: new Date().toISOString()
            }
          ],
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'mock-account-2',
          userId: 'mock-user',
          name: 'Savings Account',
          type: 'savings',
          balances: [
            {
              currency: 'BTC',
              available: 0.5,
              locked: 0,
              total: 0.5,
              updatedAt: new Date().toISOString()
            },
            {
              currency: 'USDT',
              available: 10000,
              locked: 0,
              total: 10000,
              updatedAt: new Date().toISOString()
            }
          ],
          createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
        }
      ];
    });
    
    this.mockDataGenerators.set('vault.transactions', () => {
      return [
        {
          id: 'mock-tx-1',
          userId: 'mock-user',
          accountId: 'mock-account-1',
          type: 'deposit',
          currency: 'BTC',
          amount: 0.5,
          fee: 0.001,
          status: 'completed',
          timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
          description: 'Initial deposit'
        },
        {
          id: 'mock-tx-2',
          userId: 'mock-user',
          accountId: 'mock-account-1',
          type: 'transfer',
          currency: 'USDT',
          amount: 5000,
          fee: 0,
          status: 'completed',
          timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
          description: 'Transfer to savings'
        }
      ];
    });
    
    // Simulation mock data
    this.mockDataGenerators.set('simulation.models', () => {
      return [
        {
          id: 'mock-model-1',
          userId: 'mock-user',
          name: 'Conservative Model',
          description: 'Low risk simulation model with minimal slippage',
          slippageModel: {
            type: 'percentage',
            parameters: {
              value: 0.1
            }
          },
          feeModel: {
            type: 'percentage',
            parameters: {
              value: 0.1
            }
          },
          createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 7).toISOString()
        },
        {
          id: 'mock-model-2',
          userId: 'mock-user',
          name: 'High Volume Model',
          description: 'High volume trading simulation with dynamic slippage',
          slippageModel: {
            type: 'dynamic',
            parameters: {
              basePercentage: 0.1,
              volumeMultiplier: 0.01
            }
          },
          feeModel: {
            type: 'tiered',
            parameters: {
              tiers: [
                { threshold: 0, fee: 0.2 },
                { threshold: 50000, fee: 0.15 },
                { threshold: 100000, fee: 0.1 }
              ]
            }
          },
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
        }
      ];
    });
    
    this.mockDataGenerators.set('simulation.metrics', () => {
      return {
        id: 'mock-metrics-1',
        simulationRunId: 'mock-run-1',
        timestamp: new Date().toISOString(),
        totalPnl: Math.random() * 10000 - 5000,
        pnlCurrency: 'USDT',
        winRate: 0.4 + Math.random() * 0.3,
        tradeCount: 50 + Math.floor(Math.random() * 50),
        averageProfit: 200 + Math.random() * 100,
        averageLoss: 150 + Math.random() * 100,
        largestProfit: 1000 + Math.random() * 500,
        largestLoss: 800 + Math.random() * 400,
        sharpeRatio: 0.5 + Math.random() * 1.5,
        maxDrawdown: 0.1 + Math.random() * 0.2,
        currentDrawdown: Math.random() * 0.15
      };
    });
  }
  
  /**
   * Start periodic health checks for services
   */
  private startHealthChecks(): void {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    // Check every 30 seconds
    setInterval(() => {
      this.checkServiceHealth('exchange');
      this.checkServiceHealth('elizaos');
      this.checkServiceHealth('vault');
      this.checkServiceHealth('simulation');
    }, 30000);
  }
  
  /**
   * Check health of a service
   */
  private async checkServiceHealth(service: string): Promise<void> {
    try {
      const response = await fetch(`/api/${service}/health`);
      const isHealthy = response.ok;
      
      this.serviceHealthStatus.set(service, isHealthy);
      
      if (!isHealthy) {
        MonitoringService.logEvent({
          type: 'system.warning',
          message: `${service} service health check failed`,
          data: { status: response.status }
        });
      }
    } catch (error) {
      this.serviceHealthStatus.set(service, false);
      
      MonitoringService.logEvent({
        type: 'system.warning',
        message: `${service} service health check error`,
        data: { error }
      });
    }
  }
  
  /**
   * Record a service failure
   */
  public recordFailure(serviceKey: string): void {
    const currentCount = this.failureCounts.get(serviceKey) || 0;
    this.failureCounts.set(serviceKey, currentCount + 1);
    this.lastFailures.set(serviceKey, Date.now());
    this.halfOpenSuccessCounts.delete(serviceKey);
    
    // Trip circuit breaker if threshold is reached
    if (currentCount + 1 >= this.failureThreshold) {
      this.circuitBreakers.set(serviceKey, 'OPEN');
      
      MonitoringService.logEvent({
        type: 'system.warning',
        message: `Circuit breaker tripped for ${serviceKey}`,
        data: { failures: currentCount + 1 }
      });
    }
  }
  
  /**
   * Record a service success
   */
  public recordSuccess(serviceKey: string): void {
    const currentState = this.getCircuitBreakerState(serviceKey);
    
    if (currentState === 'CLOSED') {
      // Reset failure count in closed state
      this.failureCounts.set(serviceKey, 0);
    } else if (currentState === 'HALF_OPEN') {
      // Count successes in half-open state
      const successCount = (this.halfOpenSuccessCounts.get(serviceKey) || 0) + 1;
      this.halfOpenSuccessCounts.set(serviceKey, successCount);
      
      // Close circuit if success threshold is reached
      if (successCount >= this.halfOpenSuccessThreshold) {
        this.circuitBreakers.set(serviceKey, 'CLOSED');
        this.failureCounts.set(serviceKey, 0);
        this.halfOpenSuccessCounts.delete(serviceKey);
        
        MonitoringService.logEvent({
          type: 'info',
          message: `Circuit breaker closed for ${serviceKey} after ${successCount} successful requests`,
          data: {}
        });
      }
    }
  }
  
  /**
   * Get circuit breaker state for a service
   */
  public getCircuitBreakerState(serviceKey: string): CircuitBreakerState {
    const currentState = this.circuitBreakers.get(serviceKey) || 'CLOSED';
    
    // If OPEN, check if timeout has elapsed to transition to HALF_OPEN
    if (currentState === 'OPEN') {
      const lastFailure = this.lastFailures.get(serviceKey) || 0;
      const elapsedMs = Date.now() - lastFailure;
      
      if (elapsedMs >= this.resetTimeoutMs) {
        this.circuitBreakers.set(serviceKey, 'HALF_OPEN');
        return 'HALF_OPEN';
      }
    }
    
    return currentState;
  }
  
  /**
   * Check if a service is available or should use fallback
   */
  public shouldUseFallback(serviceKey: string): boolean {
    // Use fallback if circuit breaker is OPEN
    const state = this.getCircuitBreakerState(serviceKey);
    
    if (state === 'OPEN') {
      return true;
    }
    
    // If HALF_OPEN, allow a limited number of real requests to test the service
    if (state === 'HALF_OPEN') {
      // Randomly allow some requests through in HALF_OPEN state
      return Math.random() > 0.2; // Allow about 20% of requests
    }
    
    // Check service health status as well
    const serviceBase = serviceKey.split('.')[0];
    const isHealthy = this.serviceHealthStatus.get(serviceBase);
    
    // If we have health info and it's unhealthy, use fallback
    if (isHealthy === false) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get mock data for a service
   */
  public getMockData(serviceKey: string): any {
    const generator = this.mockDataGenerators.get(serviceKey);
    
    if (generator) {
      return generator();
    }
    
    // Generic mock data if no specific generator exists
    return {
      success: true,
      data: {
        message: 'Mock data response',
        timestamp: new Date().toISOString()
      }
    };
  }
  
  /**
   * Reset circuit breaker for a service
   */
  public resetCircuitBreaker(serviceKey: string): void {
    this.circuitBreakers.set(serviceKey, 'CLOSED');
    this.failureCounts.set(serviceKey, 0);
    this.halfOpenSuccessCounts.delete(serviceKey);
    
    MonitoringService.logEvent({
      type: 'info',
      message: `Circuit breaker manually reset for ${serviceKey}`,
      data: {}
    });
  }
  
  /**
   * Configure circuit breaker parameters
   */
  public configureCircuitBreaker(
    failureThreshold?: number,
    resetTimeoutMs?: number,
    halfOpenSuccessThreshold?: number
  ): void {
    if (failureThreshold !== undefined) {
      this.failureThreshold = failureThreshold;
    }
    
    if (resetTimeoutMs !== undefined) {
      this.resetTimeoutMs = resetTimeoutMs;
    }
    
    if (halfOpenSuccessThreshold !== undefined) {
      this.halfOpenSuccessThreshold = halfOpenSuccessThreshold;
    }
  }
  
  /**
   * Get service health status
   */
  public getServiceHealth(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    
    this.serviceHealthStatus.forEach((isHealthy, service) => {
      result[service] = isHealthy;
    });
    
    return result;
  }
  
  /**
   * Get circuit breaker status for all services
   */
  public getAllCircuitBreakerStates(): Record<string, CircuitBreakerState> {
    const result: Record<string, CircuitBreakerState> = {};
    
    this.circuitBreakers.forEach((state, serviceKey) => {
      result[serviceKey] = this.getCircuitBreakerState(serviceKey);
    });
    
    return result;
  }
}

// Export singleton getter
export const getFallbackService = (): FallbackService => FallbackService.getInstance();
