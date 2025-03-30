'use client';

import { useState, useCallback, useRef } from 'react';
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
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [strategyName, setStrategyName] = useState('New Strategy');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Handle connections between nodes
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNode(node);
    },
    []
  );

  // Handle node drag
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle node drop
  const onDrop = useCallback(
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
  const addNode = useCallback(
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
  const updateNodeData = useCallback(
    (id: string, data: any) => {
      setNodes(nodes.map(node => 
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ));
    },
    [nodes, setNodes]
  );

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
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
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' && selectedNode) {
      deleteSelectedNode();
    }
  }, [deleteSelectedNode, selectedNode]);

  // Register keyboard event listener
  useState(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

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
      </Tabs>
    </div>
  );
}
