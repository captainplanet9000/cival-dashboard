import { Pool } from 'pg';
import { OpenAIService } from '../ai/openai-service';

export class NeonPgVectorService {
  private pool: Pool;
  private openaiService: OpenAIService;
  
  constructor(connectionString: string, openaiApiKey: string) {
    this.pool = new Pool({
      connectionString
    });
    
    this.openaiService = new OpenAIService(openaiApiKey);
  }
  
  /**
   * Initialize vector database (create necessary tables and extensions)
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Create vector extension if it doesn't exist
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS vector;
      `);
      
      // Create trading strategies table with vector embedding
      await client.query(`
        CREATE TABLE IF NOT EXISTS trading_strategies (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          strategy_text TEXT NOT NULL,
          embedding vector(1536),
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Create market data table with vector embeddings
      await client.query(`
        CREATE TABLE IF NOT EXISTS market_conditions (
          id SERIAL PRIMARY KEY,
          symbol TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          price_data JSONB NOT NULL,
          technical_indicators JSONB,
          fundamental_data JSONB,
          news_data JSONB,
          embedding vector(1536),
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Create index for vector similarity search
      await client.query(`
        CREATE INDEX IF NOT EXISTS trading_strategies_embedding_idx 
        ON trading_strategies 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS market_conditions_embedding_idx 
        ON market_conditions 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);
      
    } catch (error) {
      console.error('Error initializing vector database:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Store a trading strategy with vector embedding
   */
  async storeStrategy(
    name: string, 
    description: string, 
    strategyText: string, 
    metadata: any = {}
  ): Promise<number> {
    // Create embedding for the strategy text using OpenAI
    const embeddingResponse = await this.getEmbedding(strategyText);
    
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `
        INSERT INTO trading_strategies (
          name, 
          description, 
          strategy_text, 
          embedding, 
          metadata,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id
        `,
        [name, description, strategyText, embeddingResponse, JSON.stringify(metadata)]
      );
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Error storing strategy:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Store market condition data with vector embedding
   */
  async storeMarketCondition(
    symbol: string,
    priceData: any,
    technicalIndicators: any = {},
    fundamentalData: any = {},
    newsData: any = {},
    metadata: any = {}
  ): Promise<number> {
    // Create a text representation of the market condition for embedding
    const marketConditionText = this.createMarketConditionText(
      symbol, 
      priceData, 
      technicalIndicators, 
      fundamentalData, 
      newsData
    );
    
    // Get embedding
    const embeddingResponse = await this.getEmbedding(marketConditionText);
    
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `
        INSERT INTO market_conditions (
          symbol,
          timestamp,
          price_data,
          technical_indicators,
          fundamental_data,
          news_data,
          embedding,
          metadata,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
        `,
        [
          symbol,
          new Date(),
          JSON.stringify(priceData),
          JSON.stringify(technicalIndicators),
          JSON.stringify(fundamentalData),
          JSON.stringify(newsData),
          embeddingResponse,
          JSON.stringify(metadata)
        ]
      );
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Error storing market condition:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Find similar trading strategies based on a market condition or strategy text
   */
  async findSimilarStrategies(
    searchText: string, 
    limit: number = 5
  ): Promise<any[]> {
    const embedding = await this.getEmbedding(searchText);
    
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `
        SELECT 
          id,
          name,
          description,
          strategy_text,
          metadata,
          created_at,
          1 - (embedding <=> $1) as similarity
        FROM 
          trading_strategies
        ORDER BY 
          embedding <=> $1
        LIMIT $2
        `,
        [embedding, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error finding similar strategies:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Find similar market conditions based on a market condition or text description
   */
  async findSimilarMarketConditions(
    searchText: string,
    limit: number = 5
  ): Promise<any[]> {
    const embedding = await this.getEmbedding(searchText);
    
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        `
        SELECT 
          id,
          symbol,
          timestamp,
          price_data,
          technical_indicators,
          fundamental_data,
          news_data,
          metadata,
          1 - (embedding <=> $1) as similarity
        FROM 
          market_conditions
        ORDER BY 
          embedding <=> $1
        LIMIT $2
        `,
        [embedding, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error finding similar market conditions:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Helper method to get embeddings from OpenAI
   */
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const embeddingResponse = await this.openaiService.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      
      return embeddingResponse.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to create a text representation of market conditions for embedding
   */
  private createMarketConditionText(
    symbol: string,
    priceData: any,
    technicalIndicators: any = {},
    fundamentalData: any = {},
    newsData: any = {}
  ): string {
    let text = `Symbol: ${symbol}\n`;
    
    // Add price data
    text += `Price: ${priceData.price || priceData.close}\n`;
    text += `Open: ${priceData.open}, High: ${priceData.high}, Low: ${priceData.low}, Close: ${priceData.close}\n`;
    text += `Volume: ${priceData.volume}\n`;
    
    // Add technical indicators
    if (Object.keys(technicalIndicators).length > 0) {
      text += `Technical Indicators:\n`;
      for (const [indicator, value] of Object.entries(technicalIndicators)) {
        text += `${indicator}: ${value}\n`;
      }
    }
    
    // Add fundamental data
    if (Object.keys(fundamentalData).length > 0) {
      text += `Fundamental Data:\n`;
      for (const [key, value] of Object.entries(fundamentalData)) {
        text += `${key}: ${value}\n`;
      }
    }
    
    // Add news data
    if (Object.keys(newsData).length > 0 && newsData.headlines) {
      text += `Recent News:\n`;
      for (const headline of newsData.headlines.slice(0, 5)) {
        text += `- ${headline}\n`;
      }
    }
    
    return text;
  }
} 