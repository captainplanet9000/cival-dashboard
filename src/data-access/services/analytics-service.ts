import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { 
  AgentPerformanceAnalysis, 
  PerformanceMetrics, 
  StrategyPrediction, 
  PortfolioAnalytics,
  AnalyticsInsight
} from '../../types/analytics';
import { AgentCoordinationMetrics } from '../../types/agent-coordination';

export class AnalyticsService {
  private supabase;
  private openaiApiKey: string | undefined;
  private insightCache: Map<string, AnalyticsInsight> = new Map();
  private predictionCache: Map<string, StrategyPrediction> = new Map();
  
  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }
  
  /**
   * Analyze agent performance using AI
   */
  public async analyzeAgentPerformance(agentId: string, timeframe: PerformanceMetrics['timeframe']): Promise<AgentPerformanceAnalysis> {
    // Get agent details
    const { data: agentData } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (!agentData) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Get trades for the specified timeframe
    const { startDate, endDate } = this.getTimeframeDates(timeframe);
    
    const { data: trades } = await this.supabase
      .from('trades')
      .select('*')
      .eq('agent_id', agentId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    // Get agent coordination metrics
    const { data: coordinationMetrics } = await this.supabase
      .from('agent_coordination_metrics')
      .select('*')
      .eq('agentId', agentId)
      .single();
    
    // Calculate performance metrics
    const metrics = this.calculatePerformanceMetrics(trades || [], startDate, endDate);
    
    // Use AI to analyze performance and provide recommendations
    const aiAnalysis = await this.performAIAnalysis(
      metrics, 
      trades || [], 
      coordinationMetrics as AgentCoordinationMetrics,
      agentData
    );
    
    return {
      agentId,
      agentName: agentData.name,
      agentRole: agentData.type,
      metrics,
      strengths: aiAnalysis.strengths,
      weaknesses: aiAnalysis.weaknesses,
      aiRecommendations: aiAnalysis.recommendations,
      anomalies: aiAnalysis.anomalies,
      improvementScore: aiAnalysis.improvementScore,
      comparisonToBaseline: this.compareToBaseline(metrics)
    };
  }
  
  /**
   * Generate predictive analytics for a strategy
   */
  public async predictStrategyPerformance(strategyId: string, timeHorizon: string): Promise<StrategyPrediction> {
    // Check cache first
    const cacheKey = `${strategyId}-${timeHorizon}`;
    const cachedPrediction = this.predictionCache.get(cacheKey);
    
    if (cachedPrediction && (Date.now() - cachedPrediction.confidenceLevel * 86400000) < 86400000) {
      return cachedPrediction;
    }
    
    // Get strategy details
    const { data: strategyData } = await this.supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .single();
    
    if (!strategyData) {
      throw new Error(`Strategy with ID ${strategyId} not found`);
    }
    
    // Get historical performance
    const { data: historicalPerformance } = await this.supabase
      .from('strategy_performance')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('timestamp', { ascending: false })
      .limit(100);
    
    // Get market data for various assets
    const { data: marketData } = await this.supabase
      .from('market_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);
    
    // Run AI prediction model
    const prediction = await this.runPredictionModel(
      strategyData,
      historicalPerformance || [],
      marketData || [],
      timeHorizon
    );
    
    // Cache the prediction
    this.predictionCache.set(cacheKey, prediction);
    
    return prediction;
  }
  
  /**
   * Get analytics insights for agents and strategies
   */
  public async getAnalyticsInsights(): Promise<AnalyticsInsight[]> {
    // Get insights from cache or database
    const { data: dbInsights } = await this.supabase
      .from('analytics_insights')
      .select('*')
      .eq('dismissed', false)
      .order('timestamp', { ascending: false });
    
    const insights: AnalyticsInsight[] = dbInsights as unknown as AnalyticsInsight[] || [];
    
    // Generate new insights if needed
    if (insights.length < 5) {
      const newInsights = await this.generateNewInsights();
      insights.push(...newInsights);
      
      // Store new insights in database
      if (newInsights.length > 0) {
        await this.supabase
          .from('analytics_insights')
          .insert(newInsights);
      }
    }
    
    return insights;
  }
  
  /**
   * Analyze portfolio and generate recommendations
   */
  public async analyzePortfolio(): Promise<PortfolioAnalytics> {
    // Get all positions
    const { data: positions } = await this.supabase
      .from('positions')
      .select('*');
    
    // Get all active trades
    const { data: activeTrades } = await this.supabase
      .from('trades')
      .select('*')
      .eq('status', 'open');
    
    // Get market data
    const { data: marketData } = await this.supabase
      .from('market_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);
    
    // Calculate portfolio metrics and generate analytics
    const analytics = this.calculatePortfolioAnalytics(
      positions || [],
      activeTrades || [],
      marketData || []
    );
    
    return analytics;
  }
  
  /**
   * Dismiss an insight
   */
  public async dismissInsight(insightId: string): Promise<void> {
    await this.supabase
      .from('analytics_insights')
      .update({ dismissed: true })
      .eq('id', insightId);
    
    // Remove from cache
    this.insightCache.delete(insightId);
  }
  
  /**
   * Helper to get date range for a timeframe
   */
  private getTimeframeDates(timeframe: PerformanceMetrics['timeframe']): { startDate: Date, endDate: Date } {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'hour':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        // Default to a week
        startDate.setDate(startDate.getDate() - 7);
    }
    
    return { startDate, endDate };
  }
  
  /**
   * Calculate performance metrics from trade data
   */
  private calculatePerformanceMetrics(trades: any[], startDate: Date, endDate: Date): PerformanceMetrics {
    const winningTrades = trades.filter(t => (t.close_price - t.open_price) * (t.side === 'buy' ? 1 : -1) > 0);
    const losingTrades = trades.filter(t => (t.close_price - t.open_price) * (t.side === 'buy' ? 1 : -1) <= 0);
    
    const totalPnL = trades.reduce((sum, t) => {
      const pnl = (t.close_price - t.open_price) * t.amount * (t.side === 'buy' ? 1 : -1);
      return sum + (pnl || 0);
    }, 0);
    
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? winningTrades.length / totalTrades : 0;
    
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => {
          const pnl = (t.close_price - t.open_price) * t.amount * (t.side === 'buy' ? 1 : -1);
          return sum + (pnl || 0);
        }, 0) / winningTrades.length
      : 0;
    
    const averageLoss = losingTrades.length > 0 
      ? losingTrades.reduce((sum, t) => {
          const pnl = (t.close_price - t.open_price) * t.amount * (t.side === 'buy' ? 1 : -1);
          return sum + (pnl || 0);
        }, 0) / losingTrades.length
      : 0;
    
    // Calculate daily returns for Sharpe and drawdown
    const dailyReturns: number[] = [];
    const dailyPnL: { date: string, pnl: number }[] = [];
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayTrades = trades.filter(t => 
        new Date(t.close_time || t.updated_at).toISOString().split('T')[0] === dateStr
      );
      
      const dayPnL = dayTrades.reduce((sum, t) => {
        const pnl = (t.close_price - t.open_price) * t.amount * (t.side === 'buy' ? 1 : -1);
        return sum + (pnl || 0);
      }, 0);
      
      dailyPnL.push({ date: dateStr, pnl: dayPnL });
      dailyReturns.push(dayPnL);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calculate drawdown
    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    let currentDrawdown = 0;
    let currentDrawdownDuration = 0;
    let peak = 0;
    
    let cumulativePnL = 0;
    for (const dayPnL of dailyReturns) {
      cumulativePnL += dayPnL;
      
      if (cumulativePnL > peak) {
        peak = cumulativePnL;
        currentDrawdown = 0;
        currentDrawdownDuration = 0;
      } else {
        currentDrawdown = peak - cumulativePnL;
        currentDrawdownDuration++;
        
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
          maxDrawdownDuration = currentDrawdownDuration;
        }
      }
    }
    
    // Calculate Sharpe Ratio (assuming risk-free rate of 0 for simplicity)
    const returnMean = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const returnStdDev = Math.sqrt(
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - returnMean, 2), 0) / dailyReturns.length
    );
    const sharpeRatio = returnStdDev > 0 ? returnMean / returnStdDev * Math.sqrt(252) : 0; // Annualized
    
    // Calculate Sortino Ratio (only considers negative returns)
    const negativeReturns = dailyReturns.filter(r => r < 0);
    const negativeReturnVariance = negativeReturns.length > 0 
      ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length 
      : 0;
    const downsideDeviation = Math.sqrt(negativeReturnVariance);
    const sortinoRatio = downsideDeviation > 0 ? returnMean / downsideDeviation * Math.sqrt(252) : 0;
    
    return {
      startTimestamp: startDate.getTime(),
      endTimestamp: endDate.getTime(),
      timeframe: this.determineTimeframe(startDate, endDate),
      
      totalPnL,
      absoluteReturn: totalPnL,
      percentageReturn: 0, // Would need initial capital to calculate
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownDuration,
      volatility: returnStdDev,
      
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      averageWin,
      averageLoss,
      largestWin: winningTrades.length > 0 
        ? Math.max(...winningTrades.map(t => (t.close_price - t.open_price) * t.amount * (t.side === 'buy' ? 1 : -1))) 
        : 0,
      largestLoss: losingTrades.length > 0 
        ? Math.min(...losingTrades.map(t => (t.close_price - t.open_price) * t.amount * (t.side === 'buy' ? 1 : -1))) 
        : 0,
      profitFactor: Math.abs(averageLoss) > 0 ? averageWin / Math.abs(averageLoss) : 0,
      expectancy: winRate * averageWin + (1 - winRate) * averageLoss,
      
      averageHoldingTime: trades.length > 0 
        ? trades.reduce((sum, t) => {
            const openTime = new Date(t.open_time || t.created_at).getTime();
            const closeTime = new Date(t.close_time || t.updated_at).getTime();
            return sum + (closeTime - openTime);
          }, 0) / trades.length / (1000 * 60 * 60) // in hours
        : 0,
      tradesPerDay: dailyReturns.length > 0 ? trades.length / dailyReturns.length : 0,
      recoveryFactor: maxDrawdown > 0 ? totalPnL / maxDrawdown : 0
    };
  }
  
  /**
   * Determine timeframe based on date range
   */
  private determineTimeframe(startDate: Date, endDate: Date): PerformanceMetrics['timeframe'] {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffDays <= 1) return 'day';
    if (diffDays <= 7) return 'week';
    if (diffDays <= 31) return 'month';
    if (diffDays <= 365) return 'year';
    return 'custom';
  }
  
  /**
   * Compare performance metrics to baseline
   */
  private compareToBaseline(metrics: PerformanceMetrics): AgentPerformanceAnalysis['comparisonToBaseline'] {
    // Get baseline metrics (this could be from historical data or industry benchmarks)
    const baselineMetrics = {
      winRate: 0.5,
      profitFactor: 1.5,
      sharpeRatio: 1.0,
      maxDrawdown: 0.2,
      recoveryFactor: 2.0
    };
    
    return [
      {
        metric: 'Win Rate',
        baselineValue: baselineMetrics.winRate,
        currentValue: metrics.winRate,
        percentageDifference: (metrics.winRate / baselineMetrics.winRate - 1) * 100
      },
      {
        metric: 'Profit Factor',
        baselineValue: baselineMetrics.profitFactor,
        currentValue: metrics.profitFactor,
        percentageDifference: (metrics.profitFactor / baselineMetrics.profitFactor - 1) * 100
      },
      {
        metric: 'Sharpe Ratio',
        baselineValue: baselineMetrics.sharpeRatio,
        currentValue: metrics.sharpeRatio,
        percentageDifference: (metrics.sharpeRatio / baselineMetrics.sharpeRatio - 1) * 100
      },
      {
        metric: 'Max Drawdown',
        baselineValue: baselineMetrics.maxDrawdown,
        currentValue: metrics.maxDrawdown / (metrics.totalPnL > 0 ? metrics.totalPnL : 1),
        percentageDifference: (metrics.maxDrawdown / (metrics.totalPnL > 0 ? metrics.totalPnL : 1) / baselineMetrics.maxDrawdown - 1) * 100
      },
      {
        metric: 'Recovery Factor',
        baselineValue: baselineMetrics.recoveryFactor,
        currentValue: metrics.recoveryFactor,
        percentageDifference: (metrics.recoveryFactor / baselineMetrics.recoveryFactor - 1) * 100
      }
    ];
  }
  
  /**
   * Use AI to analyze performance and provide recommendations
   */
  private async performAIAnalysis(
    metrics: PerformanceMetrics,
    trades: any[],
    coordinationMetrics: AgentCoordinationMetrics,
    agentData: any
  ): Promise<{
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    anomalies: AgentPerformanceAnalysis['anomalies'];
    improvementScore: number;
  }> {
    // If OpenAI API key is not available, return mock analysis
    if (!this.openaiApiKey) {
      return this.getMockAIAnalysis(metrics);
    }
    
    try {
      // Prepare data for OpenAI API
      const analysisData = {
        metrics,
        trades: trades.slice(0, 20), // Send only a sample
        coordinationMetrics,
        agentData
      };
      
      // Call OpenAI API for analysis
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert trading performance analyst. Analyze the provided trading metrics and provide strengths, weaknesses, recommendations, and anomalies.'
            },
            {
              role: 'user',
              content: JSON.stringify(analysisData)
            }
          ],
          response_format: { type: 'json_object' }
        })
      });
      
      if (!response.ok) {
        console.error('Error calling OpenAI API:', await response.text());
        return this.getMockAIAnalysis(metrics);
      }
      
      const result = await response.json();
      const analysisResult = JSON.parse(result.choices[0].message.content);
      
      return {
        strengths: analysisResult.strengths || [],
        weaknesses: analysisResult.weaknesses || [],
        recommendations: analysisResult.recommendations || [],
        anomalies: analysisResult.anomalies || [],
        improvementScore: analysisResult.improvementScore || 50
      };
    } catch (error) {
      console.error('Error during AI analysis:', error);
      return this.getMockAIAnalysis(metrics);
    }
  }
  
  /**
   * Generate mock AI analysis for cases where OpenAI is unavailable
   */
  private getMockAIAnalysis(metrics: PerformanceMetrics): {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    anomalies: AgentPerformanceAnalysis['anomalies'];
    improvementScore: number;
  } {
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];
    const anomalies = [];
    
    // Analyze win rate
    if (metrics.winRate > 0.5) {
      strengths.push(`Strong win rate of ${(metrics.winRate * 100).toFixed(1)}%, above market average.`);
    } else {
      weaknesses.push(`Win rate of ${(metrics.winRate * 100).toFixed(1)}% is below the optimal threshold of 50%.`);
      recommendations.push('Review entry conditions to improve trade selection accuracy.');
    }
    
    // Analyze profit factor
    if (metrics.profitFactor > 1.5) {
      strengths.push(`Healthy profit factor of ${metrics.profitFactor.toFixed(2)}, indicating good risk-reward balance.`);
    } else {
      weaknesses.push(`Low profit factor of ${metrics.profitFactor.toFixed(2)} suggests risk-reward imbalance.`);
      recommendations.push('Consider adjusting take-profit targets or implementing trailing stops to increase average win size.');
    }
    
    // Analyze recovery factor
    if (metrics.recoveryFactor < 1) {
      weaknesses.push('Low recovery factor indicates difficulty in recovering from drawdowns.');
      recommendations.push('Implement stricter risk management rules to limit drawdown depth.');
    }
    
    // Analyze Sharpe ratio
    if (metrics.sharpeRatio < 1) {
      weaknesses.push(`Low Sharpe ratio of ${metrics.sharpeRatio.toFixed(2)} indicates poor risk-adjusted returns.`);
      recommendations.push('Focus on reducing volatility while maintaining returns by diversifying trading strategies.');
    } else {
      strengths.push(`Good Sharpe ratio of ${metrics.sharpeRatio.toFixed(2)} shows strong risk-adjusted performance.`);
    }
    
    // Detect anomalies
    if (metrics.largestLoss < -3 * metrics.averageLoss) {
      anomalies.push({
        type: 'risk',
        description: 'Unusually large loss detected, significantly exceeding average loss size.',
        severity: 'high',
        detectedAt: Date.now()
      });
      recommendations.push('Review risk controls to prevent outlier losses that significantly exceed average loss size.');
    }
    
    if (metrics.tradesPerDay > 20) {
      anomalies.push({
        type: 'behavioral',
        description: 'Unusually high trading frequency detected.',
        severity: 'medium',
        detectedAt: Date.now()
      });
      recommendations.push('Consider reducing trading frequency to avoid overtrading and excessive fees.');
    }
    
    // Calculate improvement score (0-100)
    const winRateScore = metrics.winRate * 100 * 0.2;
    const profitFactorScore = Math.min(metrics.profitFactor * 20, 25);
    const sharpeScore = Math.min(metrics.sharpeRatio * 20, 25);
    const drawdownScore = Math.max(0, 15 - metrics.maxDrawdown * 100);
    const recoveryScore = Math.min(metrics.recoveryFactor * 5, 15);
    
    const improvementScore = Math.min(
      Math.max(0, Math.round(winRateScore + profitFactorScore + sharpeScore + drawdownScore + recoveryScore)),
      100
    );
    
    return {
      strengths,
      weaknesses,
      recommendations,
      anomalies,
      improvementScore
    };
  }
  
  /**
   * Run AI-based prediction model
   */
  private async runPredictionModel(
    strategyData: any,
    historicalPerformance: any[],
    marketData: any[],
    timeHorizon: string
  ): Promise<StrategyPrediction> {
    // Mock implementation for now
    const expectedReturn = Math.random() * 0.2 - 0.05;
    const confidenceLevel = 0.7 + Math.random() * 0.2;
    
    // Generate probability distribution
    const distributionPoints = 9;
    const meanReturn = expectedReturn;
    const stdDev = 0.1;
    
    const probabilityDistribution = Array.from({ length: distributionPoints }).map((_, i) => {
      const returnLevel = meanReturn - stdDev * 2 + i * (stdDev * 4 / (distributionPoints - 1));
      const probability = Math.exp(-0.5 * Math.pow((returnLevel - meanReturn) / stdDev, 2)) / (stdDev * Math.sqrt(2 * Math.PI));
      return { returnLevel, probability };
    });
    
    // Normalize probabilities
    const totalProbability = probabilityDistribution.reduce((sum, p) => sum + p.probability, 0);
    probabilityDistribution.forEach(p => p.probability /= totalProbability);
    
    // Generate market scenarios
    const marketScenarios = [
      {
        scenario: 'Bullish Market',
        probability: 0.4,
        expectedPerformance: expectedReturn * 1.5
      },
      {
        scenario: 'Bearish Market',
        probability: 0.3,
        expectedPerformance: expectedReturn * 0.5
      },
      {
        scenario: 'Sideways Market',
        probability: 0.3,
        expectedPerformance: expectedReturn * 0.8
      }
    ];
    
    // Risk assessment
    const riskAssessment = {
      expectedDrawdown: 0.1 + Math.random() * 0.1,
      varLevel95: 0.05 + Math.random() * 0.1,
      stressTestResults: [
        {
          scenario: 'Market Crash (-20%)',
          impact: -0.15 - Math.random() * 0.1
        },
        {
          scenario: 'Volatility Spike (+100%)',
          impact: -0.08 - Math.random() * 0.05
        },
        {
          scenario: 'Liquidity Crisis',
          impact: -0.12 - Math.random() * 0.08
        }
      ]
    };
    
    // Generate recommendations
    const recommendations = [];
    
    if (expectedReturn < 0.05) {
      recommendations.push({
        action: 'Adjust strategy parameters to increase expected return',
        reasoning: 'Current expected return is below target threshold',
        priority: 'high'
      });
    }
    
    if (riskAssessment.expectedDrawdown > 0.15) {
      recommendations.push({
        action: 'Implement tighter stop-loss rules',
        reasoning: 'Expected drawdown exceeds risk tolerance',
        priority: 'medium'
      });
    }
    
    recommendations.push({
      action: 'Diversify entry signals',
      reasoning: 'Would reduce correlation to market volatility',
      priority: 'low'
    });
    
    return {
      strategyId: strategyData.id,
      strategyName: strategyData.name,
      predictionTimeframe: timeHorizon,
      confidenceLevel,
      expectedReturn,
      probabilityDistribution,
      marketConditions: marketScenarios,
      riskAssessment,
      recommendations
    };
  }
  
  /**
   * Calculate portfolio analytics
   */
  private calculatePortfolioAnalytics(
    positions: any[],
    activeTrades: any[],
    marketData: any[]
  ): PortfolioAnalytics {
    // Mock implementation
    const timestamp = Date.now();
    
    // Asset allocation
    const allocations = [
      {
        assetClass: 'BTC',
        percentage: 0.4,
        absoluteValue: 4000
      },
      {
        assetClass: 'ETH',
        percentage: 0.3,
        absoluteValue: 3000
      },
      {
        assetClass: 'SOL',
        percentage: 0.2,
        absoluteValue: 2000
      },
      {
        assetClass: 'USDT',
        percentage: 0.1,
        absoluteValue: 1000
      }
    ];
    
    // Risk metrics
    const riskMetrics = {
      portfolioVolatility: 0.25,
      correlationMatrix: {
        'BTC': { 'BTC': 1, 'ETH': 0.8, 'SOL': 0.7, 'USDT': 0.1 },
        'ETH': { 'BTC': 0.8, 'ETH': 1, 'SOL': 0.75, 'USDT': 0.05 },
        'SOL': { 'BTC': 0.7, 'ETH': 0.75, 'SOL': 1, 'USDT': 0.1 },
        'USDT': { 'BTC': 0.1, 'ETH': 0.05, 'SOL': 0.1, 'USDT': 1 }
      },
      varLevel95: 0.15,
      expectedShortfall: 0.18,
      stressTestResults: {
        'Market Crash': -0.25,
        'Volatility Spike': -0.15,
        'Liquidity Crisis': -0.2
      }
    };
    
    // Performance attribution
    const performanceAttribution = [
      {
        assetClass: 'BTC',
        contribution: 0.05,
        weightEffect: 0.02,
        selectionEffect: 0.03
      },
      {
        assetClass: 'ETH',
        contribution: 0.03,
        weightEffect: 0.01,
        selectionEffect: 0.02
      },
      {
        assetClass: 'SOL',
        contribution: 0.02,
        weightEffect: 0.01,
        selectionEffect: 0.01
      },
      {
        assetClass: 'USDT',
        contribution: 0.005,
        weightEffect: 0.005,
        selectionEffect: 0
      }
    ];
    
    // Efficient frontier
    const efficiencyFrontier = Array.from({ length: 10 }).map((_, i) => {
      const risk = 0.05 + i * 0.03;
      const returnValue = 0.02 + risk * 0.8 + Math.random() * 0.02 - 0.01;
      return {
        risk,
        return: returnValue,
        isOptimal: i === 5
      };
    });
    
    // Rebalancing recommendations
    const rebalancingRecommendations = [
      {
        assetClass: 'BTC',
        currentAllocation: 0.4,
        targetAllocation: 0.35,
        reasoning: 'Reduce BTC exposure due to increasing volatility'
      },
      {
        assetClass: 'SOL',
        currentAllocation: 0.2,
        targetAllocation: 0.25,
        reasoning: 'Increase SOL allocation to capitalize on positive momentum'
      }
    ];
    
    return {
      timestamp,
      allocations,
      riskMetrics,
      performanceAttribution,
      diversificationScore: 75,
      efficiencyFrontier,
      rebalancingRecommendations
    };
  }
  
  /**
   * Generate new analytics insights
   */
  private async generateNewInsights(): Promise<AnalyticsInsight[]> {
    // In a real implementation, this would analyze data and generate insights
    // For now, we'll return mock insights
    const insights: AnalyticsInsight[] = [
      {
        id: uuidv4(),
        timestamp: Date.now(),
        category: 'performance',
        title: 'Performance anomaly detected in BTC trading strategy',
        description: 'The BTC trend-following strategy has shown a 25% decrease in win rate over the past week, deviating from historical patterns.',
        severity: 'high',
        relatedEntities: [
          {
            type: 'strategy',
            id: '123',
            name: 'BTC Trend Follower'
          }
        ],
        recommendations: [
          'Review recent market conditions for potential regime change',
          'Adjust trend detection parameters to account for increased volatility',
          'Consider reducing position sizes until performance stabilizes'
        ],
        aiConfidence: 0.85,
        dismissed: false
      },
      {
        id: uuidv4(),
        timestamp: Date.now() - 3600000,
        category: 'risk',
        title: 'Portfolio correlation risk increasing',
        description: 'Correlation between ETH and SOL has increased to 0.92 in the past 48 hours, reducing diversification benefits.',
        severity: 'medium',
        relatedEntities: [
          {
            type: 'asset',
            id: 'ETH',
            name: 'Ethereum'
          },
          {
            type: 'asset',
            id: 'SOL',
            name: 'Solana'
          }
        ],
        recommendations: [
          'Reduce allocation to one of the highly correlated assets',
          'Add uncorrelated assets to the portfolio',
          'Implement cross-hedging between correlated positions'
        ],
        aiConfidence: 0.78,
        dismissed: false
      },
      {
        id: uuidv4(),
        timestamp: Date.now() - 7200000,
        category: 'opportunity',
        title: 'Potential market inefficiency detected',
        description: 'Persistent price divergence between spot and futures markets for BTC presents arbitrage opportunity.',
        severity: 'info',
        relatedEntities: [
          {
            type: 'market',
            id: 'BTC-USDT',
            name: 'BTC/USDT'
          }
        ],
        recommendations: [
          'Deploy cash-and-carry strategy to capture 4.2% annualized yield',
          'Utilize low-fee exchanges to maximize spread capture',
          'Monitor funding rates for potential shifts'
        ],
        aiConfidence: 0.92,
        dismissed: false
      }
    ];
    
    return insights;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService(); 