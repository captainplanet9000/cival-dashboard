import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { 
  RunnableSequence, 
  StructuredOutputParser, 
  ChatPromptTemplate, 
  PromptTemplate,
  StringOutputParser 
} from 'langchain/prompts';
import { AnthropicChat } from 'langchain/chat_models/anthropic';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { z } from 'zod';
import { logger } from '../logging/winston-service';
import { cacheService } from '../cache/node-cache-service';

/**
 * LangChain AI Service
 * Provides AI capabilities for the Trading Farm platform
 */
export class LangChainService {
  private static instance: LangChainService;
  private openaiClient: OpenAI;
  private anthropicClient: Anthropic;
  private openaiModel: ChatOpenAI;
  private anthropicModel: AnthropicChat;
  private embeddings: OpenAIEmbeddings;

  private constructor() {
    // Initialize OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    // Initialize Anthropic client
    this.anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // Initialize LangChain models
    this.openaiModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o',
      temperature: 0.2,
    });

    this.anthropicModel = new AnthropicChat({
      apiKey: process.env.ANTHROPIC_API_KEY,
      modelName: 'claude-3-opus-20240229',
      temperature: 0.2,
    });

    // Initialize embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-large',
    });

    logger.info('LangChain service initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LangChainService {
    if (!LangChainService.instance) {
      LangChainService.instance = new LangChainService();
    }
    return LangChainService.instance;
  }

  /**
   * Generate text with OpenAI
   */
  public async generateText(prompt: string, model: string = 'gpt-4o'): Promise<string> {
    try {
      const cacheKey = `openai_text_${model}_${prompt.substring(0, 100)}`;
      const cachedResult = cacheService.get<string>(cacheKey);
      
      if (cachedResult) {
        logger.debug('Using cached OpenAI response');
        return cachedResult;
      }

      const response = await this.openaiClient.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are an AI assistant for a trading platform. Provide concise, accurate responses focused on trading, finance, and cryptocurrency markets.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const result = response.choices[0]?.message?.content || '';
      cacheService.setMedium(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error(`Error generating text with OpenAI: ${error instanceof Error ? error.message : String(error)}`);
      return 'Error generating response.';
    }
  }

  /**
   * Generate text with Anthropic
   */
  public async generateTextWithAnthropic(prompt: string, model: string = 'claude-3-opus-20240229'): Promise<string> {
    try {
      const cacheKey = `anthropic_text_${model}_${prompt.substring(0, 100)}`;
      const cachedResult = cacheService.get<string>(cacheKey);
      
      if (cachedResult) {
        logger.debug('Using cached Anthropic response');
        return cachedResult;
      }

      const response = await this.anthropicClient.messages.create({
        model,
        system: 'You are an AI assistant for a trading platform. Provide concise, accurate responses focused on trading, finance, and cryptocurrency markets.',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const result = response.content[0]?.text || '';
      cacheService.setMedium(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error(`Error generating text with Anthropic: ${error instanceof Error ? error.message : String(error)}`);
      return 'Error generating response.';
    }
  }

  /**
   * Create vector embeddings
   */
  public async createEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      logger.error(`Error creating embeddings: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Parse market trend from news
   */
  public async parseMarketTrend(newsText: string): Promise<{ trend: string; confidence: number; reasoning: string }> {
    try {
      const cacheKey = `market_trend_${newsText.substring(0, 100)}`;
      const cachedResult = cacheService.get<{ trend: string; confidence: number; reasoning: string }>(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const parser = StructuredOutputParser.fromZodSchema(
        z.object({
          trend: z.enum(['bullish', 'bearish', 'neutral']),
          confidence: z.number().min(0).max(1),
          reasoning: z.string(),
        })
      );

      const prompt = ChatPromptTemplate.fromTemplate(`
        Analyze the following news or market information and determine the likely market trend it suggests.
        
        News text: {newsText}
        
        Determine if this news suggests a bullish, bearish, or neutral trend for the cryptocurrency market,
        and provide your confidence level (0-1) and reasoning.
        
        {format_instructions}
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.openaiModel,
        parser,
      ]);

      const result = await chain.invoke({
        newsText,
        format_instructions: parser.getFormatInstructions(),
      });

      cacheService.setLong(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(`Error parsing market trend: ${error instanceof Error ? error.message : String(error)}`);
      return {
        trend: 'neutral',
        confidence: 0,
        reasoning: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Generate a trading strategy
   */
  public async generateTradingStrategy(
    asset: string,
    riskLevel: 'low' | 'medium' | 'high',
    timeframe: string
  ): Promise<{ name: string; description: string; rules: string[]; parameters: Record<string, any> }> {
    try {
      const cacheKey = `trading_strategy_${asset}_${riskLevel}_${timeframe}`;
      const cachedResult = cacheService.get<{ name: string; description: string; rules: string[]; parameters: Record<string, any> }>(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }

      const parser = StructuredOutputParser.fromZodSchema(
        z.object({
          name: z.string(),
          description: z.string(),
          rules: z.array(z.string()),
          parameters: z.record(z.any()),
        })
      );

      const prompt = ChatPromptTemplate.fromTemplate(`
        Generate a trading strategy for {asset} with {riskLevel} risk level on the {timeframe} timeframe.
        
        The strategy should include clear entry and exit rules, risk management guidelines, and technical indicators to use.
        
        Make it practical and implementable with specific indicator parameters.
        
        {format_instructions}
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.anthropicModel,
        parser,
      ]);

      const result = await chain.invoke({
        asset,
        riskLevel,
        timeframe,
        format_instructions: parser.getFormatInstructions(),
      });

      cacheService.setVeryLong(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(`Error generating trading strategy: ${error instanceof Error ? error.message : String(error)}`);
      return {
        name: 'Error Strategy',
        description: `Failed to generate strategy: ${error instanceof Error ? error.message : String(error)}`,
        rules: [],
        parameters: {},
      };
    }
  }

  /**
   * Summarize market data
   */
  public async summarizeMarketData(
    asset: string,
    timeframe: string,
    data: { price: number; volume: number; indicators: Record<string, any> }
  ): Promise<string> {
    try {
      const prompt = PromptTemplate.fromTemplate(`
        Provide a concise summary of the current market state for {asset} on the {timeframe} timeframe.
        
        Price: {price}
        Volume: {volume}
        Technical Indicators:
        {indicators}
        
        Your analysis should be brief but include key insights about trend direction, support/resistance levels,
        potential trade setups, and overall market sentiment.
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.openaiModel,
        new StringOutputParser(),
      ]);

      const result = await chain.invoke({
        asset,
        timeframe,
        price: data.price,
        volume: data.volume,
        indicators: JSON.stringify(data.indicators, null, 2),
      });

      return result;
    } catch (error) {
      logger.error(`Error summarizing market data: ${error instanceof Error ? error.message : String(error)}`);
      return `Failed to summarize market data: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Analyze trade performance
   */
  public async analyzeTradePerformance(
    trades: {
      symbol: string;
      entryPrice: number;
      exitPrice: number;
      side: 'buy' | 'sell';
      profit: number;
      profitPercentage: number;
      duration: string;
      strategy: string;
    }[]
  ): Promise<{ summary: string; recommendations: string[] }> {
    try {
      const parser = StructuredOutputParser.fromZodSchema(
        z.object({
          summary: z.string(),
          recommendations: z.array(z.string()),
        })
      );

      const prompt = ChatPromptTemplate.fromTemplate(`
        Analyze the following trading performance data and provide insights and recommendations:
        
        Trades:
        {trades}
        
        Provide a concise performance summary and actionable recommendations to improve results.
        
        {format_instructions}
      `);

      const chain = RunnableSequence.from([
        prompt,
        this.anthropicModel,
        parser,
      ]);

      const result = await chain.invoke({
        trades: JSON.stringify(trades, null, 2),
        format_instructions: parser.getFormatInstructions(),
      });

      return result;
    } catch (error) {
      logger.error(`Error analyzing trade performance: ${error instanceof Error ? error.message : String(error)}`);
      return {
        summary: `Error analyzing trade performance: ${error instanceof Error ? error.message : String(error)}`,
        recommendations: [],
      };
    }
  }
}

// Export singleton instance
export const langchainService = LangChainService.getInstance();
