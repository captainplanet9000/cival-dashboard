import { createServerClient } from '@/utils/supabase/server';
import { ExchangeConnectionService } from '@/services/trading/exchange-connection-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

interface TradingAlert {
  id: string;
  agent_id: string | null;
  user_id: string;
  alert_type: 'anomaly' | 'connection' | 'performance' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  details: any;
  is_read: boolean;
  created_at: string;
}

interface AnomalyCheck {
  name: string;
  description: string;
  checkFn: (data: any, thresholds: any) => Promise<{ detected: boolean; details: any }>;
  defaultThresholds: any;
}

export class TradingMonitor {
  private supabase: SupabaseClient<Database>;
  private exchangeService: ExchangeConnectionService;
  
  private anomalyChecks: AnomalyCheck[] = [
    {
      name: 'large_drawdown',
      description: 'Detects unusually large drawdowns in a short time period',
      checkFn: this.checkForLargeDrawdown.bind(this),
      defaultThresholds: {
        drawdown_percent: 5,
        time_period_hours: 24
      }
    },
    {
      name: 'unusual_trading_volume',
      description: 'Detects unusually high trading volume for an agent',
      checkFn: this.checkForUnusualTradingVolume.bind(this),
      defaultThresholds: {
        volume_multiplier: 3,
        min_trades: 5
      }
    },
    {
      name: 'consecutive_losses',
      description: 'Detects multiple consecutive losing trades',
      checkFn: this.checkForConsecutiveLosses.bind(this),
      defaultThresholds: {
        consecutive_loss_count: 5
      }
    },
    {
      name: 'exchange_connection_failure',
      description: 'Detects failed exchange connection attempts',
      checkFn: this.checkForConnectionFailures.bind(this),
      defaultThresholds: {
        failure_count: 3,
        time_period_minutes: 30
      }
    },
    {
      name: 'api_rate_limit',
      description: 'Detects when an exchange API is approaching rate limits',
      checkFn: this.checkForApiRateLimits.bind(this),
      defaultThresholds: {
        rate_limit_percentage: 80
      }
    }
  ];
  
  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
    this.exchangeService = new ExchangeConnectionService(supabaseClient);
  }
  
  /**
   * Static factory method to create a monitor instance
   */
  public static async create(): Promise<TradingMonitor> {
    const supabase = await createServerClient();
    return new TradingMonitor(supabase);
  }
  
  /**
   * Run all monitoring checks for a specific agent
   */
  public async monitorAgent(agentId: string): Promise<TradingAlert[]> {
    try {
      console.log(`Running monitoring checks for agent ${agentId}`);
      const alerts: TradingAlert[] = [];
      
      // Get agent details
      const { data: agent, error: agentError } = await this.supabase
        .from('elizaos_agents')
        .select('id, user_id, configuration')
        .eq('id', agentId)
        .single();
        
      if (agentError || !agent) {
        console.error(`Error fetching agent ${agentId}:`, agentError);
        return [];
      }
      
      // Get agent's exchange connection
      const connectionResult = await this.exchangeService.getAgentExchangeConnection(agentId);
      
      // Check exchange connection
      if (connectionResult.error) {
        const alert = await this.createAlert({
          agent_id: agentId,
          user_id: agent.user_id,
          alert_type: 'connection',
          severity: 'critical',
          title: 'Exchange Connection Issue',
          message: `Unable to connect to exchange: ${connectionResult.error}`,
          details: { error: connectionResult.error }
        });
        
        if (alert) alerts.push(alert);
      }
      
      // Run all anomaly checks
      for (const check of this.anomalyChecks) {
        try {
          // Get custom thresholds from agent configuration
          const customThresholds = agent.configuration?.monitoring?.thresholds?.[check.name] || {};
          const thresholds = { ...check.defaultThresholds, ...customThresholds };
          
          // Get data for the check
          const data = await this.getDataForCheck(check.name, agentId);
          
          // Run the check
          const result = await check.checkFn(data, thresholds);
          
          if (result.detected) {
            // Determine severity based on the check
            let severity: 'info' | 'warning' | 'critical' = 'warning';
            
            if (check.name === 'exchange_connection_failure' || check.name === 'large_drawdown') {
              severity = 'critical';
            } else if (check.name === 'api_rate_limit') {
              severity = result.details.rate_percentage > 90 ? 'critical' : 'warning';
            }
            
            // Create alert
            const alert = await this.createAlert({
              agent_id: agentId,
              user_id: agent.user_id,
              alert_type: 'anomaly',
              severity,
              title: this.getAlertTitle(check.name),
              message: this.getAlertMessage(check.name, result.details),
              details: result.details
            });
            
            if (alert) alerts.push(alert);
          }
        } catch (checkError) {
          console.error(`Error running check ${check.name} for agent ${agentId}:`, checkError);
        }
      }
      
      return alerts;
    } catch (error) {
      console.error(`Error monitoring agent ${agentId}:`, error);
      return [];
    }
  }
  
  /**
   * Run monitoring checks for all active trading agents
   */
  public async monitorAllAgents(): Promise<{ total: number; alerts: number }> {
    try {
      // Get all active trading agents
      const { data: agents, error: agentsError } = await this.supabase
        .from('elizaos_agents')
        .select('id')
        .eq('agent_type', 'trading_agent')
        .in('status', ['active', 'idle', 'running']);
        
      if (agentsError) {
        console.error('Error fetching active trading agents:', agentsError);
        return { total: 0, alerts: 0 };
      }
      
      if (!agents || agents.length === 0) {
        return { total: 0, alerts: 0 };
      }
      
      // Run monitoring for each agent
      let totalAlerts = 0;
      
      for (const agent of agents) {
        const alerts = await this.monitorAgent(agent.id);
        totalAlerts += alerts.length;
      }
      
      return { total: agents.length, alerts: totalAlerts };
    } catch (error) {
      console.error('Error monitoring all agents:', error);
      return { total: 0, alerts: 0 };
    }
  }
  
  /**
   * Get alerts for a specific user
   */
  public async getUserAlerts(
    userId: string, 
    options: { 
      limit?: number; 
      offset?: number; 
      unreadOnly?: boolean;
      agentId?: string;
      alertTypes?: string[];
    } = {}
  ): Promise<{ alerts: TradingAlert[]; total: number }> {
    try {
      // Build the query
      let query = this.supabase
        .from('trading_alerts')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (options.unreadOnly) {
        query = query.eq('is_read', false);
      }
      
      if (options.agentId) {
        query = query.eq('agent_id', options.agentId);
      }
      
      if (options.alertTypes && options.alertTypes.length > 0) {
        query = query.in('alert_type', options.alertTypes);
      }
      
      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        console.error(`Error fetching alerts for user ${userId}:`, error);
        return { alerts: [], total: 0 };
      }
      
      return { 
        alerts: data as TradingAlert[], 
        total: count || 0 
      };
    } catch (error) {
      console.error(`Error fetching alerts for user ${userId}:`, error);
      return { alerts: [], total: 0 };
    }
  }
  
  /**
   * Mark alert as read
   */
  public async markAlertAsRead(alertId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('trading_alerts')
        .update({ is_read: true })
        .eq('id', alertId);
        
      return !error;
    } catch (error) {
      console.error(`Error marking alert ${alertId} as read:`, error);
      return false;
    }
  }
  
  /**
   * Create a new alert
   */
  private async createAlert(alert: Omit<TradingAlert, 'id' | 'is_read' | 'created_at'>): Promise<TradingAlert | null> {
    try {
      const { data, error } = await this.supabase
        .from('trading_alerts')
        .insert({
          agent_id: alert.agent_id,
          user_id: alert.user_id,
          alert_type: alert.alert_type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          details: alert.details,
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating alert:', error);
        return null;
      }
      
      return data as TradingAlert;
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }
  
  // Anomaly check implementations
  
  /**
   * Check for large drawdowns in a short time period
   */
  private async checkForLargeDrawdown(
    data: { performance: any },
    thresholds: { drawdown_percent: number; time_period_hours: number }
  ): Promise<{ detected: boolean; details: any }> {
    const { performance } = data;
    const { drawdown_percent, time_period_hours } = thresholds;
    
    if (!performance || !performance.equity_curve || performance.equity_curve.length < 2) {
      return { detected: false, details: {} };
    }
    
    // Check most recent drawdown
    const currentDrawdown = performance.drawdown.current;
    
    // Get recent equity data points
    const recentTimeThreshold = Date.now() - (time_period_hours * 60 * 60 * 1000);
    const recentEquityPoints = performance.equity_curve.filter(
      (point: any) => new Date(point.timestamp).getTime() >= recentTimeThreshold
    );
    
    if (recentEquityPoints.length < 2) {
      return { detected: false, details: {} };
    }
    
    // Calculate max drawdown over recent period
    let peak = recentEquityPoints[0].equity;
    let maxDrawdown = 0;
    
    for (const point of recentEquityPoints) {
      if (point.equity > peak) {
        peak = point.equity;
      }
      
      const drawdown = ((peak - point.equity) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    const detected = maxDrawdown >= drawdown_percent;
    
    return {
      detected,
      details: {
        current_drawdown: currentDrawdown,
        recent_max_drawdown: maxDrawdown,
        time_period_hours,
        threshold: drawdown_percent
      }
    };
  }
  
  /**
   * Check for unusual trading volume
   */
  private async checkForUnusualTradingVolume(
    data: { 
      recent_trades: any[]; 
      historical_trades: any[];
    },
    thresholds: { 
      volume_multiplier: number; 
      min_trades: number;
    }
  ): Promise<{ detected: boolean; details: any }> {
    const { recent_trades, historical_trades } = data;
    const { volume_multiplier, min_trades } = thresholds;
    
    if (!recent_trades || recent_trades.length < min_trades) {
      return { detected: false, details: {} };
    }
    
    // Calculate average historical trade volume
    if (!historical_trades || historical_trades.length === 0) {
      return { detected: false, details: {} };
    }
    
    // Calculate total volume for recent trades (last 24 hours)
    const recentVolume = recent_trades.reduce((sum, trade) => sum + trade.amount, 0);
    
    // Calculate average daily volume from historical data
    const historicalTradesDays = Math.ceil(
      (new Date(historical_trades[0].timestamp).getTime() - 
       new Date(historical_trades[historical_trades.length - 1].timestamp).getTime()) / 
      (24 * 60 * 60 * 1000)
    );
    
    const historicalVolume = historical_trades.reduce((sum, trade) => sum + trade.amount, 0);
    const avgDailyVolume = historicalVolume / Math.max(1, historicalTradesDays);
    
    const volumeRatio = recentVolume / avgDailyVolume;
    const detected = volumeRatio >= volume_multiplier;
    
    return {
      detected,
      details: {
        recent_volume: recentVolume,
        avg_daily_volume: avgDailyVolume,
        volume_ratio: volumeRatio,
        threshold: volume_multiplier,
        recent_trade_count: recent_trades.length
      }
    };
  }
  
  /**
   * Check for consecutive losses
   */
  private async checkForConsecutiveLosses(
    data: { recent_trades: any[] },
    thresholds: { consecutive_loss_count: number }
  ): Promise<{ detected: boolean; details: any }> {
    const { recent_trades } = data;
    const { consecutive_loss_count } = thresholds;
    
    if (!recent_trades || recent_trades.length < consecutive_loss_count) {
      return { detected: false, details: {} };
    }
    
    // Count consecutive losing trades
    let currentLossStreak = 0;
    let maxLossStreak = 0;
    
    // Sort trades by timestamp in descending order (most recent first)
    const sortedTrades = [...recent_trades].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    for (const trade of sortedTrades) {
      if (trade.profit_loss < 0) {
        currentLossStreak++;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      } else {
        currentLossStreak = 0;
      }
    }
    
    const detected = maxLossStreak >= consecutive_loss_count;
    
    return {
      detected,
      details: {
        max_loss_streak: maxLossStreak,
        threshold: consecutive_loss_count,
        recent_trades_count: recent_trades.length
      }
    };
  }
  
  /**
   * Check for connection failures
   */
  private async checkForConnectionFailures(
    data: { connection_logs: any[] },
    thresholds: { failure_count: number; time_period_minutes: number }
  ): Promise<{ detected: boolean; details: any }> {
    const { connection_logs } = data;
    const { failure_count, time_period_minutes } = thresholds;
    
    if (!connection_logs || connection_logs.length === 0) {
      return { detected: false, details: {} };
    }
    
    // Filter connection logs to the specified time period
    const timeThreshold = Date.now() - (time_period_minutes * 60 * 1000);
    const recentLogs = connection_logs.filter(
      log => new Date(log.timestamp).getTime() >= timeThreshold
    );
    
    // Count failed connections
    const failedConnections = recentLogs.filter(log => log.status === 'failed');
    const detected = failedConnections.length >= failure_count;
    
    return {
      detected,
      details: {
        failure_count: failedConnections.length,
        threshold: failure_count,
        time_period_minutes,
        recent_failures: failedConnections.slice(0, 5).map(log => ({
          timestamp: log.timestamp,
          error: log.error
        }))
      }
    };
  }
  
  /**
   * Check for API rate limits approaching
   */
  private async checkForApiRateLimits(
    data: { rate_limits: any },
    thresholds: { rate_limit_percentage: number }
  ): Promise<{ detected: boolean; details: any }> {
    const { rate_limits } = data;
    const { rate_limit_percentage } = thresholds;
    
    if (!rate_limits) {
      return { detected: false, details: {} };
    }
    
    // Check if any endpoint is approaching rate limit
    let highestPercentage = 0;
    let highestEndpoint = '';
    
    for (const endpoint in rate_limits) {
      const { used, limit } = rate_limits[endpoint];
      const percentage = (used / limit) * 100;
      
      if (percentage > highestPercentage) {
        highestPercentage = percentage;
        highestEndpoint = endpoint;
      }
    }
    
    const detected = highestPercentage >= rate_limit_percentage;
    
    return {
      detected,
      details: {
        rate_percentage: highestPercentage,
        endpoint: highestEndpoint,
        threshold: rate_limit_percentage,
        used: rate_limits[highestEndpoint]?.used,
        limit: rate_limits[highestEndpoint]?.limit
      }
    };
  }
  
  /**
   * Get the appropriate data for a specific check
   */
  private async getDataForCheck(checkName: string, agentId: string): Promise<any> {
    switch (checkName) {
      case 'large_drawdown':
        return this.getPerformanceData(agentId);
        
      case 'unusual_trading_volume':
      case 'consecutive_losses':
        return this.getTradeData(agentId);
        
      case 'exchange_connection_failure':
        return this.getConnectionLogs(agentId);
        
      case 'api_rate_limit':
        return this.getRateLimitData(agentId);
        
      default:
        return {};
    }
  }
  
  /**
   * Get performance data for an agent
   */
  private async getPerformanceData(agentId: string): Promise<any> {
    try {
      // Get agent performance from the API
      const response = await fetch(`/api/elizaos/agents/${agentId}/performance`);
      
      if (!response.ok) {
        console.error(`Error fetching performance data for agent ${agentId}`);
        return { performance: null };
      }
      
      const data = await response.json();
      return { performance: data.performance };
    } catch (error) {
      console.error(`Error fetching performance data for agent ${agentId}:`, error);
      return { performance: null };
    }
  }
  
  /**
   * Get trade data for an agent
   */
  private async getTradeData(agentId: string): Promise<any> {
    try {
      // Get recent trades (last 24 hours)
      const { data: recentTrades, error: recentError } = await this.supabase
        .from('trading_agent_trades')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
        
      if (recentError) {
        console.error(`Error fetching recent trades for agent ${agentId}:`, recentError);
      }
      
      // Get historical trades (past 30 days)
      const { data: historicalTrades, error: historicalError } = await this.supabase
        .from('trading_agent_trades')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
        
      if (historicalError) {
        console.error(`Error fetching historical trades for agent ${agentId}:`, historicalError);
      }
      
      return { 
        recent_trades: recentTrades || [],
        historical_trades: historicalTrades || []
      };
    } catch (error) {
      console.error(`Error fetching trade data for agent ${agentId}:`, error);
      return {
        recent_trades: [],
        historical_trades: []
      };
    }
  }
  
  /**
   * Get connection logs for an agent
   */
  private async getConnectionLogs(agentId: string): Promise<any> {
    try {
      // Get agent's exchange connection
      const { data: agent } = await this.supabase
        .from('elizaos_agents')
        .select('configuration')
        .eq('id', agentId)
        .single();
        
      if (!agent || !agent.configuration?.exchange_connection_id) {
        return { connection_logs: [] };
      }
      
      const connectionId = agent.configuration.exchange_connection_id;
      
      // Get connection logs
      const { data: logs, error } = await this.supabase
        .from('exchange_connection_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) {
        console.error(`Error fetching connection logs for connection ${connectionId}:`, error);
        return { connection_logs: [] };
      }
      
      return { connection_logs: logs || [] };
    } catch (error) {
      console.error(`Error fetching connection logs for agent ${agentId}:`, error);
      return { connection_logs: [] };
    }
  }
  
  /**
   * Get rate limit data for an agent
   */
  private async getRateLimitData(agentId: string): Promise<any> {
    try {
      // Get agent's exchange connection
      const connectionResult = await this.exchangeService.getAgentExchangeConnection(agentId);
      
      if (connectionResult.error || !connectionResult.connection) {
        return { rate_limits: null };
      }
      
      // Get adapter for the connection
      const adapter = await this.exchangeService.getExchangeAdapter(connectionResult.connection.id);
      
      // Get rate limits (if the adapter supports it)
      if (typeof adapter.getRateLimits === 'function') {
        const rateLimits = await adapter.getRateLimits();
        return { rate_limits: rateLimits };
      }
      
      return { rate_limits: null };
    } catch (error) {
      console.error(`Error fetching rate limit data for agent ${agentId}:`, error);
      return { rate_limits: null };
    }
  }
  
  /**
   * Get alert title based on check name
   */
  private getAlertTitle(checkName: string): string {
    switch (checkName) {
      case 'large_drawdown':
        return 'Unusual Drawdown Detected';
        
      case 'unusual_trading_volume':
        return 'Unusual Trading Volume';
        
      case 'consecutive_losses':
        return 'Consecutive Losing Trades';
        
      case 'exchange_connection_failure':
        return 'Exchange Connection Issues';
        
      case 'api_rate_limit':
        return 'API Rate Limit Warning';
        
      default:
        return 'Trading Anomaly Detected';
    }
  }
  
  /**
   * Get alert message based on check name and details
   */
  private getAlertMessage(checkName: string, details: any): string {
    switch (checkName) {
      case 'large_drawdown':
        return `Drawdown of ${details.recent_max_drawdown.toFixed(2)}% detected in the last ${details.time_period_hours} hours, exceeding threshold of ${details.threshold}%.`;
        
      case 'unusual_trading_volume':
        return `Trading volume ${details.volume_ratio.toFixed(1)}x higher than average (${details.recent_trade_count} trades).`;
        
      case 'consecutive_losses':
        return `${details.max_loss_streak} consecutive losing trades detected.`;
        
      case 'exchange_connection_failure':
        return `${details.failure_count} connection failures in the last ${details.time_period_minutes} minutes.`;
        
      case 'api_rate_limit':
        return `API endpoint ${details.endpoint} is at ${details.rate_percentage.toFixed(1)}% of rate limit (${details.used}/${details.limit}).`;
        
      default:
        return 'A trading anomaly has been detected. Please review your agent configuration.';
    }
  }
}
