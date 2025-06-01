/**
 * Trading Farm Memory System
 * 
 * This module integrates Cognee.ai agent memory and Graphiti knowledge graph
 * capabilities into the Trading Farm system, providing comprehensive memory
 * management for trading agents and relationship analysis for markets.
 */

import { getCogneeClient, CogneeMemoryItem, CogneeMemoryUpdate, AgentMemoryState, AgentMemoryAnalysis, MemoryType } from './cognee-client';
import { getGraphitiClient, GraphNode, GraphEdge, GraphQueryResult, MarketCorrelation, GraphPathAnalysis, NodeType, EdgeType } from './graphiti-client';
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

    // Set up subscriptions for automatic memory updates
    this.setupSubscriptions();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TradingFarmMemory not initialized. Call initialize() first.');
    }
  }

  // =========== Agent Memory Management ===========

  public async storeAgentMemory(
    agentId: number, 
    event: MemoryEvent
  ): Promise<CogneeMemoryItem> {
    this.ensureInitialized();

    const memoryItem: CogneeMemoryUpdate = {
      agentId: parseInt(agentId.toString()), // Convert to number
      type: event.type as MemoryType,
      content: event.content,
      metadata: {
        ...event.metadata,
        importance: event.importance,
        timestamp: event.timestamp
      }
    };

    return await this.cogneeClient.storeMemory(memoryItem);
  }

  public async retrieveRelevantMemories(
    agentId: number, 
    context: string
  ): Promise<CogneeMemoryItem[]> {
    this.ensureInitialized();
    return await this.cogneeClient.retrieveMemories(parseInt(agentId.toString()));
  }

  public async getAgentMemoryState(agentId: number): Promise<AgentMemoryState> {
    this.ensureInitialized();
    return await this.cogneeClient.getAgentMemoryState(parseInt(agentId.toString()));
  }

  public async analyzeAgentMemory(agentId: number): Promise<AgentMemoryAnalysis> {
    this.ensureInitialized();
    return await this.cogneeClient.analyzeAgentMemory(parseInt(agentId.toString()));
  }

  public async consolidateAgentMemory(agentId: number): Promise<boolean> {
    this.ensureInitialized();
    return await this.cogneeClient.consolidate(parseInt(agentId.toString()));
  }

  // =========== Market Knowledge & Relationships ===========

  public async updateFarmGraph(farmId: number): Promise<GraphNode> {
    this.ensureInitialized();
    return await this.graphitiClient.createFarmGraph(farmId);
  }

  public async getMarketCorrelations(timeframe: string = '1h'): Promise<MarketCorrelation[]> {
    this.ensureInitialized();
    return await this.graphitiClient.findMarketCorrelations(timeframe);
  }

  public async analyzeFarmPerformance(farmId: number): Promise<GraphPathAnalysis> {
    this.ensureInitialized();
    return await this.graphitiClient.findPatterns(NodeType.FARM);
  }

  public async findMarketPatterns(): Promise<MarketPattern[]> {
    this.ensureInitialized();

    const analysis = await this.graphitiClient.findPatterns(NodeType.MARKET);
    
    return analysis.paths.map(path => {
      const pattern: MarketPattern = {
        name: path.properties.name || 'Unknown Pattern',
        description: path.properties.description || '',
        markets: path.nodes
          .filter(node => node.type === NodeType.MARKET)
          .map(node => node.properties.symbol),
        timeframe: path.properties.timeframe || '1h',
        strength: path.score,
        leadLag: path.properties.leadLag
      };
      return pattern;
    });
  }

  public async generateInsights(farmId: number): Promise<StrategyInsight[]> {
    this.ensureInitialized();

    // Get farm performance analysis
    const farmAnalysis = await this.analyzeFarmPerformance(farmId);
    
    // Get market patterns
    const patterns = await this.findMarketPatterns();
    
    // Get market correlations
    const correlations = await this.getMarketCorrelations();

    const insights: StrategyInsight[] = [];

    // Add insights from farm analysis
    farmAnalysis.insights.forEach(insight => {
      insights.push({
        description: insight.description,
        confidence: insight.confidence,
        source: 'pattern',
        relatedMarkets: this.extractMarketsFromString(insight.description),
        suggestedAction: farmAnalysis.recommendations.find(
          r => r.description.toLowerCase().includes(insight.description.toLowerCase())
        )?.description
      });
    });

    // Add insights from patterns
    patterns.forEach(pattern => {
      if (pattern.strength >= 0.7) {
        insights.push({
          description: pattern.description,
          confidence: pattern.strength,
          source: 'pattern',
          relatedMarkets: pattern.markets,
          suggestedAction: pattern.leadLag 
            ? `Monitor ${pattern.leadLag.leader} for signals to trade ${pattern.leadLag.follower}`
            : undefined
        });
      }
    });

    // Add insights from correlations
    correlations.forEach(corr => {
      if (Math.abs(corr.strength) >= 0.7) {
        insights.push({
          description: `Strong ${corr.direction} correlation between ${corr.source} and ${corr.target}`,
          confidence: Math.abs(corr.strength),
          source: 'correlation',
          relatedMarkets: [corr.source, corr.target],
          suggestedAction: corr.lag
            ? `Consider ${corr.source} movements as leading indicator for ${corr.target}`
            : undefined
        });
      }
    });

    // Sort by confidence
    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  // =========== Subscription and Event Handling ===========

  private setupSubscriptions(): void {
    this.ensureInitialized();

    // Subscribe to market data updates
    this.supabase
      .channel('market_data')
      .on('postgres_changes', { 
        event: 'INSERT',
        schema: 'public',
        table: 'market_data'
      }, payload => {
        this.handleMarketDataUpdate(payload.new);
      })
      .subscribe();

    // Subscribe to agent messages
    this.supabase
      .channel('agent_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_messages'
      }, payload => {
        this.handleAgentMessage(payload.new);
      })
      .subscribe();

    // Subscribe to trades
    this.supabase
      .channel('trades')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trades'
      }, payload => {
        this.handleTradeEvent(payload.new);
      })
      .subscribe();
  }

  private async handleMarketDataUpdate(data: any): Promise<void> {
    const event: MemoryEvent = {
      type: 'market_data',
      content: `Market update for ${data.symbol}: ${data.price}`,
      importance: this.calculateImportance(data),
      metadata: data,
      timestamp: Date.now()
    };

    // Store in agent memories if relevant
    const { data: agents } = await this.supabase
      .from('agents')
      .select('id')
      .eq('market', data.symbol);

    if (agents) {
      for (const agent of agents) {
        await this.storeAgentMemory(agent.id, event);
      }
    }
  }

  private async handleAgentMessage(message: any): Promise<void> {
    const event: MemoryEvent = {
      type: 'agent_message',
      content: message.content,
      importance: message.importance || 0.5,
      metadata: message,
      timestamp: Date.now()
    };

    await this.storeAgentMemory(message.agent_id, event);
  }

  private async handleTradeEvent(trade: any): Promise<void> {
    const event: MemoryEvent = {
      type: 'trade',
      content: `${trade.side} ${trade.amount} ${trade.symbol} @ ${trade.price}`,
      importance: this.calculateImportance(trade),
      metadata: trade,
      timestamp: Date.now()
    };

    await this.storeAgentMemory(trade.agent_id, event);
  }

  private calculateImportance(data: any): number {
    // Simple importance calculation based on price movement and volume
    let importance = 0.5; // Base importance

    if (data.price_change_percent) {
      importance += Math.abs(data.price_change_percent) * 0.1;
    }

    if (data.volume_change_percent) {
      importance += Math.abs(data.volume_change_percent) * 0.05;
    }

    return Math.min(Math.max(importance, 0), 1); // Clamp between 0 and 1
  }

  private extractMarketsFromString(text: string): string[] {
    // Simple regex pattern to extract market symbols like BTC/USD, ETH-USD, etc.
    const marketPattern = /\b([A-Z]{2,5})[\/\-]([A-Z]{2,5})\b/g;
    const matches = text.match(marketPattern) || [];
    return Array.from(new Set(matches)); // Remove duplicates using Array.from
  }
}

// Export singleton instance getter
export const getTradingFarmMemory = TradingFarmMemory.getInstance;
