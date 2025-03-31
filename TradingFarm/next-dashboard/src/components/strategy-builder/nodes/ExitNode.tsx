import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react';

interface ExitNodeData {
  label: string;
  description?: string;
  parameters?: {
    direction?: 'long' | 'short' | 'both';
    useStopLoss?: boolean;
    stopLossValue?: number;
    useTakeProfit?: boolean;
    takeProfitValue?: number;
    nodeColor?: string;
    isHighlighted?: boolean;
    [key: string]: any;
  };
}

const ExitNode = memo(({ data, selected }: NodeProps<ExitNodeData>) => {
  const nodeColor = data.parameters?.nodeColor || 'default';
  const isHighlighted = data.parameters?.isHighlighted || false;
  const direction = data.parameters?.direction || 'long';
  
  // Background color based on node color and selection state
  let bgColor = 'bg-red-50 dark:bg-red-950';
  let borderColor = selected ? 'border-red-500' : 'border-red-200 dark:border-red-800';
  
  if (nodeColor !== 'default') {
    switch (nodeColor) {
      case 'blue':
        bgColor = 'bg-blue-50 dark:bg-blue-950';
        borderColor = selected ? 'border-blue-500' : 'border-blue-200 dark:border-blue-800';
        break;
      case 'green':
        bgColor = 'bg-green-50 dark:bg-green-950';
        borderColor = selected ? 'border-green-500' : 'border-green-200 dark:border-green-800';
        break;
      case 'red':
        bgColor = 'bg-red-50 dark:bg-red-950';
        borderColor = selected ? 'border-red-500' : 'border-red-200 dark:border-red-800';
        break;
      case 'yellow':
        bgColor = 'bg-yellow-50 dark:bg-yellow-950';
        borderColor = selected ? 'border-yellow-500' : 'border-yellow-200 dark:border-yellow-800';
        break;
      case 'purple':
        bgColor = 'bg-purple-50 dark:bg-purple-950';
        borderColor = selected ? 'border-purple-500' : 'border-purple-200 dark:border-purple-800';
        break;
    }
  }
  
  // Additional highlight effect
  if (isHighlighted) {
    borderColor = 'border-primary';
    if (selected) {
      borderColor = 'border-primary border-2';
    }
  }
  
  // Direction icon
  let DirectionIcon = ArrowUp;
  if (direction === 'short') {
    DirectionIcon = ArrowDown;
  } else if (direction === 'both') {
    DirectionIcon = ArrowUpDown;
  }
  
  return (
    <div className={`${bgColor} ${borderColor} p-3 rounded-md border shadow-sm min-w-[180px]`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 border-2"
      />
      
      <div className="flex items-center">
        <X className="w-4 h-4 mr-2" />
        <div className="font-semibold">{data.label}</div>
      </div>
      
      {data.description && (
        <div className="text-xs text-muted-foreground mt-1">
          {data.description}
        </div>
      )}
      
      <div className="text-xs mt-2 space-y-1">
        {data.parameters?.useStopLoss && (
          <div className="px-2 py-1 bg-background rounded flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
            Stop Loss: {data.parameters.stopLossValue || 2}%
          </div>
        )}
        
        {data.parameters?.useTakeProfit && (
          <div className="px-2 py-1 bg-background rounded flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            Take Profit: {data.parameters.takeProfitValue || 5}%
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 border-2"
      />
    </div>
  );
});

ExitNode.displayName = 'ExitNode';

export default ExitNode;
