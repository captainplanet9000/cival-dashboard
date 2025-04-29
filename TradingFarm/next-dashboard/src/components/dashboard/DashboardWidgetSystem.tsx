import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button-standardized';
import { PlusIcon, MinusIcon, ArrowsOutIcon, ArrowsInIcon, Cross2Icon, GearIcon, LayoutIcon } from '@radix-ui/react-icons';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useEventBus } from '@/hooks/use-event-bus';

// Make the grid responsive
const ResponsiveGridLayout = WidthProvider(Responsive);

export interface DashboardLayout {
  id: string;
  name: string;
  layouts: {
    lg: React.ComponentProps<typeof ResponsiveGridLayout>['layouts']['lg'];
    md: React.ComponentProps<typeof ResponsiveGridLayout>['layouts']['md'];
    sm: React.ComponentProps<typeof ResponsiveGridLayout>['layouts']['sm'];
  };
}

export interface WidgetDefinition {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  defaultProps?: Record<string, any>;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  configuration?: {
    title?: boolean;
    resize?: boolean;
    drag?: boolean;
    remove?: boolean;
    configure?: boolean;
    maximize?: boolean;
  };
}

export interface DashboardWidgetSystemProps {
  availableWidgets: WidgetDefinition[];
  defaultLayout?: DashboardLayout;
  dashboardId: string;
  onSaveLayout?: (layout: DashboardLayout) => void;
  onResetLayout?: () => void;
  className?: string;
}

/**
 * Dashboard Widget System
 * 
 * A flexible dashboard system with:
 * - Draggable and resizable widgets
 * - Layout persistence
 * - Widget configuration
 * - Inter-widget communication
 * - Responsive layouts for different screen sizes
 */
export function DashboardWidgetSystem({
  availableWidgets,
  defaultLayout,
  dashboardId,
  onSaveLayout,
  onResetLayout,
  className
}: DashboardWidgetSystemProps) {
  // State for managing widget layouts
  const [layouts, setLayouts] = useLocalStorage<DashboardLayout['layouts']>(
    `dashboard-layout-${dashboardId}`,
    defaultLayout?.layouts || { lg: [], md: [], sm: [] }
  );
  
  // State for active widgets
  const [activeWidgets, setActiveWidgets] = useLocalStorage<string[]>(
    `dashboard-widgets-${dashboardId}`,
    defaultLayout?.layouts.lg.map(item => item.i) || []
  );
  
  // State for widget maximization
  const [maximizedWidget, setMaximizedWidget] = useState<string | null>(null);
  
  // Widget configuration state
  const [widgetConfigs, setWidgetConfigs] = useLocalStorage<Record<string, any>>(
    `dashboard-widget-configs-${dashboardId}`,
    {}
  );
  
  // Event bus for inter-widget communication
  const { publish, subscribe } = useEventBus();
  
  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Handle layout changes
  const handleLayoutChange = useCallback((currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    if (onSaveLayout) {
      onSaveLayout({
        id: dashboardId,
        name: 'Custom Layout',
        layouts: allLayouts
      });
    }
  }, [dashboardId, onSaveLayout, setLayouts]);
  
  // Add a widget to the dashboard
  const addWidget = useCallback((widgetId: string) => {
    const widgetDef = availableWidgets.find(w => w.id === widgetId);
    if (!widgetDef || activeWidgets.includes(widgetId)) return;
    
    const newWidget = {
      i: widgetId,
      x: 0,
      y: Infinity, // Add to the bottom
      w: widgetDef.minW || 3,
      h: widgetDef.minH || 3,
      minW: widgetDef.minW || 2,
      minH: widgetDef.minH || 2,
      maxW: widgetDef.maxW || Infinity,
      maxH: widgetDef.maxH || Infinity
    };
    
    // Add to all layouts for responsiveness
    setLayouts(prev => ({
      lg: [...(prev.lg || []), { ...newWidget }],
      md: [...(prev.md || []), { ...newWidget, w: Math.min(newWidget.w, 6) }],
      sm: [...(prev.sm || []), { ...newWidget, w: Math.min(newWidget.w, 4), x: 0 }]
    }));
    
    setActiveWidgets(prev => [...prev, widgetId]);
  }, [availableWidgets, activeWidgets, setLayouts, setActiveWidgets]);
  
  // Remove a widget from the dashboard
  const removeWidget = useCallback((widgetId: string) => {
    setLayouts(prev => ({
      lg: prev.lg.filter(item => item.i !== widgetId),
      md: prev.md.filter(item => item.i !== widgetId),
      sm: prev.sm.filter(item => item.i !== widgetId)
    }));
    
    setActiveWidgets(prev => prev.filter(id => id !== widgetId));
    
    // If the removed widget was maximized, clear the maximized state
    if (maximizedWidget === widgetId) {
      setMaximizedWidget(null);
    }
  }, [maximizedWidget, setLayouts, setActiveWidgets]);
  
  // Toggle widget maximization
  const toggleMaximizeWidget = useCallback((widgetId: string) => {
    setMaximizedWidget(prev => prev === widgetId ? null : widgetId);
  }, []);
  
  // Reset dashboard to default layout
  const resetDashboard = useCallback(() => {
    if (defaultLayout) {
      setLayouts(defaultLayout.layouts);
      setActiveWidgets(defaultLayout.layouts.lg.map(item => item.i));
      setWidgetConfigs({});
      if (onResetLayout) {
        onResetLayout();
      }
    }
  }, [defaultLayout, onResetLayout, setLayouts, setActiveWidgets, setWidgetConfigs]);
  
  // Update widget configuration
  const updateWidgetConfig = useCallback((widgetId: string, config: any) => {
    setWidgetConfigs(prev => ({
      ...prev,
      [widgetId]: {
        ...(prev[widgetId] || {}),
        ...config
      }
    }));
    
    // Notify other widgets about the configuration change
    publish(`widget.${widgetId}.configChanged`, config);
  }, [publish, setWidgetConfigs]);
  
  // Render a widget
  const renderWidget = useCallback((widgetId: string) => {
    const widgetDef = availableWidgets.find(w => w.id === widgetId);
    if (!widgetDef) return null;
    
    const WidgetComponent = widgetDef.component;
    const widgetConfig = widgetConfigs[widgetId] || {};
    const isMaximized = maximizedWidget === widgetId;
    
    // Default configuration options
    const config = {
      title: true,
      resize: true,
      drag: true,
      remove: true,
      configure: true,
      maximize: true,
      ...widgetDef.configuration
    };
    
    return (
      <Card 
        className={cn(
          "overflow-hidden shadow-sm transition-all duration-200 h-full",
          isMaximized ? "z-50" : "",
          isEditMode ? "border-dashed border-blue-400" : ""
        )}
      >
        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
          {config.title && (
            <CardTitle className="text-sm truncate">
              {widgetConfig.customTitle || widgetDef.name}
            </CardTitle>
          )}
          
          <div className="flex items-center space-x-1">
            {isEditMode && config.configure && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label="Configure widget"
                  >
                    <GearIcon className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      const newTitle = prompt('Enter new title', widgetConfig.customTitle || widgetDef.name);
                      if (newTitle) {
                        updateWidgetConfig(widgetId, { customTitle: newTitle });
                      }
                    }}
                  >
                    Rename Widget
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      // Reset widget to default configuration
                      updateWidgetConfig(widgetId, widgetDef.defaultProps || {});
                    }}
                  >
                    Reset Configuration
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {config.maximize && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleMaximizeWidget(widgetId)}
                aria-label={isMaximized ? "Minimize widget" : "Maximize widget"}
              >
                {isMaximized ? (
                  <ArrowsInIcon className="h-3 w-3" />
                ) : (
                  <ArrowsOutIcon className="h-3 w-3" />
                )}
              </Button>
            )}
            
            {isEditMode && config.remove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:text-destructive"
                onClick={() => removeWidget(widgetId)}
                aria-label="Remove widget"
              >
                <Cross2Icon className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-3 overflow-auto h-[calc(100%-40px)]">
          <WidgetComponent
            id={widgetId}
            config={widgetConfig}
            updateConfig={(config: any) => updateWidgetConfig(widgetId, config)}
            publish={(event: string, data: any) => publish(`widget.${widgetId}.${event}`, data)}
            subscribe={(event: string, callback: (data: any) => void) => 
              subscribe(`widget.${widgetId}.${event}`, callback)
            }
            isEditMode={isEditMode}
            isMaximized={isMaximized}
            {...(widgetDef.defaultProps || {})}
          />
        </CardContent>
      </Card>
    );
  }, [availableWidgets, widgetConfigs, maximizedWidget, isEditMode, updateWidgetConfig, toggleMaximizeWidget, removeWidget, publish, subscribe]);
  
  return (
    <div className={cn("relative", className)}>
      {/* Dashboard toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? 'Exit Edit Mode' : 'Edit Dashboard'}
          </Button>
          
          {isEditMode && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={resetDashboard}
              >
                Reset Dashboard
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <PlusIcon className="mr-1 h-4 w-4" />
                    Add Widget
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {availableWidgets
                    .filter(widget => !activeWidgets.includes(widget.id))
                    .map(widget => (
                      <DropdownMenuItem
                        key={widget.id}
                        onSelect={() => addWidget(widget.id)}
                      >
                        {widget.name}
                      </DropdownMenuItem>
                    ))}
                  
                  {availableWidgets.filter(widget => !activeWidgets.includes(widget.id)).length === 0 && (
                    <DropdownMenuItem disabled>
                      All widgets are active
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <LayoutIcon className="mr-1 h-4 w-4" />
              Layout
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                const layoutName = prompt('Save layout as:', dashboardId);
                if (layoutName && onSaveLayout) {
                  onSaveLayout({
                    id: dashboardId,
                    name: layoutName,
                    layouts
                  });
                }
              }}
            >
              Save Current Layout
            </DropdownMenuItem>
            {/* More layout options would go here */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Maximized widget view */}
      <AnimatePresence>
        {maximizedWidget && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-[60px] left-0 right-0 bottom-0 z-50 m-4 bg-background border rounded-lg shadow-lg overflow-hidden"
          >
            {renderWidget(maximizedWidget)}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dashboard grid layout */}
      <div className={cn(maximizedWidget ? 'opacity-0 pointer-events-none' : 'opacity-100')}>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          compactType="vertical"
          useCSSTransforms
        >
          {activeWidgets.map((widgetId) => (
            <div key={widgetId}>
              {renderWidget(widgetId)}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
      
      {/* Empty state */}
      {activeWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-3">
            <LayoutIcon className="h-6 w-6" />
          </div>
          <h3 className="mb-2 text-lg font-medium">No widgets added</h3>
          <p className="mb-4 text-sm text-muted-foreground max-w-sm">
            Your dashboard is empty. Add widgets to create your custom trading dashboard.
          </p>
          <Button
            onClick={() => {
              setIsEditMode(true);
              if (availableWidgets.length > 0) {
                addWidget(availableWidgets[0].id);
              }
            }}
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            Add Your First Widget
          </Button>
        </div>
      )}
    </div>
  );
}
