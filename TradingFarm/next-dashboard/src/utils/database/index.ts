/**
 * Database service integration layer
 * Provides a unified API for Trading Farm dashboard to interact with both 
 * Neon PostgreSQL and Pinecone Vector Database
 */
import neonClient, {
  Farm, 
  Agent, 
  Strategy, 
  Trade, 
  Goal,
  WalletTransaction
} from './neon-client';

import pineconeClient, {
  StrategyKnowledge,
  AgentInstruction,
  ElizaCommand
} from './pinecone-client';

// Re-export types for easier imports throughout the application
export type {
  Farm, Agent, Strategy, Trade, Goal, WalletTransaction,
  StrategyKnowledge, AgentInstruction, ElizaCommand
};

/**
 * Unified database service class for Trading Farm dashboard
 * Manages connections to both Neon and Pinecone
 */
class TradingFarmDatabase {
  private initialized = false;
  
  // Initialize all database connections
  public async initialize(): Promise<void> {
    if (!this.initialized) {
      try {
        // Initialize Neon PostgreSQL
        await neonClient.initialize();
        
        // Initialize Pinecone
        await pineconeClient.initialize();
        
        // Set up schemas for Neon
        await neonClient.setupSchema();
        
        this.initialized = true;
        console.log('Trading Farm database systems initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Trading Farm database systems:', error);
        throw error;
      }
    }
  }
  
  // Farm Management
  
  public async createFarm(farm: Omit<Farm, 'id' | 'created_at'>): Promise<Farm> {
    return neonClient.createFarm(farm);
  }
  
  public async getFarms(): Promise<Farm[]> {
    return neonClient.getFarms();
  }
  
  public async getFarm(id: string): Promise<Farm | null> {
    return neonClient.getFarmById(id);
  }
  
  public async updateFarm(id: string, data: Partial<Farm>): Promise<Farm | null> {
    return neonClient.updateFarm(id, data);
  }
  
  public async deleteFarm(id: string): Promise<boolean> {
    return neonClient.deleteFarm(id);
  }
  
  // Strategy Knowledge Management
  
  public async addStrategyDocument(document: StrategyKnowledge): Promise<string> {
    return pineconeClient.indexStrategyDocument(document);
  }
  
  public async searchStrategyDocuments(query: string, farmId?: string): Promise<StrategyKnowledge[]> {
    const results = await pineconeClient.searchStrategyKnowledge(
      query,
      farmId ? { farm_id: farmId } : undefined
    );
    
    return results.map(result => result.metadata as StrategyKnowledge);
  }
  
  // Agent Instructions
  
  public async addAgentInstruction(instruction: AgentInstruction): Promise<string> {
    return pineconeClient.indexAgentInstruction(instruction);
  }
  
  public async getRelevantInstructions(context: string, agentId: string): Promise<AgentInstruction[]> {
    const results = await pineconeClient.searchAgentInstructions(context, agentId);
    return results.map(result => result.metadata as AgentInstruction);
  }
  
  // ElizaOS Command Intent Detection
  
  public async addElizaCommand(command: ElizaCommand): Promise<string> {
    return pineconeClient.indexElizaCommand(command);
  }
  
  public async detectCommandIntent(userInput: string): Promise<ElizaCommand | null> {
    const results = await pineconeClient.detectCommandIntent(userInput);
    
    if (results.length > 0 && typeof results[0]?.score === 'number' && results[0]?.score > 0.7) {
      // Return the highest scoring command if it meets the threshold
      return results[0]?.metadata as ElizaCommand;
    }
    
    return null;
  }
  
  // Context-Aware Message Bus Activity
  
  /**
   * Log inter-farm message activity and store in both structured and vector databases
   * This demonstrates the hybrid approach where structured data is stored in Neon
   * while semantic content is vectorized and stored in Pinecone
   */
  public async logMessageBusActivity(
    fromFarmId: string, 
    toFarmId: string,
    messageType: string, 
    content: string
  ): Promise<{id: string, vectorId: string}> {
    // First, store the structured message data in Neon PostgreSQL
    const client = await neonClient.getClient();
    
    try {
      // Create a message record in PostgreSQL
      const { rows } = await client.query(
        `INSERT INTO message_bus.messages
         (from_farm_id, to_farm_id, message_type, content) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [fromFarmId, toFarmId, messageType, content]
      );
      
      const messageId = rows[0].id;
      
      // Also index the message content in Pinecone for semantic search
      const strategyDoc: StrategyKnowledge = {
        id: `message-${messageId}`,
        title: `Message: ${messageType}`,
        content: content,
        category: 'message',
        source: `farm-${fromFarmId}`,
        created_at: new Date().toISOString(),
        farm_id: toFarmId
      };
      
      const vectorId = await pineconeClient.indexStrategyDocument(strategyDoc);
      
      return { id: messageId, vectorId };
    } finally {
      client.release();
    }
  }
  
  // Search across message bus activity
  public async searchMessageBusActivity(query: string): Promise<any[]> {
    // Use Pinecone's semantic search to find relevant messages
    const results = await pineconeClient.searchStrategyKnowledge(
      query,
      { category: 'message' }
    );
    
    // Get the detailed structured data from Neon
    if (results.length > 0) {
      const client = await neonClient.getClient();
      
      try {
        const ids = results.map(r => r.metadata?.id?.replace('message-', '') || '');
        
        const { rows } = await client.query(
          `SELECT m.*, 
            f1.name as from_farm_name, 
            f2.name as to_farm_name
           FROM message_bus.messages m
           JOIN farms.farms f1 ON m.from_farm_id = f1.id
           JOIN farms.farms f2 ON m.to_farm_id = f2.id
           WHERE m.id = ANY($1)`,
          [ids]
        );
        
        // Combine structured data with relevance scores
        return rows.map(row => {
          const result = results.find(r => r.metadata?.id === `message-${row.id}`);
          return {
            ...row,
            relevance: result ? result.score : 0
          };
        });
      } finally {
        client.release();
      }
    }
    
    return [];
  }
  
  // Shutdown all connections
  public async close(): Promise<void> {
    await neonClient.close();
  }
}

// Export singleton instance
const tradingFarmDb = new TradingFarmDatabase();
export default tradingFarmDb;
