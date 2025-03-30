/**
 * Trading Farm Memory System
 * 
 * This module integrates the Cognee and Graphiti memory systems to provide
 * a comprehensive memory solution for trading agents.
 */

import { API_CONFIG } from '../services/api-config';
import { cogneeClient } from './cognee-client';
import { graphitiClient } from './graphiti-client';

/**
 * Trading Farm Memory System provides integrated memory capabilities for trading agents
 * by combining episodic (Cognee) and structured knowledge graph (Graphiti) systems.
 */
export class TradingFarmMemory {
  private static instance: TradingFarmMemory;
  private initialized: boolean = false;

  /**
   * Get the singleton instance of TradingFarmMemory
   */
  public static getInstance(): TradingFarmMemory {
    if (!TradingFarmMemory.instance) {
      TradingFarmMemory.instance = new TradingFarmMemory();
      
      // Auto-initialize if API keys are available from environment
      if (API_CONFIG.COGNEE_API_KEY && API_CONFIG.GRAPHITI_API_KEY) {
        TradingFarmMemory.instance.initialize(
          API_CONFIG.COGNEE_API_KEY,
          API_CONFIG.GRAPHITI_API_KEY
        );
      }
    }
    
    return TradingFarmMemory.instance;
  }

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Initialize the Trading Farm Memory System
   */
  public initialize(cogneeApiKey: string, graphitiApiKey: string): void {
    cogneeClient.initialize(cogneeApiKey);
    graphitiClient.initialize(graphitiApiKey);
    this.initialized = true;
    console.log('Trading Farm Memory System initialized');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Trading Farm Memory System not initialized. Call initialize() first.');
    }
  }

  /**
   * Store a memory using the appropriate memory system
   */
  public async storeMemory(agentId: string, content: string, type: string): Promise<string> {
    this.ensureInitialized();
    
    // Use Cognee for episodic and semantic memories
    if (type === 'episodic' || type === 'semantic') {
      return await cogneeClient.storeMemory(agentId, content, type as any);
    }
    
    // Default to Cognee
    return await cogneeClient.storeMemory(agentId, content, 'episodic');
  }

  /**
   * Create an agent-related node in the knowledge graph
   */
  public async createAgentNode(agentId: string, properties: Record<string, any>): Promise<any> {
    this.ensureInitialized();
    return await graphitiClient.createNode('Agent', {
      agent_id: agentId,
      ...properties
    });
  }

  /**
   * Get all memories for an agent from Cognee
   */
  public async getAgentMemories(agentId: string, type?: string): Promise<any[]> {
    this.ensureInitialized();
    return await cogneeClient.getMemories(agentId, type as any);
  }

  /**
   * Get related nodes from the knowledge graph
   */
  public async getRelatedNodes(nodeId: string, depth: number = 1): Promise<any[]> {
    this.ensureInitialized();
    return await graphitiClient.queryNeighbors(nodeId, { depthLimit: depth });
  }

  // Add more integrated methods here as needed
}

// Export singleton instance
export const tradingFarmMemory = TradingFarmMemory.getInstance();
