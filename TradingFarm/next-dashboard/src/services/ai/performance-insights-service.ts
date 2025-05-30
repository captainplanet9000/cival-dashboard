/**
 * Performance Insights AI Service
 * Uses LangChain to provide AI-powered analysis of trading performance data
 */

import { LangChainService } from './langchain-service';
import { AIModelConfig } from './types';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

// Define schema for performance insights
const performanceInsightsSchema = z.object({
  summary: z.object({
    overallPerformance: z.string().describe('Overall assessment of the trading performance'),
    keyStrengths: z.array(z.string()).describe('Key strengths identified in the trading performance'),
    keyWeaknesses: z.array(z.string()).describe('Key areas for improvement in the trading performance'),
    performanceRating: z.number().min(1).max(10).describe('Overall performance rating on a scale of 1-10'),
  }),
  metrics: z.object({
    profitabilityAnalysis: z.string().describe('Analysis of profitability metrics and trends'),
    riskMetricsAnalysis: z.string().describe('Analysis of risk metrics (drawdown, volatility, etc.)'),
    consistencyAnalysis: z.string().describe('Analysis of trading consistency and stability'),
    comparisonToBenchmarks: z.string().optional().describe('Comparison to relevant market benchmarks'),
  }),
  patterns: z.object({
    successPatterns: z.array(z.string()).describe('Patterns identified in successful trades'),
    failurePatterns: z.array(z.string()).describe('Patterns identified in unsuccessful trades'),
    marketCorrelations: z.array(z.string()).optional().describe('Correlations with overall market conditions'),
    timeBasedPatterns: z.array(z.string()).optional().describe('Patterns related to time of day, week, or seasonality'),
  }),
  recommendations: z.object({
    strategicAdjustments: z.array(z.string()).describe('Recommended strategic adjustments'),
    riskManagement: z.array(z.string()).describe('Risk management improvement suggestions'),
    specificActions: z.array(z.string()).describe('Specific, actionable steps to improve performance'),
    monitoringFocus: z.array(z.string()).describe('Metrics or patterns to focus on monitoring'),
  }),
});

// Performance data interface
export interface PerformanceData {
  farmId: string;
  farmName: string;
  timeframe: string;
  trades: Trade[];
  performanceMetrics: PerformanceMetrics;
  marketConditions?: string;
}

interface Trade {
  id: string;
  market: string;
  entryTime: string;
  exitTime?: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  direction: 'long' | 'short';
  pnl?: number;
  pnlPercentage?: number;
  strategy?: string;
  tags?: string[];
}

interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio?: number;
  maxDrawdown: number;
  returnOnInvestment: number;
  averageHoldingTime?: string;
}

// Service class for AI-powered performance insights
export class PerformanceInsightsService {
  private langChainService: LangChainService;
  private systemPrompt: string;
  
  constructor(langChainService: LangChainService) {
    this.langChainService = langChainService;
    
    // Define the system prompt for performance analysis
    this.systemPrompt = `You are an expert trading performance analyst. Your task is to analyze trading 
performance data and provide detailed, actionable insights. Identify patterns in the data, highlighting 
strengths and weaknesses in the trading approach. Analyze key metrics like win rate, profit factor, and 
drawdown to assess overall performance. Look for correlations between successful/unsuccessful trades and 
market conditions, time patterns, or specific strategies. Provide specific, actionable recommendations to 
improve trading performance based on the patterns and metrics you identify. Your analysis should be 
data-driven, objective, and focused on practical improvements.`;
  }
  
  /**
   * Generate detailed performance insights based on trading data
   */
  async generatePerformanceInsights(performanceData: PerformanceData, modelConfig?: AIModelConfig) {
    try {
      // Create a structured output parser
      const parser = StructuredOutputParser.fromZodSchema(performanceInsightsSchema);
      const formatInstructions = parser.getFormatInstructions();
      
      // Format trade data
      const tradeDataSummary = this.summarizeTradeData(performanceData.trades);
      
      // Build the user prompt
      const userPrompt = `Analyze the following trading performance data for "${performanceData.farmName}" over the ${performanceData.timeframe} timeframe:

PERFORMANCE METRICS:
- Total Trades: ${performanceData.performanceMetrics.totalTrades}
- Win Rate: ${(performanceData.performanceMetrics.winRate * 100).toFixed(2)}%
- Average Win: ${performanceData.performanceMetrics.averageWin.toFixed(2)}%
- Average Loss: ${performanceData.performanceMetrics.averageLoss.toFixed(2)}%
- Profit Factor: ${performanceData.performanceMetrics.profitFactor.toFixed(2)}
- Sharpe Ratio: ${performanceData.performanceMetrics.sharpeRatio?.toFixed(2) || 'N/A'}
- Max Drawdown: ${performanceData.performanceMetrics.maxDrawdown.toFixed(2)}%
- ROI: ${performanceData.performanceMetrics.returnOnInvestment.toFixed(2)}%
- Average Holding Time: ${performanceData.performanceMetrics.averageHoldingTime || 'N/A'}

TRADE SUMMARY:
${tradeDataSummary}

${performanceData.marketConditions ? `MARKET CONDITIONS: ${performanceData.marketConditions}` : ''}

${formatInstructions}`;

      // Generate the performance insights
      const completion = await this.langChainService.chatCompletion({
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }, modelConfig);
      
      // Parse the structured output
      const parsedOutput = await parser.parse(completion.content);
      return parsedOutput;
      
    } catch (error) {
      console.error('Error generating performance insights:', error);
      throw new Error('Failed to generate performance insights');
    }
  }
  
  /**
   * Generate a quick performance summary
   */
  async generateQuickPerformanceSummary(performanceData: PerformanceData) {
    const summarizationPrompt = `Provide a concise summary of the trading performance for "${performanceData.farmName}" 
over the ${performanceData.timeframe} timeframe. Focus on the key metrics: ${Object.entries(performanceData.performanceMetrics)
.filter(([_, value]) => value !== undefined)
.map(([key, value]) => `${key}: ${value}`)
.join(', ')}`;
    
    try {
      const chain = this.langChainService.createPromptChain(
        'You are an expert trading performance analyst. Provide concise, actionable performance summaries.',
        summarizationPrompt
      );
      
      return await chain.invoke({});
    } catch (error) {
      console.error('Error generating performance summary:', error);
      throw new Error('Failed to generate performance summary');
    }
  }
  
  /**
   * Compare performance across multiple timeframes
   */
  async comparePerformancePeriods(
    currentPeriod: PerformanceData, 
    previousPeriod: PerformanceData,
    modelConfig?: AIModelConfig
  ) {
    const comparisonPrompt = `Compare the trading performance between these two periods:

CURRENT PERIOD (${currentPeriod.timeframe}):
- Win Rate: ${(currentPeriod.performanceMetrics.winRate * 100).toFixed(2)}%
- Profit Factor: ${currentPeriod.performanceMetrics.profitFactor.toFixed(2)}
- ROI: ${currentPeriod.performanceMetrics.returnOnInvestment.toFixed(2)}%
- Max Drawdown: ${currentPeriod.performanceMetrics.maxDrawdown.toFixed(2)}%

PREVIOUS PERIOD (${previousPeriod.timeframe}):
- Win Rate: ${(previousPeriod.performanceMetrics.winRate * 100).toFixed(2)}%
- Profit Factor: ${previousPeriod.performanceMetrics.profitFactor.toFixed(2)}
- ROI: ${previousPeriod.performanceMetrics.returnOnInvestment.toFixed(2)}%
- Max Drawdown: ${previousPeriod.performanceMetrics.maxDrawdown.toFixed(2)}%

Identify significant changes between periods, potential causes for these changes, and actionable insights.`;

    try {
      const completion = await this.langChainService.chatCompletion({
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert in trading performance analysis. Provide clear, data-driven comparisons between trading periods, highlighting key changes and their potential causes.' 
          },
          { role: 'user', content: comparisonPrompt }
        ]
      }, modelConfig);
      
      return completion.content;
    } catch (error) {
      console.error('Error comparing performance periods:', error);
      throw new Error('Failed to compare performance periods');
    }
  }

  /**
   * Helper method to summarize trade data for the prompt
   */
  private summarizeTradeData(trades: Trade[]): string {
    // If there are too many trades, summarize by market
    if (trades.length > 10) {
      const marketSummary = trades.reduce((acc, trade) => {
        if (!acc[trade.market]) {
          acc[trade.market] = {
            count: 0,
            wins: 0,
            losses: 0,
            totalPnl: 0,
          };
        }
        
        acc[trade.market].count++;
        
        if (trade.pnl) {
          acc[trade.market].totalPnl += trade.pnl;
          if (trade.pnl > 0) {
            acc[trade.market].wins++;
          } else if (trade.pnl < 0) {
            acc[trade.market].losses++;
          }
        }
        
        return acc;
      }, {} as Record<string, { count: number; wins: number; losses: number; totalPnl: number }>);
      
      return Object.entries(marketSummary)
        .map(([market, data]) => {
          const winRate = data.wins / (data.wins + data.losses) || 0;
          return `${market}: ${data.count} trades, Win Rate: ${(winRate * 100).toFixed(2)}%, Total P&L: ${data.totalPnl.toFixed(2)}`;
        })
        .join('\n');
    }
    
    // If few trades, show them individually
    return trades
      .map(trade => {
        const result = trade.pnl ? (trade.pnl > 0 ? 'WIN' : 'LOSS') : 'OPEN';
        const pnl = trade.pnl ? `P&L: ${trade.pnl.toFixed(2)} (${trade.pnlPercentage?.toFixed(2)}%)` : 'Open';
        return `${trade.market} ${trade.direction.toUpperCase()}: Entry ${new Date(trade.entryTime).toLocaleDateString()} at ${trade.entryPrice}, ${trade.exitTime ? `Exit ${new Date(trade.exitTime).toLocaleDateString()} at ${trade.exitPrice}` : 'Open'}, ${pnl}, Result: ${result}`;
      })
      .join('\n');
  }
}

export default PerformanceInsightsService;
