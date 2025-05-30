'use client';

import React, { useRef, useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { MemoryItem, MemorySearchResult } from '../../repositories/memory-item-repository';
import { EnhancedMemoryService } from '../../services/enhanced-memory-service';

interface GraphMemoryViewProps {
  agentId: string;
  onMemorySelect?: (memory: MemoryItem) => void;
  searchResults?: MemorySearchResult[];
}

type Node = {
  id: string;
  label: string;
  type: string;
  size: number;
  color: string;
  memory?: MemoryItem;
};

type Link = {
  source: string;
  target: string;
  label?: string;
  color?: string;
  strength?: number;
};

type GraphData = {
  nodes: Node[];
  links: Link[];
};

export const GraphMemoryView: React.FC<GraphMemoryViewProps> = ({
  agentId,
  onMemorySelect,
  searchResults
}) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  
  // Graph ref
  const graphRef = useRef<any>();
  
  // Memory service
  const memoryService = new EnhancedMemoryService();
  
  // Load memory graph data
  useEffect(() => {
    async function loadMemoryGraph() {
      try {
        setLoading(true);
        setError(null);
        
        // If we have search results, use them to build the graph
        if (searchResults && searchResults.length > 0) {
          buildGraphFromSearchResults(searchResults);
          return;
        }
        
        // Otherwise, load memories from the repository
        const memories = await memoryService.getRecentMemories(agentId, 50);
        buildGraphFromMemories(memories);
      } catch (error: any) {
        console.error('Error loading memory graph:', error);
        setError(error.message || 'Failed to load memory graph');
        setGraphData({ nodes: [], links: [] });
      } finally {
        setLoading(false);
      }
    }
    
    loadMemoryGraph();
  }, [agentId, searchResults]);
  
  // Build graph from search results
  const buildGraphFromSearchResults = (results: MemorySearchResult[]) => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeMap = new Map<string, Node>();
    
    // Create central query node
    const queryNodeId = 'search-query';
    const queryNode: Node = {
      id: queryNodeId,
      label: 'Search Query',
      type: 'query',
      size: 15,
      color: '#2c3e50'
    };
    nodes.push(queryNode);
    nodeMap.set(queryNodeId, queryNode);
    
    // Create nodes for memories
    results.forEach(memory => {
      const node: Node = {
        id: memory.id,
        label: truncateText(memory.content, 30),
        type: memory.type,
        size: Math.max(5, memory.importance * 1.5),
        color: getTypeColor(memory.type),
        memory
      };
      
      nodes.push(node);
      nodeMap.set(memory.id, node);
      
      // Link to query node with strength based on relevance
      links.push({
        source: queryNodeId,
        target: memory.id,
        label: 'relevance',
        color: '#95a5a6',
        strength: memory.relevance_score
      });
    });
    
    // Find connections between memories
    findMemoryConnections(results, links);
    
    setGraphData({ nodes, links });
  };
  
  // Build graph from memories
  const buildGraphFromMemories = (memories: MemoryItem[]) => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeMap = new Map<string, Node>();
    
    // Create nodes for memories
    memories.forEach(memory => {
      const node: Node = {
        id: memory.id,
        label: truncateText(memory.content, 30),
        type: memory.type,
        size: Math.max(5, memory.importance * 1.5),
        color: getTypeColor(memory.type),
        memory
      };
      
      nodes.push(node);
      nodeMap.set(memory.id, node);
    });
    
    // Find connections between memories
    findMemoryConnections(memories, links);
    
    // Group similar memories by type
    groupByType(memories, links);
    
    setGraphData({ nodes, links });
  };
  
  // Find connections between memories
  const findMemoryConnections = (memories: MemoryItem[], links: Link[]) => {
    // Simple time-based connections
    memories.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    // Link sequential memories of the same type
    for (let i = 0; i < memories.length - 1; i++) {
      if (memories[i].type === memories[i + 1].type) {
        links.push({
          source: memories[i].id,
          target: memories[i + 1].id,
          label: 'sequence',
          color: '#bdc3c7'
        });
      }
    }
    
    // Link decisions to insights
    const decisions = memories.filter(m => m.type === 'decision');
    const insights = memories.filter(m => m.type === 'insight');
    
    decisions.forEach(decision => {
      // Find insights that might have led to this decision (created before it)
      const relatedInsights = insights.filter(insight => 
        new Date(insight.created_at).getTime() < new Date(decision.created_at).getTime() && 
        new Date(insight.created_at).getTime() > new Date(decision.created_at).getTime() - 24 * 60 * 60 * 1000 // Within 24 hours
      );
      
      relatedInsights.forEach(insight => {
        links.push({
          source: insight.id,
          target: decision.id,
          label: 'influenced',
          color: '#9b59b6'
        });
      });
    });
    
    // Find references in content
    memories.forEach(memory => {
      // Look for ID references in metadata
      if (memory.metadata && memory.metadata.references) {
        const references = Array.isArray(memory.metadata.references) 
          ? memory.metadata.references
          : [memory.metadata.references];
        
        references.forEach((refId: string) => {
          if (memories.some(m => m.id === refId)) {
            links.push({
              source: refId,
              target: memory.id,
              label: 'reference',
              color: '#3498db'
            });
          }
        });
      }
    });
  };
  
  // Group memories by type
  const groupByType = (memories: MemoryItem[], links: Link[]) => {
    const typeGroups = new Map<string, MemoryItem[]>();
    
    // Group memories by type
    memories.forEach(memory => {
      if (!typeGroups.has(memory.type)) {
        typeGroups.set(memory.type, []);
      }
      typeGroups.get(memory.type)!.push(memory);
    });
    
    // Create links between memories of same type
    typeGroups.forEach((typeMemories, type) => {
      for (let i = 0; i < typeMemories.length; i++) {
        for (let j = i + 1; j < typeMemories.length; j++) {
          // Create weak similarity links
          links.push({
            source: typeMemories[i].id,
            target: typeMemories[j].id,
            color: getTypeColor(type),
            strength: 0.1
          });
        }
      }
    });
  };
  
  // Handle node click
  const handleNodeClick = (node: Node) => {
    if (node.memory && onMemorySelect) {
      onMemorySelect(node.memory);
      setSelectedNode(node);
    }
  };
  
  // Handle node hover
  const handleNodeHover = (node: Node | null) => {
    setHoveredNode(node);
  };
  
  // Filter by type
  const filterByType = (type: string | null) => {
    setFilterType(type);
    
    if (graphRef.current) {
      if (type === null) {
        // Reset to show all nodes
        graphRef.current.graphData(graphData);
      } else {
        // Filter nodes by type
        const filteredNodes = graphData.nodes.filter(
          node => node.type === type || node.type === 'query'
        );
        const nodeIds = new Set(filteredNodes.map(node => node.id));
        
        // Keep links between filtered nodes
        const filteredLinks = graphData.links.filter(
          link => 
            nodeIds.has(typeof link.source === 'string' ? link.source : link.source.id) && 
            nodeIds.has(typeof link.target === 'string' ? link.target : link.target.id)
        );
        
        graphRef.current.graphData({ nodes: filteredNodes, links: filteredLinks });
      }
    }
  };
  
  // Get color for memory type
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'observation':
        return '#3498db';
      case 'decision':
        return '#e74c3c';
      case 'insight':
        return '#9b59b6';
      case 'feedback':
        return '#2ecc71';
      case 'fact':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };
  
  // Truncate text for labels
  const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Add method to extend memory service
  const getRecentMemories = async (agentId: string, limit: number): Promise<MemoryItem[]> => {
    return await memoryService.getRecentMemories(agentId, limit);
  };
  
  // Add to the memory service prototype if missing
  if (!memoryService.hasOwnProperty('getRecentMemories')) {
    // @ts-ignore
    memoryService.getRecentMemories = getRecentMemories;
  }
  
  return (
    <div className="graph-memory-view relative">
      <div className="memory-type-filters mb-4">
        <button
          onClick={() => filterByType(null)}
          className={`px-2 py-1 rounded mr-1 ${filterType === null ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
        >
          All
        </button>
        {['observation', 'decision', 'insight', 'feedback', 'fact'].map(type => (
          <button
            key={type}
            onClick={() => filterByType(type)}
            className={`px-2 py-1 rounded mr-1 capitalize ${
              filterType === type ? 'bg-gray-800 text-white' : 'bg-gray-200'
            }`}
            style={{
              borderLeft: `4px solid ${getTypeColor(type)}`
            }}
          >
            {type}
          </button>
        ))}
      </div>
      
      {loading ? (
        <div className="loading-indicator p-4 text-center">
          Loading memory graph...
        </div>
      ) : error ? (
        <div className="error-message p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      ) : (
        <div className="graph-container h-[600px] border rounded relative overflow-hidden">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel={node => (node as Node).label}
            nodeColor={node => (node as Node).color}
            nodeVal={node => (node as Node).size}
            linkColor={link => (link as Link).color || '#999'}
            linkWidth={link => ((link as Link).strength || 0.5) * 3}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            cooldownTicks={100}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={link => ((link as Link).strength || 0.5) * 2}
          />
          
          {hoveredNode && (
            <div className="tooltip absolute bg-white p-2 rounded shadow-md text-sm"
              style={{
                top: '10px',
                right: '10px'
              }}
            >
              <div className="font-bold">{hoveredNode.label}</div>
              <div className="text-xs text-gray-500 capitalize">{hoveredNode.type}</div>
            </div>
          )}
        </div>
      )}
      
      <div className="graph-legend mt-4 text-xs">
        <div className="text-gray-700 mb-1 font-semibold">Legend:</div>
        <div className="flex flex-wrap">
          {[
            { type: 'observation', label: 'Observation' },
            { type: 'decision', label: 'Decision' },
            { type: 'insight', label: 'Insight' },
            { type: 'feedback', label: 'Feedback' },
            { type: 'fact', label: 'Fact' }
          ].map(item => (
            <div key={item.type} className="mr-3 flex items-center">
              <span className="inline-block w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: getTypeColor(item.type) }}></span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 