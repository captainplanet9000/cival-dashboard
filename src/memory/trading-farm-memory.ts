import { CogneeClient, CogneeMemoryItem } from './cognee-client';
import { GraphitiClient, GraphNode, GraphEdge } from './graphiti-client';
import { ElizaCommandService } from '../services/elizaos-command-service';

/**
 * Market entity interface
 */
export interface MarketEntity {
  symbol: string;
  exchange: string;
  properties: Record<string, any>;
}

/**
 * TradingFarmMemory - Combined memory system for trading agents
 * 
 * This class integrates the CogneeClient for episodic memory and GraphitiClient
 * for semantic knowledge graphs, providing a unified memory interface for trading agents.
 */
export class TradingFarmMemory {
  private cognee: CogneeClient;
  private graphiti: GraphitiClient;
  private elizaService: ElizaCommandService;
  private agentId: string;
  
  constructor(agentId: string) {
    this.agentId = agentId;
    this.cognee = new CogneeClient(agentId);
    this.graphiti = new GraphitiClient(agentId);
    this.elizaService = new ElizaCommandService();
  }
  
  /**
   * Store a trading observation in memory
   */
  async storeObservation(
    content: string,
    importance: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.cognee.storeMemory({
      content,
      type: 'observation',
      importance,
      metadata,
      expiresInDays: 30 // Trading observations expire after a month by default
    });
  }
  
  /**
   * Store a trading decision in memory
   */
  async storeDecision(
    content: string,
    importance: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.cognee.storeMemory({
      content,
      type: 'decision',
      importance,
      metadata
    });
  }
  
  /**
   * Store market feedback in memory
   */
  async storeFeedback(
    content: string,
    importance: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.cognee.storeMemory({
      content,
      type: 'feedback',
      importance,
      metadata
    });
  }
  
  /**
   * Create or update a market entity in the knowledge graph
   */
  async updateMarketEntity(entity: MarketEntity): Promise<GraphNode | null> {
    // Check if the entity already exists
    const entityId = `${entity.exchange}-${entity.symbol}`;
    const existingEntities = await this.graphiti.getNodesByType('market');
    
    const existing = existingEntities.find(node => 
      node.properties.exchange === entity.exchange && 
      node.properties.symbol === entity.symbol
    );
    
    if (existing) {
      // Update existing node
      // Note: Since GraphitiClient doesn't have an update method, we're creating a new one
      // In a real implementation, you would update the existing node
      return this.graphiti.createNode({
        label: entity.symbol,
        type: 'market',
        properties: {
          ...entity.properties,
          exchange: entity.exchange,
          symbol: entity.symbol,
          updated_at: new Date().toISOString()
        }
      });
    } else {
      // Create new node
      return this.graphiti.createNode({
        label: entity.symbol,
        type: 'market',
        properties: {
          ...entity.properties,
          exchange: entity.exchange,
          symbol: entity.symbol,
          created_at: new Date().toISOString()
        }
      });
    }
  }
  
  /**
   * Create a relationship between market entities
   */
  async createMarketRelationship(
    sourceSymbol: string,
    targetSymbol: string,
    relationshipType: string,
    properties: Record<string, any> = {}
  ): Promise<GraphEdge | null> {
    // Find source and target nodes
    const nodes = await this.graphiti.getNodesByType('market');
    
    const sourceNode = nodes.find(node => node.label === sourceSymbol);
    const targetNode = nodes.find(node => node.label === targetSymbol);
    
    if (!sourceNode || !targetNode) {
      console.error('Source or target market entity not found');
      return null;
    }
    
    // Create the relationship
    return this.graphiti.createEdge({
      source: sourceNode.id,
      target: targetNode.id,
      label: relationshipType,
      properties: {
        ...properties,
        created_at: new Date().toISOString()
      }
    });
  }
  
  /**
   * Find related markets based on a symbol
   */
  async findRelatedMarkets(symbol: string): Promise<MarketEntity[]> {
    const nodes = await this.graphiti.getNodesByType('market');
    const marketNode = nodes.find(node => node.label === symbol);
    
    if (!marketNode) {
      return [];
    }
    
    const connections = await this.graphiti.getConnectedNodes(marketNode.id);
    
    return connections
      .filter(conn => conn.node.type === 'market')
      .map(conn => ({
        symbol: conn.node.label,
        exchange: conn.node.properties.exchange,
        properties: {
          ...conn.node.properties,
          relationship: conn.edge.label,
          relationshipProperties: conn.edge.properties
        }
      }));
  }
  
  /**
   * Search trading memories by context
   */
  async searchTradingMemories(query: string, limit: number = 10): Promise<CogneeMemoryItem[]> {
    const results = await this.cognee.searchMemories({
      query,
      limit,
      recency: 'medium' // Balance between importance and recency
    });
    
    return results.map(item => ({
      id: item.id,
      content: item.content,
      type: item.type,
      importance: item.importance,
      metadata: item.metadata
    }));
  }
  
  /**
   * Get recent trading decisions
   */
  async getRecentDecisions(limit: number = 5): Promise<CogneeMemoryItem[]> {
    const decisions = await this.cognee.getMemoriesByType('decision', limit);
    
    return decisions.map(item => ({
      id: item.id,
      content: item.content,
      type: item.type,
      importance: item.importance,
      metadata: item.metadata
    }));
  }
  
  /**
   * Process ElizaOS command with memory context
   */
  async processCommand(command: string, context: Record<string, any> = {}): Promise<any> {
    // Retrieve relevant memories
    const relevantMemories = await this.searchTradingMemories(command, 5);
    
    // Add memory context
    const memoryContext = relevantMemories.map(mem => ({
      content: mem.content,
      type: mem.type,
      importance: mem.importance
    }));
    
    // Execute command with memory context
    return this.elizaService.executeCommand(
      command,
      'agent',
      this.agentId,
      undefined,
      {
        ...context,
        memories: memoryContext
      }
    );
  }
} 