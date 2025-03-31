import { supabase } from '../integrations/supabase/client';

/**
 * Knowledge graph node interface
 */
export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Knowledge graph edge interface
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  properties: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Graph query parameters
 */
export interface GraphQueryParams {
  nodeTypes?: string[];
  edgeLabels?: string[];
  sourceNodeId?: string;
  targetNodeId?: string;
  limit?: number;
  offset?: number;
}

/**
 * GraphitiClient - Knowledge graph management for intelligent agents
 * 
 * This client provides a high-level interface for working with knowledge graphs,
 * including creating and querying relationships between entities.
 */
export class GraphitiClient {
  private agentId: string;
  
  constructor(agentId: string) {
    this.agentId = agentId;
  }
  
  /**
   * Create a new node in the knowledge graph
   */
  async createNode(node: Omit<GraphNode, 'id' | 'created_at' | 'updated_at'>): Promise<GraphNode | null> {
    const { data, error } = await supabase
      .from('knowledge_graph_nodes')
      .insert({
        agent_id: this.agentId,
        label: node.label,
        type: node.type,
        properties: node.properties
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating knowledge graph node:', error);
      return null;
    }
    
    return data as GraphNode;
  }
  
  /**
   * Create a new edge between nodes
   */
  async createEdge(edge: Omit<GraphEdge, 'id' | 'created_at' | 'updated_at'>): Promise<GraphEdge | null> {
    const { data, error } = await supabase
      .from('knowledge_graph_edges')
      .insert({
        agent_id: this.agentId,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        properties: edge.properties
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating knowledge graph edge:', error);
      return null;
    }
    
    return data as GraphEdge;
  }
  
  /**
   * Get nodes by type
   */
  async getNodesByType(type: string, limit: number = 50): Promise<GraphNode[]> {
    const { data, error } = await supabase
      .from('knowledge_graph_nodes')
      .select('*')
      .eq('agent_id', this.agentId)
      .eq('type', type)
      .limit(limit);
    
    if (error) {
      console.error('Error fetching knowledge graph nodes:', error);
      return [];
    }
    
    return data as GraphNode[];
  }
  
  /**
   * Get node by ID
   */
  async getNodeById(nodeId: string): Promise<GraphNode | null> {
    const { data, error } = await supabase
      .from('knowledge_graph_nodes')
      .select('*')
      .eq('id', nodeId)
      .single();
    
    if (error) {
      console.error('Error fetching knowledge graph node:', error);
      return null;
    }
    
    return data as GraphNode;
  }
  
  /**
   * Get edges by label
   */
  async getEdgesByLabel(label: string, limit: number = 50): Promise<GraphEdge[]> {
    const { data, error } = await supabase
      .from('knowledge_graph_edges')
      .select('*')
      .eq('agent_id', this.agentId)
      .eq('label', label)
      .limit(limit);
    
    if (error) {
      console.error('Error fetching knowledge graph edges:', error);
      return [];
    }
    
    return data as GraphEdge[];
  }
  
  /**
   * Get all nodes connected to a given node
   */
  async getConnectedNodes(nodeId: string): Promise<{ node: GraphNode, edge: GraphEdge }[]> {
    // Get outgoing edges first
    const { data: outgoingEdges, error: outgoingError } = await supabase
      .from('knowledge_graph_edges')
      .select('*')
      .eq('source', nodeId);
    
    if (outgoingError) {
      console.error('Error fetching outgoing edges:', outgoingError);
      return [];
    }
    
    // Get incoming edges
    const { data: incomingEdges, error: incomingError } = await supabase
      .from('knowledge_graph_edges')
      .select('*')
      .eq('target', nodeId);
    
    if (incomingError) {
      console.error('Error fetching incoming edges:', incomingError);
      return [];
    }
    
    const allEdges = [...outgoingEdges, ...incomingEdges];
    const connectedNodeIds = new Set<string>();
    
    // Collect all connected node IDs
    for (const edge of allEdges) {
      if (edge.source !== nodeId) {
        connectedNodeIds.add(edge.source);
      }
      if (edge.target !== nodeId) {
        connectedNodeIds.add(edge.target);
      }
    }
    
    // Fetch all connected nodes in a single query
    const nodeIdsArray = Array.from(connectedNodeIds);
    if (nodeIdsArray.length === 0) {
      return [];
    }
    
    const { data: nodes, error: nodesError } = await supabase
      .from('knowledge_graph_nodes')
      .select('*')
      .in('id', nodeIdsArray);
    
    if (nodesError) {
      console.error('Error fetching connected nodes:', nodesError);
      return [];
    }
    
    // Map nodes to their IDs for easy lookup
    const nodeMap = new Map<string, GraphNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }
    
    // Build the result
    const result: { node: GraphNode, edge: GraphEdge }[] = [];
    
    for (const edge of allEdges) {
      const connectedNodeId = edge.source === nodeId ? edge.target : edge.source;
      const connectedNode = nodeMap.get(connectedNodeId);
      
      if (connectedNode) {
        result.push({
          node: connectedNode,
          edge
        });
      }
    }
    
    return result;
  }
  
  /**
   * Delete a node and all its connected edges
   */
  async deleteNode(nodeId: string): Promise<boolean> {
    // Delete all edges connected to the node
    const { error: edgesError } = await supabase
      .from('knowledge_graph_edges')
      .delete()
      .or(`source.eq.${nodeId},target.eq.${nodeId}`);
    
    if (edgesError) {
      console.error('Error deleting connected edges:', edgesError);
      return false;
    }
    
    // Delete the node
    const { error: nodeError } = await supabase
      .from('knowledge_graph_nodes')
      .delete()
      .eq('id', nodeId);
    
    if (nodeError) {
      console.error('Error deleting node:', nodeError);
      return false;
    }
    
    return true;
  }
  
  /**
   * Find path between two nodes
   */
  async findPath(sourceId: string, targetId: string, maxDepth: number = 3): Promise<GraphEdge[] | null> {
    // This is a simple implementation - in a real application, 
    // a more sophisticated graph traversal algorithm would be used
    
    const visited = new Set<string>();
    const queue: { nodeId: string, path: GraphEdge[] }[] = [{ nodeId: sourceId, path: [] }];
    
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      
      if (path.length > maxDepth) {
        continue;
      }
      
      if (nodeId === targetId) {
        return path;
      }
      
      if (visited.has(nodeId)) {
        continue;
      }
      
      visited.add(nodeId);
      
      // Get all edges from the current node
      const { data: outgoingEdges, error: outgoingError } = await supabase
        .from('knowledge_graph_edges')
        .select('*')
        .eq('source', nodeId);
      
      if (outgoingError) {
        console.error('Error fetching outgoing edges:', outgoingError);
        continue;
      }
      
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          queue.push({
            nodeId: edge.target,
            path: [...path, edge]
          });
        }
      }
    }
    
    return null; // No path found
  }
} 