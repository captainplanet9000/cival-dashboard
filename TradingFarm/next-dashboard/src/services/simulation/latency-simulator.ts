/**
 * LatencySimulator
 * 
 * Simulates realistic network and exchange latency for the dry-run trading simulation.
 * This helps test strategies under more realistic conditions where orders don't execute instantly.
 */
import { LatencyModel } from '../simulation-service';

export interface LatencyContext {
  exchange: string;
  operation: 'placeOrder' | 'cancelOrder' | 'getMarketData' | 'getOrderStatus' | string;
  symbol?: string;
  urgent?: boolean; // For operations that should have minimal latency
}

export class LatencySimulator {
  /**
   * Simulate latency for a given operation
   * 
   * @param context Operation context
   * @param model Latency model to use
   * @returns Promise that resolves after the simulated latency
   */
  static async simulateLatency(
    context: LatencyContext,
    model: LatencyModel
  ): Promise<void> {
    // If latency model is 'none', don't simulate any latency
    if (model.parameters.type === 'none') {
      return;
    }
    
    const latencyMs = this.calculateLatency(context, model.parameters);
    
    // Wait for the calculated latency
    if (latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, latencyMs));
    }
  }
  
  /**
   * Calculate latency based on the model and context
   */
  private static calculateLatency(
    context: LatencyContext,
    parameters: any
  ): number {
    switch (parameters.type) {
      case 'random':
        return this.calculateRandomLatency(
          context,
          parameters.minMs || 50,
          parameters.maxMs || 500
        );
        
      case 'realistic':
        return this.calculateRealisticLatency(context, parameters);
        
      default:
        return 0; // No latency
    }
  }
  
  /**
   * Calculate a random latency between min and max values
   */
  private static calculateRandomLatency(
    context: LatencyContext,
    minMs: number,
    maxMs: number
  ): number {
    // For urgent operations, use lower latency
    if (context.urgent) {
      minMs = Math.max(10, minMs / 2);
      maxMs = Math.max(50, maxMs / 2);
    }
    
    return Math.floor(minMs + (Math.random() * (maxMs - minMs)));
  }
  
  /**
   * Calculate a more realistic latency based on operation type and exchange
   */
  private static calculateRealisticLatency(
    context: LatencyContext,
    parameters: any
  ): number {
    // Base latency by exchange (some exchanges are faster than others)
    const exchangeBaseLatency = this.getExchangeBaseLatency(context.exchange);
    
    // Operation-specific latency
    let operationLatency = 0;
    switch (context.operation) {
      case 'placeOrder':
        operationLatency = parameters.orderLatencyMs || 100;
        break;
      case 'cancelOrder':
        operationLatency = parameters.cancelLatencyMs || 80;
        break;
      case 'getMarketData':
        operationLatency = parameters.marketDataLatencyMs || 40;
        break;
      case 'getOrderStatus':
        operationLatency = parameters.statusLatencyMs || 60;
        break;
      default:
        operationLatency = parameters.defaultLatencyMs || 70;
    }
    
    // Jitter - random variation to simulate network conditions
    const jitterPercent = parameters.jitterPercent || 20; // Default 20% jitter
    const jitterFactor = 1 + ((Math.random() * jitterPercent * 2) - jitterPercent) / 100;
    
    // Network congestion - occasional spikes in latency
    let congestionFactor = 1;
    if (Math.random() < (parameters.congestionProbability || 0.05)) {
      congestionFactor = parameters.congestionMultiplier || 3;
    }
    
    // Calculate total latency
    let totalLatency = (exchangeBaseLatency + operationLatency) * jitterFactor * congestionFactor;
    
    // For urgent operations, reduce latency
    if (context.urgent) {
      totalLatency = totalLatency / 2;
    }
    
    return Math.floor(totalLatency);
  }
  
  /**
   * Get base latency for different exchanges
   */
  private static getExchangeBaseLatency(exchange: string): number {
    switch (exchange.toLowerCase()) {
      case 'bybit':
        return 70; // Medium latency
      case 'binance':
        return 50; // Lower latency
      case 'coinbase':
        return 90; // Higher latency
      case 'hyperliquid':
        return 40; // Very low latency
      default:
        return 80; // Default latency
    }
  }
  
  /**
   * Get default latency model
   */
  static getDefaultLatencyModel(): LatencyModel {
    return {
      id: 'default-latency',
      userId: '00000000-0000-0000-0000-000000000000',
      name: 'Realistic Latency',
      modelType: 'latency',
      isSystemModel: true,
      parameters: {
        type: 'realistic',
        orderLatencyMs: 100,
        cancelLatencyMs: 80,
        marketDataLatencyMs: 40,
        statusLatencyMs: 60,
        defaultLatencyMs: 70,
        jitterPercent: 20,
        congestionProbability: 0.05,
        congestionMultiplier: 3,
        description: 'Realistic latency simulation with jitter and occasional congestion'
      },
      createdAt: new Date().toISOString()
    };
  }
}
