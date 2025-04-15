import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api-service';
import { queryKeys } from '@/utils/react-query/query-keys';

// Strategy filter parameters
export interface StrategyFilters {
  farmId?: string;
  status?: 'active' | 'paused' | 'archived';
  type?: string;
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// Strategy entity interface
export interface Strategy {
  id: string;
  farmId: string;
  name: string;
  description?: string;
  type: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  config: Record<string, any>;
  performance?: {
    winRate: number;
    profitLoss: number;
    totalTrades: number;
    averageTradeLength: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
  };
  parameters?: {
    timeframe: string;
    symbols: string[];
    entryConditions: any[];
    exitConditions: any[];
    riskManagement: {
      maxPositionSize: number;
      stopLoss?: number;
      takeProfit?: number;
      trailingStop?: number;
    };
  };
  metadata?: Record<string, any>;
  tags?: string[];
}

// Strategy backtesting result interface
export interface StrategyBacktestResult {
  strategyId: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  finalBalance: number;
  totalPnl: number;
  pnlPercentage: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercentage: number;
  averageTradeLength: number;
  trades: {
    entryTime: string;
    exitTime?: string;
    symbol: string;
    direction: "long" | "short";
    entryPrice: number;
    exitPrice?: number;
    size: number;
    pnl?: number;
    pnlPercentage?: number;
    status: 'open' | 'closed';
    reason?: string;
  }[];
  equityCurve: {
    timestamp: string;
    equity: number;
    drawdown: number;
    drawdownPercentage: number;
  }[];
  parameters: any;
}

// Strategy execution result interface
export interface StrategyExecution {
  id: string;
  strategyId: string;
  farmId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  signals: {
    timestamp: string;
    symbol: string;
    direction: "long" | 'exit';
    price: number;
    reason: string;
    confidence: number;
    metadata?: Record<string, any>;
    positionId?: string;
  }[];
  performance?: {
    pnl: number;
    pnlPercentage: number;
    trades: number;
    winningTrades: number;
    losingTrades: number;
  };
  logs?: {
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
  }[];
}

/**
 * Hook to fetch a list of strategies with optional filtering
 */
export function useStrategies(filters: StrategyFilters = {}) {
  return useQuery<Strategy[]>({
    queryKey: queryKeys.strategies.list(filters),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getStrategies(filters);
      
      // For now, return mock data
      return Array.from({ length: 3 }).map((_, index) => ({
        id: `strategy-${index + 1}`,
        farmId: filters.farmId || 'farm-1',
        name: index === 0 ? 'Golden Cross' : `Strategy ${index + 1}`,
        description: `Description for strategy ${index + 1}`,
        type: ['Trend Following', 'Mean Reversion', 'Breakout', 'Pattern Recognition', 'ML Based'][Math.floor(Math.random() * 5)],
        status: ['active', 'paused', 'archived'][Math.floor(Math.random() * 3)] as 'active' | 'paused' | 'archived',
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastRunAt: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        config: {
          version: '1.0',
          engine: 'python',
          params: {
            lookbackPeriod: 14,
            threshold: 0.2,
          }
        },
        performance: {
          winRate: 50 + Math.random() * 30,
          profitLoss: (Math.random() * 10000) - 2000,
          totalTrades: Math.floor(Math.random() * 200) + 50,
          averageTradeLength: Math.random() * 24 + 1, // hours
          sharpeRatio: Math.random() * 2 + 0.5,
          maxDrawdown: (Math.random() * 20 + 5) * -1,
        },
        parameters: {
          timeframe: ['1m', '5m', '15m', '1h', '4h', '1d'][Math.floor(Math.random() * 6)],
          symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'].slice(0, Math.floor(Math.random() * 3) + 1),
          entryConditions: [
            { type: 'indicator', name: 'RSI', value: 30, operator: '<' },
            { type: 'price', name: 'close', value: 'EMA(20)', operator: '>' }
          ],
          exitConditions: [
            { type: 'indicator', name: 'RSI', value: 70, operator: '>' },
            { type: 'price', name: 'close', value: 'EMA(20)', operator: '<' }
          ],
          riskManagement: {
            maxPositionSize: Math.random() * 0.2 + 0.01,
            stopLoss: Math.random() > 0.3 ? Math.random() * 10 + 2 : undefined,
            takeProfit: Math.random() > 0.3 ? Math.random() * 20 + 5 : undefined,
            trailingStop: Math.random() > 0.7 ? Math.random() * 5 + 1 : undefined,
          }
        },
        tags: ['trending', 'optimized', 'backtested'].slice(0, Math.floor(Math.random() * 3) + 1),
      }));
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch a single strategy by ID
 */
export function useStrategy(id: string) {
  return useQuery<Strategy>({
    queryKey: queryKeys.strategies.detail(id),
    queryFn: async () => {
      // In a real implementation, this would call the API service
      // return apiService.getStrategy(id);
      
      // For now, return mock data
      return {
        id,
        farmId: 'farm-1',
        name: `Strategy ${id.split('-')[1]}`,
        description: `Description for strategy ${id.split('-')[1]}`,
        type: ['Trend Following', 'Mean Reversion', 'Breakout', 'Pattern Recognition', 'ML Based'][Math.floor(Math.random() * 5)],
        status: ['active', 'paused', 'archived'][Math.floor(Math.random() * 3)] as 'active' | 'paused' | 'archived',
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastRunAt: Math.random() > 0.2 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        config: {
          version: '1.0',
          engine: 'python',
          params: {
            lookbackPeriod: 14,
            threshold: 0.2,
          }
        },
        performance: {
          winRate: 50 + Math.random() * 30,
          profitLoss: (Math.random() * 10000) - 2000,
          totalTrades: Math.floor(Math.random() * 200) + 50,
          averageTradeLength: Math.random() * 24 + 1, // hours
          sharpeRatio: Math.random() * 2 + 0.5,
          maxDrawdown: (Math.random() * 20 + 5) * -1,
        },
        parameters: {
          timeframe: ['1m', '5m', '15m', '1h', '4h', '1d'][Math.floor(Math.random() * 6)],
          symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'].slice(0, Math.floor(Math.random() * 3) + 1),
          entryConditions: [
            { type: 'indicator', name: 'RSI', value: 30, operator: '<' },
            { type: 'price', name: 'close', value: 'EMA(20)', operator: '>' }
          ],
          exitConditions: [
            { type: 'indicator', name: 'RSI', value: 70, operator: '>' },
            { type: 'price', name: 'close', value: 'EMA(20)', operator: '<' }
          ],
          riskManagement: {
            maxPositionSize: Math.random() * 0.2 + 0.01,
            stopLoss: Math.random() > 0.3 ? Math.random() * 10 + 2 : undefined,
            takeProfit: Math.random() > 0.3 ? Math.random() * 20 + 5 : undefined,
            trailingStop: Math.random() > 0.7 ? Math.random() * 5 + 1 : undefined,
          }
        },
        tags: ['trending', 'optimized', 'backtested'].slice(0, Math.floor(Math.random() * 3) + 1),
      };
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch all strategies for a specific farm
 */
export function useFarmStrategies(farmId: string, filters: Omit<StrategyFilters, 'farmId'> = {}) {
  return useStrategies({ ...filters, farmId });
}

/**
 * Hook to fetch backtest results for a strategy
 * This is a dependent query that depends on the strategy existing
 */
export function useStrategyBacktests(strategyId: string) {
  const queryClient = useQueryClient();
  
  return useQuery<StrategyBacktestResult[]>({
    queryKey: queryKeys.strategies.backtests(strategyId),
    queryFn: async () => {
      // Check if the strategy exists in the cache
      const strategy = queryClient.getQueryData<Strategy>(
        queryKeys.strategies.detail(strategyId)
      );
      
      if (!strategy) {
        // If the strategy doesn't exist in the cache, fetch it first
        await queryClient.fetchQuery({
          queryKey: queryKeys.strategies.detail(strategyId),
          queryFn: () => useStrategy(strategyId).queryFn(),
        });
      }
      
      // In a real implementation, this would call the API service
      // return apiService.getStrategyBacktests(strategyId);
      
      // For now, return mock data
      return Array.from({ length: 3 }).map((_, index) => {
        const startDate = new Date(Date.now() - (index + 1) * 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const initialBalance = 100000;
        const pnlPercentage = Math.random() * 40 - 10; // Between -10% and 30%
        const finalBalance = initialBalance * (1 + pnlPercentage / 100);
        
        const totalTrades = Math.floor(Math.random() * 100) + 20;
        const winRate = 40 + Math.random() * 40;
        const winningTrades = Math.floor(totalTrades * (winRate / 100));
        const losingTrades = totalTrades - winningTrades;
        
        // Generate trades
        const trades = Array.from({ length: totalTrades }).map((_, tradeIndex) => {
          const entryTime = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
          const tradeDuration = Math.random() * 48 * 60 * 60 * 1000; // Up to 48 hours
          const exitTime = new Date(Math.min(endDate.getTime(), entryTime.getTime() + tradeDuration));
          
          const symbol = ['BTC/USD', 'ETH/USD', 'SOL/USD'][Math.floor(Math.random() * 3)];
          const direction: "long" | "short" = Math.random() > 0.5 ? "long" : "short";
          const entryPrice = 30000 + Math.random() * 5000;
          const isWinning = tradeIndex < winningTrades;
          const pnlMultiplier = isWinning ? (Math.random() * 0.1 + 0.01) : (Math.random() * -0.1 - 0.01);
          const exitPrice = entryPrice * (1 + pnlMultiplier);
          
          return {
            entryTime: entryTime.toISOString(),
            exitTime: exitTime.toISOString(),
            symbol,
            direction,
            entryPrice,
            exitPrice,
            size: Math.random() * 10000 + 1000,
            pnl: direction === 'long' 
              ? (exitPrice - entryPrice) * (Math.random() * 10000 + 1000) / entryPrice
              : (entryPrice - exitPrice) * (Math.random() * 10000 + 1000) / entryPrice,
            pnlPercentage: pnlMultiplier * 100,
            status: "closed" as "open" | "closed",
            reason: isWinning 
              ? ['Take Profit', 'Target Reached', 'Signal Exit'][Math.floor(Math.random() * 3)]
              : ['Stop Loss', 'Signal Reversal', 'Risk Management Exit'][Math.floor(Math.random() * 3)],
          };
        });
        
        // Sort trades by entry time
        trades.sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
        
        // Generate equity curve
        const equityCurve = Array.from({ length: 100 }).map((_, curveIndex) => {
          const timestamp = new Date(startDate.getTime() + (curveIndex / 99) * (endDate.getTime() - startDate.getTime())).toISOString();
          const progressPercentage = curveIndex / 99;
          const randomWalk = Math.sin(curveIndex * 0.1) * 5000 + Math.random() * 3000 - 1500;
          const expectedGain = initialBalance * (pnlPercentage / 100) * progressPercentage;
          const equity = initialBalance + expectedGain + randomWalk;
          const drawdown = Math.min(0, equity - initialBalance);
          const drawdownPercentage = Math.min(0, (equity - initialBalance) / initialBalance) * 100;
          
          return {
            timestamp,
            equity,
            drawdown,
            drawdownPercentage,
          };
        });
        
        // Calculate max drawdown
        const maxDrawdown = Math.min(...equityCurve.map(point => point.drawdown));
        const maxDrawdownPercentage = Math.min(...equityCurve.map(point => point.drawdownPercentage));
        
        return {
          strategyId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          initialBalance,
          finalBalance,
          totalPnl: finalBalance - initialBalance,
          pnlPercentage,
          totalTrades,
          winningTrades,
          losingTrades,
          winRate,
          profitFactor: winningTrades > 0 ? (winningTrades / totalTrades) / (losingTrades / totalTrades) + 0.5 : 0,
          sharpeRatio: Math.random() * 2 + 0.5,
          sortinoRatio: Math.random() * 2 + 0.8,
          maxDrawdown,
          maxDrawdownPercentage,
          averageTradeLength: Math.random() * 24 + 1, // hours
          trades,
          equityCurve,
          parameters: {
            timeframe: ['1m', '5m', '15m', '1h', '4h', '1d'][Math.floor(Math.random() * 6)],
            symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'].slice(0, Math.floor(Math.random() * 3) + 1),
            indicators: {
              rsi: { period: 14, overbought: 70, oversold: 30 },
              ema: { fast: 9, slow: 21 },
            },
            riskManagement: {
              maxPositionSize: 0.1,
              stopLoss: 5,
              takeProfit: 15,
            }
          },
        };
      });
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!strategyId, // Only run query if strategyId is provided
  });
}

/**
 * Hook to fetch executions for a strategy
 * This is a dependent query that depends on the strategy existing
 */
export function useStrategyExecutions(strategyId: string) {
  const queryClient = useQueryClient();
  
  return useQuery<StrategyExecution[]>({
    queryKey: queryKeys.strategies.executions(strategyId),
    queryFn: async () => {
      // Check if the strategy exists in the cache
      const strategy = queryClient.getQueryData<Strategy>(
        queryKeys.strategies.detail(strategyId)
      );
      
      if (!strategy && strategyId) {
        // If the strategy doesn't exist in the cache, fetch it first
        await queryClient.fetchQuery({
          queryKey: queryKeys.strategies.detail(strategyId),
          queryFn: () => useStrategy(strategyId).queryFn(),
        });
      }
      
      // In a real implementation, this would call the API service
      // return apiService.getStrategyExecutions(strategyId);
      
      // For now, return mock data
      return Array.from({ length: 5 }).map((_, index) => {
        const startTime = new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000);
        const isRunning = index === 0 && Math.random() > 0.7;
        const hasFailed = !isRunning && Math.random() > 0.8;
        
        const endTime = isRunning 
          ? undefined 
          : new Date(startTime.getTime() + Math.random() * 12 * 60 * 60 * 1000);
        
        const signals = Array.from({ length: Math.floor(Math.random() * 10) + 1 }).map((_, signalIndex) => {
          const signalTime = new Date(
            startTime.getTime() + Math.random() * ((endTime?.getTime() || Date.now()) - startTime.getTime())
          );
          
          return {
            timestamp: signalTime.toISOString(),
            symbol: ['BTC/USD', 'ETH/USD', 'SOL/USD'][Math.floor(Math.random() * 3)],
            direction: (Math.random() > 0.3 ? 'long' : 'exit') as 'long' | 'exit',
            price: 30000 + Math.random() * 5000,
            reason: `Signal ${signalIndex + 1} reason`,
            confidence: Math.random() * 100,
            metadata: {
              indicator: 'RSI',
              value: Math.random() * 100,
            },
            positionId: Math.random() > 0.5 ? `pos-${Math.floor(Math.random() * 100) + 1}` : undefined,
          };
        });
        
        // Sort signals by timestamp
        signals.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // Generate logs
        const logs = Array.from({ length: Math.floor(Math.random() * 20) + 5 }).map((_, logIndex) => {
          const logTime = new Date(
            startTime.getTime() + Math.random() * ((endTime?.getTime() || Date.now()) - startTime.getTime())
          );
          
          return {
            timestamp: logTime.toISOString(),
            level: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)] as 'info' | 'warning' | 'error',
            message: `Log message ${logIndex + 1}`,
          };
        });
        
        // Sort logs by timestamp
        logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // Only add performance if execution is completed
        const performance = !isRunning && !hasFailed
          ? {
              pnl: Math.random() * 2000 - 500,
              pnlPercentage: Math.random() * 10 - 2,
              trades: signals.filter(s => s.direction !== 'exit').length,
              winningTrades: Math.floor(signals.filter(s => s.direction !== 'exit').length * (Math.random() * 0.8 + 0.2)),
              losingTrades: Math.floor(signals.filter(s => s.direction !== 'exit').length * (Math.random() * 0.4)),
            }
          : undefined;
        
        return {
          id: `exec-${strategyId}-${index}`,
          strategyId,
          farmId: 'farm-1',
          startTime: startTime.toISOString(),
          endTime: endTime?.toISOString(),
          status: isRunning 
            ? 'running' 
            : hasFailed 
              ? 'failed' 
              : 'completed',
          error: hasFailed 
            ? ['Connection error', 'API rate limit exceeded', 'Strategy logic error'][Math.floor(Math.random() * 3)] 
            : undefined,
          signals,
          performance,
          logs,
        };
      });
    },
    staleTime: 60 * 1000, // 1 minute
    // Only run query if strategyId is provided
    enabled: !!strategyId,
  });
}

/**
 * Combined hook for all strategy data
 * This uses dependent queries to minimize unnecessary fetches
 */
// Alias for test compatibility
export const useStrategyDetail = useStrategy;

export function useStrategyAnalytics(strategyId: string) {
  const strategyQuery = useStrategy(strategyId);
  
  // Only fetch backtests and executions if strategy query was successful
  const backtestsQuery = useStrategyBacktests(strategyId);
  const executionsQuery = useStrategyExecutions(strategyId);
  
  return {
    strategy: strategyQuery.data,
    backtests: backtestsQuery.data,
    executions: executionsQuery.data,
    isLoading: strategyQuery.isLoading || backtestsQuery.isLoading || executionsQuery.isLoading,
    isError: strategyQuery.isError || backtestsQuery.isError || executionsQuery.isError,
    error: strategyQuery.error || backtestsQuery.error || executionsQuery.error,
    refetch: async () => {
      await strategyQuery.refetch();
      await backtestsQuery.refetch();
      await executionsQuery.refetch();
    }
  };
}
