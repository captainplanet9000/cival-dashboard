/**
 * Goal Dependency Graph Component
 * Visualizes the dependencies between goals in a farm
 */
import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  Position,
  NodeMouseHandler
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, Edit, Link, Unlink } from 'lucide-react';
import { goalService } from '@/services/goal-service';
import { Goal } from '@/services/goal-service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Status Colors
const statusColors = {
  completed: 'bg-green-500',
  in_progress: 'bg-blue-500',
  not_started: 'bg-gray-300',
  waiting: 'bg-yellow-300',
  cancelled: 'bg-red-300'
};

// Goal Node Component
const GoalNode = ({ data }: { data: any }) => {
  const statusColor = statusColors[data.status as keyof typeof statusColors] || 'bg-gray-300';

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 min-w-[180px] max-w-[220px]">
      <div className={`h-2 rounded-t-lg ${statusColor}`} />
      <div className="p-3">
        <h5 className="text-sm font-semibold truncate" title={data.title}>
          {data.title}
        </h5>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {data.progress !== undefined ? `${Math.round(data.progress * 100)}%` : 'N/A'}
          </div>
          {data.actions && (
            <div className="flex items-center">
              {data.actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface GoalDependencyGraphProps {
  farmId: string;
  goals: Goal[];
  onAddDependency?: (sourceId: string, targetId: string) => Promise<void>;
  onRemoveDependency?: (sourceId: string, targetId: string) => Promise<void>;
  editable?: boolean;
  className?: string;
}

export const GoalDependencyGraph: React.FC<GoalDependencyGraphProps> = ({
  farmId,
  goals,
  onAddDependency,
  onRemoveDependency,
  editable = false,
  className = ''
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [sourceLinkNode, setSourceLinkNode] = useState<string | null>(null);

  const nodeTypes: NodeTypes = {
    goalNode: GoalNode
  };

  // Initialize the graph with goals
  useEffect(() => {
    if (!goals || goals.length === 0) {
      setLoading(false);
      return;
    }

    initializeGraph();
  }, [goals]);

  // Calculate layout for nodes and edges
  const initializeGraph = async () => {
    try {
      setLoading(true);

      // Create nodes from goals
      const graphNodes: Node[] = goals.map((goal, index) => {
        // Calculate position - attempt to create a grid layout
        // We'll position in rows of 3 items
        const row = Math.floor(index / 3);
        const col = index % 3;
        
        return {
          id: goal.id,
          type: 'goalNode',
          position: { x: col * 250 + 50, y: row * 150 + 50 },
          data: {
            ...goal,
            actions: editable ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLinkNodeClick(goal.id);
                      }}
                    >
                      {sourceLinkNode === goal.id ? <Unlink className="h-3 w-3" /> : <Link className="h-3 w-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {sourceLinkNode === goal.id ? 'Cancel link' : 'Create dependency link'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
      });

      // Create edges from dependencies
      const dependencyEdges: Edge[] = [];
      
      // For each goal, check if it has dependencies
      for (const goal of goals) {
        if (goal.dependencies && Array.isArray(goal.dependencies)) {
          goal.dependencies.forEach((dep: any) => {
            if (dep.goal_id) {
              dependencyEdges.push({
                id: `${goal.id}-${dep.goal_id}`,
                source: goal.id,
                target: dep.goal_id,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 15,
                  height: 15
                },
                style: { stroke: '#888', strokeWidth: 1.5 },
                animated: true,
                label: 'depends on'
              });
            }
          });
        }
      }

      setNodes(graphNodes);
      setEdges(dependencyEdges);
      setError(null);
    } catch (err) {
      console.error('Error initializing graph:', err);
      setError('Failed to load goal dependencies');
    } finally {
      setLoading(false);
    }
  };

  // Handle link node click
  const handleLinkNodeClick = (nodeId: string) => {
    if (!editable) return;

    if (sourceLinkNode === nodeId) {
      // If same node, cancel linking
      setSourceLinkNode(null);
      setIsLinkMode(false);
    } else if (!sourceLinkNode) {
      // Start linking
      setSourceLinkNode(nodeId);
      setIsLinkMode(true);
    } else {
      // Complete linking
      handleCreateDependency(sourceLinkNode, nodeId);
      setSourceLinkNode(null);
      setIsLinkMode(false);
    }
  };

  // Handle node click
  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    if (isLinkMode && sourceLinkNode && node.id !== sourceLinkNode) {
      handleCreateDependency(sourceLinkNode, node.id);
      setSourceLinkNode(null);
      setIsLinkMode(false);
    }
  }, [isLinkMode, sourceLinkNode]);

  // Create a dependency between two goals
  const handleCreateDependency = async (sourceId: string, targetId: string) => {
    if (!onAddDependency) return;
    
    try {
      await onAddDependency(sourceId, targetId);
      
      // Add edge to graph
      const newEdge: Edge = {
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15
        },
        style: { stroke: '#888', strokeWidth: 1.5 },
        animated: true,
        label: 'depends on'
      };
      
      setEdges((eds) => [...eds, newEdge]);
    } catch (error) {
      console.error('Error creating dependency:', error);
    }
  };

  // Remove a dependency
  const handleRemoveDependency = async (edge: Edge) => {
    if (!onRemoveDependency || !edge.source || !edge.target) return;
    
    try {
      await onRemoveDependency(edge.source, edge.target);
      
      // Remove edge from graph
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    } catch (error) {
      console.error('Error removing dependency:', error);
    }
  };

  // Handle edge click
  const onEdgeClick = useCallback((_, edge) => {
    if (editable && onRemoveDependency) {
      if (window.confirm('Remove this dependency?')) {
        handleRemoveDependency(edge);
      }
    }
  }, [editable, onRemoveDependency]);

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No goals found to display dependency graph</p>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Goal Dependencies</CardTitle>
          
          {editable && (
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={isLinkMode ? "secondary" : "outline"}
                      disabled={isLinkMode}
                      onClick={() => setIsLinkMode(!isLinkMode)}
                    >
                      <Link className="h-4 w-4 mr-1" />
                      Link Mode
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isLinkMode ? 'Currently in link mode' : 'Enter link mode to connect goals'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {isLinkMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsLinkMode(false);
                    setSourceLinkNode(null);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
        
        {isLinkMode && (
          <p className="text-xs text-gray-500 mt-1">
            {sourceLinkNode 
              ? "Select a target goal to create a dependency link" 
              : "Click a goal to start creating a dependency link"}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="py-2">
        <div style={{ height: 500 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            fitView
            attributionPosition="bottom-right"
          >
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
};
