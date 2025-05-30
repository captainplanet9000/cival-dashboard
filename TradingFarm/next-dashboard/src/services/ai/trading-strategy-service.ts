/**
 * Trading Strategy AI Service
 * Uses LangChain to provide AI-powered trading strategy recommendations
 */

import { LangChainService } from './langchain-service';
import { AIModelConfig } from './types';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

// Define the schema for strategy recommendations
const strategyRecommendationSchema = z.object({
  strategy: z.object({
    name: z.string().describe('A concise name for the trading strategy'),
    description: z.string().describe('Detailed description of the trading strategy'),
    timeframe: z.enum(['short_term', 'medium_term', 'long_term']).describe('The time horizon for this strategy'),
    riskLevel: z.enum(['low', 'medium', 'high']).describe('The risk level of this strategy'),
  }),
  execution: z.object({
    entryConditions: z.array(z.string()).describe('Specific conditions for entering positions'),
    exitConditions: z.array(z.string()).describe('Specific conditions for exiting positions'),
    positionSizing: z.string().describe('Recommendation for position sizing'),
    riskManagement: z.array(z.string()).describe('Risk management guidelines'),
  }),
  marketOutlook: z.object({
    sentiment: z.enum(['bearish', 'neutral', 'bullish']).describe('Current market sentiment'),
    keyFactors: z.array(z.string()).describe('Key factors influencing this market'),
    potentialRisks: z.array(z.string()).describe('Potential risks to be aware of'),
  }),
  expectedPerformance: z.object({
    potentialReturn: z.string().describe('Expected return range (e.g., "5-8%")'),
    timeToTarget: z.string().describe('Estimated time to reach target'),
    confidenceLevel: z.enum(['low', 'medium', 'high']).describe('Confidence level in this recommendation'),
  }),
});

// Strategy recommendation request parameters
export interface StrategyRecommendationParams {
  marketSymbol: string;
  initialCapital: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  preferredTimeframe: 'short' | 'medium' | 'long';
  tradingExperience: 'beginner' | 'intermediate' | 'expert';
  previousStrategies?: string[];
  marketConditions?: string;
  technicalIndicators?: string[];
}

// Service class for AI-powered trading strategy recommendations
export class TradingStrategyService {
  private langChainService: LangChainService;
  private systemPrompt: string;
  
  constructor(langChainService: LangChainService) {
    this.langChainService = langChainService;
    
    // Define the system prompt for strategy recommendations
    this.systemPrompt = `You are an expert trading advisor specialized in developing effective trading strategies.
Your task is to analyze the provided market information and user preferences to generate a detailed, 
personalized trading strategy recommendation. Consider the user's risk tolerance, preferred timeframe, 
trading experience, and capital constraints. Base your recommendations on sound trading principles and 
technical analysis. Provide specific, actionable advice including entry and exit conditions, position sizing, 
and risk management guidelines. Your output should be comprehensive yet practical for implementation.`;
  }
  
  /**
   * Generate a detailed trading strategy recommendation
   */
  async generateStrategyRecommendation(params: StrategyRecommendationParams, modelConfig?: AIModelConfig) {
    try {
      // Create a structured output parser
      const parser = StructuredOutputParser.fromZodSchema(strategyRecommendationSchema);
      const formatInstructions = parser.getFormatInstructions();
      
      // Build the user prompt template
      const userPrompt = `Generate a detailed trading strategy recommendation for ${params.marketSymbol} based on the following parameters:
      
Initial Capital: $${params.initialCapital}
Risk Tolerance: ${params.riskTolerance}
Preferred Timeframe: ${params.preferredTimeframe} term
Trading Experience: ${params.tradingExperience}
${params.previousStrategies ? `Previous Strategies: ${params.previousStrategies.join(', ')}` : ''}
${params.marketConditions ? `Current Market Conditions: ${params.marketConditions}` : ''}
${params.technicalIndicators ? `Technical Indicators to Consider: ${params.technicalIndicators.join(', ')}` : ''}

${formatInstructions}`;

      // Generate the strategy recommendation
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
      console.error('Error generating strategy recommendation:', error);
      throw new Error('Failed to generate strategy recommendation');
    }
  }
  
  /**
   * Generate a quick summary of a market based on recent data
   */
  async generateMarketSummary(marketSymbol: string, timeframe: string) {
    const summarizationPrompt = `Provide a concise summary of the current state of ${marketSymbol} over the ${timeframe} timeframe. 
Include price action, key support/resistance levels, trading volume trends, and overall market sentiment.`;
    
    try {
      const chain = this.langChainService.createPromptChain(
        'You are an expert market analyst. Provide factual, concise market summaries based on the requested information.',
        summarizationPrompt
      );
      
      return await chain.invoke({});
    } catch (error) {
      console.error('Error generating market summary:', error);
      throw new Error('Failed to generate market summary');
    }
  }
  
  /**
   * Analyze risk of a specific strategy
   */
  async analyzeStrategyRisk(strategyDescription: string, marketSymbol: string, modelConfig?: AIModelConfig) {
    const riskAnalysisPrompt = `Perform a comprehensive risk analysis of the following trading strategy for ${marketSymbol}:
    
${strategyDescription}

Include:
1. Potential failure points
2. Market conditions that could adversely affect this strategy
3. Quantifiable risk metrics where possible (max drawdown, risk/reward, etc.)
4. Suggestions for risk mitigation
5. Overall risk assessment on a scale of 1-10`;

    try {
      const completion = await this.langChainService.chatCompletion({
        messages: [
          { 
            role: 'system', 
            content: 'You are a risk assessment specialist for trading strategies. Provide thorough, quantitative risk analyses using market knowledge and trading principles.' 
          },
          { role: 'user', content: riskAnalysisPrompt }
        ]
      }, modelConfig);
      
      return completion.content;
    } catch (error) {
      console.error('Error analyzing strategy risk:', error);
      throw new Error('Failed to analyze strategy risk');
    }
  }
}

export default TradingStrategyService;
