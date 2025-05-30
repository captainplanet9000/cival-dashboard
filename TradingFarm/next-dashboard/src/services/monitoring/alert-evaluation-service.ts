/**
 * Alert Evaluation Service
 * Handles evaluation of alert rules against real-time trading data
 */

import { createServerClient } from '@/utils/supabase/server';
import { AlertManagementService, AlertCondition, AlertRule, TradingAlert, AlertRuleType } from './alert-management-service';

interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
}

interface PositionData {
  id: string;
  strategy_id: number;
  agent_id: number;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  drawdown: number;
}

interface ExchangeData {
  exchange: string;
  status: 'connected' | 'limited' | 'disconnected' | 'error';
  apiUsage: number;
  apiLimit: number;
  responseTime: number;
}

interface AgentData {
  agent_id: number;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'paused';
  lastExecutionTime: string;
  successRate: number;
  errorCount: number;
}

export class AlertEvaluationService {
  /**
   * Evaluate alert rules for a user's farms
   * This would be called by a scheduled background job
   */
  static async evaluateUserAlertRules(userId: string): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      // Get all user's farms
      const { data: farms, error: farmError } = await supabase
        .from('farms')
        .select('id, name')
        .eq('user_id', userId);
      
      if (farmError) throw farmError;
      
      // Process each farm's alert rules
      for (const farm of farms || []) {
        await this.evaluateFarmAlertRules(userId, farm.id);
      }
    } catch (error) {
      console.error('Error evaluating user alert rules:', error);
    }
  }
  
  /**
   * Evaluate alert rules for a specific farm
   */
  static async evaluateFarmAlertRules(userId: string, farmId: number): Promise<void> {
    try {
      // Get active alert rules for the farm
      const alertRules = await AlertManagementService.getAlertRules(userId, {
        farmId,
        activeOnly: true,
      });
      
      if (!alertRules || alertRules.length === 0) return;
      
      // Get necessary data for evaluating the rules
      const marketData = await this.getFarmMarketData(farmId);
      const positionData = await this.getFarmPositionData(farmId);
      const exchangeData = await this.getUserExchangeData(userId);
      const agentData = await this.getFarmAgentData(farmId);
      
      // Evaluate each rule against the data
      for (const rule of alertRules) {
        await this.evaluateAlertRule(
          userId,
          farmId,
          rule,
          {
            marketData,
            positionData,
            exchangeData,
            agentData,
          }
        );
      }
    } catch (error) {
      console.error(`Error evaluating farm ${farmId} alert rules:`, error);
    }
  }
  
  /**
   * Evaluate a single alert rule against data
   */
  private static async evaluateAlertRule(
    userId: string,
    farmId: number,
    rule: AlertRule,
    data: {
      marketData: MarketData[];
      positionData: PositionData[];
      exchangeData: ExchangeData[];
      agentData: AgentData[];
    }
  ): Promise<void> {
    try {
      // Check if rule was triggered recently (respect throttle)
      if (rule.last_triggered) {
        const lastTriggered = new Date(rule.last_triggered);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastTriggered.getTime()) / (1000 * 60);
        
        if (diffMinutes < rule.throttle_minutes) {
          return; // Skip this rule, it was triggered recently
        }
      }
      
      // Evaluate rule based on its type
      let triggered = false;
      let alertMessage = '';
      let alertDetails: Record<string, any> = {};
      let strategyId: number | undefined;
      let agentId: number | undefined;
      let exchange: string | undefined;
      
      switch (rule.rule_type) {
        case 'price_change':
          const priceChangeResult = this.evaluatePriceChangeRule(rule, data.marketData);
          if (priceChangeResult.triggered) {
            triggered = true;
            alertMessage = priceChangeResult.message;
            alertDetails = priceChangeResult.details;
          }
          break;
          
        case 'volume_change':
          const volumeChangeResult = this.evaluateVolumeChangeRule(rule, data.marketData);
          if (volumeChangeResult.triggered) {
            triggered = true;
            alertMessage = volumeChangeResult.message;
            alertDetails = volumeChangeResult.details;
          }
          break;
          
        case 'position_drawdown':
          const drawdownResult = this.evaluateDrawdownRule(rule, data.positionData);
          if (drawdownResult.triggered) {
            triggered = true;
            alertMessage = drawdownResult.message;
            alertDetails = drawdownResult.details;
            strategyId = drawdownResult.strategyId;
            agentId = drawdownResult.agentId;
          }
          break;
          
        case 'api_limit':
          const apiLimitResult = this.evaluateApiLimitRule(rule, data.exchangeData);
          if (apiLimitResult.triggered) {
            triggered = true;
            alertMessage = apiLimitResult.message;
            alertDetails = apiLimitResult.details;
            exchange = apiLimitResult.exchange;
          }
          break;
          
        case 'agent_status':
          const agentStatusResult = this.evaluateAgentStatusRule(rule, data.agentData);
          if (agentStatusResult.triggered) {
            triggered = true;
            alertMessage = agentStatusResult.message;
            alertDetails = agentStatusResult.details;
            agentId = agentStatusResult.agentId;
          }
          break;
          
        // Additional rule types can be added here
      }
      
      // If rule conditions were met, create an alert
      if (triggered) {
        // Update rule's last triggered timestamp
        await AlertManagementService.saveAlertRule({
          ...rule,
          last_triggered: new Date().toISOString(),
        });
        
        // Create alert
        const alert: Omit<TradingAlert, 'is_read' | 'is_acknowledged'> = {
          user_id: userId,
          farm_id: farmId,
          strategy_id: strategyId,
          agent_id: agentId,
          exchange,
          alert_type: rule.rule_type,
          level: rule.level,
          message: alertMessage || `Alert rule "${rule.name}" triggered`,
          details: alertDetails,
        };
        
        await AlertManagementService.createAlert(alert);
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
    }
  }
  
  /**
   * Evaluate price change alert rule
   */
  private static evaluatePriceChangeRule(
    rule: AlertRule,
    marketData: MarketData[]
  ): { triggered: boolean; message: string; details: Record<string, any> } {
    try {
      const result = {
        triggered: false,
        message: '',
        details: {} as Record<string, any>,
      };
      
      // Find the condition for price change
      const priceChangeCondition = rule.conditions.find(c => 
        c.metric === 'price_change_percent' || c.metric === 'price_change'
      );
      
      if (!priceChangeCondition) return result;
      
      // Find symbol condition if any
      const symbolCondition = rule.conditions.find(c => c.metric === 'symbol');
      const symbols = symbolCondition ? 
        (Array.isArray(symbolCondition.value) ? symbolCondition.value : [symbolCondition.value]) : 
        marketData.map(m => m.symbol);
      
      // Check each market data against the condition
      for (const market of marketData) {
        if (!symbols.includes(market.symbol)) continue;
        
        const metricValue = priceChangeCondition.metric === 'price_change_percent' ? 
          market.priceChangePercent24h : 
          market.priceChange24h;
        
        const conditionMet = this.evaluateCondition(priceChangeCondition, metricValue);
        
        if (conditionMet) {
          const direction = metricValue > 0 ? 'increased' : 'decreased';
          const percentValue = Math.abs(market.priceChangePercent24h);
          
          result.triggered = true;
          result.message = `${market.symbol} price has ${direction} by ${percentValue.toFixed(2)}% in the last 24 hours`;
          result.details = {
            symbol: market.symbol,
            price: market.price,
            priceChange24h: market.priceChange24h,
            priceChangePercent24h: market.priceChangePercent24h,
          };
          
          break;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error evaluating price change rule:', error);
      return { triggered: false, message: '', details: {} };
    }
  }
  
  /**
   * Evaluate volume change alert rule
   */
  private static evaluateVolumeChangeRule(
    rule: AlertRule,
    marketData: MarketData[]
  ): { triggered: boolean; message: string; details: Record<string, any> } {
    try {
      const result = {
        triggered: false,
        message: '',
        details: {} as Record<string, any>,
      };
      
      // Find the condition for volume
      const volumeCondition = rule.conditions.find(c => c.metric === 'volume_24h');
      
      if (!volumeCondition) return result;
      
      // Find symbol condition if any
      const symbolCondition = rule.conditions.find(c => c.metric === 'symbol');
      const symbols = symbolCondition ? 
        (Array.isArray(symbolCondition.value) ? symbolCondition.value : [symbolCondition.value]) : 
        marketData.map(m => m.symbol);
      
      // Check each market data against the condition
      for (const market of marketData) {
        if (!symbols.includes(market.symbol)) continue;
        
        const conditionMet = this.evaluateCondition(volumeCondition, market.volume24h);
        
        if (conditionMet) {
          result.triggered = true;
          result.message = `Unusual trading volume detected for ${market.symbol}`;
          result.details = {
            symbol: market.symbol,
            volume24h: market.volume24h,
          };
          
          break;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error evaluating volume change rule:', error);
      return { triggered: false, message: '', details: {} };
    }
  }
  
  /**
   * Evaluate position drawdown alert rule
   */
  private static evaluateDrawdownRule(
    rule: AlertRule,
    positionData: PositionData[]
  ): { 
    triggered: boolean; 
    message: string; 
    details: Record<string, any>; 
    strategyId?: number; 
    agentId?: number;
  } {
    try {
      const result = {
        triggered: false,
        message: '',
        details: {} as Record<string, any>,
        strategyId: undefined as number | undefined,
        agentId: undefined as number | undefined,
      };
      
      // Find the condition for drawdown
      const drawdownCondition = rule.conditions.find(c => 
        c.metric === 'drawdown' || c.metric === 'drawdown_percent'
      );
      
      if (!drawdownCondition) return result;
      
      // Check if strategy specific
      const strategyCondition = rule.conditions.find(c => c.metric === 'strategy_id');
      const strategies = strategyCondition ? 
        (Array.isArray(strategyCondition.value) ? strategyCondition.value : [strategyCondition.value]) : 
        positionData.map(p => p.strategy_id);
      
      // Check each position against the condition
      for (const position of positionData) {
        if (!strategies.includes(position.strategy_id)) continue;
        
        const metricValue = position.drawdown;
        const conditionMet = this.evaluateCondition(drawdownCondition, metricValue);
        
        if (conditionMet) {
          result.triggered = true;
          result.message = `${position.symbol} position has reached ${metricValue.toFixed(2)}% drawdown`;
          result.details = {
            symbol: position.symbol,
            entryPrice: position.entryPrice,
            currentPrice: position.currentPrice,
            pnlPercent: position.pnlPercent,
            drawdown: position.drawdown,
          };
          result.strategyId = position.strategy_id;
          result.agentId = position.agent_id;
          
          break;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error evaluating drawdown rule:', error);
      return { 
        triggered: false, 
        message: '', 
        details: {}, 
        strategyId: undefined, 
        agentId: undefined 
      };
    }
  }
  
  /**
   * Evaluate API limit alert rule
   */
  private static evaluateApiLimitRule(
    rule: AlertRule,
    exchangeData: ExchangeData[]
  ): { 
    triggered: boolean; 
    message: string; 
    details: Record<string, any>; 
    exchange?: string;
  } {
    try {
      const result = {
        triggered: false,
        message: '',
        details: {} as Record<string, any>,
        exchange: undefined as string | undefined,
      };
      
      // Find the condition for API usage
      const apiUsageCondition = rule.conditions.find(c => c.metric === 'api_usage_percent');
      
      if (!apiUsageCondition) return result;
      
      // Find exchange condition if any
      const exchangeCondition = rule.conditions.find(c => c.metric === 'exchange');
      const exchanges = exchangeCondition ? 
        (Array.isArray(exchangeCondition.value) ? exchangeCondition.value : [exchangeCondition.value]) : 
        exchangeData.map(e => e.exchange);
      
      // Check each exchange against the condition
      for (const exchange of exchangeData) {
        if (!exchanges.includes(exchange.exchange)) continue;
        
        const apiUsagePercent = (exchange.apiUsage / exchange.apiLimit) * 100;
        const conditionMet = this.evaluateCondition(apiUsageCondition, apiUsagePercent);
        
        if (conditionMet) {
          result.triggered = true;
          result.message = `${exchange.exchange} API usage has reached ${apiUsagePercent.toFixed(1)}% of limit`;
          result.details = {
            exchange: exchange.exchange,
            apiUsage: exchange.apiUsage,
            apiLimit: exchange.apiLimit,
            apiUsagePercent,
          };
          result.exchange = exchange.exchange;
          
          break;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error evaluating API limit rule:', error);
      return { triggered: false, message: '', details: {}, exchange: undefined };
    }
  }
  
  /**
   * Evaluate agent status alert rule
   */
  private static evaluateAgentStatusRule(
    rule: AlertRule,
    agentData: AgentData[]
  ): { 
    triggered: boolean; 
    message: string; 
    details: Record<string, any>; 
    agentId?: number;
  } {
    try {
      const result = {
        triggered: false,
        message: '',
        details: {} as Record<string, any>,
        agentId: undefined as number | undefined,
      };
      
      // Find the condition for agent status
      const statusCondition = rule.conditions.find(c => c.metric === 'status');
      
      if (!statusCondition) return result;
      
      // Find agent condition if any
      const agentCondition = rule.conditions.find(c => c.metric === 'agent_id');
      const agentIds = agentCondition ? 
        (Array.isArray(agentCondition.value) ? agentCondition.value : [agentCondition.value]) : 
        agentData.map(a => a.agent_id);
      
      // Check each agent against the condition
      for (const agent of agentData) {
        if (!agentIds.includes(agent.agent_id)) continue;
        
        let conditionMet = false;
        
        if (statusCondition.operator === 'eq') {
          conditionMet = agent.status === statusCondition.value;
        } else if (statusCondition.operator === 'neq') {
          conditionMet = agent.status !== statusCondition.value;
        } else if (statusCondition.operator === 'contains') {
          const valueArray = Array.isArray(statusCondition.value) ? 
            statusCondition.value : [statusCondition.value];
          conditionMet = valueArray.includes(agent.status);
        }
        
        if (conditionMet) {
          let statusMessage;
          switch (agent.status) {
            case 'error':
              statusMessage = 'encountered an error';
              break;
            case 'inactive':
              statusMessage = 'is inactive';
              break;
            case 'paused':
              statusMessage = 'has been paused';
              break;
            default:
              statusMessage = `has status: ${agent.status}`;
          }
          
          result.triggered = true;
          result.message = `Agent "${agent.name}" ${statusMessage}`;
          result.details = {
            agent_id: agent.agent_id,
            name: agent.name,
            status: agent.status,
            lastExecutionTime: agent.lastExecutionTime,
            successRate: agent.successRate,
            errorCount: agent.errorCount,
          };
          result.agentId = agent.agent_id;
          
          break;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error evaluating agent status rule:', error);
      return { triggered: false, message: '', details: {}, agentId: undefined };
    }
  }
  
  /**
   * Evaluate a condition against a value
   */
  private static evaluateCondition(condition: AlertCondition, value: any): boolean {
    try {
      switch (condition.operator) {
        case 'gt':
          return value > condition.value;
        case 'lt':
          return value < condition.value;
        case 'eq':
          return value === condition.value;
        case 'neq':
          return value !== condition.value;
        case 'gte':
          return value >= condition.value;
        case 'lte':
          return value <= condition.value;
        case 'between':
          return value >= condition.value && value <= (condition.value2 || 0);
        case 'contains':
          if (Array.isArray(value)) {
            return value.includes(condition.value);
          } else if (typeof value === 'string') {
            return value.includes(String(condition.value));
          }
          return false;
        case 'not_contains':
          if (Array.isArray(value)) {
            return !value.includes(condition.value);
          } else if (typeof value === 'string') {
            return !value.includes(String(condition.value));
          }
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }
  
  /**
   * Get market data for a farm
   * In a real implementation, this would fetch from exchanges or cache
   */
  private static async getFarmMarketData(farmId: number): Promise<MarketData[]> {
    // Mock implementation
    return [
      {
        symbol: 'BTC/USDT',
        price: 65420.5,
        volume24h: 12500000000,
        priceChange24h: 1200.5,
        priceChangePercent24h: 1.87,
        high24h: 66100.0,
        low24h: 64200.0,
      },
      {
        symbol: 'ETH/USDT',
        price: 3120.75,
        volume24h: 5800000000,
        priceChange24h: -85.25,
        priceChangePercent24h: -2.66,
        high24h: 3230.0,
        low24h: 3080.0,
      },
      {
        symbol: 'SOL/USDT',
        price: 142.5,
        volume24h: 1200000000,
        priceChange24h: 8.5,
        priceChangePercent24h: 6.34,
        high24h: 145.0,
        low24h: 133.5,
      },
    ];
  }
  
  /**
   * Get position data for a farm
   * In a real implementation, this would fetch from the database
   */
  private static async getFarmPositionData(farmId: number): Promise<PositionData[]> {
    // Mock implementation
    return [
      {
        id: 'pos-1',
        strategy_id: 1,
        agent_id: 1,
        symbol: 'BTC/USDT',
        entryPrice: 64200.0,
        currentPrice: 65420.5,
        quantity: 0.5,
        value: 32710.25,
        pnl: 610.25,
        pnlPercent: 1.9,
        drawdown: 0,
      },
      {
        id: 'pos-2',
        strategy_id: 2,
        agent_id: 2,
        symbol: 'ETH/USDT',
        entryPrice: 3350.0,
        currentPrice: 3120.75,
        quantity: 5.0,
        value: 15603.75,
        pnl: -1146.25,
        pnlPercent: -6.84,
        drawdown: 6.84,
      },
    ];
  }
  
  /**
   * Get exchange data for a user
   * In a real implementation, this would fetch from the database or exchange APIs
   */
  private static async getUserExchangeData(userId: string): Promise<ExchangeData[]> {
    // Mock implementation
    return [
      {
        exchange: 'Binance',
        status: 'connected',
        apiUsage: 850,
        apiLimit: 1000,
        responseTime: 150,
      },
      {
        exchange: 'Coinbase',
        status: 'limited',
        apiUsage: 450,
        apiLimit: 500,
        responseTime: 220,
      },
    ];
  }
  
  /**
   * Get agent data for a farm
   * In a real implementation, this would fetch from the database
   */
  private static async getFarmAgentData(farmId: number): Promise<AgentData[]> {
    // Mock implementation
    return [
      {
        agent_id: 1,
        name: 'Momentum Trader',
        status: 'active',
        lastExecutionTime: new Date().toISOString(),
        successRate: 0.92,
        errorCount: 2,
      },
      {
        agent_id: 2,
        name: 'DCA Agent',
        status: 'active',
        lastExecutionTime: new Date().toISOString(),
        successRate: 1.0,
        errorCount: 0,
      },
      {
        agent_id: 3,
        name: 'Swing Trader',
        status: 'error',
        lastExecutionTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        successRate: 0.75,
        errorCount: 3,
      },
    ];
  }
}
