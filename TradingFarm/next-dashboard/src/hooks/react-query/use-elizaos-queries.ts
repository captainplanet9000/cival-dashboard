import { useQuery, useQueries } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';

// ElizaOS Agent interface
export interface ElizaAgent {
  id: string;
  farmId: string;
  name: string;
  type: 'elizaos';
  status: 'active' | 'paused' | 'offline';
  capabilities: string[];
  aiModelVersion: string;
  learningMode: 'enabled' | 'disabled';
  personalityProfile: string;
  confidenceThreshold: number;
  createdAt: string;
  lastActiveAt?: string;
  performance?: {
    win_rate: number;
    profit_loss: number;
    total_trades: number;
    average_trade_duration: number;
  };
  metadata?: Record<string, any>;
}

// Command interface
export interface ElizaCommand {
  id: string;
  agentId: string;
  type: string;
  command: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  params?: Record<string, any>;
}

// Knowledge item interface
export interface ElizaKnowledge {
  id: string;
  agentId: string;
  type: 'market' | 'strategy' | 'event' | 'user' | 'system';
  content: string;
  source: string;
  confidence: number;
  createdAt: string;
  expiresAt?: string;
  tags: string[];
  metadata?: Record<string, any>;
}

// Insight interface
export interface ElizaInsight {
  id: string;
  agentId: string;
  type: 'prediction' | 'analysis' | 'alert' | 'suggestion';
  title: string;
  content: string;
  confidence: number;
  dataPoints: string[];
  createdAt: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'invalidated';
  actionTaken?: boolean;
  relatedInsightIds?: string[];
}

// Performance metrics interface
export interface ElizaPerformanceMetrics {
  agentId: string;
  period: '24h' | '7d' | '30d' | 'all';
  metrics: {
    commandsExecuted: number;
    commandsSuccessRate: number;
    averageResponseTime: number;
    knowledgeItemsCreated: number;
    insightsGenerated: number;
    accurateInsightsPercentage: number;
    tradesInitiated: number;
    profitableTrades: number;
    unprofitableTrades: number;
    winRate: number;
    totalPnL: number;
    pnlPercentage: number;
    roiPercentage: number;
  };
}

/**
 * Hook to fetch all ElizaOS agents for a farm
 */
export function useElizaAgents(farmId: string) {
  return useQuery<ElizaAgent[]>({
    queryKey: queryKeys.eliza.agents(farmId),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getElizaAgents(farmId);
      
      // For now, return mock data
      return Array.from({ length: 3 }).map((_, index) => ({
        id: `eliza-${index + 1}`,
        farmId,
        name: `ElizaOS Agent ${index + 1}`,
        type: 'elizaos',
        status: ['active', 'paused', 'offline'][Math.floor(Math.random() * 3)] as 'active' | 'paused' | 'offline',
        capabilities: [
          'market_analysis',
          'strategy_execution',
          'risk_management',
          'sentiment_analysis',
          'portfolio_optimization'
        ].slice(0, Math.floor(Math.random() * 5) + 2),
        aiModelVersion: `3.${Math.floor(Math.random() * 5) + 1}.0`,
        learningMode: Math.random() > 0.3 ? 'enabled' : 'disabled',
        personalityProfile: ['Aggressive', 'Balanced', 'Conservative', 'Analytical'][Math.floor(Math.random() * 4)],
        confidenceThreshold: Math.floor(Math.random() * 30) + 70,
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
        lastActiveAt: Math.random() > 0.1 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        performance: {
          win_rate: Math.floor(Math.random() * 30) + 50,
          profit_loss: Math.floor(Math.random() * 20000) - 5000,
          total_trades: Math.floor(Math.random() * 200) + 20,
          average_trade_duration: Math.floor(Math.random() * 48) + 1
        },
        metadata: {
          learningIterations: Math.floor(Math.random() * 1000) + 100,
          dataSourcesConnected: Math.floor(Math.random() * 10) + 1,
        }
      }));
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch a single ElizaOS agent
 */
export function useElizaAgent(agentId: string) {
  return useQuery<ElizaAgent>({
    queryKey: queryKeys.eliza.agent(agentId),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getElizaAgent(agentId);
      
      // For now, return mock data
      const index = parseInt(agentId.split('-')[1]) - 1;
      
      return {
        id: agentId,
        farmId: 'farm-1',
        name: `ElizaOS Agent ${index + 1}`,
        type: 'elizaos',
        status: ['active', 'paused', 'offline'][Math.floor(Math.random() * 3)] as 'active' | 'paused' | 'offline',
        capabilities: [
          'market_analysis',
          'strategy_execution',
          'risk_management',
          'sentiment_analysis',
          'portfolio_optimization'
        ].slice(0, Math.floor(Math.random() * 5) + 2),
        aiModelVersion: `3.${Math.floor(Math.random() * 5) + 1}.0`,
        learningMode: Math.random() > 0.3 ? 'enabled' : 'disabled',
        personalityProfile: ['Aggressive', 'Balanced', 'Conservative', 'Analytical'][Math.floor(Math.random() * 4)],
        confidenceThreshold: Math.floor(Math.random() * 30) + 70,
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
        lastActiveAt: Math.random() > 0.1 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        performance: {
          win_rate: Math.floor(Math.random() * 30) + 50,
          profit_loss: Math.floor(Math.random() * 20000) - 5000,
          total_trades: Math.floor(Math.random() * 200) + 20,
          average_trade_duration: Math.floor(Math.random() * 48) + 1
        },
        metadata: {
          learningIterations: Math.floor(Math.random() * 1000) + 100,
          dataSourcesConnected: Math.floor(Math.random() * 10) + 1,
        }
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch commands for an ElizaOS agent
 */
export function useElizaCommands(agentId: string) {
  return useQuery<ElizaCommand[]>({
    queryKey: queryKeys.eliza.commands(agentId),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getElizaCommands(agentId);
      
      // For now, return mock data
      return Array.from({ length: 10 }).map((_, index) => {
        const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
        const status = ['pending', 'executing', 'completed', 'failed'][Math.floor(Math.random() * 4)] as 'pending' | 'executing' | 'completed' | 'failed';
        const completedAt = status === 'pending' || status === 'executing' 
          ? undefined 
          : new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000);
        
        const commandTypes = [
          'analyze_market',
          'place_order',
          'cancel_order',
          'adjust_risk_parameters',
          'learn_pattern',
          'generate_report',
          'optimize_portfolio',
          'execute_strategy'
        ];
        
        const type = commandTypes[Math.floor(Math.random() * commandTypes.length)];
        
        let command = '';
        let params = {};
        let result = '';
        
        if (type === 'analyze_market') {
          command = 'Analyze market conditions for BTC/USD';
          params = { symbol: 'BTC/USD', timeframe: '1h', indicators: ['RSI', 'MACD'] };
          result = status === 'completed' ? 'Analysis indicates potential bullish trend with RSI at 62.5' : undefined;
        } else if (type === 'place_order') {
          command = 'Place limit buy order for ETH/USD';
          params = { symbol: 'ETH/USD', side: 'buy', type: 'limit', price: 2850, quantity: 1.5 };
          result = status === 'completed' ? 'Order placed successfully. Order ID: ord-123456' : undefined;
        } else if (type === 'execute_strategy') {
          command = 'Execute strategy-3 on BTC/USD';
          params = { strategyId: 'strategy-3', symbol: 'BTC/USD', timeframe: '4h' };
          result = status === 'completed' ? 'Strategy executed, generated 3 signals' : undefined;
        }
        
        return {
          id: `cmd-${agentId}-${index}`,
          agentId,
          type,
          command,
          status,
          result: status === 'completed' ? result : undefined,
          error: status === 'failed' ? 'Failed to execute command: API error' : undefined,
          createdAt: createdAt.toISOString(),
          completedAt: completedAt?.toISOString(),
          params,
        };
      });
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch knowledge items for an ElizaOS agent
 */
export function useElizaKnowledge(agentId: string) {
  return useQuery<ElizaKnowledge[]>({
    queryKey: queryKeys.eliza.knowledge(agentId),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getElizaKnowledge(agentId);
      
      // For now, return mock data
      return Array.from({ length: 15 }).map((_, index) => {
        const types = ['market', 'strategy', 'event', 'user', 'system'];
        const type = types[Math.floor(Math.random() * types.length)] as 'market' | 'strategy' | 'event' | 'user' | 'system';
        
        let content = '';
        let source = '';
        let tags: string[] = [];
        
        if (type === 'market') {
          content = 'BTC/USD shows strong resistance at $35,000 price level';
          source = 'technical_analysis';
          tags = ['bitcoin', 'resistance', 'technical_analysis'];
        } else if (type === 'strategy') {
          content = 'RSI divergence strategy performs best in ranging markets';
          source = 'backtest_results';
          tags = ['rsi', 'divergence', 'ranging_market'];
        } else if (type === 'event') {
          content = 'Fed announcement scheduled for 2pm EST on Thursday';
          source = 'economic_calendar';
          tags = ['fed', 'announcement', 'market_event'];
        } else if (type === 'user') {
          content = 'User prefers conservative risk profile and max 5x leverage';
          source = 'user_preferences';
          tags = ['user', 'risk_profile', 'leverage'];
        } else if (type === 'system') {
          content = 'Exchange API rate limiting at 10 requests per minute';
          source = 'system_monitoring';
          tags = ['api', 'rate_limit', 'exchange'];
        }
        
        return {
          id: `knowledge-${agentId}-${index}`,
          agentId,
          type,
          content,
          source,
          confidence: Math.random() * 50 + 50,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: Math.random() > 0.7 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          tags,
          metadata: {
            relatedItems: Math.floor(Math.random() * 5),
            priority: Math.floor(Math.random() * 10),
          }
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch insights for an ElizaOS agent
 */
export function useElizaInsights(agentId: string) {
  return useQuery<ElizaInsight[]>({
    queryKey: queryKeys.eliza.insights(agentId),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getElizaInsights(agentId);
      
      // For now, return mock data
      return Array.from({ length: 8 }).map((_, index) => {
        const types = ['prediction', 'analysis', 'alert', 'suggestion'];
        const type = types[Math.floor(Math.random() * types.length)] as 'prediction' | 'analysis' | 'alert' | 'suggestion';
        
        let title = '';
        let content = '';
        
        if (type === 'prediction') {
          title = 'Potential BTC/USD bullish movement within 24-48 hours';
          content = 'Based on current market conditions and historical patterns, BTC/USD shows signs of a potential upward movement of 5-8% within the next 24-48 hours. Key indicators: RSI divergence, increasing volume, and higher lows formation.';
        } else if (type === 'analysis') {
          title = 'ETH/USD correlation with stock market declining';
          content = 'Analysis of the last 30 days shows ETH/USD correlation with S&P 500 has declined from 0.73 to 0.58, suggesting increasing market independence and potentially different price action drivers.';
        } else if (type === 'alert') {
          title = 'Unusually high sell orders detected for SOL/USD';
          content = 'Detected unusually large sell orders for SOL/USD across major exchanges in the last 2 hours. Total volume approximately 3x average. Potential price pressure may lead to short-term volatility.';
        } else if (type === 'suggestion') {
          title = 'Consider partial portfolio rebalancing';
          content = 'Current portfolio allocation shows 62% in BTC, which exceeds target allocation by 12%. Considering recent performance and risk metrics, suggest rebalancing by reducing BTC exposure by 5-10% and increasing allocation to ETH and SOL.';
        }
        
        return {
          id: `insight-${agentId}-${index}`,
          agentId,
          type,
          title,
          content,
          confidence: Math.random() * 40 + 60,
          dataPoints: Array.from({ length: Math.floor(Math.random() * 5) + 1 }).map((_, i) => `data-point-${i}`),
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: Math.random() > 0.3 ? new Date(Date.now() + Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          status: ['active', 'expired', 'invalidated'][Math.floor(Math.random() * 3)] as 'active' | 'expired' | 'invalidated',
          actionTaken: Math.random() > 0.5,
          relatedInsightIds: Math.random() > 0.7 ? Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, i) => `insight-${agentId}-${(index + i) % 8}`) : undefined,
        };
      });
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch performance metrics for an ElizaOS agent
 */
export function useElizaPerformance(agentId: string, period: '24h' | '7d' | '30d' | 'all' = '30d') {
  return useQuery<ElizaPerformanceMetrics>({
    queryKey: queryKeys.eliza.performance(agentId, period),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getElizaPerformance(agentId, period);
      
      // For now, return mock data
      const multiplier = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
      
      return {
        agentId,
        period,
        metrics: {
          commandsExecuted: Math.floor(multiplier * (Math.random() * 10 + 5)),
          commandsSuccessRate: Math.random() * 20 + 80,
          averageResponseTime: Math.random() * 5 + 0.5, // seconds
          knowledgeItemsCreated: Math.floor(multiplier * (Math.random() * 5 + 2)),
          insightsGenerated: Math.floor(multiplier * (Math.random() * 3 + 1)),
          accurateInsightsPercentage: Math.random() * 30 + 70,
          tradesInitiated: Math.floor(multiplier * (Math.random() * 4 + 1)),
          profitableTrades: Math.floor(multiplier * (Math.random() * 3 + 0.5)),
          unprofitableTrades: Math.floor(multiplier * (Math.random() * 2 + 0.5)),
          winRate: Math.random() * 30 + 60,
          totalPnL: multiplier * (Math.random() * 1000 - 200),
          pnlPercentage: multiplier * (Math.random() * 5 - 1),
          roiPercentage: multiplier * (Math.random() * 4 - 0.5),
        }
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Combined hook for a complete ElizaOS agent snapshot
 * Uses parallel queries to fetch all agent data at once
 */
export function useElizaAgentSnapshot(agentId: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.eliza.agent(agentId),
        queryFn: () => useElizaAgent(agentId).queryFn(),
        staleTime: 60 * 1000,
      },
      {
        queryKey: queryKeys.eliza.commands(agentId),
        queryFn: () => useElizaCommands(agentId).queryFn(),
        staleTime: 30 * 1000,
      },
      {
        queryKey: queryKeys.eliza.knowledge(agentId),
        queryFn: () => useElizaKnowledge(agentId).queryFn(),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: queryKeys.eliza.insights(agentId),
        queryFn: () => useElizaInsights(agentId).queryFn(),
        staleTime: 60 * 1000,
      },
      {
        queryKey: queryKeys.eliza.performance(agentId, '30d'),
        queryFn: () => useElizaPerformance(agentId, '30d').queryFn(),
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const [agentQuery, commandsQuery, knowledgeQuery, insightsQuery, performanceQuery] = results;

  return {
    agent: agentQuery.data,
    commands: commandsQuery.data,
    knowledge: knowledgeQuery.data,
    insights: insightsQuery.data,
    performance: performanceQuery.data,
    isLoading: results.some(query => query.isLoading),
    isError: results.some(query => query.isError),
    errors: results.map(query => query.error).filter(Boolean),
    refetch: async () => {
      await Promise.all(results.map(query => query.refetch()));
    }
  };
}

/**
 * Hook for multi-agent performance comparison
 * Uses dynamic queries based on the provided agent IDs
 */
export function useElizaAgentsComparison(agentIds: string[], period: '24h' | '7d' | '30d' | 'all' = '30d') {
  const results = useQueries({
    queries: agentIds.map(agentId => ({
      queryKey: queryKeys.eliza.performance(agentId, period),
      queryFn: () => useElizaPerformance(agentId, period).queryFn(),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = results.some(query => query.isLoading);
  const isError = results.some(query => query.isError);
  const errors = results.map(query => query.error).filter(Boolean);

  // Combine data for comparison
  const comparisonData = !isLoading && !isError ? agentIds.map((agentId, index) => ({
    agentId,
    performance: results[index].data?.metrics,
  })).filter(item => item.performance) : [];

  return {
    data: comparisonData,
    isLoading,
    isError,
    errors,
    refetch: async () => {
      await Promise.all(results.map(query => query.refetch()));
    }
  };
}
