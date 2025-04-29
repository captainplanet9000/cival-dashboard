/**
 * Performance & Load Testing Framework
 * 
 * Provides tools for testing the performance and scalability
 * of the Trading Farm platform under various load conditions.
 */

import { MonitoringService } from '../monitoring/monitoring-service';

// Test types
export enum TestType {
  LOAD = 'load',         // Gradually increasing load
  STRESS = 'stress',     // Maximum capacity testing
  SPIKE = 'spike',       // Sudden load increase
  SOAK = 'soak',         // Long duration testing
  ENDURANCE = 'endurance', // Extended load over time
  SCALABILITY = 'scalability' // Testing scaling capabilities
}

// Test scenario interface
export interface TestScenario {
  name: string;
  description: string;
  type: TestType;
  duration: number; // seconds
  userCount: number; // simulated users
  rampUpTime?: number; // seconds
  thinkTime?: number; // milliseconds between actions
  actions: TestAction[];
}

// Test action interface
export interface TestAction {
  name: string;
  weight: number; // relative probability of action
  execute: (userId: string, iteration: number) => Promise<TestActionResult>;
}

// Test action result
export interface TestActionResult {
  success: boolean;
  duration: number; // milliseconds
  statusCode?: number;
  error?: string;
  metrics?: Record<string, number>;
}

// Test result interface
export interface TestResult {
  scenarioName: string;
  type: TestType;
  startTime: string;
  endTime: string;
  duration: number;
  userCount: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  requestsPerSecond: number;
  errors: { message: string; count: number }[];
  actionResults: {
    [actionName: string]: {
      count: number;
      successRate: number;
      averageResponseTime: number;
      p95ResponseTime: number;
    };
  };
  customMetrics: Record<string, number>;
}

/**
 * Performance tester for Trading Farm platform
 */
export class PerformanceTester {
  private monitoringService: MonitoringService;
  
  constructor(monitoringService: MonitoringService) {
    this.monitoringService = monitoringService;
  }
  
  /**
   * Run a performance test scenario
   */
  async runTest(scenario: TestScenario): Promise<TestResult> {
    console.log(`Starting performance test: ${scenario.name}`);
    console.log(`Type: ${scenario.type}, Users: ${scenario.userCount}, Duration: ${scenario.duration}s`);
    
    const startTime = new Date();
    
    // Set up test metrics
    const metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [] as number[],
      errors: new Map<string, number>(),
      actionResults: new Map<string, {
        count: number;
        successCount: number;
        responseTimes: number[];
      }>(),
      customMetrics: new Map<string, number>()
    };
    
    // Initialize action results
    scenario.actions.forEach(action => {
      metrics.actionResults.set(action.name, {
        count: 0,
        successCount: 0,
        responseTimes: []
      });
    });
    
    // Create a promise that resolves after the test duration
    const testDurationPromise = new Promise<void>(resolve => {
      setTimeout(() => resolve(), scenario.duration * 1000);
    });
    
    // Start user sessions
    const userPromises: Promise<void>[] = [];
    
    // Calculate user start times (for ramp-up)
    const rampUpTime = scenario.rampUpTime || 0;
    const userStartDelays = Array.from({ length: scenario.userCount }, (_, i) => {
      if (rampUpTime === 0) return 0;
      return Math.floor((i / scenario.userCount) * rampUpTime * 1000);
    });
    
    // Start each user session
    for (let userId = 0; userId < scenario.userCount; userId++) {
      const userPromise = this.runUserSession(
        `user-${userId}`,
        scenario,
        metrics,
        userStartDelays[userId],
        testDurationPromise
      );
      
      userPromises.push(userPromise);
    }
    
    // Wait for all user sessions to complete
    await Promise.all(userPromises);
    
    const endTime = new Date();
    const testDuration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    // Calculate final results
    const sortedResponseTimes = [...metrics.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p99Index = Math.floor(sortedResponseTimes.length * 0.99);
    
    const result: TestResult = {
      scenarioName: scenario.name,
      type: scenario.type,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: testDuration,
      userCount: scenario.userCount,
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      averageResponseTime: metrics.responseTimes.length > 0
        ? metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length
        : 0,
      p95ResponseTime: sortedResponseTimes[p95Index] || 0,
      p99ResponseTime: sortedResponseTimes[p99Index] || 0,
      maxResponseTime: Math.max(...metrics.responseTimes, 0),
      minResponseTime: Math.min(...metrics.responseTimes, 0),
      requestsPerSecond: metrics.totalRequests / testDuration,
      errors: Array.from(metrics.errors.entries()).map(([message, count]) => ({
        message,
        count
      })),
      actionResults: {},
      customMetrics: {}
    };
    
    // Process action results
    for (const [actionName, actionData] of metrics.actionResults.entries()) {
      const actionResponseTimes = [...actionData.responseTimes].sort((a, b) => a - b);
      const actionP95Index = Math.floor(actionResponseTimes.length * 0.95);
      
      result.actionResults[actionName] = {
        count: actionData.count,
        successRate: actionData.count > 0
          ? (actionData.successCount / actionData.count) * 100
          : 0,
        averageResponseTime: actionData.responseTimes.length > 0
          ? actionData.responseTimes.reduce((sum, time) => sum + time, 0) / actionData.responseTimes.length
          : 0,
        p95ResponseTime: actionResponseTimes[actionP95Index] || 0
      };
    }
    
    // Process custom metrics
    for (const [metricName, metricValue] of metrics.customMetrics.entries()) {
      result.customMetrics[metricName] = metricValue;
    }
    
    // Record results in monitoring service
    this.recordTestResults(result);
    
    console.log(`Performance test completed: ${scenario.name}`);
    console.log(`Total requests: ${result.totalRequests}, RPS: ${result.requestsPerSecond.toFixed(2)}`);
    console.log(`Avg response time: ${result.averageResponseTime.toFixed(2)}ms, P95: ${result.p95ResponseTime}ms`);
    console.log(`Success rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`);
    
    return result;
  }
  
  /**
   * Run a user session during the test
   */
  private async runUserSession(
    userId: string,
    scenario: TestScenario,
    metrics: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      responseTimes: number[];
      errors: Map<string, number>;
      actionResults: Map<string, {
        count: number;
        successCount: number;
        responseTimes: number[];
      }>;
      customMetrics: Map<string, number>;
    },
    startDelay: number,
    testDurationPromise: Promise<void>
  ): Promise<void> {
    // Wait for start delay (ramp-up)
    if (startDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, startDelay));
    }
    
    let iteration = 0;
    let running = true;
    
    // Set up test completion handler
    testDurationPromise.then(() => {
      running = false;
    });
    
    // User session loop
    while (running) {
      iteration++;
      
      // Select an action using weighted random selection
      const action = this.selectWeightedAction(scenario.actions);
      
      // Execute the action
      try {
        const startTime = performance.now();
        const result = await action.execute(userId, iteration);
        const duration = performance.now() - startTime;
        
        // Update metrics
        metrics.totalRequests++;
        metrics.responseTimes.push(duration);
        
        const actionResult = metrics.actionResults.get(action.name);
        if (actionResult) {
          actionResult.count++;
          actionResult.responseTimes.push(duration);
        }
        
        if (result.success) {
          metrics.successfulRequests++;
          if (actionResult) {
            actionResult.successCount++;
          }
        } else {
          metrics.failedRequests++;
          
          // Track error
          const errorMessage = result.error || 'Unknown error';
          const errorCount = metrics.errors.get(errorMessage) || 0;
          metrics.errors.set(errorMessage, errorCount + 1);
        }
        
        // Track custom metrics
        if (result.metrics) {
          for (const [metricName, metricValue] of Object.entries(result.metrics)) {
            const currentValue = metrics.customMetrics.get(metricName) || 0;
            metrics.customMetrics.set(metricName, currentValue + metricValue);
          }
        }
      } catch (error) {
        // Handle unexpected errors
        metrics.totalRequests++;
        metrics.failedRequests++;
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorCount = metrics.errors.get(errorMessage) || 0;
        metrics.errors.set(errorMessage, errorCount + 1);
        
        const actionResult = metrics.actionResults.get(action.name);
        if (actionResult) {
          actionResult.count++;
        }
      }
      
      // Add think time between actions
      if (scenario.thinkTime && running) {
        // Apply variation to think time (±30%)
        const variation = (Math.random() * 0.6) - 0.3; // -0.3 to +0.3
        const appliedThinkTime = scenario.thinkTime * (1 + variation);
        await new Promise(resolve => setTimeout(resolve, appliedThinkTime));
      }
    }
  }
  
  /**
   * Select an action using weighted random selection
   */
  private selectWeightedAction(actions: TestAction[]): TestAction {
    const totalWeight = actions.reduce((sum, action) => sum + action.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const action of actions) {
      random -= action.weight;
      if (random <= 0) {
        return action;
      }
    }
    
    // Fallback to the last action (should not happen with proper weights)
    return actions[actions.length - 1];
  }
  
  /**
   * Record test results in monitoring service
   */
  private recordTestResults(result: TestResult): void {
    // Record overall test metrics
    this.monitoringService.recordMetric('performance_test_requests', result.totalRequests, {
      scenario: result.scenarioName,
      type: result.type
    });
    
    this.monitoringService.recordMetric('performance_test_success_rate', 
      (result.successfulRequests / result.totalRequests) * 100, {
        scenario: result.scenarioName,
        type: result.type
      });
    
    this.monitoringService.recordMetric('performance_test_rps', result.requestsPerSecond, {
      scenario: result.scenarioName,
      type: result.type
    });
    
    this.monitoringService.recordMetric('performance_test_avg_response_time', result.averageResponseTime, {
      scenario: result.scenarioName,
      type: result.type
    });
    
    this.monitoringService.recordMetric('performance_test_p95_response_time', result.p95ResponseTime, {
      scenario: result.scenarioName,
      type: result.type
    });
    
    // Record action-specific metrics
    for (const [actionName, actionResult] of Object.entries(result.actionResults)) {
      this.monitoringService.recordMetric('performance_test_action_success_rate', actionResult.successRate, {
        scenario: result.scenarioName,
        action: actionName
      });
      
      this.monitoringService.recordMetric('performance_test_action_avg_response_time', actionResult.averageResponseTime, {
        scenario: result.scenarioName,
        action: actionName
      });
    }
  }
  
  /**
   * Create common test actions for Trading Farm
   */
  static createCommonActions(): Record<string, TestAction> {
    return {
      // User Authentication Actions
      login: {
        name: 'login',
        weight: 5,
        execute: async (userId: string, iteration: number) => {
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: `test-${userId}@example.com`,
                password: 'test-password'
              })
            });
            
            return {
              success: response.ok,
              duration: 0, // Will be filled by the test framework
              statusCode: response.status,
              error: response.ok ? undefined : await response.text()
            };
          } catch (error) {
            return {
              success: false,
              duration: 0, // Will be filled by the test framework
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      },
      
      // Dashboard and UI Actions
      loadDashboard: {
        name: 'loadDashboard',
        weight: 10,
        execute: async (userId: string, iteration: number) => {
          try {
            const response = await fetch('/api/dashboard/data');
            return {
              success: response.ok,
              duration: 0,
              statusCode: response.status,
              error: response.ok ? undefined : await response.text()
            };
          } catch (error) {
            return {
              success: false,
              duration: 0,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      },
      
      // Trading Actions
      fetchMarketData: {
        name: 'fetchMarketData',
        weight: 15,
        execute: async (userId: string, iteration: number) => {
          try {
            // Rotate between different symbols for more realistic testing
            const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT'];
            const symbolIndex = iteration % symbols.length;
            
            const response = await fetch(`/api/market/price?symbol=${symbols[symbolIndex]}`);
            return {
              success: response.ok,
              duration: 0,
              statusCode: response.status,
              error: response.ok ? undefined : await response.text()
            };
          } catch (error) {
            return {
              success: false,
              duration: 0,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      },
      
      placeOrder: {
        name: 'placeOrder',
        weight: 5,
        execute: async (userId: string, iteration: number) => {
          try {
            // Cycle through order types for more realistic testing
            const orderTypes = ['market', 'limit', 'stop', 'takeProfit'];
            const sides = ['buy', 'sell'];
            const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
            
            const orderTypeIndex = iteration % orderTypes.length;
            const sideIndex = iteration % sides.length;
            const symbolIndex = iteration % symbols.length;
            
            const response = await fetch('/api/trading/place-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                symbol: symbols[symbolIndex],
                side: sides[sideIndex],
                type: orderTypes[orderTypeIndex],
                quantity: 0.01 * (1 + (iteration % 5)), // Vary quantity slightly
                price: orderTypes[orderTypeIndex] === 'market' ? undefined : 50000 - (iteration * 100),
                isTest: true // Ensure orders are not actually placed in production
              })
            });
            
            return {
              success: response.ok,
              duration: 0,
              statusCode: response.status,
              error: response.ok ? undefined : await response.text(),
              metrics: {
                ordersPlaced: 1,
                orderValue: 0.01 * 50000 // Approximate value for metrics
              }
            };
          } catch (error) {
            return {
              success: false,
              duration: 0,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      },
      
      // Agent Management Actions
      fetchAgents: {
        name: 'fetchAgents',
        weight: 8,
        execute: async (userId: string, iteration: number) => {
          try {
            const response = await fetch('/api/agents');
            return {
              success: response.ok,
              duration: 0,
              statusCode: response.status,
              error: response.ok ? undefined : await response.text()
            };
          } catch (error) {
            return {
              success: false,
              duration: 0,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      },
      
      // Vault Banking Actions
      checkBalance: {
        name: 'checkBalance',
        weight: 7,
        execute: async (userId: string, iteration: number) => {
          try {
            const response = await fetch('/api/vault/balance');
            return {
              success: response.ok,
              duration: 0,
              statusCode: response.status,
              error: response.ok ? undefined : await response.text()
            };
          } catch (error) {
            return {
              success: false,
              duration: 0,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      }
    };
  }
  
  /**
   * Create common test scenarios for Trading Farm
   */
  static createCommonScenarios(actions: Record<string, TestAction>): TestScenario[] {
    return [
      // Load Testing Scenario
      {
        name: 'Normal Load',
        description: 'Simulates normal user activity on the platform',
        type: TestType.LOAD,
        duration: 300, // 5 minutes
        userCount: 20,
        rampUpTime: 60, // 1 minute ramp-up
        thinkTime: 2000, // 2 seconds between actions
        actions: [
          actions.login,
          actions.loadDashboard,
          actions.fetchMarketData,
          actions.placeOrder,
          actions.fetchAgents,
          actions.checkBalance
        ]
      },
      
      // Stress Testing Scenario
      {
        name: 'Peak Trading',
        description: 'Simulates heavy trading activity during market volatility',
        type: TestType.STRESS,
        duration: 600, // 10 minutes
        userCount: 50,
        rampUpTime: 120, // 2 minutes ramp-up
        thinkTime: 1000, // 1 second between actions
        actions: [
          { ...actions.fetchMarketData, weight: 20 }, // Increase weight for market data
          { ...actions.placeOrder, weight: 15 },      // Increase weight for placing orders
          actions.fetchAgents,
          actions.checkBalance
        ]
      },
      
      // Spike Testing Scenario
      {
        name: 'Market News Spike',
        description: 'Simulates sudden spike in activity after market news',
        type: TestType.SPIKE,
        duration: 180, // 3 minutes
        userCount: 100,
        rampUpTime: 10, // Very quick ramp-up
        thinkTime: 500, // 0.5 seconds between actions
        actions: [
          { ...actions.fetchMarketData, weight: 25 }, // Heavy focus on market data
          { ...actions.placeOrder, weight: 20 },      // Heavy trading activity
          actions.checkBalance
        ]
      },
      
      // Endurance Testing Scenario
      {
        name: 'Daily Operations',
        description: 'Simulates steady activity over a longer period',
        type: TestType.ENDURANCE,
        duration: 3600, // 1 hour
        userCount: 15,
        rampUpTime: 300, // 5 minutes ramp-up
        thinkTime: 3000, // 3 seconds between actions
        actions: [
          actions.login,
          actions.loadDashboard,
          actions.fetchMarketData,
          actions.placeOrder,
          actions.fetchAgents,
          actions.checkBalance
        ]
      }
    ];
  }
}
