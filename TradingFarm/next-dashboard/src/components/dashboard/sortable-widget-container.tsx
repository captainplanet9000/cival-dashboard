/**
 * Sortable Widget Container for Trading Farm Dashboard
 * Enables drag-and-drop functionality for dashboard widgets
 */
'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button-standardized';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grip, Settings, X } from 'lucide-react';
import { MarketDataWidget } from '@/components/dashboard/widgets/MarketDataWidget';
import { RealTimeMarketWidget } from '@/components/dashboard/widgets/RealTimeMarketWidget';
import { RealTimeOrdersWidget } from '@/components/dashboard/widgets/RealTimeOrdersWidget';
import { useDraggableWidget } from '@/components/dashboard/draggable-widget-context';
import { WidgetConfig, WidgetType } from '@/components/dashboard/draggable-dashboard';

// Size classes for different widget sizes
const sizeClasses = {
  'small': 'col-span-3',
  'medium': 'col-span-6',
  'large': 'col-span-9',
  'full-width': 'col-span-12'
};

interface DashboardSortableItemProps {
  id: string;
  widget: WidgetConfig;
  farmId?: string;
}

/**
 * Sortable widget container component
 * Wraps a widget with drag-and-drop capabilities
 */
export function DashboardSortableItem({ id, widget, farmId }: DashboardSortableItemProps) {
  const { isEditing, onRemove, onUpdate } = useDraggableWidget();
  
  // Set up sortable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  
  // Apply drag transform styles
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };
  
  // Render the appropriate widget based on type
  const renderWidget = () => {
    switch (widget.type) {
      case 'market_data':
        return (
          <MarketDataWidget 
            title={widget.title} 
            params={widget.settings?.params} 
          />
        );
      case 'real_time_market':
        return (
          <RealTimeMarketWidget 
            title={widget.title} 
            symbols={widget.settings?.symbols} 
            exchange={widget.settings?.exchange}
          />
        );
      case 'real_time_orders':
        return (
          <RealTimeOrdersWidget 
            title={widget.title} 
            farmId={farmId} 
            walletId={widget.settings?.walletId}
          />
        );
      // Add cases for other widget types
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>{widget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">
                {widget.type} widget (Not yet implemented)
              </div>
            </CardContent>
          </Card>
        );
    }
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-200",
        sizeClasses[widget.size]
      )}
    >
      <div className="h-full">
        {/* Edit mode UI overlay */}
        {isEditing && (
          <div className="group relative h-full">
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="backdrop-blur-sm bg-background/90"
                  onClick={() => {
                    // Open widget settings modal (would be implemented)
                    console.log('Edit widget', widget.id);
                  }}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="backdrop-blur-sm bg-destructive/90"
                  onClick={() => onRemove(widget.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
            
            {/* Drag handle */}
            <div 
              className="absolute top-2 left-2 z-20 p-1 rounded bg-background/90 shadow cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
              {...attributes}
              {...listeners}
            >
              <Grip className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {/* Widget content */}
            <div className="h-full opacity-80 group-hover:opacity-40 transition-opacity">
              {renderWidget()}
            </div>
          </div>
        )}
        
        {/* Normal display mode */}
        {!isEditing && renderWidget()}
      </div>
    </div>
  );
}

export default DashboardSortableItem;
