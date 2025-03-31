'use client';

import React from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NodePaletteProps {
  onAddNode: (type: string, data?: any) => void;
}

// Node type definitions with descriptions
const nodeCategories = [
  {
    id: 'signals',
    name: 'Signals',
    nodes: [
      { type: 'entry', label: 'Entry Signal', description: 'Define when to enter a position' },
      { type: 'exit', label: 'Exit Signal', description: 'Define when to exit a position' },
      { type: 'condition', label: 'Condition', description: 'Add conditional logic to your strategy' }
    ]
  },
  {
    id: 'indicators',
    name: 'Indicators',
    nodes: [
      { type: 'indicator', label: 'Moving Average', description: 'Simple Moving Average (SMA)', data: { indicator: 'sma' } },
      { type: 'indicator', label: 'EMA', description: 'Exponential Moving Average', data: { indicator: 'ema' } },
      { type: 'indicator', label: 'MACD', description: 'Moving Average Convergence Divergence', data: { indicator: 'macd' } },
      { type: 'indicator', label: 'RSI', description: 'Relative Strength Index', data: { indicator: 'rsi' } },
      { type: 'indicator', label: 'Bollinger Bands', description: 'Bollinger Bands volatility indicator', data: { indicator: 'bbands' } },
      { type: 'indicator', label: 'Stochastic', description: 'Stochastic Oscillator', data: { indicator: 'stoch' } },
      { type: 'indicator', label: 'ATR', description: 'Average True Range', data: { indicator: 'atr' } }
    ]
  },
  {
    id: 'filters',
    name: 'Filters',
    nodes: [
      { type: 'filter', label: 'Time Filter', description: 'Filter based on time of day', data: { filter: 'time' } },
      { type: 'filter', label: 'Volume Filter', description: 'Filter based on volume thresholds', data: { filter: 'volume' } },
      { type: 'filter', label: 'Price Filter', description: 'Filter based on price levels', data: { filter: 'price' } },
      { type: 'filter', label: 'Volatility Filter', description: 'Filter based on volatility', data: { filter: 'volatility' } }
    ]
  }
];

const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  // Initialize drag start handler
  const onDragStart = (event: React.DragEvent, nodeType: string, nodeData?: any) => {
    // Set the node type as drag data
    event.dataTransfer.setData('application/reactflow', nodeType);
    
    // Store additional node data if provided
    if (nodeData) {
      event.dataTransfer.setData('application/node-data', JSON.stringify(nodeData));
    }
    
    // Set drag effect
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle node click (alternative to drag)
  const handleNodeClick = (nodeType: string, nodeData?: any) => {
    onAddNode(nodeType, nodeData);
  };

  return (
    <div className="h-full">
      <CardHeader className="px-4 py-3 border-b">
        <CardTitle className="text-lg">Node Palette</CardTitle>
      </CardHeader>
      <Tabs defaultValue="signals" className="h-[calc(100%-65px)]">
        <TabsList className="w-full grid grid-cols-3">
          {nodeCategories.map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {nodeCategories.map(category => (
          <TabsContent 
            key={category.id} 
            value={category.id} 
            className="h-full overflow-y-auto p-0"
          >
            <CardContent className="p-3 space-y-1.5">
              <TooltipProvider>
                {category.nodes.map((node, index) => (
                  <Tooltip key={`${node.type}-${index}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="cursor-grab border border-border bg-card rounded-md p-2 mb-2 hover:bg-accent hover:text-accent-foreground"
                        draggable
                        onDragStart={(event) => onDragStart(event, node.type, node.data)}
                        onClick={() => handleNodeClick(node.type, node.data)}
                      >
                        <div className="font-medium">{node.label}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{node.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </CardContent>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default NodePalette;
