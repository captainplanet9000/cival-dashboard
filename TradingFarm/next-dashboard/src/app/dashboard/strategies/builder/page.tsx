'use client';

import React from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  NodeTypes,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import StrategyHeader from '@/components/strategy-builder/StrategyHeader';
import NodePalette from '@/components/strategy-builder/NodePalette';
import PropertiesPanel from '@/components/strategy-builder/PropertiesPanel';
import StrategyValidation from '@/components/strategy-builder/StrategyValidation';
import BacktestPanel from '@/components/strategy-builder/BacktestPanel';
import StrategyCommandConsole from '@/components/eliza-integration/strategy-command-console';

// Custom node types
import IndicatorNode from '@/components/strategy-builder/nodes/IndicatorNode';
import EntryNode from '@/components/strategy-builder/nodes/EntryNode';
import ExitNode from '@/components/strategy-builder/nodes/ExitNode';
import FilterNode from '@/components/strategy-builder/nodes/FilterNode';
import ConditionNode from '@/components/strategy-builder/nodes/ConditionNode';
import { createStrategy } from '@/app/actions/strategy-actions';

// Define node types
const nodeTypes: NodeTypes = {
  indicator: IndicatorNode,
  entry: EntryNode,
  exit: ExitNode,
  filter: FilterNode,
  condition: ConditionNode,
};

// Initial nodes for new strategy
const initialNodes = [
  {
    id: 'entry-1',
    type: 'entry',
    position: { x: 250, y: 100 },
    data: { label: 'Entry Signal', description: 'Define entry conditions' }
  },
  {
    id: 'exit-1',
    type: 'exit',
    position: { x: 250, y: 300 },
    data: { label: 'Exit Signal', description: 'Define exit conditions' }
  }
];

export default function StrategyBuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = React.useState<any>(null);
  const [strategyName, setStrategyName] = React.useState('New Strategy');
  const [strategyDescription, setStrategyDescription] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('editor');
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);

  // Handle connections between nodes
  const onConnect = React.useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = React.useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNode(node);
    },
    []
  );

  // Handle node drag
  const onDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle node drop
  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (reactFlowWrapper.current && reactFlowInstance) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const type = event.dataTransfer.getData('application/reactflow');
        
        // Check if the dropped element is valid
        if (typeof type === 'undefined' || !type) {
          return;
        }

        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNode = {
          id: `${type}-${Date.now()}`,
          type,
          position,
          data: { 
            label: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
            parameters: {}
          },
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance, setNodes]
  );

  // Add new node from palette
  const addNode = React.useCallback(
    (type: string, data = {}) => {
      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position: {
          x: 250,
          y: 100 + nodes.length * 10
        },
        data: { 
          label: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
          ...data
        }
      };
      
      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, setNodes]
  );

  // Update node data
  const updateNodeData = React.useCallback(
    (id: string, data: any) => {
      setNodes(nodes.map(node => 
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ));
    },
    [nodes, setNodes]
  );

  // Delete selected node
  const deleteSelectedNode = React.useCallback(() => {
    if (selectedNode) {
      setNodes(nodes.filter(node => node.id !== selectedNode.id));
      setEdges(edges.filter(edge => 
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
    }
  }, [selectedNode, nodes, edges, setNodes, setEdges]);

  // Save strategy
  const saveStrategy = async () => {
    if (!strategyName) {
      toast.error('Please enter a strategy name');
      return;
    }

    setIsSaving(true);
    
    try {
      // Prepare strategy data
      const strategyData = {
        name: strategyName,
        description: strategyDescription || 'Created with Strategy Builder',
        type: 'visual-flow',
        version: '1.0',
        parameters: {},
        is_active: true,
        performance_metrics: {},
        content: JSON.stringify({
          nodes,
          edges
        })
      };
      
      // Save strategy to database
      const result = await createStrategy(strategyData);
      
      if (result.success) {
        toast.success('Strategy saved successfully');
      } else {
        toast.error(`Failed to save strategy: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Error saving strategy');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' && selectedNode) {
      deleteSelectedNode();
    }
  }, [deleteSelectedNode, selectedNode]);

  // Register keyboard event listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-full">
      <StrategyHeader 
        name={strategyName}
        setName={setStrategyName}
        description={strategyDescription}
        setDescription={setStrategyDescription}
        onSave={saveStrategy}
        isSaving={isSaving}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="mx-4">
          <TabsTrigger value="editor">Flow Editor</TabsTrigger>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="elizaos">ElizaOS AI Assistant</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="flex-1 flex">
          <Card className="w-64 border-r m-0 rounded-none">
            <NodePalette onAddNode={addNode} />
          </Card>
          
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              deleteKeyCode={null} // Disable default delete to handle with our custom function
              fitView
            >
              <Controls />
              <MiniMap nodeStrokeWidth={3} />
              <Background variant="dots" gap={12} size={1} />
              <Panel position="bottom-center">
                <div className="bg-card p-2 rounded-md shadow-md">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={deleteSelectedNode}
                    disabled={!selectedNode}
                  >
                    Delete Selected
                  </Button>
                </div>
              </Panel>
            </ReactFlow>
          </div>
          
          <Card className="w-80 border-l m-0 rounded-none">
            <PropertiesPanel 
              selectedNode={selectedNode}
              updateNodeData={updateNodeData}
            />
          </Card>
        </TabsContent>
        
        <TabsContent value="backtest">
          <BacktestPanel 
            strategyNodes={nodes}
            strategyEdges={edges}
            strategyName={strategyName}
          />
        </TabsContent>
        
        <TabsContent value="validation">
          <StrategyValidation 
            nodes={nodes}
            edges={edges}
          />
        </TabsContent>
        
        <TabsContent value="elizaos" className="p-6 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <div className="h-[600px]">
              <StrategyCommandConsole
                strategyName={strategyName}
                nodes={nodes}
                edges={edges}
              />
            </div>
            <div className="space-y-6">
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-2">AI Strategy Insights</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ElizaOS can analyze your strategy and provide insights. Try the following commands:
                </p>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setActiveTab('elizaos');
                      // This would typically dispatch a command to the ElizaOS system
                    }}
                  >
                    Analyze strategy performance
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setActiveTab('elizaos');
                      // This would typically dispatch a command to the ElizaOS system
                    }}
                  >
                    Optimize strategy parameters
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setActiveTab('elizaos');
                      // This would typically dispatch a command to the ElizaOS system
                    }}
                  >
                    Generate code implementation
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setActiveTab('elizaos');
                      // This would typically dispatch a command to the ElizaOS system
                    }}
                  >
                    Explain current strategy
                  </Button>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-2">ElizaOS Integration</h3>
                <p className="text-sm text-muted-foreground">
                  The ElizaOS AI system is integrated with your Trading Farm dashboard to provide intelligent strategy analysis, 
                  optimization suggestions, and automated execution capabilities. Use the command console to interact with ElizaOS
                  using natural language commands and queries about your trading strategies.
                </p>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
