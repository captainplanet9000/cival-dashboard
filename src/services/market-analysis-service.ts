import { GraphitiClient } from '../memory/graphiti-client';
import { supabase } from '../integrations/supabase/client';

/**
 * Market entity interface
 */
export interface MarketEntity {
  symbol: string;
  exchange: string;
  properties: Record<string, any>;
}

/**
 * Market correlation result
 */
export interface MarketCorrelation {
  source: string;
  target: string;
  correlation: number;
  timeframe: string;
  confidence: number;
  sampleSize: number;
  metadata: Record<string, any>;
}

/**
 * Market Sector interface
 */
export interface MarketSector {
  name: string;
  assets: MarketEntity[];
  marketShare: number;
  volatility: number;
  metadata: Record<string, any>;
}

/**
 * Market Cycle interface
 */
export interface MarketCycle {
  name: string;
  description: string;
  duration: string;
  currentPhase: string;
  assets: MarketEntity[];
  confidence: number;
  metadata: Record<string, any>;
}

/**
 * Market analysis service using knowledge graphs
 * 
 * This service provides advanced market analysis using the knowledge
 * graph to identify correlations, market sectors, and market cycles.
 */
export class MarketAnalysisService {
  private graphiti: GraphitiClient;
  private agentId: string;
  
  constructor(agentId: string) {
    this.agentId = agentId;
    this.graphiti = new GraphitiClient(agentId);
  }
  
  /**
   * Identify correlated assets based on a threshold
   * 
   * @param symbol Target symbol
   * @param threshold Correlation threshold (0-1)
   * @param positiveOnly Only include positive correlations
   * @returns List of correlated assets
   */
  async findCorrelatedAssets(
    symbol: string, 
    threshold: number = 0.7,
    positiveOnly: boolean = true
  ): Promise<MarketCorrelation[]> {
    // Check both outgoing and incoming edges for correlations
    const correlations: MarketCorrelation[] = [];
    
    // Get all nodes related to the symbol
    const nodes = await this.graphiti.getNodesByType('market');
    const marketNode = nodes.find(node => node.label === symbol);
    
    if (!marketNode) {
      return correlations;
    }
    
    // Get connections from the market node
    const connections = await this.graphiti.getConnectedNodes(marketNode.id);
    
    // Filter for correlation edges
    for (const connection of connections) {
      // Check if the edge is a correlation
      if (connection.edge.label === 'correlated_with' || connection.edge.label === 'inverse_correlation') {
        const correlation = connection.edge.properties.correlation;
        const isPositive = connection.edge.label === 'correlated_with';
        const correlationValue = isPositive ? correlation : -correlation;
        
        // Apply threshold filtering
        if (Math.abs(correlationValue) >= threshold && (correlationValue > 0 || !positiveOnly)) {
          correlations.push({
            source: symbol,
            target: connection.node.label,
            correlation: correlationValue,
            timeframe: connection.edge.properties.timeframe || '1d',
            confidence: connection.edge.properties.confidence || 0.8,
            sampleSize: connection.edge.properties.sample_size || 100,
            metadata: connection.edge.properties
          });
        }
      }
    }
    
    // Sort by correlation strength
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }
  
  /**
   * Map all market sectors
   * 
   * @returns Map of sectors to assets
   */
  async mapMarketSectors(): Promise<MarketSector[]> {
    const sectors: Record<string, MarketSector> = {};
    
    // Get all sector relationships from the knowledge graph
    const nodes = await this.graphiti.getNodesByType('market');
    
    // Get all sector relationship edges
    const sectorEdges = await this.getAllEdgesByLabel('sector_related');
    
    // Process each sector relationship
    for (const edge of sectorEdges) {
      const sourceNode = nodes.find(node => node.id === edge.source);
      const targetNode = nodes.find(node => node.id === edge.target);
      
      if (!sourceNode || !targetNode) continue;
      
      const sectorName = edge.properties.sector;
      if (!sectorName) continue;
      
      // Create sector if it doesn't exist
      if (!sectors[sectorName]) {
        sectors[sectorName] = {
          name: sectorName,
          assets: [],
          marketShare: edge.properties.market_share || 0,
          volatility: edge.properties.volatility || 0,
          metadata: edge.properties
        };
      }
      
      // Add both source and target assets if they're not already in the sector
      const sourceAsset = this.createMarketEntity(sourceNode);
      const targetAsset = this.createMarketEntity(targetNode);
      
      if (!sectors[sectorName].assets.some(a => a.symbol === sourceAsset.symbol)) {
        sectors[sectorName].assets.push(sourceAsset);
      }
      
      if (!sectors[sectorName].assets.some(a => a.symbol === targetAsset.symbol)) {
        sectors[sectorName].assets.push(targetAsset);
      }
    }
    
    return Object.values(sectors).sort((a, b) => b.marketShare - a.marketShare);
  }
  
  /**
   * Detect market cycles
   * 
   * @param timeframe Timeframe for cycle detection
   * @returns Detected market cycles
   */
  async detectMarketCycles(timeframe: string = '1d'): Promise<MarketCycle[]> {
    // This would typically use a more sophisticated algorithm
    // using the knowledge graph and market data
    
    // Get all cycle pattern edges from the graph
    const cycleEdges = await this.getAllEdgesByLabel('forms_cycle');
    
    // Process all cycles by group ID
    const cycleMap: Record<string, MarketCycle> = {};
    
    // Process each cycle edge
    for (const edge of cycleEdges) {
      const cycleId = edge.properties.cycle_id;
      if (!cycleId) continue;
      
      // Get the nodes involved
      const sourceNode = await this.graphiti.getNodeById(edge.source);
      const targetNode = await this.graphiti.getNodeById(edge.target);
      
      if (!sourceNode || !targetNode) continue;
      
      // Create or update the cycle
      if (!cycleMap[cycleId]) {
        cycleMap[cycleId] = {
          name: edge.properties.cycle_name || `Cycle ${cycleId}`,
          description: edge.properties.description || '',
          duration: edge.properties.duration || 'unknown',
          currentPhase: edge.properties.current_phase || 'unknown',
          assets: [],
          confidence: edge.properties.confidence || 0.5,
          metadata: edge.properties
        };
      }
      
      // Add the assets
      const sourceAsset = this.createMarketEntity(sourceNode);
      const targetAsset = this.createMarketEntity(targetNode);
      
      if (!cycleMap[cycleId].assets.some(a => a.symbol === sourceAsset.symbol)) {
        cycleMap[cycleId].assets.push(sourceAsset);
      }
      
      if (!cycleMap[cycleId].assets.some(a => a.symbol === targetAsset.symbol)) {
        cycleMap[cycleId].assets.push(targetAsset);
      }
    }
    
    return Object.values(cycleMap).sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Get the market relationship graph for visualization
   * 
   * @param centralSymbol Central symbol for the graph
   * @param maxDepth Maximum depth of relationships to include
   * @returns Graph data for visualization
   */
  async getMarketRelationshipGraph(
    centralSymbol: string,
    maxDepth: number = 2
  ): Promise<{
    nodes: any[],
    links: any[]
  }> {
    const graphData = {
      nodes: [],
      links: []
    };
    
    // Track visited nodes to avoid duplicates
    const visitedNodes = new Set<string>();
    const visitedLinks = new Set<string>();
    
    // Find the central node
    const allNodes = await this.graphiti.getNodesByType('market');
    const centralNode = allNodes.find(node => node.label === centralSymbol);
    
    if (!centralNode) {
      return graphData;
    }
    
    // Add the central node
    graphData.nodes.push({
      id: centralNode.id,
      label: centralNode.label,
      type: centralNode.type,
      properties: centralNode.properties,
      level: 0
    });
    visitedNodes.add(centralNode.id);
    
    // Helper function for BFS traversal
    const processNode = async (nodeId: string, level: number) => {
      if (level > maxDepth) return;
      
      // Get connected nodes
      const connections = await this.graphiti.getConnectedNodes(nodeId);
      
      for (const connection of connections) {
        // Add the connected node if not visited
        if (!visitedNodes.has(connection.node.id)) {
          graphData.nodes.push({
            id: connection.node.id,
            label: connection.node.label,
            type: connection.node.type,
            properties: connection.node.properties,
            level
          });
          visitedNodes.add(connection.node.id);
          
          // Recursively process this node if not at max depth
          if (level < maxDepth) {
            await processNode(connection.node.id, level + 1);
          }
        }
        
        // Add the edge if not visited
        const linkId = `${connection.edge.source}:${connection.edge.target}:${connection.edge.label}`;
        if (!visitedLinks.has(linkId)) {
          graphData.links.push({
            source: connection.edge.source,
            target: connection.edge.target,
            label: connection.edge.label,
            properties: connection.edge.properties
          });
          visitedLinks.add(linkId);
        }
      }
    };
    
    // Start BFS traversal from central node
    await processNode(centralNode.id, 1);
    
    return graphData;
  }
  
  /**
   * Get all edges by label
   */
  private async getAllEdgesByLabel(label: string): Promise<any[]> {
    // Get all edges with the specified label
    try {
      const { data: edges, error } = await supabase
        .from('knowledge_graph_edges')
        .select('*')
        .eq('agent_id', this.agentId)
        .eq('label', label);
      
      if (error) {
        console.error('Error fetching edges:', error);
        return [];
      }
      
      return edges;
    } catch (error) {
      console.error('Error in getAllEdgesByLabel:', error);
      return [];
    }
  }
  
  /**
   * Create a market entity from a graph node
   */
  private createMarketEntity(node: any): MarketEntity {
    return {
      symbol: node.label,
      exchange: node.properties.exchange || 'unknown',
      properties: node.properties || {}
    };
  }
} 