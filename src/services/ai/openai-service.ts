import OpenAI from 'openai';
import { MarketAnalysis } from '../../types/ai-types';

export class OpenAIService {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey
    });
  }
  
  /**
   * Analyzes market data and generates trading insights
   */
  async analyzeMarket(
    symbol: string, 
    marketData: any, 
    newsData: any[] = [], 
    technicalIndicators: any = {}
  ): Promise<MarketAnalysis> {
    try {
      const data = {
        symbol,
        price: marketData.price || marketData.close,
        timestamp: marketData.timestamp || new Date().toISOString(),
        indicators: technicalIndicators,
        recentNews: newsData.slice(0, 5).map(n => ({ 
          title: n.title, 
          summary: n.summary, 
          sentiment: n.sentiment 
        }))
      };
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert trading analyst and market strategist. 
            Analyze the provided market data and generate actionable trading insights.
            Your analysis should include sentiment, trend direction, key support/resistance levels,
            risk assessment, and a recommended action (buy, sell, hold).
            Provide confidence levels for your analysis.`
          },
          {
            role: 'user',
            content: `Please analyze this market data for ${symbol}:\n${JSON.stringify(data, null, 2)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
      
      if (!response.choices[0]?.message?.content) {
        throw new Error('No response content from OpenAI');
      }
      
      const analysisText = response.choices[0].message.content;
      return JSON.parse(analysisText) as MarketAnalysis;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }
  
  /**
   * Generates a trading strategy based on market conditions
   */
  async generateStrategy(marketContext: string, riskTolerance: string = 'moderate'): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert trading strategist specializing in algorithmic trading.
            Generate a detailed trading strategy based on the market context provided.
            The strategy should include entry/exit conditions, position sizing, risk management,
            and time horizon. Adapt the strategy to the specified risk tolerance.`
          },
          {
            role: 'user',
            content: `Generate a trading strategy for the following market context:
            ${marketContext}
            
            Risk Tolerance: ${riskTolerance}`
          }
        ],
        temperature: 0.4,
        max_tokens: 1500
      });
      
      if (!response.choices[0]?.message?.content) {
        throw new Error('No response content from OpenAI');
      }
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }
  
  /**
   * Evaluates a strategy based on historical performance
   */
  async evaluateStrategy(
    strategy: string,
    historicalPerformance: { date: string, pnl: number, trades: number }[]
  ): Promise<any> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert in strategy evaluation and optimization.
            Analyze the provided strategy and its historical performance.
            Identify strengths, weaknesses, and potential optimizations.
            Provide a quantitative assessment with confidence levels.`
          },
          {
            role: 'user',
            content: `Evaluate this trading strategy:
            ${strategy}
            
            Historical Performance:
            ${JSON.stringify(historicalPerformance, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: 'json_object' }
      });
      
      if (!response.choices[0]?.message?.content) {
        throw new Error('No response content from OpenAI');
      }
      
      const evaluationText = response.choices[0].message.content;
      return JSON.parse(evaluationText);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }
} 