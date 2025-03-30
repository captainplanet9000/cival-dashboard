import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { SplitSquareHorizontal } from 'lucide-react';

interface ConditionNodeData {
  label: string;
  parameters?: {
    conditionType?: 'comparison' | 'crossover' | 'threshold';
    comparisonOperator?: string;
    nodeColor?: string;
    isHighlighted?: boolean;
    [key: string]: any;
  };
}

const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeData>) => {
  const nodeColor = data.parameters?.nodeColor || 'default';
  const isHighlighted = data.parameters?.isHighlighted || false;
  const conditionType = data.parameters?.conditionType || 'comparison';
  
  // Background color based on node color and selection state
  let bgColor = 'bg-yellow-50 dark:bg-yellow-950';
  let borderColor = selected ? 'border-yellow-500' : 'border-yellow-200 dark:border-yellow-800';
  
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
  
  // Get operator symbol
  const getOperatorSymbol = (op: string) => {
    switch (op) {
      case 'greaterThan': return '>';
      case 'lessThan': return '<';
      case 'equals': return '=';
      case 'greaterThanOrEquals': return '>=';
      case 'lessThanOrEquals': return '<=';
      default: return op;
    }
  };
  
  // Render condition type specific content
  const renderConditionContent = () => {
    switch (conditionType) {
      case 'comparison':
        return (
          <div className="text-xs bg-background mt-2 px-2 py-1 rounded">
            {getOperatorSymbol(data.parameters?.comparisonOperator || 'greaterThan')}
            {data.parameters?.comparisonValue ? ` ${data.parameters.comparisonValue}` : ''}
          </div>
        );
      case 'crossover':
        return (
          <div className="text-xs bg-background mt-2 px-2 py-1 rounded">
            Crossover: {data.parameters?.crossoverDirection || 'Above'}
          </div>
        );
      case 'threshold':
        return (
          <div className="text-xs bg-background mt-2 px-2 py-1 rounded">
            Threshold: {data.parameters?.thresholdValue || '0'} 
            {data.parameters?.thresholdDirection && ` (${data.parameters.thresholdDirection})`}
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className={`${bgColor} ${borderColor} p-3 rounded-md border shadow-sm min-w-[150px]`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 border-2"
      />
      
      <div className="flex items-center">
        <SplitSquareHorizontal className="w-4 h-4 mr-2" />
        <div className="font-semibold">{data.label}</div>
      </div>
      
      <div className="text-xs text-muted-foreground mt-1">
        Type: {conditionType.charAt(0).toUpperCase() + conditionType.slice(1)}
      </div>
      
      {renderConditionContent()}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 border-2"
        id="a"
      />
      
      {/* Add a second output handle for conditional branching */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2"
        id="b"
        style={{ top: '50%' }}
      />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';

export default ConditionNode;
