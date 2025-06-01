/**
 * Draggable Dashboard Component for Trading Farm
 * Provides drag-and-drop, resizable widgets with layout persistence
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { createBrowserClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button-standardized';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DashboardSortableItem } from '@/components/dashboard/sortable-widget-container';
import { DraggableWidgetProvider } from '@/components/dashboard/draggable-widget-context';
import { Database } from '@/types/database.types';
import { cn } from '@/lib/utils';
import { Plus, LayoutGrid, Save, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Settings } from 'lucide-react';

// Widget type definitions
export type WidgetSize = 'small' | 'medium' | 'large' | 'full-width';
export type WidgetType = 
  | 'market_data'
  | 'real_time_market'
  | 'orders'
  | 'real_time_orders'
  | 'positions'
  | 'portfolio_summary'
  | 'wallet_balance'
  | 'performance_chart'
  | 'agent_status'
  | 'risk_metrics'
  | 'trading_history';

// Widget configuration interface
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  settings?: Record<string, any>;
}

// Dashboard layout configuration
export interface DashboardLayout {
  id: string;
  name: string;
  isDefault: boolean;
  widgets: WidgetConfig[];
  farmId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Available widget types and their configurations
export const availableWidgetTypes: Record<WidgetType, { title: string, description: string, icon: JSX.Element, defaultSize: WidgetSize }> = {
  market_data: { 
    title: 'Market Data', 
    description: 'View current market data for multiple assets',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  real_time_market: { 
    title: 'Real-Time Market', 
    description: 'Live updating market data with price animations',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  orders: { 
    title: 'Orders', 
    description: 'List of current and recent orders',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  real_time_orders: { 
    title: 'Real-Time Orders', 
    description: 'Live updating order status and history',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  positions: { 
    title: 'Positions', 
    description: 'Current open positions and P&L',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  portfolio_summary: { 
    title: 'Portfolio Summary', 
    description: 'Overview of portfolio performance',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'medium'
  },
  wallet_balance: { 
    title: 'Wallet Balance', 
    description: 'Current wallet balances across exchanges',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'small'
  },
  performance_chart: { 
    title: 'Performance Chart', 
    description: 'Visual chart of trading performance',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'large'
  },
  agent_status: { 
    title: 'Agent Status', 
    description: 'Status overview of trading agents',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'small'
  },
  risk_metrics: { 
    title: 'Risk Metrics', 
    description: 'Key risk indicators for your portfolio',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'small'
  },
  trading_history: { 
    title: 'Trading History', 
    description: 'Historical record of completed trades',
    icon: <LayoutGrid className="h-5 w-5" />,
    defaultSize: 'large'
  }
};

// Default dashboard layout for new users
const defaultDashboardLayout: DashboardLayout = {
  id: 'default',
  name: 'Default Dashboard',
  isDefault: true,
  widgets: [
    { id: 'market-data-1', type: 'real_time_market', title: 'Market Overview', size: 'medium' },
    { id: 'orders-1', type: 'real_time_orders', title: 'Recent Orders', size: 'large' },
    { id: 'positions-1', type: 'positions', title: 'Open Positions', size: 'medium' },
    { id: 'wallet-1', type: 'wallet_balance', title: 'Wallet Balance', size: 'small' },
    { id: 'performance-1', type: 'performance_chart', title: 'Performance', size: 'large' },
  ],
  userId: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

interface DraggableDashboardProps {
  userId: string;
  farmId?: string;
  initialLayout?: DashboardLayout;
  availableLayouts?: DashboardLayout[];
}

/**
 * Draggable dashboard component for Trading Farm
 * Allows users to customize their dashboard with drag and drop widgets
 */
export function DraggableDashboard({
  userId,
  farmId,
  initialLayout,
  availableLayouts = []
}: DraggableDashboardProps) {
  // State for layouts and active widgets
  const [layouts, setLayouts] = useState<DashboardLayout[]>(availableLayouts);
  const [activeLayout, setActiveLayout] = useState<DashboardLayout>(
    initialLayout || 
    availableLayouts.find(l => l.isDefault) || 
    { ...defaultDashboardLayout, userId }
  );
  const [widgets, setWidgets] = useState<WidgetConfig[]>(activeLayout.widgets);
  const [editMode, setEditMode] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [isSaveLayoutOpen, setIsSaveLayoutOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserClient<Database>();
  
  // Set up DnD sensors with increased tolerance for better UX
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Load layouts from database on component mount
  useEffect(() => {
    const loadUserLayouts = async () => {
      try {
        const { data, error } = await supabase
          .from('dashboard_layouts')
          .select('*')
          .eq('user_id', userId);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          const parsedLayouts = data.map(layout => ({
            id: layout.id,
            name: layout.name,
            isDefault: layout.is_default,
            widgets: JSON.parse(layout.widgets as unknown as string),
            farmId: layout.farm_id,
            userId: layout.user_id,
            createdAt: layout.created_at,
            updatedAt: layout.updated_at
          }));
          
          setLayouts(parsedLayouts);
          
          // If no initial layout was provided, use the default one
          if (!initialLayout) {
            const defaultLayout = parsedLayouts.find(l => l.isDefault);
            if (defaultLayout) {
              setActiveLayout(defaultLayout);
              setWidgets(defaultLayout.widgets);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard layouts:', error);
        toast({
          title: 'Error loading layouts',
          description: 'Could not load your saved dashboard layouts',
          variant: 'destructive'
        });
      }
    };
    
    loadUserLayouts();
  }, [userId, initialLayout, supabase, toast]);

  // Handle layout changes when active layout changes
  useEffect(() => {
    setWidgets(activeLayout.widgets);
  }, [activeLayout]);

  // Handle drag end events to reorder widgets
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setWidgets(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // Save current layout to database
  const saveLayout = async (name: string, makeDefault: boolean = false) => {
    try {
      // If saving the current layout with a new name
      const layoutToSave = {
        id: activeLayout.id === 'default' ? crypto.randomUUID() : activeLayout.id,
        name,
        is_default: makeDefault,
        widgets: JSON.stringify(widgets),
        farm_id: farmId,
        user_id: userId,
      };
      
      // If making this layout default, update all others to non-default
      if (makeDefault) {
        await supabase
          .from('dashboard_layouts')
          .update({ is_default: false })
          .eq('user_id', userId);
      }
      
      // Save the layout
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .upsert(layoutToSave, { onConflict: 'id' })
        .select('*')
        .single();
        
      if (error) throw error;
      
      // Update state with the new/updated layout
      const updatedLayout = {
        id: data.id,
        name: data.name,
        isDefault: data.is_default,
        widgets: JSON.parse(data.widgets as unknown as string),
        farmId: data.farm_id,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      // Update layouts list
      setLayouts(prevLayouts => {
        const existingIndex = prevLayouts.findIndex(l => l.id === updatedLayout.id);
        if (existingIndex >= 0) {
          const newLayouts = [...prevLayouts];
          newLayouts[existingIndex] = updatedLayout;
          return newLayouts;
        }
        return [...prevLayouts, updatedLayout];
      });
      
      // Set as active layout
      setActiveLayout(updatedLayout);
      
      toast({
        title: 'Layout saved',
        description: `Dashboard layout "${name}" has been saved`,
        variant: 'default'
      });
      
      setIsSaveLayoutOpen(false);
      setNewLayoutName('');
      setIsDefault(false);
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
      toast({
        title: 'Error saving layout',
        description: 'Could not save your dashboard layout',
        variant: 'destructive'
      });
    }
  };

  // Delete the current layout
  const deleteLayout = async () => {
    if (activeLayout.id === 'default') {
      toast({
        title: 'Cannot delete default layout',
        description: 'The default layout cannot be deleted',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('dashboard_layouts')
        .delete()
        .eq('id', activeLayout.id);
        
      if (error) throw error;
      
      // Remove from layouts list
      setLayouts(prevLayouts => prevLayouts.filter(l => l.id !== activeLayout.id));
      
      // Set active layout to default
      const defaultLayout = layouts.find(l => l.isDefault) || 
        { ...defaultDashboardLayout, userId };
      setActiveLayout(defaultLayout);
      
      toast({
        title: 'Layout deleted',
        description: `Dashboard layout "${activeLayout.name}" has been deleted`,
        variant: 'default'
      });
      
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Failed to delete dashboard layout:', error);
      toast({
        title: 'Error deleting layout',
        description: 'Could not delete your dashboard layout',
        variant: 'destructive'
      });
    }
  };

  // Add a new widget to the dashboard
  const addWidget = (type: WidgetType) => {
    const widgetInfo = availableWidgetTypes[type];
    const newWidget: WidgetConfig = {
      id: `${type}-${Date.now()}`,
      type,
      title: widgetInfo.title,
      size: widgetInfo.defaultSize,
      settings: {}
    };
    
    setWidgets(prev => [...prev, newWidget]);
    setIsAddWidgetOpen(false);
    
    toast({
      title: 'Widget added',
      description: `${widgetInfo.title} widget has been added to your dashboard`,
      variant: 'default'
    });
  };

  // Remove a widget from the dashboard
  const removeWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
    
    toast({
      title: 'Widget removed',
      description: 'Widget has been removed from your dashboard',
      variant: 'default'
    });
  };

  // Update a widget's title or settings
  const updateWidgetConfig = (widgetId: string, updates: Partial<WidgetConfig>) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId
          ? { ...widget, ...updates }
          : widget
      )
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Dashboard header with layout controls */}
      <div className="flex items-center justify-between border-b py-3 px-6">
        <div className="flex items-center space-x-4">
          <Select 
            value={activeLayout.id}
            onValueChange={(value) => {
              const selected = layouts.find(l => l.id === value) || 
                { ...defaultDashboardLayout, userId };
              setActiveLayout(selected);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <span className="flex items-center">
                <LayoutGrid className="mr-2 h-4 w-4" />
                {activeLayout.name}
                {activeLayout.isDefault && (
                  <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                )}
              </span>
            </SelectTrigger>
            <SelectContent>
              {layouts.map(layout => (
                <SelectItem key={layout.id} value={layout.id}>
                  <span className="flex items-center">
                    {layout.name}
                    {layout.isDefault && (
                      <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
              <SelectItem value="default">Default Dashboard</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSaveLayoutOpen(true)}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={activeLayout.id === 'default'}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Label htmlFor="edit-mode" className="cursor-pointer">Edit Mode</Label>
            <Switch
              id="edit-mode"
              checked={editMode}
              onCheckedChange={setEditMode}
            />
          </div>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsAddWidgetOpen(true)}
            disabled={!editMode}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Widget
          </Button>
        </div>
      </div>
      
      {/* Main dashboard content area */}
      <ScrollArea className="flex-1 p-6">
        <DraggableWidgetProvider
          isEditing={editMode}
          onRemove={removeWidget}
          onUpdate={updateWidgetConfig}
        >
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={widgets.map(w => w.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-12 gap-4">
                {widgets.map(widget => (
                  <DashboardSortableItem
                    key={widget.id}
                    id={widget.id}
                    widget={widget}
                    farmId={farmId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </DraggableWidgetProvider>
        
        {/* Empty state when no widgets */}
        {widgets.length === 0 && (
          <div className="text-center py-20">
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No widgets in this dashboard</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add some widgets to get started
            </p>
            <Button
              variant="default"
              className="mt-4"
              onClick={() => setIsAddWidgetOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Widget
            </Button>
          </div>
        )}
      </ScrollArea>
      
      {/* Add Widget Dialog */}
      <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
            <DialogDescription>
              Choose a widget to add to your dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            {Object.entries(availableWidgetTypes).map(([type, info]) => (
              <Button
                key={type}
                variant="outline"
                className="h-auto p-4 justify-start flex flex-col items-start text-left"
                onClick={() => addWidget(type as WidgetType)}
              >
                <div className="flex items-center mb-2">
                  {info.icon}
                  <span className="ml-2 font-medium">{info.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{info.description}</p>
              </Button>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddWidgetOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Save Layout Dialog */}
      <Dialog open={isSaveLayoutOpen} onOpenChange={setIsSaveLayoutOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Dashboard Layout</DialogTitle>
            <DialogDescription>
              Save your current dashboard configuration for future use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newLayoutName || activeLayout.name}
                onChange={(e) => setNewLayoutName(e.target.value)}
                className="col-span-3"
                placeholder="My Dashboard"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="default" className="text-right">
                Make Default
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="default"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
                <span className="text-sm text-muted-foreground">
                  Use this layout by default when opening the dashboard
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveLayoutOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveLayout(
                newLayoutName || activeLayout.name, 
                isDefault
              )}
              disabled={!newLayoutName && activeLayout.id === 'default'}
            >
              Save Layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Delete Dashboard Layout
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{activeLayout.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteLayout}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DraggableDashboard;
