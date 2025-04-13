import { StrategyBacktestResult, Trade } from '@/types/trading.types';
import { createServerClient } from '@/utils/supabase/server';

/**
 * Interface for performance metrics
 */
export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  averageHoldingPeriod: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  expectancy: number;
  calmarRatio: number;
  recoveryFactor: number;
  ulcerIndex: number;
  returnToDrawdownRatio: number;
}

/**
 * Interface for strategy comparison result
 */
export interface StrategyComparison {
  strategyId: string;
  name: string;
  metrics: PerformanceMetrics;
  rank: number;
  scorePerCategory: Record<string, number>;
  totalScore: number;
}

/**
 * Service for analyzing trading strategy performance
 */
export class PerformanceAnalytics {
  /**
   * Analyze backtest results and calculate comprehensive performance metrics
   */
  analyzeBacktestResults(result: StrategyBacktestResult): PerformanceMetrics {
    // Extract trades from metadata
    const trades = result.metadata?.trades || [];
    const equityCurve = result.metadata?.equityCurve || [];
    
    // Get basic metrics
    const totalReturn = result.profitPercent;
    const maxDrawdown = result.maxDrawdown;
    const maxDrawdownPercent = result.maxDrawdownPercent;
    
    // Calculate win rate
    const winRate = result.winningTrades / (result.winningTrades + result.losingTrades) * 100;
    
    // Calculate trade metrics
    const {
      profitFactor,
      averageWin,
      averageLoss,
      averageHoldingPeriod,
      bestTrade,
      worstTrade,
      consecutiveWins,
      consecutiveLosses,
      expectancy
    } = this.calculateTradeMetrics(trades);
    
    // Calculate equity curve metrics
    const {
      annualizedReturn,
      volatility,
      ulcerIndex,
      calmarRatio,
      recoveryFactor,
      returnToDrawdownRatio
    } = this.calculateEquityCurveMetrics(
      equityCurve,
      result.initialCapital,
      result.startTime,
      result.endTime,
      maxDrawdownPercent
    );
    
    // Use pre-calculated Sharpe and Sortino ratios if available
    const sharpeRatio = result.sharpeRatio || 0;
    const sortinoRatio = result.sortinoRatio || 0;
    
    return {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercent,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      averageHoldingPeriod,
      bestTrade,
      worstTrade,
      consecutiveWins,
      consecutiveLosses,
      expectancy,
      calmarRatio,
      recoveryFactor,
      ulcerIndex,
      returnToDrawdownRatio
    };
  }
  
  /**
   * Calculate trade-specific metrics
   */
  private calculateTradeMetrics(trades: Trade[]): {
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    averageHoldingPeriod: number;
    bestTrade: number;
    worstTrade: number;
    consecutiveWins: number;
    consecutiveLosses: number;
    expectancy: number;
  } {
    if (trades.length === 0) {
      return {
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        averageHoldingPeriod: 0,
        bestTrade: 0,
        worstTrade: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        expectancy: 0
      };
    }
    
    // Separate winning and losing trades
    const winningTrades = trades.filter(t => (t as any).profit > 0);
    const losingTrades = trades.filter(t => (t as any).profit < 0);
    
    // Calculate metrics
    const grossProfit = winningTrades.reduce((sum, t) => sum + (t as any).profit, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t as any).profit, 0));
    
    // Profit factor
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    // Average win and loss
    const averageWin = winningTrades.length > 0 
      ? grossProfit / winningTrades.length 
      : 0;
    
    const averageLoss = losingTrades.length > 0 
      ? grossLoss / losingTrades.length 
      : 0;
    
    // Best and worst trades
    const bestTrade = Math.max(...trades.map(t => (t as any).profit));
    const worstTrade = Math.min(...trades.map(t => (t as any).profit));
    
    // Average holding period
    const avgHoldingPeriod = trades.reduce((sum, t) => sum + ((t as any).holdingPeriod || 0), 0) / trades.length;
    
    // Calculate consecutive wins and losses
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let isWinning = false;
    
    // Sort trades by timestamp
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (let i = 0; i < sortedTrades.length; i++) {
      const isWin = (sortedTrades[i] as any).profit > 0;
      
      if (i === 0) {
        // First trade
        currentStreak = 1;
        isWinning = isWin;
      } else if (isWin === isWinning) {
        // Same streak continues
        currentStreak++;
      } else {
        // Streak broken
        if (isWinning) {
          maxWinStreak = Math.max(maxWinStreak, currentStreak);
        } else {
          maxLossStreak = Math.max(maxLossStreak, currentStreak);
        }
        currentStreak = 1;
        isWinning = isWin;
      }
    }
    
    // Check last streak
    if (isWinning) {
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else {
      maxLossStreak = Math.max(maxLossStreak, currentStreak);
    }
    
    // Calculate expectancy
    const winProbability = winningTrades.length / trades.length;
    const lossProbability = losingTrades.length / trades.length;
    const expectancy = (winProbability * averageWin) - (lossProbability * averageLoss);
    
    return {
      profitFactor,
      averageWin,
      averageLoss,
      averageHoldingPeriod: avgHoldingPeriod,
      bestTrade,
      worstTrade,
      consecutiveWins: maxWinStreak,
      consecutiveLosses: maxLossStreak,
      expectancy
    };
  }
  
  /**
   * Calculate equity curve metrics
   */
  private calculateEquityCurveMetrics(
    equityCurve: { timestamp: number; equity: number }[],
    initialCapital: number,
    startTime: string,
    endTime: string,
    maxDrawdownPercent: number
  ): {
    annualizedReturn: number;
    volatility: number;
    ulcerIndex: number;
    calmarRatio: number;
    recoveryFactor: number;
    returnToDrawdownRatio: number;
  } {
    if (equityCurve.length < 2) {
      return {
        annualizedReturn: 0,
        volatility: 0,
        ulcerIndex: 0,
        calmarRatio: 0,
        recoveryFactor: 0,
        returnToDrawdownRatio: 0
      };
    }
    
    // Calculate test duration in years
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const durationInDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const durationInYears = durationInDays / 365;
    
    // Calculate final return
    const finalEquity = equityCurve[equityCurve.length - 1].equity;
    const totalReturn = (finalEquity - initialCapital) / initialCapital;
    
    // Calculate annualized return
    const annualizedReturn = Math.pow(1 + totalReturn, 1 / durationInYears) - 1;
    
    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prevEquity = equityCurve[i - 1].equity;
      const currentEquity = equityCurve[i].equity;
      returns.push((currentEquity - prevEquity) / prevEquity);
    }
    
    // Calculate volatility (annualized)
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    const volatility = dailyVolatility * Math.sqrt(252); // Annualized assuming 252 trading days
    
    // Calculate Ulcer Index (UI)
    let sumSquaredDrawdowns = 0;
    let highWaterMark = initialCapital;
    
    for (const point of equityCurve) {
      // Update high water mark
      if (point.equity > highWaterMark) {
        highWaterMark = point.equity;
      }
      
      // Calculate percent drawdown
      const drawdownPercent = (highWaterMark - point.equity) / highWaterMark * 100;
      
      // Add squared drawdown to sum
      sumSquaredDrawdowns += Math.pow(drawdownPercent, 2);
    }
    
    const ulcerIndex = Math.sqrt(sumSquaredDrawdowns / equityCurve.length);
    
    // Calculate Calmar Ratio
    const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn * 100 / maxDrawdownPercent : 0;
    
    // Calculate Recovery Factor
    const recoveryFactor = totalReturn > 0 && maxDrawdownPercent > 0 
      ? totalReturn * 100 / maxDrawdownPercent 
      : 0;
    
    // Calculate Return to Drawdown Ratio
    const returnToDrawdownRatio = totalReturn > 0 && maxDrawdownPercent > 0 
      ? totalReturn * 100 / maxDrawdownPercent 
      : 0;
    
    return {
      annualizedReturn: annualizedReturn * 100, // Convert to percentage
      volatility: volatility * 100, // Convert to percentage
      ulcerIndex,
      calmarRatio,
      recoveryFactor,
      returnToDrawdownRatio
    };
  }
  
  /**
   * Compare multiple strategy backtest results and rank them
   */
  compareStrategies(
    results: StrategyBacktestResult[],
    weights: Record<string, number> = {}
  ): StrategyComparison[] {
    if (results.length === 0) {
      return [];
    }
    
    // Default weights
    const defaultWeights = {
      totalReturn: 1.0,
      sharpeRatio: 1.0,
      maxDrawdownPercent: 0.8,
      winRate: 0.6,
      profitFactor: 0.7,
      expectancy: 0.5,
      calmarRatio: 0.8,
      returnToDrawdownRatio: 0.6,
      volatility: 0.4
    };
    
    // Merge with user-provided weights
    const finalWeights = { ...defaultWeights, ...weights };
    
    // Analyze each strategy
    const analysisResults = results.map(result => {
      const metrics = this.analyzeBacktestResults(result);
      
      return {
        strategyId: result.strategyId,
        name: result.parameters.name || result.strategyId,
        metrics,
        rank: 0, // Will be set later
        scorePerCategory: {}, // Will be calculated
        totalScore: 0 // Will be calculated
      };
    });
    
    // Calculate scores for each metric
    const metricKeys = Object.keys(finalWeights);
    
    for (const key of metricKeys) {
      // Get min and max values for normalization
      // For drawdown and volatility, lower is better
      const isLowerBetter = key === 'maxDrawdownPercent' || key === 'volatility';
      
      const values = analysisResults.map(r => r.metrics[key]);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const range = maxValue - minValue;
      
      // Calculate normalized score for each strategy
      for (const result of analysisResults) {
        let normalizedScore = 0;
        
        if (range > 0) {
          if (isLowerBetter) {
            // For metrics where lower is better, invert the score
            normalizedScore = (maxValue - result.metrics[key]) / range;
          } else {
            normalizedScore = (result.metrics[key] - minValue) / range;
          }
        }
        
        // Apply weight
        const weightedScore = normalizedScore * finalWeights[key];
        
        // Store score
        result.scorePerCategory[key] = weightedScore;
        result.totalScore += weightedScore;
      }
    }
    
    // Sort by total score (descending) and assign ranks
    analysisResults.sort((a, b) => b.totalScore - a.totalScore);
    
    // Assign ranks
    for (let i = 0; i < analysisResults.length; i++) {
      analysisResults[i].rank = i + 1;
    }
    
    return analysisResults;
  }
  
  /**
   * Save backtest results to the database
   */
  async saveBacktestResult(result: StrategyBacktestResult): Promise<boolean> {
    try {
      const supabase = createServerClient();
      
      // Save main result
      const { error } = await supabase
        .from('elizaos_backtest_results')
        .insert([{
          id: result.id,
          strategy_id: result.strategyId,
          start_time: result.startTime,
          end_time: result.endTime,
          initial_capital: result.initialCapital,
          final_capital: result.finalCapital,
          profit: result.profit,
          profit_percent: result.profitPercent,
          trades: result.trades,
          winning_trades: result.winningTrades,
          losing_trades: result.losingTrades,
          max_drawdown: result.maxDrawdown,
          max_drawdown_percent: result.maxDrawdownPercent,
          sharpe_ratio: result.sharpeRatio,
          sortino_ratio: result.sortinoRatio,
          parameters: result.parameters,
          metadata: result.metadata
        }]);
      
      if (error) {
        console.error('Error saving backtest result:', error);
        return false;
      }
      
      // Save trades if present in metadata
      if (result.metadata?.trades && result.metadata.trades.length > 0) {
        // In a real implementation, would save trades to a separate table
        console.log(`Saved ${result.metadata.trades.length} backtest trades for result ${result.id}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving backtest result:', error);
      return false;
    }
  }
  
  /**
   * Get backtest results for a strategy
   */
  async getBacktestResults(
    strategyId: string,
    limit: number = 10
  ): Promise<StrategyBacktestResult[]> {
    try {
      const supabase = createServerClient();
      
      const { data, error } = await supabase
        .from('elizaos_backtest_results')
        .select('*')
        .eq('strategy_id', strategyId)
        .order('start_time', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error getting backtest results:', error);
        return [];
      }
      
      // Convert to StrategyBacktestResult format
      return data.map(item => ({
        id: item.id,
        strategyId: item.strategy_id,
        startTime: item.start_time,
        endTime: item.end_time,
        initialCapital: item.initial_capital,
        finalCapital: item.final_capital,
        profit: item.profit,
        profitPercent: item.profit_percent,
        trades: item.trades,
        winningTrades: item.winning_trades,
        losingTrades: item.losing_trades,
        maxDrawdown: item.max_drawdown,
        maxDrawdownPercent: item.max_drawdown_percent,
        sharpeRatio: item.sharpe_ratio,
        sortinoRatio: item.sortino_ratio,
        parameters: item.parameters,
        metadata: item.metadata
      }));
    } catch (error) {
      console.error('Error getting backtest results:', error);
      return [];
    }
  }
  
  /**
   * Get performance metrics for live strategies
   */
  async getLivePerformanceMetrics(strategyIds: string[]): Promise<Record<string, PerformanceMetrics>> {
    try {
      // This would retrieve real performance data from the database
      // For now, we'll return mock data
      const result: Record<string, PerformanceMetrics> = {};
      
      for (const id of strategyIds) {
        result[id] = this.generateMockPerformanceMetrics();
      }
      
      return result;
    } catch (error) {
      console.error('Error getting live performance metrics:', error);
      return {};
    }
  }
  
  /**
   * Generate mock performance metrics for development
   */
  private generateMockPerformanceMetrics(): PerformanceMetrics {
    return {
      totalReturn: Math.random() * 50 - 10, // -10% to 40%
      annualizedReturn: Math.random() * 30 - 5, // -5% to 25%
      volatility: Math.random() * 20 + 5, // 5% to 25%
      sharpeRatio: Math.random() * 3, // 0 to 3
      sortinoRatio: Math.random() * 4, // 0 to 4
      maxDrawdown: Math.random() * 5000 + 1000, // $1000 to $6000
      maxDrawdownPercent: Math.random() * 30 + 5, // 5% to 35%
      winRate: Math.random() * 40 + 40, // 40% to 80%
      profitFactor: Math.random() * 2 + 0.5, // 0.5 to 2.5
      averageWin: Math.random() * 500 + 100, // $100 to $600
      averageLoss: Math.random() * 300 + 100, // $100 to $400
      averageHoldingPeriod: Math.random() * 172800000 + 86400000, // 1 to 3 days in ms
      bestTrade: Math.random() * 2000 + 500, // $500 to $2500
      worstTrade: -(Math.random() * 1500 + 500), // -$500 to -$2000
      consecutiveWins: Math.floor(Math.random() * 8 + 2), // 2 to 10
      consecutiveLosses: Math.floor(Math.random() * 6 + 2), // 2 to 8
      expectancy: Math.random() * 200 - 50, // -$50 to $150
      calmarRatio: Math.random() * 2, // 0 to 2
      recoveryFactor: Math.random() * 3, // 0 to 3
      ulcerIndex: Math.random() * 10, // 0 to 10
      returnToDrawdownRatio: Math.random() * 3 // 0 to 3
    };
  }
}
