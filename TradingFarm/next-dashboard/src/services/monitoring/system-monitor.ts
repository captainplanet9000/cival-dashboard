import { createServerClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import os from 'os';

interface SystemMetrics {
  timestamp: number;
  cpu_usage: number;
  memory_usage: number;
  active_connections: number;
  api_requests_per_minute: number;
  websocket_connections: number;
  database_query_time_ms: number;
  active_trading_agents: number;
  pending_orders: number;
  order_execution_time_ms: number;
  system_errors: number;
}

interface ServiceStatus {
  service_name: string;
  status: 'operational' | 'degraded' | 'down';
  last_check: number;
  response_time_ms: number;
  error_rate: number;
  details?: any;
}

export class SystemMonitor {
  private supabase: SupabaseClient<Database>;
  private metricsIntervalId?: NodeJS.Timeout;
  private servicesIntervalId?: NodeJS.Timeout;
  private isCollecting: boolean = false;
  
  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
  }
  
  /**
   * Static factory method to create a monitor instance
   */
  public static async create(): Promise<SystemMonitor> {
    const supabase = await createServerClient();
    return new SystemMonitor(supabase);
  }
  
  /**
   * Start collecting system metrics
   */
  public startMetricsCollection(intervalMs: number = 60000): void {
    if (this.isCollecting) {
      console.log('Metrics collection already running');
      return;
    }
    
    this.isCollecting = true;
    
    // Collect initial metrics
    this.collectSystemMetrics();
    
    // Set up interval for continued collection
    this.metricsIntervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
    
    console.log(`Started system metrics collection with interval of ${intervalMs}ms`);
  }
  
  /**
   * Start service health checks
   */
  public startServiceChecks(intervalMs: number = 60000): void {
    if (this.servicesIntervalId) {
      console.log('Service health checks already running');
      return;
    }
    
    // Perform initial service checks
    this.checkAllServices();
    
    // Set up interval for continued checks
    this.servicesIntervalId = setInterval(() => {
      this.checkAllServices();
    }, intervalMs);
    
    console.log(`Started service health checks with interval of ${intervalMs}ms`);
  }
  
  /**
   * Stop metrics collection
   */
  public stopMetricsCollection(): void {
    if (this.metricsIntervalId) {
      clearInterval(this.metricsIntervalId);
      this.metricsIntervalId = undefined;
      this.isCollecting = false;
      console.log('Stopped system metrics collection');
    }
  }
  
  /**
   * Stop service health checks
   */
  public stopServiceChecks(): void {
    if (this.servicesIntervalId) {
      clearInterval(this.servicesIntervalId);
      this.servicesIntervalId = undefined;
      console.log('Stopped service health checks');
    }
  }
  
  /**
   * Get the latest system metrics
   */
  public async getLatestMetrics(): Promise<SystemMetrics | null> {
    try {
      const { data, error } = await this.supabase
        .from('system_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
        
      if (error) {
        console.error('Error fetching latest metrics:', error);
        return null;
      }
      
      return this.mapDbMetricsToSystemMetrics(data);
    } catch (error) {
      console.error('Error getting latest metrics:', error);
      return null;
    }
  }
  
  /**
   * Get metrics for a specific time range
   */
  public async getMetricsForRange(
    startTime: Date,
    endTime: Date = new Date(),
    interval: string = '1h'
  ): Promise<SystemMetrics[]> {
    try {
      // For a production system, we would use a time-series database or
      // SQL window functions to properly sample data at the specified interval
      
      const { data, error } = await this.supabase
        .from('system_metrics')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .lte('timestamp', endTime.toISOString())
        .order('timestamp', { ascending: true });
        
      if (error) {
        console.error('Error fetching metrics for range:', error);
        return [];
      }
      
      return data.map(this.mapDbMetricsToSystemMetrics);
    } catch (error) {
      console.error('Error getting metrics for range:', error);
      return [];
    }
  }
  
  /**
   * Get current status of all services
   */
  public async getAllServiceStatuses(): Promise<ServiceStatus[]> {
    try {
      const { data, error } = await this.supabase
        .from('service_statuses')
        .select('*')
        .order('last_check', { ascending: false });
        
      if (error) {
        console.error('Error fetching service statuses:', error);
        return [];
      }
      
      // Group by service name and get most recent status for each
      const serviceMap = new Map<string, ServiceStatus>();
      
      for (const status of data) {
        if (!serviceMap.has(status.service_name) || 
            status.last_check > serviceMap.get(status.service_name)!.last_check) {
          serviceMap.set(status.service_name, {
            service_name: status.service_name,
            status: status.status,
            last_check: new Date(status.last_check).getTime(),
            response_time_ms: status.response_time_ms,
            error_rate: status.error_rate,
            details: status.details
          });
        }
      }
      
      return Array.from(serviceMap.values());
    } catch (error) {
      console.error('Error getting service statuses:', error);
      return [];
    }
  }
  
  /**
   * Get historical status for a specific service
   */
  public async getServiceStatusHistory(
    serviceName: string,
    limit: number = 100
  ): Promise<ServiceStatus[]> {
    try {
      const { data, error } = await this.supabase
        .from('service_statuses')
        .select('*')
        .eq('service_name', serviceName)
        .order('last_check', { ascending: false })
        .limit(limit);
        
      if (error) {
        console.error(`Error fetching status history for ${serviceName}:`, error);
        return [];
      }
      
      return data.map(status => ({
        service_name: status.service_name,
        status: status.status,
        last_check: new Date(status.last_check).getTime(),
        response_time_ms: status.response_time_ms,
        error_rate: status.error_rate,
        details: status.details
      }));
    } catch (error) {
      console.error(`Error getting status history for ${serviceName}:`, error);
      return [];
    }
  }
  
  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherCurrentMetrics();
      
      await this.supabase
        .from('system_metrics')
        .insert({
          timestamp: new Date().toISOString(),
          cpu_usage: metrics.cpu_usage,
          memory_usage: metrics.memory_usage,
          active_connections: metrics.active_connections,
          api_requests_per_minute: metrics.api_requests_per_minute,
          websocket_connections: metrics.websocket_connections,
          database_query_time_ms: metrics.database_query_time_ms,
          active_trading_agents: metrics.active_trading_agents,
          pending_orders: metrics.pending_orders,
          order_execution_time_ms: metrics.order_execution_time_ms,
          system_errors: metrics.system_errors
        });
      
      // Check for anomalies and generate alerts if needed
      this.detectMetricAnomalies(metrics);
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }
  
  /**
   * Gather current system metrics
   */
  private async gatherCurrentMetrics(): Promise<SystemMetrics> {
    try {
      // CPU usage - for serverless functions, this would be implemented differently
      const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
      
      // Memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
      
      // Get active trading agents count
      const { count: activeAgents } = await this.supabase
        .from('elizaos_agents')
        .select('*', { count: 'exact', head: true })
        .eq('agent_type', 'trading_agent')
        .in('status', ['active', 'running']);
      
      // Get pending orders count
      const { count: pendingOrders } = await this.supabase
        .from('trading_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['NEW', 'OPEN', 'PARTIALLY_FILLED']);
      
      // For demo/illustration purposes, some metrics would use more
      // sophisticated gathering methods in a production environment
      
      return {
        timestamp: Date.now(),
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        active_connections: 0, // Would be gathered from connection pool stats
        api_requests_per_minute: 0, // Would be gathered from API gateway metrics
        websocket_connections: 0, // Would be gathered from websocket server
        database_query_time_ms: 0, // Would be gathered from database profiling
        active_trading_agents: activeAgents || 0,
        pending_orders: pendingOrders || 0,
        order_execution_time_ms: 0, // Would be gathered from order execution logs
        system_errors: 0 // Would be gathered from error logs
      };
    } catch (error) {
      console.error('Error gathering system metrics:', error);
      
      // Return placeholder metrics with zeros
      return {
        timestamp: Date.now(),
        cpu_usage: 0,
        memory_usage: 0,
        active_connections: 0,
        api_requests_per_minute: 0,
        websocket_connections: 0,
        database_query_time_ms: 0,
        active_trading_agents: 0,
        pending_orders: 0,
        order_execution_time_ms: 0,
        system_errors: 0
      };
    }
  }
  
  /**
   * Check health of all services
   */
  private async checkAllServices(): Promise<void> {
    try {
      // Check main services
      await this.checkService('api_server');
      await this.checkService('database');
      await this.checkService('exchange_connection');
      await this.checkService('agent_coordination');
      await this.checkService('optimization_service');
      await this.checkService('paper_trading');
      await this.checkService('market_data_feed');
    } catch (error) {
      console.error('Error checking services:', error);
    }
  }
  
  /**
   * Check health of a specific service
   */
  private async checkService(serviceName: string): Promise<void> {
    try {
      // Start timer for response time measurement
      const startTime = Date.now();
      
      // Service-specific health checks
      let status: 'operational' | 'degraded' | 'down' = 'operational';
      let responseTime = 0;
      let errorRate = 0;
      let details: any = {};
      
      switch (serviceName) {
        case 'api_server':
          // Simple API server health check would ping a health endpoint
          responseTime = Math.random() * 50 + 10; // Mock response time between 10-60ms
          errorRate = Math.random() * 1; // Mock error rate between 0-1%
          status = errorRate > 0.5 ? 'degraded' : 'operational';
          break;
          
        case 'database':
          // Check database connectivity and performance
          try {
            const dbStartTime = Date.now();
            const { data, error } = await this.supabase.rpc('ping');
            
            if (error) {
              status = 'down';
              errorRate = 100;
              details = { error: error.message };
            } else {
              responseTime = Date.now() - dbStartTime;
              status = responseTime > 200 ? 'degraded' : 'operational';
              errorRate = 0;
            }
          } catch (error: any) {
            status = 'down';
            errorRate = 100;
            details = { error: error.message };
          }
          break;
          
        case 'exchange_connection':
          // Would check connectivity to supported exchanges
          responseTime = Math.random() * 200 + 50; // Mock response time between 50-250ms
          errorRate = Math.random() * 5; // Mock error rate between 0-5%
          status = errorRate > 3 ? 'degraded' : (errorRate > 4.5 ? 'down' : 'operational');
          break;
          
        case 'agent_coordination':
          // Would check agent coordination service
          responseTime = Math.random() * 100 + 20; // Mock response time between 20-120ms
          errorRate = Math.random() * 2; // Mock error rate between 0-2%
          status = errorRate > 1.5 ? 'degraded' : 'operational';
          break;
          
        case 'optimization_service':
          // Would check optimization service
          responseTime = Math.random() * 150 + 30; // Mock response time between 30-180ms
          errorRate = Math.random() * 3; // Mock error rate between 0-3%
          status = errorRate > 2 ? 'degraded' : 'operational';
          break;
          
        case 'paper_trading':
          // Would check paper trading service
          responseTime = Math.random() * 50 + 10; // Mock response time between 10-60ms
          errorRate = Math.random() * 1; // Mock error rate between 0-1%
          status = errorRate > 0.7 ? 'degraded' : 'operational';
          break;
          
        case 'market_data_feed':
          // Would check market data feed
          responseTime = Math.random() * 100 + 10; // Mock response time between 10-110ms
          errorRate = Math.random() * 2; // Mock error rate between 0-2%
          status = errorRate > 1.5 ? 'degraded' : 'operational';
          break;
          
        default:
          responseTime = Date.now() - startTime;
          status = 'operational';
          errorRate = 0;
      }
      
      // Record the service status
      await this.supabase
        .from('service_statuses')
        .insert({
          service_name: serviceName,
          status,
          last_check: new Date().toISOString(),
          response_time_ms: responseTime,
          error_rate: errorRate,
          details
        });
      
      // Generate alert if service is degraded or down
      if (status !== 'operational') {
        await this.generateServiceAlert(serviceName, status, errorRate, details);
      }
    } catch (error) {
      console.error(`Error checking service ${serviceName}:`, error);
      
      // Record the service as down due to check failure
      await this.supabase
        .from('service_statuses')
        .insert({
          service_name: serviceName,
          status: 'down',
          last_check: new Date().toISOString(),
          response_time_ms: 0,
          error_rate: 100,
          details: { error: String(error) }
        });
      
      // Generate alert for service being down
      await this.generateServiceAlert(serviceName, 'down', 100, { error: String(error) });
    }
  }
  
  /**
   * Detect anomalies in system metrics
   */
  private async detectMetricAnomalies(currentMetrics: SystemMetrics): Promise<void> {
    try {
      // Get historical metrics for comparison
      const { data: historicalData } = await this.supabase
        .from('system_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(24); // Last 24 data points (assuming 1 hour intervals)
      
      if (!historicalData || historicalData.length < 5) {
        // Not enough historical data for comparison
        return;
      }
      
      // Calculate average and standard deviation for key metrics
      const metrics = historicalData.map(this.mapDbMetricsToSystemMetrics);
      
      // Check for anomalies in key metrics
      this.checkMetricAnomaly(
        'CPU Usage',
        currentMetrics.cpu_usage,
        metrics.map(m => m.cpu_usage),
        70, // Alert if above 70%
        3   // Or if 3 standard deviations above normal
      );
      
      this.checkMetricAnomaly(
        'Memory Usage',
        currentMetrics.memory_usage,
        metrics.map(m => m.memory_usage),
        80, // Alert if above 80%
        3   // Or if 3 standard deviations above normal
      );
      
      this.checkMetricAnomaly(
        'API Request Rate',
        currentMetrics.api_requests_per_minute,
        metrics.map(m => m.api_requests_per_minute),
        1000, // Alert if above 1000 requests per minute
        4     // Or if 4 standard deviations above normal
      );
      
      this.checkMetricAnomaly(
        'Database Query Time',
        currentMetrics.database_query_time_ms,
        metrics.map(m => m.database_query_time_ms),
        500, // Alert if above 500ms
        3    // Or if 3 standard deviations above normal
      );
      
      this.checkMetricAnomaly(
        'System Errors',
        currentMetrics.system_errors,
        metrics.map(m => m.system_errors),
        10,  // Alert if above 10 errors
        2.5  // Or if 2.5 standard deviations above normal
      );
    } catch (error) {
      console.error('Error detecting metric anomalies:', error);
    }
  }
  
  /**
   * Check for anomaly in a specific metric
   */
  private async checkMetricAnomaly(
    metricName: string,
    currentValue: number,
    historicalValues: number[],
    absoluteThreshold: number,
    stdDevThreshold: number
  ): Promise<void> {
    // Calculate mean and standard deviation
    const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
    const variance = historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate z-score (how many standard deviations from the mean)
    const zScore = (currentValue - mean) / (stdDev || 1); // Avoid division by zero
    
    // Check if current value exceeds thresholds
    const exceedsAbsoluteThreshold = currentValue > absoluteThreshold;
    const exceedsRelativeThreshold = zScore > stdDevThreshold;
    
    if (exceedsAbsoluteThreshold || exceedsRelativeThreshold) {
      // Generate system alert for anomaly
      await this.generateMetricAlert(
        metricName,
        currentValue,
        mean,
        stdDev,
        zScore,
        exceedsAbsoluteThreshold,
        exceedsRelativeThreshold,
        absoluteThreshold,
        stdDevThreshold
      );
    }
  }
  
  /**
   * Generate alert for service status change
   */
  private async generateServiceAlert(
    serviceName: string,
    status: 'degraded' | 'down',
    errorRate: number,
    details: any
  ): Promise<void> {
    try {
      const severity = status === 'down' ? 'critical' : 'warning';
      const title = `${serviceName} service is ${status}`;
      const message = status === 'down'
        ? `The ${serviceName} service is currently unavailable. This may affect system functionality.`
        : `The ${serviceName} service is experiencing degraded performance (${errorRate.toFixed(1)}% error rate).`;
      
      await this.supabase
        .from('trading_alerts')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // System alert - visible to all admins
          alert_type: 'system',
          severity,
          title,
          message,
          details: {
            service_name: serviceName,
            status,
            error_rate: errorRate,
            ...details
          },
          is_read: false,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error(`Error generating service alert for ${serviceName}:`, error);
    }
  }
  
  /**
   * Generate alert for metric anomaly
   */
  private async generateMetricAlert(
    metricName: string,
    currentValue: number,
    mean: number,
    stdDev: number,
    zScore: number,
    exceedsAbsoluteThreshold: boolean,
    exceedsRelativeThreshold: boolean,
    absoluteThreshold: number,
    stdDevThreshold: number
  ): Promise<void> {
    try {
      const severity = zScore > stdDevThreshold * 1.5 ? 'critical' : 'warning';
      const title = `Abnormal ${metricName} detected`;
      
      let message = `${metricName} is currently at ${currentValue.toFixed(2)}, `;
      if (exceedsAbsoluteThreshold) {
        message += `which exceeds the threshold of ${absoluteThreshold}. `;
      }
      if (exceedsRelativeThreshold) {
        message += `which is ${zScore.toFixed(2)} standard deviations above normal. `;
      }
      message += `The average value is ${mean.toFixed(2)}.`;
      
      await this.supabase
        .from('trading_alerts')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // System alert - visible to all admins
          alert_type: 'system',
          severity,
          title,
          message,
          details: {
            metric_name: metricName,
            current_value: currentValue,
            mean,
            standard_deviation: stdDev,
            z_score: zScore,
            absolute_threshold: absoluteThreshold,
            stddev_threshold: stdDevThreshold
          },
          is_read: false,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error(`Error generating metric alert for ${metricName}:`, error);
    }
  }
  
  /**
   * Map database metrics to SystemMetrics type
   */
  private mapDbMetricsToSystemMetrics(data: any): SystemMetrics {
    return {
      timestamp: new Date(data.timestamp).getTime(),
      cpu_usage: data.cpu_usage,
      memory_usage: data.memory_usage,
      active_connections: data.active_connections,
      api_requests_per_minute: data.api_requests_per_minute,
      websocket_connections: data.websocket_connections,
      database_query_time_ms: data.database_query_time_ms,
      active_trading_agents: data.active_trading_agents,
      pending_orders: data.pending_orders,
      order_execution_time_ms: data.order_execution_time_ms,
      system_errors: data.system_errors
    };
  }
}
