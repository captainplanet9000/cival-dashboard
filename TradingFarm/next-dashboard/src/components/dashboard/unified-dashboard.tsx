'use client';

import React from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import ElizaDeFiConsoleWidget from '@/components/dashboard/widgets/ElizaDeFiConsoleWidget';
import { WidgetContainer } from '@/components/dashboard/widget-container';
import { useSocket } from '@/providers/socket-provider';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/fixed-dialog';
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
  SlidersHorizontal,
  CircleDollarSign
} from 'lucide-react';
import { DashboardActionBar } from '@/components/ui/dashboard-action-bar';
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
  | 'elizaos_defi_console'
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

interface Notification {
  id: number;
  type: 'success' | 'info' | 'error' | 'warning';
  message: string;
  time: string;
}

interface PriceAlert {
  id: number;
  pair: string;
  condition: 'above' | 'below';
  price: number;
  current: number;
  active: boolean;
}

interface RiskMetricProps {
  title: string;
  metrics: {
    name: string;
    value: string;
    status: 'normal' | 'warning' | 'good' | 'danger';
  }[];
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
  const [currentTime, setCurrentTime] = React.useState<string>('');
  
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

  // Update the time only on the client side
  React.useEffect(() => {
    // Initial time update
    setCurrentTime(new Date().toLocaleTimeString());
    
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);
  
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
        const typedLayouts = data.map((layout: any) => ({
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
      elizaos_defi_console: 'ElizaOS DeFi Console',
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
      elizaos_defi_console: { width: 3, height: 2 },
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
      case 'elizaos_defi_console':
        return <CircleDollarSign className="h-5 w-5" />;
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
      elizaos_defi_console: 'AI-powered DeFi lending, strategy, and risk console',
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
      case 'elizaos_defi_console':
        return <ElizaDeFiConsoleWidget id="eliza-defi-console" />;
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

  const [activeTab, setActiveTab] = React.useState('overview');

  // Missing components for notifications and alerts
  const ExecutionNotifications = ({ limit = 3 }: { limit?: number }) => {
    const [notifications, setNotifications] = React.useState<Notification[]>([
      { id: 1, type: 'success', message: 'BTC/USDT Buy order filled at $51,245.30', time: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: 2, type: 'info', message: 'ETH/USDT strategy initiated with $5,000 allocation', time: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
      { id: 3, type: 'error', message: 'SOL/USDT order rejected: insufficient margin', time: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      { id: 4, type: 'warning', message: 'Risk threshold exceeded on ARB/USDT position', time: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    ]);
    
    return (
      <div className="space-y-2 mt-2">
        {notifications.slice(0, limit).map((notification: Notification) => (
          <div 
            key={notification.id}
            className={`p-2 rounded-md text-xs ${
              notification.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-500' :
              notification.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-500' :
              notification.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500' :
              'bg-blue-500/10 border border-blue-500/20 text-blue-500'
            }`}
          >
            <div className="font-medium">{notification.message}</div>
            <div className="text-xs opacity-70 mt-1">
              <span suppressHydrationWarning>
                {typeof window !== 'undefined' 
                  ? new Date(notification.time).toLocaleTimeString() 
                  : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const PriceAlertSystem = ({ limit = 3 }: { limit?: number }) => {
    const [alerts, setAlerts] = React.useState<PriceAlert[]>([
      { id: 1, pair: 'BTC/USDT', condition: 'above', price: 52000, current: 51245.30, active: true },
      { id: 2, pair: 'ETH/USDT', condition: 'below', price: 2800, current: 2945.75, active: true },
      { id: 3, pair: 'SOL/USDT', condition: 'above', price: 105, current: 99.45, active: true },
    ]);
    
    return (
      <div className="space-y-2 mt-2">
        {alerts.slice(0, limit).map((alert: PriceAlert) => (
          <div 
            key={alert.id}
            className="p-2 rounded-md text-xs bg-card border"
          >
            <div className="flex justify-between">
              <span className="font-medium">{alert.pair}</span>
              <span className={
                alert.condition === 'above' && alert.current > alert.price ? 'text-green-500' :
                alert.condition === 'below' && alert.current < alert.price ? 'text-green-500' :
                'text-muted-foreground'
              }>
                ${alert.current.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>Alert {alert.condition} ${alert.price.toLocaleString()}</span>
              <span className={alert.active ? 'text-green-500' : 'text-muted-foreground'}>
                {alert.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const RiskMetricsCard = ({ title, metrics }: RiskMetricProps) => {
    return (
      <div className="bg-card p-4 rounded-md border shadow-sm">
        <div className="flex flex-col">
          <div className="text-sm font-medium mb-2">{title}</div>
          <div className="space-y-2">
            {metrics.map((metric, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{metric.name}</span>
                <span className={`text-sm font-medium ${
                  metric.status === 'good' ? 'text-green-500' : 
                  metric.status === 'warning' ? 'text-yellow-500' : 
                  metric.status === 'danger' ? 'text-red-500' : 
                  'text-foreground'
                }`}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trading Farm Dashboard</h1>
          <p className="text-muted-foreground">
            {isConnected ? (
              <span className="text-green-500 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                Connected - Real-time updates active
              </span>
            ) : (
              <span className="text-red-500 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                Disconnected - Reconnecting...
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Last updated: {currentTime}</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trading Farm Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your trading activities, market data, and agent insights
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => {
            toast({
              description: `Refreshing dashboard data...`
            });
            // Refresh data
            loadLayouts();
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setIsEditMode(!isEditMode)}>
            <LayoutGrid className="h-4 w-4 mr-2" />
            {isEditMode ? 'Done' : 'Edit Layout'}
          </Button>
          
          {isEditMode && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowAddWidget(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
              
              <Button variant="default" size="sm" onClick={saveLayout} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Layout'}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Standardized Modal Action Bar - Uses the modal controller pattern */}
      <DashboardActionBar 
        farmId={farmId}
        showAgents={true}
        showExchanges={true}
        showFunding={true}
        showStrategies={true}
        showGoals={true}
        className="pb-2"
      />

      <Tabs 
        defaultValue="overview" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 sm:grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="elizaos">ElizaOS</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main dashboard area */}
              <div className="col-span-1 md:col-span-2 space-y-6">
                {/* Performance metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Total Assets</span>
                    <span className="text-2xl font-bold">$123,456</span>
                    <span className="text-xs text-green-500">+2.5% today</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Daily P&L</span>
                    <span className="text-2xl font-bold">$1,234</span>
                    <span className="text-xs text-green-500">+3.2%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Open Positions</span>
                    <span className="text-2xl font-bold">12</span>
                    <span className="text-xs text-muted-foreground">4 profitable</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className="text-2xl font-bold">68%</span>
                    <span className="text-xs text-muted-foreground">Last 30 days</span>
                  </div>
                </div>
                
                {/* Recent activity */}
                <OrderUpdatesStream limit={5} />
                
                {/* Command console in overview for quick access */}
                <CommandConsole farmId={farmId} height="compact" />
              </div>
              
              {/* Sidebar with notifications and alerts */}
              <div className="col-span-1 space-y-6">
                <div>
                  <div className="text-sm text-muted-foreground">Notifications</div>
                  <ExecutionNotifications limit={3} />
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Price Alerts</div>
                  <PriceAlertSystem limit={3} />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="trading" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">Active Trades</div>
                <div className="text-center p-8 text-muted-foreground">
                  Active trades will appear here
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Order Book</div>
                <OrderUpdatesStream limit={10} />
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Trade History</div>
                <div className="text-center p-8 text-muted-foreground">
                  Trade history will appear here
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="risk" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RiskMetricsCard title="Position Risk" metrics={[
                { name: 'VaR (95%)', value: '$2,345.00', status: 'normal' },
                { name: 'Max Drawdown', value: '12.4%', status: 'warning' },
                { name: 'Sharpe Ratio', value: '1.8', status: 'good' },
                { name: 'Leverage', value: '2.3x', status: 'normal' }
              ]} />
              
              <RiskMetricsCard title="Exposure Analysis" metrics={[
                { name: 'BTC Exposure', value: '32%', status: 'warning' },
                { name: 'ETH Exposure', value: '28%', status: 'normal' },
                { name: 'USDT Balance', value: '$45,678', status: 'good' },
                { name: 'Margin Level', value: '76%', status: 'normal' }
              ]} />
              
              <RiskMetricsCard title="Exchange Risk" metrics={[
                { name: 'Binance', value: '42%', status: 'normal' },
                { name: 'FTX', value: '0%', status: 'danger' },
                { name: 'Kraken', value: '35%', status: 'normal' },
                { name: 'Coinbase', value: '23%', status: 'normal' }
              ]} />
              
              <RiskMetricsCard title="Correlation Analysis" metrics={[
                { name: 'Internal Correlation', value: '0.32', status: 'good' },
                { name: 'Market Correlation', value: '0.68', status: 'warning' },
                { name: 'SPY Correlation', value: '0.21', status: 'good' },
                { name: 'Volatility Index', value: '0.45', status: 'normal' }
              ]} />
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground">Risk Alerts</div>
              <div className="text-center p-8 text-muted-foreground">
                Risk alerts will appear here
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="elizaos" className="space-y-6">
            <div className="min-h-[600px]">
              <CommandConsole farmId={farmId} height="full" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">Knowledge Base</div>
                <div className="flex flex-col gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Risk Management Strategy</h4>
                    <p className="text-sm text-muted-foreground">
                      Position sizing and hedging techniques for volatile markets
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Market Analysis Framework</h4>
                    <p className="text-sm text-muted-foreground">
                      Technical and fundamental analysis methodology for crypto assets
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Arbitrage Opportunity Detection</h4>
                    <p className="text-sm text-muted-foreground">
                      Cross-exchange price differentials and execution strategies
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">AI Actions</div>
                <div className="flex flex-col gap-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium">Risk rebalancing</span>
                      <span className="text-xs text-muted-foreground">2:34 PM</span>
                    </div>
                    <p className="text-sm">Adjusted BTC position to maintain risk parameters</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium">Market analysis</span>
                      <span className="text-xs text-muted-foreground">1:15 PM</span>
                    </div>
                    <p className="text-sm">Completed sentiment analysis of recent market developments</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium">Alert configuration</span>
                      <span className="text-xs text-muted-foreground">11:42 AM</span>
                    </div>
                    <p className="text-sm">Updated price alerts based on volatility analysis</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
