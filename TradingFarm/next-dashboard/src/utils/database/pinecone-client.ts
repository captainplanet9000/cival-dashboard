/**
 * Pinecone Vector Database client for Trading Farm system
 * Handles AI/ML features, semantic search, and vector embeddings for strategies and commands
 */
import { Pinecone } from '@pinecone-database/pinecone';
import type { RecordMetadata, ScoredPineconeRecord } from '@pinecone-database/pinecone';
import { PINECONE_CONFIG } from './config';

// Type definitions for vector data
export interface StrategyKnowledge {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  created_at: string;
  farm_id?: string;
}

export interface AgentInstruction {
  id: string;
  agent_id: string;
  instruction: string;
  context: string;
  priority: number;
  created_at: string;
}

export interface ElizaCommand {
  id: string;
  command: string;
  intent: string;
  parameters: Record<string, any>;
  example_phrases: string[];
  created_at: string;
}

// Generic type for metadata
type VectorMetadata<T> = RecordMetadata & T;

// Main Pinecone client class
class PineconeClient {
  private client: Pinecone | null = null;
  private apiKey: string;
  private environment: string;
  private initialized: boolean = false;
  
  constructor(apiKey?: string, environment?: string) {
    this.apiKey = apiKey || (PINECONE_CONFIG.apiKey as string) || '';
    this.environment = environment || PINECONE_CONFIG.environment;
    
    if (!this.apiKey) {
      console.error('Missing Pinecone API key');
    }
  }
  
  // Initialize client
  public async initialize(): Promise<void> {
    if (!this.initialized) {
      try {
        this.client = new Pinecone({
          apiKey: this.apiKey,
        });
        
        this.initialized = true;
        console.log('Successfully initialized Pinecone client');
        
        // Check and create necessary indexes
        await this.ensureIndexes();
      } catch (error) {
        console.error('Failed to initialize Pinecone client:', error);
        throw error;
      }
    }
  }
  
  // Ensure all required indexes exist
  private async ensureIndexes(): Promise<void> {
    if (!this.client) return;
    
    try {
      const indexes = await this.client.listIndexes();
      const indexNames = Array.isArray(indexes) 
        ? indexes.map((index: any) => index.name)
        : Object.keys(indexes).map(name => name);
      
      for (const [key, indexName] of Object.entries(PINECONE_CONFIG.indexes)) {
        if (!indexNames.includes(indexName as string)) {
          console.log(`Creating Pinecone index: ${indexName}`);
          
          // Create the index if it doesn't exist
          await this.client.createIndex({
            name: indexName as string,
            dimension: PINECONE_CONFIG.dimensions,
            metric: 'cosine',
            spec: {
              serverless: {
                cloud: 'aws',
                region: 'us-west-2'
              }
            }
          });
          
          console.log(`Created index: ${indexName}`);
        }
      }
    } catch (error) {
      console.error('Error ensuring Pinecone indexes exist:', error);
      throw error;
    }
  }
  
  // Get index by name
  private async getIndex(indexName: string) {
    if (!this.client) {
      await this.initialize();
    }
    
    return this.client!.index(indexName);
  }
  
  // Create embedding vectors - in a real app, you would use OpenAI or another model to generate embeddings
  // This is a placeholder for the actual embedding generation
  private async createEmbedding(text: string): Promise<number[]> {
    // This would normally call an embedding API like OpenAI
    // For now, we'll create a mock embedding of the right dimension
    
    // Create a deterministic but unique vector based on the text
    const mockVector = Array(PINECONE_CONFIG.dimensions).fill(0);
    const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    for (let i = 0; i < PINECONE_CONFIG.dimensions; i++) {
      // Generate a value between -1 and 1 based on the seed and position
      mockVector[i] = Math.sin(seed * (i + 1)) % 1;
    }
    
    return mockVector;
  }
  
  // Strategy Knowledge operations
  public async indexStrategyDocument(doc: StrategyKnowledge): Promise<string> {
    const index = await this.getIndex(PINECONE_CONFIG.indexes.strategyKnowledge);
    
    // Create embedding for the document
    const content = `${doc.title} ${doc.content}`;
    const embedding = await this.createEmbedding(content);
    
    // Generate a unique ID if not provided
    const id = doc.id || `strategy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Prepare metadata by converting complex objects to strings
    const metadata: Record<string, string | string[] | number | boolean> = {
      indexed_at: new Date().toISOString()
    };
    
    // Copy document fields to metadata, serializing complex objects
    for (const [key, value] of Object.entries(doc)) {
      if (Array.isArray(value) || typeof value === 'string' || 
          typeof value === 'number' || typeof value === 'boolean') {
        metadata[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        metadata[key] = JSON.stringify(value);
      }
    }
    
    // Index the document
    await index.upsert([{
      id,
      values: embedding,
      metadata
    }]);
    
    return id;
  }
  
  public async searchStrategyKnowledge(
    query: string, 
    filter?: Partial<StrategyKnowledge>,
    topK: number = 5
  ): Promise<Array<ScoredPineconeRecord<VectorMetadata<StrategyKnowledge>>>> {
    const index = await this.getIndex(PINECONE_CONFIG.indexes.strategyKnowledge);
    
    // Create embedding for the query
    const embedding = await this.createEmbedding(query);
    
    // Build filter if provided
    let filterCondition: Record<string, any> | undefined;
    if (filter) {
      filterCondition = {};
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined) {
          filterCondition[key] = { $eq: value };
        }
      }
    }
    
    // Query the index
    const results = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter: filterCondition
    });
    
    return results.matches as Array<ScoredPineconeRecord<VectorMetadata<StrategyKnowledge>>>;
  }
  
  public async deleteStrategyDocument(id: string): Promise<void> {
    const index = await this.getIndex(PINECONE_CONFIG.indexes.strategyKnowledge);
    await index.deleteOne(id);
  }
  
  // Agent Instruction operations
  public async indexAgentInstruction(instruction: AgentInstruction): Promise<string> {
    const index = await this.getIndex(PINECONE_CONFIG.indexes.agentInstructions);
    
    // Create embedding for the instruction
    const content = `${instruction.instruction} ${instruction.context}`;
    const embedding = await this.createEmbedding(content);
    
    // Generate a unique ID if not provided
    const id = instruction.id || `instruction-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Prepare metadata by converting complex objects to strings
    const metadata: Record<string, string | string[] | number | boolean> = {
      indexed_at: new Date().toISOString()
    };
    
    // Copy instruction fields to metadata, serializing complex objects
    for (const [key, value] of Object.entries(instruction)) {
      if (Array.isArray(value) || typeof value === 'string' || 
          typeof value === 'number' || typeof value === 'boolean') {
        metadata[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        metadata[key] = JSON.stringify(value);
      }
    }
    
    // Index the instruction
    await index.upsert([{
      id,
      values: embedding,
      metadata
    }]);
    
    return id;
  }
  
  public async searchAgentInstructions(
    query: string,
    agentId?: string,
    topK: number = 5
  ): Promise<Array<ScoredPineconeRecord<VectorMetadata<AgentInstruction>>>> {
    const index = await this.getIndex(PINECONE_CONFIG.indexes.agentInstructions);
    
    // Create embedding for the query
    const embedding = await this.createEmbedding(query);
    
    // Build filter if agent ID is provided
    let filter: Record<string, any> | undefined;
    if (agentId) {
      filter = { agent_id: { $eq: agentId } };
    }
    
    // Query the index
    const results = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter
    });
    
    return results.matches as Array<ScoredPineconeRecord<VectorMetadata<AgentInstruction>>>;
  }
  
  // ElizaOS Command operations
  public async indexElizaCommand(command: ElizaCommand): Promise<string> {
    const index = await this.getIndex(PINECONE_CONFIG.indexes.elizaCommands);
    
    // Create embedding for the command
    const content = `${command.command} ${command.intent} ${command.example_phrases.join(' ')}`;
    const embedding = await this.createEmbedding(content);
    
    // Generate a unique ID if not provided
    const id = command.id || `command-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Prepare metadata by converting complex objects to strings
    const metadata: Record<string, string | string[] | number | boolean> = {
      indexed_at: new Date().toISOString()
    };
    
    // Copy command fields to metadata, serializing complex objects
    for (const [key, value] of Object.entries(command)) {
      if (Array.isArray(value) || typeof value === 'string' || 
          typeof value === 'number' || typeof value === 'boolean') {
        metadata[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        metadata[key] = JSON.stringify(value);
      }
    }
    
    // Index the command
    await index.upsert([{
      id,
      values: embedding,
      metadata
    }]);
    
    return id;
  }
  
  public async detectCommandIntent(
    userInput: string,
    topK: number = 3
  ): Promise<Array<ScoredPineconeRecord<VectorMetadata<ElizaCommand>>>> {
    const index = await this.getIndex(PINECONE_CONFIG.indexes.elizaCommands);
    
    // Create embedding for the user input
    const embedding = await this.createEmbedding(userInput);
    
    // Query the index to find matching command intents
    const results = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true
    });
    
    return results.matches as Array<ScoredPineconeRecord<VectorMetadata<ElizaCommand>>>;
  }
  
  /**
   * Adds a document to the vector database
   * @param document - Document to add with text and metadata
   * @returns - Success status
   */
  public async addDocument(document: { 
    id: string;
    text: string;
    metadata: Record<string, any>;
  }): Promise<boolean> {
    if (!this.client) await this.initialize();
    
    try {
      // Determine the index based on metadata
      let indexName = PINECONE_CONFIG.indexes.elizaCommands;
      if (document.metadata.type === 'agent_instructions') {
        indexName = PINECONE_CONFIG.indexes.agentInstructions;
      } else if (document.metadata.type === 'strategy_knowledge') {
        indexName = PINECONE_CONFIG.indexes.strategyKnowledge;
      }
      
      const index = this.client!.Index(indexName);
      
      // Get embedding for the text
      const vector = await this.createEmbedding(document.text);
      
      // Prepare metadata by converting complex objects to strings
      const metadata: Record<string, string | string[] | number | boolean> = {
        indexed_at: new Date().toISOString()
      };
      
      // Copy document metadata, serializing complex objects
      for (const [key, value] of Object.entries(document.metadata)) {
        if (Array.isArray(value) || typeof value === 'string' || 
            typeof value === 'number' || typeof value === 'boolean') {
          metadata[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          metadata[key] = JSON.stringify(value);
        }
      }
      
      // Upsert vector
      await index.upsert([{
        id: document.id,
        values: vector,
        metadata
      }]);
      
      return true;
    } catch (error) {
      console.error('Failed to add document to vector database:', error);
      return false;
    }
  }
  
  /**
   * Deletes a document from the vector database
   * @param id - ID of the document to delete
   * @returns - Success status
   */
  public async deleteDocument(id: string): Promise<boolean> {
    if (!this.client) await this.initialize();
    
    try {
      // Try to delete from each index since we don't know which one contains the document
      const indexes = [
        PINECONE_CONFIG.indexes.agentInstructions,
        PINECONE_CONFIG.indexes.elizaCommands,
        PINECONE_CONFIG.indexes.strategyKnowledge
      ];
      
      for (const indexName of indexes) {
        try {
          const index = this.client!.Index(indexName);
          // Using the deleteMany method for single document deletion
          // If this doesn't work, we may need to use a different approach or check Pinecone version
          await index.deleteMany({ ids: [id] });
        } catch (error) {
          console.log(`Document not found in index ${indexName} or delete operation failed`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete document from vector database:', error);
      return false;
    }
  }
  
  /**
   * Adds a command to the vector database
   * @param command - Command to add
   * @returns - Success status
   */
  public async addCommand(command: ElizaCommand): Promise<boolean> {
    if (!this.client) await this.initialize();
    
    try {
      const index = this.client!.Index(PINECONE_CONFIG.indexes.elizaCommands);
      
      // Get embedding for command and examples
      const text = `Command: ${command.command}\nIntent: ${command.intent}\nExamples: ${command.example_phrases.join(', ')}`;
      const vector = await this.createEmbedding(text);
      
      // Prepare metadata by converting complex objects to strings
      const metadata: Record<string, string | string[] | number | boolean> = {
        indexed_at: new Date().toISOString()
      };
      
      // Copy command fields to metadata, serializing complex objects
      for (const [key, value] of Object.entries(command)) {
        if (Array.isArray(value) || typeof value === 'string' || 
            typeof value === 'number' || typeof value === 'boolean') {
          metadata[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          metadata[key] = JSON.stringify(value);
        }
      }
      
      // Upsert vector
      await index.upsert([{
        id: `command-${command.id}`,
        values: vector,
        metadata
      }]);
      
      return true;
    } catch (error) {
      console.error('Failed to add command to vector database:', error);
      return false;
    }
  }
  
  // Batch operations for efficient indexing
  public async batchIndexStrategyDocuments(
    docs: StrategyKnowledge[]
  ): Promise<string[]> {
    if (docs.length === 0) return [];
    
    const index = await this.getIndex(PINECONE_CONFIG.indexes.strategyKnowledge);
    const vectors = await Promise.all(
      docs.map(async (doc) => {
        const content = `${doc.title} ${doc.content}`;
        const embedding = await this.createEmbedding(content);
        const id = doc.id || `strategy-${Date.now()}-${Math.random().toString(36).substring(2, 10 + docs.indexOf(doc))}`;
        
        // Prepare metadata by converting complex objects to strings
        const metadata: Record<string, string | string[] | number | boolean> = {
          indexed_at: new Date().toISOString()
        };
        
        // Copy document fields to metadata, serializing complex objects
        for (const [key, value] of Object.entries(doc)) {
          if (Array.isArray(value) || typeof value === 'string' || 
              typeof value === 'number' || typeof value === 'boolean') {
            metadata[key] = value;
          } else if (typeof value === 'object' && value !== null) {
            metadata[key] = JSON.stringify(value);
          }
        }
        
        return {
          id,
          values: embedding,
          metadata
        };
      })
    );
    
    await index.upsert(vectors);
    return vectors.map(v => v.id);
  }
}

// Export singleton instance
export const pineconeClient = new PineconeClient();
export default pineconeClient;
