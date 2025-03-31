'use client';

import React from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { WidgetContainer } from '@/components/dashboard/widget-container';
import { useSocket } from '@/providers/socket-provider';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CommandConsole from '@/components/elizaos/command-console';
import OrderUpdatesStream from '@/components/websocket/order-updates-stream';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@/utils/supabase/client';
import { 
  Plus, 
  LayoutGrid, 
  Sun, 
  Moon, 
  RefreshCw, 
  Save, 
  Brain,
  Wallet,
  BarChart2,
  LineChart,
  Bell,
  Zap,
  BookOpen,
  SlidersHorizontal
} from 'lucide-react';
import { Database } from '@/types/database.types';
import { cn } from '@/utils/cn';

type WidgetType = 
  | 'order_updates'
  | 'price_alerts'
  | 'execution_notifications'
  | 'market_data'
  | 'positions_table'
  | 'performance_chart'
  | 'risk_metrics'
  | 'balance_overview'
  | 'elizaos_console'
  | 'recent_orders'
  | 'open_positions'
  | 'news_feed';

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  size: {
    width: number;
    height: number;
  };
  position: number;
  config?: Record<string, any>;
}

interface DashboardLayoutConfig {
  id?: string;
  name: string;
  is_default?: boolean;
  widgets: Widget[];
  farm_id: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

interface UnifiedDashboardProps {
  farmId: string;
  initialLayout?: DashboardLayoutConfig;
  availableLayouts?: DashboardLayoutConfig[];
  hasElizaOS?: boolean;
}

export default function UnifiedDashboard({
  farmId,
  initialLayout,
  availableLayouts = [],
  hasElizaOS = true
}: UnifiedDashboardProps) {
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const { isConnected } = useSocket();
  const supabase = createBrowserClient();
  
  const [activeLayout, setActiveLayout] = React.useState<DashboardLayoutConfig | null>(initialLayout || null);
  const [widgets, setWidgets] = React.useState<Widget[]>(initialLayout?.widgets || []);
  const [layouts, setLayouts] = React.useState<DashboardLayoutConfig[]>(availableLayouts);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showAddWidget, setShowAddWidget] = React.useState(false);
  const [currentLayoutName, setCurrentLayoutName] = React.useState(initialLayout?.name || 'Default Layout');
  
  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // Load layouts on component mount
  React.useEffect(() => {
    loadLayouts();
  }, [farmId]);
  
  // Load available layouts for the farm
  const loadLayouts = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('*')
        .eq('farm_id', farmId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Convert database Json type to Widget[] type
        const typedLayouts = data.map((layout) => ({
          ...layout,
          widgets: layout.widgets as unknown as Widget[]
        })) as DashboardLayoutConfig[];
        
        setLayouts(typedLayouts);
        
        // If no initialLayout provided, use the default layout
        if (!initialLayout) {
          const defaultLayout = typedLayouts.find(layout => layout.is_default);
          if (defaultLayout) {
            setActiveLayout(defaultLayout);
            setWidgets(defaultLayout.widgets);
            setCurrentLayoutName(defaultLayout.name);
          }
        }
      }
    } catch (error) {
      console.error('Error loading layouts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard layouts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save current layout
  const saveLayout = async () => {
    if (!activeLayout) return;
    
    setIsSaving(true);
    
    try {
      const layoutToSave = {
        ...(activeLayout.id ? { id: activeLayout.id } : {}),
        name: currentLayoutName,
        widgets: widgets as unknown as Database['public']['Tables']['dashboard_layouts']['Insert']['widgets'],
        farm_id: farmId,
        user_id: await getCurrentUserId(),
      };
      
      let result;
      
      if (activeLayout.id) {
        // Update existing layout
        result = await supabase
          .from('dashboard_layouts')
          .update({
            name: layoutToSave.name,
            widgets: layoutToSave.widgets,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeLayout.id);
      } else {
        // Create new layout
        result = await supabase
          .from('dashboard_layouts')
          .insert({
            name: layoutToSave.name,
            widgets: layoutToSave.widgets,
            farm_id: layoutToSave.farm_id,
            user_id: layoutToSave.user_id,
            is_default: layouts.length === 0, // Make default if first layout
          });
      }
      
      if (result.error) throw result.error;
      
      toast({
        title: 'Layout Saved',
        description: `Dashboard layout "${currentLayoutName}" has been saved`,
      });
      
      // Refresh layouts
      loadLayouts();
      
    } catch (error) {
      console.error('Error saving layout:', error);
      toast({
        title: 'Error',
        description: 'Failed to save dashboard layout',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Get current user ID
  const getCurrentUserId = async (): Promise<string> => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || 'anonymous';
  };
  
  // Handle drag end event
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setWidgets((items: Widget[]) => {
        const oldIndex = items.findIndex((item: Widget) => item.id === active.id);
        const newIndex = items.findIndex((item: Widget) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  // Handle layout change
  const handleLayoutChange = async (layoutId: string) => {
    const selected = layouts.find((l: DashboardLayoutConfig) => l.id === layoutId);
    if (selected) {
      setActiveLayout(selected);
      setWidgets(selected.widgets);
      setCurrentLayoutName(selected.name);
    }
  };
  
  // Handle widget removal
  const handleRemoveWidget = (widgetId: string) => {
    setWidgets(widgets.filter((w: Widget) => w.id !== widgetId));
  };
  
  // Handle widget refresh
  const handleRefreshWidget = (widgetId: string) => {
    // Implementation would depend on the widget type
    toast({
      description: `Refreshing widget...`,
    });
  };
  
  // Add a new widget
  const addWidget = (type: WidgetType) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      title: getWidgetTitle(type),
      size: getDefaultWidgetSize(type),
      position: widgets.length,
    };
    
    setWidgets([...widgets, newWidget]);
    setShowAddWidget(false);
  };
  
  // Helper functions for widget properties
  const getWidgetTitle = (type: WidgetType): string => {
    const titles: Record<WidgetType, string> = {
      order_updates: 'Order Updates',
      price_alerts: 'Price Alerts',
      execution_notifications: 'Execution Feed',
      market_data: 'Market Data',
      positions_table: 'Positions',
      performance_chart: 'Performance',
      risk_metrics: 'Risk Metrics',
      balance_overview: 'Balance',
      elizaos_console: 'ElizaOS Console',
      recent_orders: 'Recent Orders',
      open_positions: 'Open Positions',
      news_feed: 'News Feed',
    };
    
    return titles[type];
  };
  
  const getDefaultWidgetSize = (type: WidgetType): { width: number; height: number } => {
    const sizes: Record<WidgetType, { width: number; height: number }> = {
      order_updates: { width: 2, height: 2 },
      price_alerts: { width: 1, height: 1 },
      execution_notifications: { width: 2, height: 1 },
      market_data: { width: 2, height: 2 },
      positions_table: { width: 3, height: 2 },
      performance_chart: { width: 3, height: 2 },
      risk_metrics: { width: 2, height: 1 },
      balance_overview: { width: 1, height: 1 },
      elizaos_console: { width: 3, height: 2 },
      recent_orders: { width: 2, height: 1 },
      open_positions: { width: 2, height: 2 },
      news_feed: { width: 2, height: 1 },
    };
    
    return sizes[type];
  };
  
  // Get widget icon
  const getWidgetIcon = (type: WidgetType) => {
    switch (type) {
      case 'order_updates':
        return <Bell className="h-5 w-5" />;
      case 'price_alerts':
        return <Bell className="h-5 w-5" />;
      case 'execution_notifications':
        return <Zap className="h-5 w-5" />;
      case 'market_data':
        return <BarChart2 className="h-5 w-5" />;
      case 'positions_table':
        return <LayoutGrid className="h-5 w-5" />;
      case 'performance_chart':
        return <LineChart className="h-5 w-5" />;
      case 'risk_metrics':
        return <SlidersHorizontal className="h-5 w-5" />;
      case 'balance_overview':
        return <Wallet className="h-5 w-5" />;
      case 'elizaos_console':
        return <Brain className="h-5 w-5" />;
      case 'recent_orders':
        return <BookOpen className="h-5 w-5" />;
      case 'open_positions':
        return <LayoutGrid className="h-5 w-5" />;
      case 'news_feed':
        return <BookOpen className="h-5 w-5" />;
      default:
        return <Plus className="h-5 w-5" />;
    }
  };

  // Get widget description for tooltip/info
  const getWidgetDescription = (type: WidgetType): string => {
    const descriptions: Record<WidgetType, string> = {
      order_updates: 'Real-time updates on order status changes',
      price_alerts: 'Customizable price alerts for selected assets',
      execution_notifications: 'Notifications for order executions',
      market_data: 'Real-time market data for selected symbols',
      positions_table: 'Current open positions and their status',
      performance_chart: 'Trading performance visualization',
      risk_metrics: 'Key risk indicators and metrics',
      balance_overview: 'Account balance and asset allocation',
      elizaos_console: 'AI-powered trading assistant console',
      recent_orders: 'Recently placed and executed orders',
      open_positions: 'Currently open trading positions',
      news_feed: 'Market news and event feed',
    };
    
    return descriptions[type];
  };

  // Switch to a different layout
  const switchLayout = (layoutId: string) => {
    const layout = layouts.find((l: DashboardLayoutConfig) => l.id === layoutId);
    if (layout) {
      setActiveLayout(layout);
      setWidgets(layout.widgets);
      setCurrentLayoutName(layout.name);
      toast({
        title: 'Layout Changed',
        description: `Switched to "${layout.name}" dashboard`,
      });
    }
  };

  // Remove a widget from the dashboard
  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter((w: Widget) => w.id !== widgetId));
  };

  // Render individual widget based on its type
  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case 'order_updates':
        return <OrderUpdatesStream farmId={farmId} />;
      case 'price_alerts':
        return <div>Price Alerts Widget</div>;
      case 'execution_notifications':
        return <div>Execution Notifications Widget</div>;
      case 'market_data':
        return <div>Market Data Widget</div>;
      case 'positions_table':
        return <div>Positions Table Widget</div>;
      case 'performance_chart':
        return <div>Performance Chart Widget</div>;
      case 'risk_metrics':
        return <div>Risk Metrics Widget</div>;
      case 'balance_overview':
        return <div>Balance Overview Widget</div>;
      case 'elizaos_console':
        return <CommandConsole farmId={farmId} />;
      case 'recent_orders':
        return <div>Recent Orders Widget</div>;
      case 'open_positions':
        return <div>Open Positions Widget</div>;
      case 'news_feed':
        return <div>News Feed Widget</div>;
      default:
        return <div>Unknown Widget Type</div>;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Trading Farm Dashboard</h1>
          <p className="text-muted-foreground">Manage your trades and monitor performance</p>
        </div>
        
        <div className="flex space-x-2">
          {/* Theme toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          {/* Layout selector */}
          {layouts.length > 0 && (
            <Select
              value={activeLayout?.id || ''}
              onValueChange={(value: string) => switchLayout(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                {layouts.map((layout: DashboardLayoutConfig) => (
                  <SelectItem key={layout.id} value={layout.id || ''}>
                    {layout.name}
                    {layout.is_default && (
                      <Badge variant="outline" className="ml-2">
                        Default
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Layout actions */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadLayouts()}
            disabled={isLoading}
            aria-label="Refresh layouts"
          >
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => saveLayout()}
            disabled={isSaving}
            aria-label="Save layout"
          >
            <Save className="h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            size="icon" 
            onClick={() => setIsEditMode(!isEditMode)}
            aria-label={isEditMode ? "Exit edit mode" : "Edit dashboard"}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
          
          {isEditMode && (
            <Dialog>
              <DialogTrigger asChild>
                <Button onClick={() => setShowAddWidget(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Widget
                </Button>
              </DialogTrigger>
              {showAddWidget && (
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Widget</DialogTitle>
                    <DialogDescription>
                      Choose a widget to add to your dashboard
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-2 gap-3 py-4">
                    {(Object.keys(getWidgetTitle({} as WidgetType)) as WidgetType[]).map((type) => (
                      <Button
                        key={type}
                        variant="outline"
                        className="flex flex-col items-center justify-center p-4 h-auto space-y-2 hover:bg-accent"
                        onClick={() => addWidget(type)}
                      >
                        <div className="flex-none">{getWidgetIcon(type)}</div>
                        <div className="text-sm font-medium">{getWidgetTitle(type)}</div>
                        <p className="text-xs text-muted-foreground">{getWidgetDescription(type)}</p>
                      </Button>
                    ))}
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddWidget(false)}>
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              )}
            </Dialog>
          )}
        </div>
      </div>
      
      {isConnected ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
              <div className="mb-4 opacity-50">
                <LayoutGrid className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium mb-2">No widgets added</h3>
              <p className="text-muted-foreground mb-4">
                Your dashboard is empty. Add widgets to start monitoring your farm.
              </p>
              {isEditMode ? (
                <Button onClick={() => setShowAddWidget(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Widget
                </Button>
              ) : (
                <Button onClick={() => setIsEditMode(true)}>
                  <SlidersHorizontal className="h-5 w-5 mr-2" />
                  Enter Edit Mode
                </Button>
              )}
            </div>
          ) : (
            <SortableContext items={widgets.map((w: Widget) => w.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {widgets.map((widget: Widget) => (
                  <WidgetContainer
                    key={widget.id}
                    id={widget.id}
                    title={widget.title}
                    onRemove={isEditMode ? () => removeWidget(widget.id) : undefined}
                  >
                    {renderWidget(widget)}
                  </WidgetContainer>
                ))}
              </div>
            </SortableContext>
          )}
        </DndContext>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
          <div className="mb-4 text-yellow-500">
            <RefreshCw className="h-12 w-12 animate-spin" />
          </div>
          <h3 className="text-lg font-medium mb-2">Connecting to server...</h3>
          <p className="text-muted-foreground">
            Please wait while we establish a connection to the trading server.
          </p>
        </div>
      )}
    </div>
  );
}
