/**
 * Exchange Monitoring Service
 * 
 * Provides real-time monitoring of exchange connections and API health
 * Reports on rate limits, errors, and connectivity issues
 */

import { ExchangeType } from './exchange-service';
import { ConnectionState } from './exchange-websocket-service';
import bybitTradingService from './bybit-trading-service';
import hyperliquidTradingService from './hyperliquid-trading-service';
import websocketService, { WebSocketTopic } from './websocket-service';
import databaseService from './database-service';
import { ApiResponse } from '@/types/api';

// Connection health status
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

// Connection stats
export interface ConnectionStats {
  exchange: ExchangeType;
  connectionState: ConnectionState;
  healthStatus: HealthStatus;
  latency: number; // in ms
  errorRate: number; // percentage of requests that fail
  rateLimitRemaining: number | null;
  rateLimitResetTime: number | null; // timestamp
  lastChecked: string; // ISO timestamp
  checkHistory: Array<{
    timestamp: string;
    status: HealthStatus;
    latency: number;
  }>;
}

// Monitoring options
export interface MonitoringOptions {
  checkInterval: number; // in milliseconds
  errorThreshold: number; // percentage of errors to trigger unhealthy state
  latencyThreshold: number; // latency in ms to trigger degraded state
  historySize: number; // number of check results to keep
}

// Exchange Monitoring Service
class ExchangeMonitoringService {
  private stats: Map<ExchangeType, ConnectionStats> = new Map();
  private monitoringIntervals: Map<ExchangeType, NodeJS.Timeout> = new Map();
  private options: MonitoringOptions = {
    checkInterval: 30000, // 30 seconds
    errorThreshold: 10, // 10%
    latencyThreshold: 1000, // 1 second
    historySize: 100
  };

  constructor() {
    this.setupDefaultStats();
  }

  /**
   * Set up initial stats for supported exchanges
   */
  private setupDefaultStats() {
    const exchanges: ExchangeType[] = ['bybit', 'hyperliquid'];
    const now = new Date().toISOString();
    
    exchanges.forEach(exchange => {
      this.stats.set(exchange, {
        exchange,
        connectionState: ConnectionState.DISCONNECTED,
        healthStatus: HealthStatus.UNKNOWN,
        latency: 0,
        errorRate: 0,
        rateLimitRemaining: null,
        rateLimitResetTime: null,
        lastChecked: now,
        checkHistory: []
      });
    });
  }

  /**
   * Start monitoring an exchange
   */
  async startMonitoring(exchange: ExchangeType, credentialId?: string): Promise<boolean> {
    // Stop existing monitoring if any
    this.stopMonitoring(exchange);
    
    try {
      // Perform initial health check
      await this.checkExchangeHealth(exchange, credentialId);
      
      // Set up monitoring interval
      const interval = setInterval(
        () => this.checkExchangeHealth(exchange, credentialId),
        this.options.checkInterval
      );
      
      this.monitoringIntervals.set(exchange, interval);
      return true;
    } catch (error) {
      console.error(`Failed to start monitoring for ${exchange}:`, error);
      return false;
    }
  }

  /**
   * Stop monitoring an exchange
   */
  stopMonitoring(exchange: ExchangeType): void {
    const interval = this.monitoringIntervals.get(exchange);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(exchange);
    }
  }

  /**
   * Check the health of an exchange
   */
  async checkExchangeHealth(exchange: ExchangeType, credentialId?: string): Promise<HealthStatus> {
    const startTime = Date.now();
    let currentStats = this.stats.get(exchange) || this.createDefaultStats(exchange);
    let response: ApiResponse<any>;
    
    try {
      // Select appropriate endpoint to check based on exchange
      switch (exchange) {
        case 'bybit':
          // Use public endpoint first, if credentials provided use private
          if (credentialId) {
            const { data: credentials } = await databaseService.rpc('get_exchange_credentials', { p_credential_id: credentialId });
            if (credentials) {
              response = await bybitTradingService.getServerTime(credentials);
            } else {
              response = await bybitTradingService.getServerTime({
                apiKey: '', apiSecret: '', testnet: false
              });
            }
          } else {
            response = await bybitTradingService.getServerTime({
              apiKey: '', apiSecret: '', testnet: false
            });
          }
          break;
          
        case 'hyperliquid':
          // Use the market meta endpoint which is public
          response = await hyperliquidTradingService.getMarketMeta();
          break;
          
        default:
          throw new Error(`Unsupported exchange: ${exchange}`);
      }
      
      // Calculate latency
      const latency = Date.now() - startTime;
      
      // Extract rate limit info if available
      let rateLimitRemaining = null;
      let rateLimitResetTime = null;
      
      if (response.headers) {
        rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining'] || '');
        rateLimitResetTime = parseInt(response.headers['x-ratelimit-reset'] || '');
      }
      
      // Determine health status
      let healthStatus: HealthStatus;
      
      if (!response.success) {
        healthStatus = HealthStatus.UNHEALTHY;
      } else if (latency > this.options.latencyThreshold) {
        healthStatus = HealthStatus.DEGRADED;
      } else {
        healthStatus = HealthStatus.HEALTHY;
      }
      
      // Update stats
      currentStats = {
        ...currentStats,
        connectionState: response.success ? ConnectionState.CONNECTED : ConnectionState.ERROR,
        healthStatus,
        latency,
        rateLimitRemaining: rateLimitRemaining || currentStats.rateLimitRemaining,
        rateLimitResetTime: rateLimitResetTime || currentStats.rateLimitResetTime,
        lastChecked: new Date().toISOString(),
        checkHistory: [
          {
            timestamp: new Date().toISOString(),
            status: healthStatus,
            latency
          },
          ...currentStats.checkHistory
        ].slice(0, this.options.historySize)
      };
      
      // Calculate error rate from history
      const recentHistory = currentStats.checkHistory.slice(0, 10);
      const errorCount = recentHistory.filter(h => h.status === HealthStatus.UNHEALTHY).length;
      currentStats.errorRate = (errorCount / recentHistory.length) * 100;
      
      // Update stored stats
      this.stats.set(exchange, currentStats);
      
      // Broadcast status update
      this.broadcastStatusUpdate(exchange, currentStats);
      
      return healthStatus;
    } catch (error) {
      console.error(`Error checking health for ${exchange}:`, error);
      
      // Update stats for error case
      currentStats = {
        ...currentStats,
        connectionState: ConnectionState.ERROR,
        healthStatus: HealthStatus.UNHEALTHY,
        latency: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        checkHistory: [
          {
            timestamp: new Date().toISOString(),
            status: HealthStatus.UNHEALTHY,
            latency: Date.now() - startTime
          },
          ...currentStats.checkHistory
        ].slice(0, this.options.historySize)
      };
      
      // Calculate error rate from history
      const recentHistory = currentStats.checkHistory.slice(0, 10);
      const errorCount = recentHistory.filter(h => h.status === HealthStatus.UNHEALTHY).length;
      currentStats.errorRate = (errorCount / recentHistory.length) * 100;
      
      // Update stored stats
      this.stats.set(exchange, currentStats);
      
      // Broadcast status update
      this.broadcastStatusUpdate(exchange, currentStats);
      
      return HealthStatus.UNHEALTHY;
    }
  }

  /**
   * Broadcast status update to websocket clients
   */
  private broadcastStatusUpdate(exchange: ExchangeType, stats: ConnectionStats): void {
    websocketService.broadcastToTopic(WebSocketTopic.SYSTEM, {
      type: 'exchange_health',
      exchange,
      data: stats
    });
  }

  /**
   * Get stats for all exchanges
   */
  getAllExchangeStats(): Array<ConnectionStats> {
    return Array.from(this.stats.values());
  }

  /**
   * Get stats for a specific exchange
   */
  getExchangeStats(exchange: ExchangeType): ConnectionStats | null {
    return this.stats.get(exchange) || null;
  }

  /**
   * Set monitoring options
   */
  setOptions(options: Partial<MonitoringOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
    
    // Restart all monitoring with new interval if changed
    if (options.checkInterval !== undefined) {
      const exchanges = Array.from(this.monitoringIntervals.keys());
      exchanges.forEach(exchange => {
        this.stopMonitoring(exchange);
        this.startMonitoring(exchange);
      });
    }
  }

  /**
   * Create default stats for an exchange
   */
  private createDefaultStats(exchange: ExchangeType): ConnectionStats {
    return {
      exchange,
      connectionState: ConnectionState.DISCONNECTED,
      healthStatus: HealthStatus.UNKNOWN,
      latency: 0,
      errorRate: 0,
      rateLimitRemaining: null,
      rateLimitResetTime: null,
      lastChecked: new Date().toISOString(),
      checkHistory: []
    };
  }
}

// Export singleton instance
const exchangeMonitoringService = new ExchangeMonitoringService();
export default exchangeMonitoringService;
