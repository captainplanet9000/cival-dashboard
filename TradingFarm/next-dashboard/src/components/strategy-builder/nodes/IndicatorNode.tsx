import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface IndicatorNodeData {
  label: string;
  indicator?: string;
  parameters?: Record<string, any>;
}

const IndicatorNode = memo(({ data, selected }: NodeProps<IndicatorNodeData>) => {
  const nodeColor = data.parameters?.nodeColor || 'default';
  const isHighlighted = data.parameters?.isHighlighted || false;
  
  // Background color based on node color and selection state
  let bgColor = 'bg-card';
  let borderColor = selected ? 'border-primary' : 'border-border';
  
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
  
  return (
    <div className={`${bgColor} ${borderColor} p-3 rounded-md border shadow-sm min-w-[150px]`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 border-2"
      />
      
      <div className="font-semibold">{data.label}</div>
      
      {data.indicator && (
        <div className="text-xs text-muted-foreground mt-1">
          Type: {data.indicator.toUpperCase()}
          {data.parameters?.period && ` (${data.parameters.period})`}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 border-2"
      />
    </div>
  );
});

IndicatorNode.displayName = 'IndicatorNode';

export default IndicatorNode;
