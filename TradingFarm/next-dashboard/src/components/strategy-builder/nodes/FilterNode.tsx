import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Filter } from 'lucide-react';

interface FilterNodeData {
  label: string;
  filter?: string;
  parameters?: {
    nodeColor?: string;
    isHighlighted?: boolean;
    [key: string]: any;
  };
}

const FilterNode = memo(({ data, selected }: NodeProps<FilterNodeData>) => {
  const nodeColor = data.parameters?.nodeColor || 'default';
  const isHighlighted = data.parameters?.isHighlighted || false;
  const filterType = data.filter || data.parameters?.filter;
  
  // Background color based on node color and selection state
  let bgColor = 'bg-blue-50 dark:bg-blue-950';
  let borderColor = selected ? 'border-blue-500' : 'border-blue-200 dark:border-blue-800';
  
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
  
  // Render filter specific content based on type
  const renderFilterContent = () => {
    if (!filterType) return null;
    
    switch (filterType) {
      case 'time':
        return (
          <div className="text-xs bg-background mt-2 px-2 py-1 rounded">
            {data.parameters?.startTime || '09:30'} - {data.parameters?.endTime || '16:00'}
            {data.parameters?.excludeWeekends !== false && ' (Excl. Weekends)'}
          </div>
        );
      case 'volume':
        return (
          <div className="text-xs bg-background mt-2 px-2 py-1 rounded">
            Min Vol: {data.parameters?.minVolume || 1000}
            {data.parameters?.relativeVolume && `, Rel: ${data.parameters.relativeVolume}x`}
          </div>
        );
      case 'price':
        return (
          <div className="text-xs bg-background mt-2 px-2 py-1 rounded">
            Price: {data.parameters?.minPrice || 1} - {data.parameters?.maxPrice || 1000}
          </div>
        );
      case 'volatility':
        return (
          <div className="text-xs bg-background mt-2 px-2 py-1 rounded">
            Volatility: {data.parameters?.minVolatility || 'Low'} - {data.parameters?.maxVolatility || 'High'}
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
        <Filter className="w-4 h-4 mr-2" />
        <div className="font-semibold">{data.label}</div>
      </div>
      
      {filterType && (
        <div className="text-xs text-muted-foreground mt-1">
          Type: {filterType.charAt(0).toUpperCase() + filterType.slice(1)} Filter
        </div>
      )}
      
      {renderFilterContent()}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 border-2"
      />
    </div>
  );
});

FilterNode.displayName = 'FilterNode';

export default FilterNode;
