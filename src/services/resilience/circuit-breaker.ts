/**
 * CircuitBreaker implementation for API resilience
 * 
 * This class implements the Circuit Breaker pattern to prevent cascading failures
 * and provide fallback mechanisms when services are unavailable.
 * 
 * Circuit states:
 * - CLOSED: Normal operation, requests are allowed
 * - OPEN: Requests are blocked for a cool-down period
 * - HALF_OPEN: Limited requests are allowed to test if the service has recovered
 */

import { MonitoringService } from '../monitoring-service';

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'CLOSED',  // Normal operation
  OPEN = 'OPEN',      // Service unavailable
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back up
}

// Configuration options
export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  resetTimeout: number; // Time in ms to wait before trying again (OPEN -> HALF_OPEN)
  halfOpenSuccessThreshold: number; // Number of successful requests to close the circuit
  monitoringWindow: number; // Time window in ms for failure counting
  maxFailuresInMonitoringWindow: number; // Max failures in the monitoring window
}

// Default configuration values
const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenSuccessThreshold: 2,
  monitoringWindow: 120000, // 2 minutes
  maxFailuresInMonitoringWindow: 10
};

/**
 * CircuitBreaker class implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: number = 0;
  private lastStateChange: number = Date.now();
  private options: CircuitBreakerOptions;
  private failureHistory: number[] = []; // Timestamp history of failures
  
  /**
   * Creates a new CircuitBreaker
   * 
   * @param options Configuration options
   */
  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Checks if a request can be made
   * 
   * @returns True if the circuit is closed or half-open (allowing requests)
   */
  public canRequest(): boolean {
    this.updateState();
    
    // In CLOSED state, always allow requests
    if (this.state === CircuitState.CLOSED) {
      return true;
    }
    
    // In HALF_OPEN state, allow limited testing requests
    if (this.state === CircuitState.HALF_OPEN) {
      return true;
    }
    
    // In OPEN state, block all requests
    return false;
  }
  
  /**
   * Record a successful request
   * 
   * @returns Current state after recording success
   */
  public recordSuccess(): CircuitState {
    this.updateState();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      
      // If we've reached the threshold, close the circuit
      if (this.successes >= this.options.halfOpenSuccessThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
    
    // Reset failure count in CLOSED state after successful requests
    if (this.state === CircuitState.CLOSED) {
      this.failures = 0;
      this.pruneFailureHistory();
    }
    
    return this.state;
  }
  
  /**
   * Record a failed request
   * 
   * @returns Current state after recording failure
   */
  public recordFailure(): CircuitState {
    this.updateState();
    
    // Record failure timestamp
    const now = Date.now();
    this.lastFailure = now;
    this.failureHistory.push(now);
    this.pruneFailureHistory();
    
    // In CLOSED state, check if we need to open the circuit
    if (this.state === CircuitState.CLOSED) {
      this.failures++;
      
      if (this.shouldOpenCircuit()) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
    
    // In HALF_OPEN state, immediately open the circuit again on any failure
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
    }
    
    return this.state;
  }
  
  /**
   * Get the current circuit state
   * 
   * @returns Current circuit state
   */
  public getState(): CircuitState {
    this.updateState();
    return this.state;
  }
  
  /**
   * Reset the circuit breaker to CLOSED state
   */
  public reset(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.failures = 0;
    this.successes = 0;
    this.failureHistory = [];
  }
  
  /**
   * Get statistics about the circuit breaker
   * 
   * @returns Circuit breaker statistics
   */
  public getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure ? new Date(this.lastFailure) : null,
      lastStateChange: new Date(this.lastStateChange),
      failuresInWindow: this.failureHistory.length,
      options: this.options
    };
  }
  
  /**
   * Update the circuit state based on timing conditions
   */
  private updateState(): void {
    const now = Date.now();
    
    // If we're in OPEN state and reset timeout has elapsed, 
    // transition to HALF_OPEN to test the service
    if (
      this.state === CircuitState.OPEN && 
      now - this.lastStateChange >= this.options.resetTimeout
    ) {
      this.transitionTo(CircuitState.HALF_OPEN);
      this.successes = 0; // Reset successes counter for half-open state
    }
  }
  
  /**
   * Transition to a new state
   * 
   * @param newState The state to transition to
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.lastStateChange = Date.now();
      
      // Log state change
      MonitoringService.logEvent({
        type: 'info',
        message: `Circuit state change: ${oldState} → ${newState}`,
        data: {
          oldState,
          newState,
          failures: this.failures,
          successes: this.successes,
          failuresInWindow: this.failureHistory.length
        }
      });
    }
  }
  
  /**
   * Determine if the circuit should be opened based on failure patterns
   */
  private shouldOpenCircuit(): boolean {
    // Check simple threshold
    if (this.failures >= this.options.failureThreshold) {
      return true;
    }
    
    // Check failure rate in monitoring window
    if (this.failureHistory.length >= this.options.maxFailuresInMonitoringWindow) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Remove expired failures from the history
   */
  private pruneFailureHistory(): void {
    const now = Date.now();
    const cutoff = now - this.options.monitoringWindow;
    
    // Remove failures outside the monitoring window
    this.failureHistory = this.failureHistory.filter(time => time >= cutoff);
  }
} 