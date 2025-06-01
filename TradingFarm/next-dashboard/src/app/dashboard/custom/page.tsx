/**
 * Enhanced Customizable Dashboard Page
 * Integrates drag-and-drop layouts, themes, and onboarding
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/utils/supabase/client';
import { Database } from '@/types/database.types';
import { DraggableDashboard } from '@/components/dashboard/draggable-dashboard';
import { DraggableWidgetProvider } from '@/components/dashboard/draggable-widget-context';
import { DashboardOnboarding } from '@/components/dashboard/dashboard-onboarding';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button-standardized';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  LayoutDashboard,
  Save,
  RefreshCw,
  Edit,
  PlusCircle,
  Undo,
  User,
  BookOpen,
  BarChart,
  MoreVertical,
  X,
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RealTimeMarketWidget } from '@/components/dashboard/widgets/RealTimeMarketWidget';
import { useToast } from '@/components/ui/use-toast';

// Define available widget types
const availableWidgets = [
  { id: 'market-data', name: 'Market Data', component: RealTimeMarketWidget },
  { id: 'positions', name: 'Positions', component: RealTimeMarketWidget }, // Replace with actual component
  { id: 'orders', name: 'Orders', component: RealTimeMarketWidget }, // Replace with actual component
  { id: 'performance', name: 'Performance', component: RealTimeMarketWidget }, // Replace with actual component
  { id: 'news', name: 'Market News', component: RealTimeMarketWidget }, // Replace with actual component
];

// Default dashboard layout
const defaultLayout = {
  name: 'Default',
  grid: [
    { id: 'widget-1', x: 0, y: 0, w: 12, h: 10, type: 'market-data' },
    { id: 'widget-2', x: 0, y: 10, w: 6, h: 8, type: 'positions' },
    { id: 'widget-3', x: 6, y: 10, w: 6, h: 8, type: 'orders' },
  ],
};

// Dashboard layout presets
const dashboardPresets = [
  { id: 'default', name: 'Default', icon: <LayoutDashboard className="h-4 w-4 mr-2" /> },
  { id: 'trading', name: 'Trading Focus', icon: <BarChart className="h-4 w-4 mr-2" /> },
  { id: 'analytics', name: 'Analytics', icon: <BookOpen className="h-4 w-4 mr-2" /> },
  { id: 'custom', name: 'My Custom', icon: <User className="h-4 w-4 mr-2" /> },
];

/**
 * Enhanced dashboard page with customizable layouts, themes and onboarding
 */
export default function CustomizableDashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedLayouts, setSavedLayouts] = useState<Array<any>>([]);
  const [currentLayout, setCurrentLayout] = useState(defaultLayout);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const supabase = createBrowserClient<Database>();
  const router = useRouter();
  const { toast } = useToast();

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching user:', error);
          router.push('/login');
          return;
        }
        
        if (user) {
          setUserId(user.id);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to get user:', error);
        router.push('/login');
      }
    };
    
    getUser();
  }, [supabase, router]);

  // Fetch user layouts
  useEffect(() => {
    if (!userId) return;
    
    const fetchLayouts = async () => {
      try {
        setIsLoading(true);
        
        // Check if user has any saved layouts
        const { data: userLayouts, error } = await supabase
          .from('dashboard_layouts')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching layouts:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your dashboard layouts',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        
        if (userLayouts && userLayouts.length > 0) {
          setSavedLayouts(userLayouts);
          
          // Set the default layout to the most recently updated one
          const defaultUserLayout = userLayouts[0];
          setCurrentLayout(defaultUserLayout.layout_data);
          setSelectedLayoutId(defaultUserLayout.id);
        } else {
          // If no layouts are found, mark as new user and use default
          setIsNewUser(true);
          
          // Create default layout for new user
          const { data, error: createError } = await supabase
            .from('dashboard_layouts')
            .insert({
              user_id: userId,
              name: 'Default',
              layout_data: defaultLayout,
              is_default: true,
            })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating default layout:', createError);
          } else if (data) {
            setSavedLayouts([data]);
            setSelectedLayoutId(data.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch layouts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLayouts();
  }, [userId, supabase, toast]);

  // Save current layout
  const saveLayout = async (layoutName = 'Untitled Layout') => {
    if (!userId) return;
    
    try {
      // If we have a selected layout ID, update it
      if (selectedLayoutId) {
        const { error } = await supabase
          .from('dashboard_layouts')
          .update({
            layout_data: currentLayout,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedLayoutId)
          .eq('user_id', userId);
          
        if (error) {
          throw error;
        }
        
        toast({
          title: 'Layout Saved',
          description: 'Your dashboard layout has been updated.',
        });
      } else {
        // Create a new layout
        const { data, error } = await supabase
          .from('dashboard_layouts')
          .insert({
            user_id: userId,
            name: layoutName,
            layout_data: currentLayout,
          })
          .select()
          .single();
          
        if (error) {
          throw error;
        }
        
        if (data) {
          setSavedLayouts([...savedLayouts, data]);
          setSelectedLayoutId(data.id);
        }
        
        toast({
          title: 'Layout Created',
          description: 'Your new dashboard layout has been saved.',
        });
      }
    } catch (error) {
      console.error('Failed to save layout:', error);
      toast({
        title: 'Save Failed',
        description: 'There was a problem saving your layout.',
        variant: 'destructive',
      });
    }
  };

  // Load a specific layout by ID
  const loadLayout = async (layoutId: string) => {
    try {
      const layout = savedLayouts.find((l) => l.id === layoutId);
      
      if (layout) {
        setCurrentLayout(layout.layout_data);
        setSelectedLayoutId(layoutId);
      } else {
        const { data, error } = await supabase
          .from('dashboard_layouts')
          .select('*')
          .eq('id', layoutId)
          .eq('user_id', userId)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (data) {
          setCurrentLayout(data.layout_data);
          setSelectedLayoutId(data.id);
        }
      }
    } catch (error) {
      console.error('Failed to load layout:', error);
      toast({
        title: 'Error',
        description: 'Failed to load the selected layout',
        variant: 'destructive',
      });
    }
  };

  // Create a new layout
  const createNewLayout = () => {
    setCurrentLayout(defaultLayout);
    setSelectedLayoutId(null);
    setIsEditMode(true);
    
    toast({
      title: 'New Layout',
      description: 'Creating a new dashboard layout. Save to keep your changes.',
    });
  };

  // Handle layout changes
  const handleLayoutChange = (newLayout: any) => {
    setCurrentLayout({
      ...currentLayout,
      grid: newLayout,
    });
  };

  // Add a new widget to the layout
  const addWidget = (widgetType: string) => {
    // Generate unique widget ID
    const widgetId = `widget-${Date.now()}`;
    
    // Add widget to end of layout
    setCurrentLayout({
      ...currentLayout,
      grid: [
        ...currentLayout.grid,
        {
          id: widgetId,
          type: widgetType,
          x: 0,
          y: currentLayout.grid.reduce((max, widget) => Math.max(max, widget.y + widget.h), 0),
          w: 6,
          h: 8,
        },
      ],
    });
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  // Get the component for a widget type
  const getWidgetComponent = (type: string) => {
    const widget = availableWidgets.find((w) => w.id === type);
    return widget ? widget.component : null;
  };

  // If still loading user data
  if (!userId || isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <Progress value={30} className="w-1/3 mb-4" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <DraggableWidgetProvider>
      {/* Main dashboard container */}
      <div className="flex flex-col h-full min-h-screen bg-background">
        {/* Top bar */}
        <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight trading-accent-gradient bg-clip-text text-transparent">
                Trading Farm
              </h1>
              
              <Tabs defaultValue="default" className="ml-4">
                <TabsList>
                  {dashboardPresets.map((preset) => (
                    <TabsTrigger 
                      key={preset.id} 
                      value={preset.id}
                      onClick={() => preset.id !== 'custom' && loadLayout(preset.id)}
                      className="flex items-center"
                    >
                      {preset.icon}
                      {preset.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Edit mode toggle */}
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                onClick={toggleEditMode}
                className="gap-2"
              >
                {isEditMode ? (
                  <>
                    <X className="h-4 w-4" />
                    Exit Edit Mode
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4" />
                    Customize
                  </>
                )}
              </Button>
              
              {/* Save layout button */}
              {isEditMode && (
                <Button 
                  size="sm"
                  onClick={() => saveLayout()}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Layout
                </Button>
              )}
              
              {/* Add widget button */}
              {isEditMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add Widget
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Available Widgets</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableWidgets.map((widget) => (
                      <DropdownMenuItem
                        key={widget.id}
                        onClick={() => addWidget(widget.id)}
                      >
                        {widget.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Create new layout */}
              <Button
                variant="ghost"
                size="sm"
                onClick={createNewLayout}
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                New Layout
              </Button>
              
              {/* Layouts menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Your Layouts</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {savedLayouts.map((layout) => (
                    <DropdownMenuItem
                      key={layout.id}
                      onClick={() => loadLayout(layout.id)}
                    >
                      {layout.name}
                      {selectedLayoutId === layout.id && (
                        <span className="ml-auto">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Theme switcher */}
              <ThemeSwitcher userId={userId} compact />
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 container px-4 py-6">
          <DraggableDashboard
            layout={currentLayout.grid}
            onLayoutChange={handleLayoutChange}
            isEditMode={isEditMode}
            getWidgetComponent={getWidgetComponent}
          />
        </main>
      </div>
      
      {/* Onboarding component */}
      {userId && <DashboardOnboarding userId={userId} forceShow={isNewUser} />}
    </DraggableWidgetProvider>
  );
}
