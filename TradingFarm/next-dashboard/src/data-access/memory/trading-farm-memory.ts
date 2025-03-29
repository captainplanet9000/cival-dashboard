/**
 * Trading Farm Memory System
 * 
 * This module integrates Cognee.ai agent memory and Graphiti knowledge graph
 * capabilities into the Trading Farm system, providing comprehensive memory
 * management for trading agents and relationship analysis for markets.
 */

import { getCogneeClient, CogneeMemoryItem, CogneeMemoryUpdate, AgentMemoryState, AgentMemoryAnalysis } from './cognee-client';
import { getGraphitiClient, GraphNode, GraphEdge, GraphQueryResult, MarketCorrelation, GraphPathAnalysis } from './graphiti-client';
import { getSupabaseClient } from '../lib/supabase-client';
import { SupabaseClient } from '@supabase/supabase-js';

// Combined memory types
export interface MemoryEvent {
  type: 'market_data' | 'order' | 'trade' | 'agent_message' | 'system_event';
  content: string;
  importance: number;
  metadata: Record<string, any>;
  timestamp: number;
}

export interface StrategyInsight {
  description: string;
  confidence: number;
  source: 'pattern' | 'correlation' | 'agent' | 'system';
  relatedMarkets: string[];
  suggestedAction?: string;
}

export interface MarketPattern {
  name: string;
  description: string;
  markets: string[];
  timeframe: string;
  strength: number;
  leadLag?: {
    leader: string;
    follower: string;
    lagAmount: string;
  };
}

// Main memory system
export class TradingFarmMemory {
  private static instance: TradingFarmMemory;
  private cogneeClient = getCogneeClient();
  private graphitiClient = getGraphitiClient();
  private supabase: SupabaseClient;
  private initialized: boolean = false;

  private constructor() {
    this.supabase = getSupabaseClient();
  }

  public static getInstance(): TradingFarmMemory {
    if (!TradingFarmMemory.instance) {
      TradingFarmMemory.instance = new TradingFarmMemory();
    }
    return TradingFarmMemory.instance;
  }

  public initialize(cogneeApiKey: string, graphitiApiKey: string): void {
    this.cogneeClient.initialize(cogneeApiKey);
    this.graphitiClient.initialize(graphitiApiKey);
    this.initialized = true;
    console.log('Trading Farm Memory System initialized');
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Trading Farm Memory not initialized. Call initialize() first.');
    }
  }

  // =========== Agent Memory Management ===========

  /**
   * Store a memory event for an agent
   */
  public async storeAgentMemory(
    agentId: number, 
    event: MemoryEvent
  ): Promise<CogneeMemoryItem> {
    this.ensureInitialized();
    
    // Convert to Cognee memory format
    const memoryUpdate: CogneeMemoryUpdate = {
      agentId,
      content: event.content,
      type: this.mapEventTypeToMemoryType(event.type),
      importance: event.importance,
      metadata: {
        ...event.metadata,
        event_type: event.type,
        event_timestamp: event.timestamp
      }
    };
    
    // Store in Cognee
    return this.cogneeClient.storeMemory(memoryUpdate);
  }
  
  /**
   * Retrieve relevant memories for an agent based on context
   */
  public async retrieveRelevantMemories(
    agentId: number, 
    context: string, 
    options: { limit?: number } = {}
  ): Promise<CogneeMemoryItem[]> {
    this.ensureInitialized();
    
    // Use Cognee to retrieve semantically relevant memories
    return this.cogneeClient.retrieveMemories(agentId, context, options);
  }
  
  /**
   * Get the current memory state for an agent
   */
  public async getAgentMemoryState(agentId: number): Promise<AgentMemoryState> {
    this.ensureInitialized();
    
    return this.cogneeClient.getAgentMemoryState(agentId);
  }
  
  /**
   * Analyze an agent's memory for patterns and insights
   */
  public async analyzeAgentMemory(agentId: number): Promise<AgentMemoryAnalysis> {
    this.ensureInitialized();
    
    return this.cogneeClient.analyzeAgentMemory(agentId);
  }
  
  /**
   * Trigger memory consolidation for an agent
   */
  public async consolidateAgentMemory(agentId: number): Promise<boolean> {
    this.ensureInitialized();
    
    return this.cogneeClient.consolidateMemories(agentId);
  }
  
  // =========== Market Knowledge & Relationships ===========
  
  /**
   * Create or update the knowledge graph for a farm
   */
  public async updateFarmGraph(farmId: number): Promise<GraphNode> {
    this.ensureInitialized();
    
    return this.graphitiClient.createFarmGraph(farmId);
  }
  
  /**
   * Find correlations between markets
   */
  public async getMarketCorrelations(timeframe: string = '1h'): Promise<MarketCorrelation[]> {
    this.ensureInitialized();
    
    return this.graphitiClient.findMarketCorrelations(timeframe);
  }
  
  /**
   * Analyze the performance of a farm using graph relationships
   */
  public async analyzeFarmPerformance(farmId: number): Promise<GraphPathAnalysis> {
    this.ensureInitialized();
    
    return this.graphitiClient.analyzeFarmPerformance(farmId);
  }
  
  /**
   * Find patterns across multiple markets
   */
  public async findMarketPatterns(): Promise<MarketPattern[]> {
    this.ensureInitialized();
    
    // Use Graphiti to find patterns between markets
    const patternAnalysis = await this.graphitiClient.findPatterns('Market');
    
    // Convert to our market pattern format
    return patternAnalysis.paths.map(path => {
      // Extract market nodes from the path
      const marketNodes = path.nodes.filter(node => node.type === 'Market');
      const patternNodes = path.nodes.filter(node => node.type === 'Pattern');
      
      // Extract lead-lag relationship if present
      let leadLag: MarketPattern['leadLag'] | undefined = undefined;
      const leadLagEdges = path.edges.filter(edge => 
        edge.properties.lag && edge.type === 'LEADS_TO'
      );
      
      if (leadLagEdges.length > 0) {
        const edge = leadLagEdges[0];
        const sourceNode = path.nodes.find(node => node.id === edge.sourceId);
        const targetNode = path.nodes.find(node => node.id === edge.targetId);
        
        if (sourceNode && targetNode && sourceNode.type === 'Market' && targetNode.type === 'Market') {
          leadLag = {
            leader: sourceNode.properties.symbol,
            follower: targetNode.properties.symbol,
            lagAmount: edge.properties.lag
          };
        }
      }
      
      return {
        name: patternNodes.length > 0 ? patternNodes[0].properties.name : 'Unknown Pattern',
        description: path.description,
        markets: marketNodes.map(node => node.properties.symbol),
        timeframe: path.edges[0]?.properties.timeframe || '1h',
        strength: path.significance,
        leadLag
      };
    });
  }
  
  /**
   * Generate trading insights based on memory and knowledge graph
   */
  public async generateInsights(
    farmId: number, 
    markets: string[] = []
  ): Promise<StrategyInsight[]> {
    this.ensureInitialized();
    
    // 1. Get data from Cognee and Graphiti
    const [farmAnalysis, correlations, farmGraph] = await Promise.all([
      this.graphitiClient.analyzeFarmPerformance(farmId),
      this.graphitiClient.findMarketCorrelations(),
      this.graphitiClient.queryGraph({ startNodeType: 'Farm', startNodeId: `farm_${farmId}` })
    ]);
    
    // 2. Get agent IDs from the farm
    const agentNodes = farmGraph.nodes.filter(node => node.type === 'Agent');
    const agentIds = agentNodes.map(node => node.properties.id);
    
    // 3. Get agent memory analyses
    const agentAnalyses = await Promise.all(
      agentIds.map(agentId => this.cogneeClient.analyzeAgentMemory(agentId))
    );
    
    // 4. Combine insights
    const insights: StrategyInsight[] = [];
    
    // From farm performance analysis
    farmAnalysis.paths.forEach(path => {
      insights.push({
        description: path.description,
        confidence: path.significance,
        source: 'pattern',
        relatedMarkets: path.nodes
          .filter(node => node.type === 'Market')
          .map(node => node.properties.symbol)
      });
    });
    
    // From market correlations
    correlations
      .filter(corr => 
        corr.correlationStrength > 0.7 &&
        (markets.length === 0 || 
         markets.includes(corr.market1) || 
         markets.includes(corr.market2))
      )
      .forEach(corr => {
        insights.push({
          description: corr.description,
          confidence: corr.correlationStrength,
          source: 'correlation',
          relatedMarkets: [corr.market1, corr.market2],
          suggestedAction: corr.leadLag 
            ? `Monitor ${corr.leadLag.leader} for signals to trade ${corr.leadLag.follower} with ${corr.leadLag.lagAmount} delay`
            : undefined
        });
      });
    
    // From agent memory analyses
    agentAnalyses.forEach(analysis => {
      analysis.strategySuggestions.forEach(suggestion => {
        insights.push({
          description: suggestion.description,
          confidence: suggestion.confidenceScore,
          source: 'agent',
          relatedMarkets: [], // Would need to extract from rationale
          suggestedAction: suggestion.rationale
        });
      });
      
      analysis.marketInsights.forEach(insight => {
        if (insight.strength > 0.75) {
          insights.push({
            description: insight.description,
            confidence: insight.strength,
            source: 'agent',
            relatedMarkets: this.extractMarketsFromString(insight.description),
            suggestedAction: undefined
          });
        }
      });
    });
    
    // Sort by confidence
    return insights.sort((a, b) => b.confidence - a.confidence);
  }
  
  // =========== Subscription and Event Handling ===========
  
  /**
   * Set up subscriptions to automatically update memory
   */
  public setupAutomaticMemoryUpdates(): void {
    this.ensureInitialized();
    
    // Subscribe to market data updates
    this.subscribeToMarketData();
    
    // Subscribe to agent messages
    this.subscribeToAgentMessages();
    
    // Subscribe to order and trade events
    this.subscribeToTrades();
  }
  
  private subscribeToMarketData(): void {
    this.supabase
      .channel('market_data_updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'market_data' }, 
        async (payload) => {
          // Find related agents that trade this market
          const { data: agents } = await this.supabase
            .from('agents')
            .select('id, farm_id')
            .eq('status', 'active');
            
          if (!agents) return;
          
          // For each agent, store this as a memory
          for (const agent of agents) {
            this.storeAgentMemory(agent.id, {
              type: 'market_data',
              content: `New ${payload.new.symbol} ${payload.new.timeframe} data: ${payload.new.close} at ${payload.new.timestamp}`,
              importance: 0.6,
              metadata: {
                market: payload.new.symbol,
                timeframe: payload.new.timeframe,
                close_price: payload.new.close,
                timestamp: payload.new.timestamp
              },
              timestamp: Date.now()
            });
          }
      })
      .subscribe();
  }
  
  private subscribeToAgentMessages(): void {
    this.supabase
      .channel('agent_messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'agent_messages' }, 
        async (payload) => {
          // Store as agent memory
          this.storeAgentMemory(payload.new.agent_id, {
            type: 'agent_message',
            content: payload.new.message,
            importance: payload.new.importance || 0.7,
            metadata: {
              message_type: payload.new.message_type,
              timestamp: payload.new.created_at
            },
            timestamp: Date.now()
          });
      })
      .subscribe();
  }
  
  private subscribeToTrades(): void {
    this.supabase
      .channel('trades')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'trades' }, 
        async (payload) => {
          // Get the agent that executed this trade
          const { data: order } = await this.supabase
            .from('orders')
            .select('agent_id')
            .eq('id', payload.new.order_id)
            .single();
            
          if (!order) return;
          
          // Store as agent memory
          this.storeAgentMemory(order.agent_id, {
            type: 'trade',
            content: `Executed trade: ${payload.new.side} ${payload.new.amount} ${payload.new.symbol} at ${payload.new.price}`,
            importance: 0.8, // Trades are important memories
            metadata: {
              symbol: payload.new.symbol,
              side: payload.new.side,
              amount: payload.new.amount,
              price: payload.new.price,
              timestamp: payload.new.created_at
            },
            timestamp: Date.now()
          });
          
          // After a trade, update the farm graph to reflect new relationships
          const { data: agent } = await this.supabase
            .from('agents')
            .select('farm_id')
            .eq('id', order.agent_id)
            .single();
            
          if (agent) {
            this.updateFarmGraph(agent.farm_id).catch(console.error);
          }
      })
      .subscribe();
  }
  
  // =========== Helper Functions ===========
  
  private mapEventTypeToMemoryType(eventType: MemoryEvent['type']): 'working' | 'episodic' | 'semantic' | 'procedural' {
    switch (eventType) {
      case 'market_data':
        return 'working'; // Current market data is working memory
      case 'order':
      case 'trade':
      case 'agent_message':
        return 'episodic'; // Actions are episodic memories
      case 'system_event':
        return 'procedural'; // System events form procedural memory
      default:
        return 'episodic';
    }
  }
  
  private extractMarketsFromString(text: string): string[] {
    // Simple regex pattern to extract market symbols like BTC/USD, ETH-USD, etc.
    const marketPattern = /\b([A-Z]{2,5})[\/\-]([A-Z]{2,5})\b/g;
    const matches = [...text.matchAll(marketPattern)];
    return matches.map(match => match[0]);
  }
}

// Export a singleton instance getter
export const getTradingFarmMemory = (): TradingFarmMemory => {
  return TradingFarmMemory.getInstance();
};
