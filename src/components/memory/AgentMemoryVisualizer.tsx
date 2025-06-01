import React, { useState, useEffect } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import { TradingFarmMemory } from '../../memory/trading-farm-memory';
import { CogneeMemoryItem } from '../../memory/cognee-client';
import { GraphNode, GraphEdge } from '../../memory/graphiti-client';

interface MemoryVisualizerProps {
  agentId: string;
  width?: number;
  height?: number;
}

interface GraphData {
  nodes: {
    id: string;
    label: string;
    type: string;
    color: string;
    size: number;
    properties?: Record<string, any>;
  }[];
  links: {
    source: string;
    target: string;
    label: string;
    color: string;
    properties?: Record<string, any>;
  }[];
}

interface MemoryNodeData {
  id: string;
  content: string;
  type: string;
  importance: number;
  timestamp: string;
}

const AgentMemoryVisualizer: React.FC<MemoryVisualizerProps> = ({
  agentId,
  width = 800,
  height = 600,
}) => {
  const [memorySystem, setMemorySystem] = useState<TradingFarmMemory | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [memories, setMemories] = useState<MemoryNodeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Initialize the memory system
  useEffect(() => {
    const memory = new TradingFarmMemory(agentId);
    setMemorySystem(memory);
  }, [agentId]);

  // Load market knowledge graph
  useEffect(() => {
    if (!memorySystem) return;

    const loadKnowledgeGraph = async () => {
      try {
        setLoading(true);
        
        // Get BTC/USD as a starting point
        const btcMarketEntities = await memorySystem.findRelatedMarkets('BTC/USD');
        
        // Start building the graph data
        const nodes: GraphData['nodes'] = [];
        const links: GraphData['links'] = [];
        const nodeMap = new Map<string, boolean>();
        
        // Add BTC/USD as the central node
        nodes.push({
          id: 'BTC/USD',
          label: 'BTC/USD',
          type: 'market',
          color: '#ff9900',
          size: 10
        });
        nodeMap.set('BTC/USD', true);
        
        // Add related markets and connections
        for (const market of btcMarketEntities) {
          // Add the related market node if not already in the graph
          if (!nodeMap.has(market.symbol)) {
            nodes.push({
              id: market.symbol,
              label: market.symbol,
              type: 'market',
              color: '#3498db',
              size: 8,
              properties: market.properties
            });
            nodeMap.set(market.symbol, true);
          }
          
          // Add the link between nodes
          links.push({
            source: 'BTC/USD',
            target: market.symbol,
            label: market.properties.relationship || 'related_to',
            color: getRelationshipColor(market.properties.relationship),
            properties: market.properties.relationshipProperties
          });
          
          // Find second-level connections
          const relatedToRelated = await memorySystem.findRelatedMarkets(market.symbol);
          
          for (const secondLevel of relatedToRelated) {
            if (secondLevel.symbol !== 'BTC/USD') {
              // Add the second-level node if not already in the graph
              if (!nodeMap.has(secondLevel.symbol)) {
                nodes.push({
                  id: secondLevel.symbol,
                  label: secondLevel.symbol,
                  type: 'market',
                  color: '#2ecc71',
                  size: 6,
                  properties: secondLevel.properties
                });
                nodeMap.set(secondLevel.symbol, true);
              }
              
              // Add the link between first and second level nodes
              links.push({
                source: market.symbol,
                target: secondLevel.symbol,
                label: secondLevel.properties.relationship || 'related_to',
                color: getRelationshipColor(secondLevel.properties.relationship),
                properties: secondLevel.properties.relationshipProperties
              });
            }
          }
        }
        
        setGraphData({ nodes, links });
        
        // Load recent memories
        const recentDecisions = await memorySystem.getRecentDecisions(5);
        const tradeMemories = await memorySystem.searchTradingMemories('market trade', 5);
        
        const allMemories = [...recentDecisions, ...tradeMemories].map(mem => ({
          id: mem.id || `mem-${Date.now()}-${Math.random()}`,
          content: mem.content,
          type: mem.type,
          importance: mem.importance,
          timestamp: mem.metadata.timestamp || new Date().toISOString()
        }));
        
        setMemories(allMemories);
        setLoading(false);
      } catch (error) {
        console.error('Error loading knowledge graph:', error);
        setLoading(false);
      }
    };
    
    loadKnowledgeGraph();
  }, [memorySystem]);
  
  // Handle search
  const handleSearch = async () => {
    if (!memorySystem || !searchQuery) return;
    
    try {
      setLoading(true);
      const searchResults = await memorySystem.searchTradingMemories(searchQuery, 10);
      
      const searchMemories = searchResults.map(mem => ({
        id: mem.id || `mem-${Date.now()}-${Math.random()}`,
        content: mem.content,
        type: mem.type,
        importance: mem.importance,
        timestamp: mem.metadata.timestamp || new Date().toISOString()
      }));
      
      setMemories(searchMemories);
      setLoading(false);
    } catch (error) {
      console.error('Error searching memories:', error);
      setLoading(false);
    }
  };
  
  // Handle node click in the graph
  const handleNodeClick = async (node: any) => {
    setSelectedNode(node);
    
    if (!memorySystem) return;
    
    try {
      setLoading(true);
      // Search for memories related to the selected node
      const nodeMemories = await memorySystem.searchTradingMemories(node.label, 5);
      
      const relatedMemories = nodeMemories.map(mem => ({
        id: mem.id || `mem-${Date.now()}-${Math.random()}`,
        content: mem.content,
        type: mem.type,
        importance: mem.importance,
        timestamp: mem.metadata.timestamp || new Date().toISOString()
      }));
      
      setMemories(relatedMemories);
      setLoading(false);
    } catch (error) {
      console.error('Error loading related memories:', error);
      setLoading(false);
    }
  };
  
  // Helper function to get color for relationship types
  const getRelationshipColor = (relationship: string): string => {
    switch (relationship) {
      case 'correlated_with':
        return '#9b59b6';
      case 'inverse_correlation':
        return '#e74c3c';
      case 'sector_related':
        return '#1abc9c';
      case 'competitor':
        return '#f39c12';
      case 'market_cap_comparable':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };
  
  // Get color for memory types
  const getMemoryTypeColor = (type: string): string => {
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
  
  return (
    <div className="memory-visualizer">
      <div className="memory-controls">
        <h2>Agent Memory Visualizer</h2>
        
        <div className="search-container">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agent memories..."
            className="search-input"
          />
          <button onClick={handleSearch} className="search-button">
            Search
          </button>
        </div>
        
        {selectedNode && (
          <div className="selected-node">
            <h3>Selected: {selectedNode.label}</h3>
            <p>Type: {selectedNode.type}</p>
            {selectedNode.properties && (
              <div className="node-properties">
                <h4>Properties:</h4>
                <ul>
                  {Object.entries(selectedNode.properties).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {JSON.stringify(value)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="visualization-container">
        <div className="graph-container">
          <h3>Knowledge Graph</h3>
          {loading ? (
            <div className="loading">Loading knowledge graph...</div>
          ) : (
            <ForceGraph2D
              graphData={graphData}
              width={width * 0.6}
              height={height}
              nodeLabel="label"
              nodeColor={(node) => (node as any).color}
              nodeVal={(node) => (node as any).size}
              linkColor={(link) => (link as any).color}
              linkDirectionalArrowLength={3}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.25}
              onNodeClick={handleNodeClick}
              cooldownTicks={100}
              linkLabel={(link) => (link as any).label}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = (node as any).label;
                const fontSize = 12 / globalScale;
                const nodeSize = (node as any).size;
                
                ctx.fillStyle = (node as any).color;
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
                ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, node.x!, node.y!);
              }}
            />
          )}
        </div>
        
        <div className="memories-container">
          <h3>Agent Memories</h3>
          {loading ? (
            <div className="loading">Loading memories...</div>
          ) : (
            <div className="memories-list">
              {memories.length === 0 ? (
                <p>No memories found. Try searching for something else.</p>
              ) : (
                memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="memory-item"
                    style={{
                      borderLeft: `4px solid ${getMemoryTypeColor(memory.type)}`,
                    }}
                  >
                    <div className="memory-header">
                      <span className="memory-type">{memory.type}</span>
                      <span className="memory-importance">
                        Importance: {memory.importance}/10
                      </span>
                    </div>
                    <div className="memory-content">{memory.content}</div>
                    <div className="memory-timestamp">
                      {new Date(memory.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .memory-visualizer {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1rem;
        }
        
        .memory-controls {
          margin-bottom: 1rem;
        }
        
        .search-container {
          display: flex;
          margin-bottom: 1rem;
        }
        
        .search-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px 0 0 4px;
        }
        
        .search-button {
          padding: 0.5rem 1rem;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 0 4px 4px 0;
          cursor: pointer;
        }
        
        .visualization-container {
          display: flex;
          flex: 1;
          gap: 1rem;
        }
        
        .graph-container {
          flex: 3;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 1rem;
          overflow: hidden;
        }
        
        .memories-container {
          flex: 2;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 1rem;
          overflow-y: auto;
          max-height: ${height}px;
        }
        
        .memories-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .memory-item {
          background-color: #f8f9fa;
          border-radius: 4px;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .memory-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .memory-type {
          font-weight: bold;
          text-transform: capitalize;
        }
        
        .memory-importance {
          font-size: 0.9rem;
          color: #666;
        }
        
        .memory-content {
          margin-bottom: 0.5rem;
        }
        
        .memory-timestamp {
          font-size: 0.8rem;
          color: #888;
          text-align: right;
        }
        
        .selected-node {
          background-color: #f8f9fa;
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        
        .node-properties ul {
          margin: 0;
          padding-left: 1.5rem;
        }
        
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          font-style: italic;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default AgentMemoryVisualizer; 