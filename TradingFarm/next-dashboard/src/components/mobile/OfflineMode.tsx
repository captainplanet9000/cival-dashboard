"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  WifiOff,
  Database,
  Download,
  FileDown,
  BarChart2,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Trash2,
  Settings,
  Smartphone,
  Calendar,
  Zap,
  HardDrive
} from "lucide-react";

interface OfflineDataCategory {
  id: string;
  name: string;
  description: string;
  size: string;
  lastUpdated: string;
  enabled: boolean;
  status: "synced" | "syncing" | "pending" | "error";
  progress?: number;
}

interface OfflineFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiresDataSync: boolean;
}

export function OfflineMode() {
  // State for offline data categories
  const [dataCategories, setDataCategories] = useState<OfflineDataCategory[]>([
    {
      id: "data-1",
      name: "Market Data",
      description: "Historical price and volume data for major assets",
      size: "1.2 GB",
      lastUpdated: "2025-04-12T17:30:00Z",
      enabled: true,
      status: "synced"
    },
    {
      id: "data-2",
      name: "Trading History",
      description: "Your recent trades and positions",
      size: "245 MB",
      lastUpdated: "2025-04-12T18:00:10Z",
      enabled: true,
      status: "synced"
    },
    {
      id: "data-3",
      name: "Strategy Models",
      description: "Your configured trading strategies and models",
      size: "385 MB",
      lastUpdated: "2025-04-12T12:15:22Z",
      enabled: true,
      status: "synced"
    },
    {
      id: "data-4",
      name: "Analysis Documents",
      description: "Your saved research and analysis documents",
      size: "520 MB",
      lastUpdated: "2025-04-11T18:45:30Z",
      enabled: false,
      status: "pending"
    },
    {
      id: "data-5",
      name: "Chart Templates",
      description: "Your custom chart layouts and indicators",
      size: "125 MB",
      lastUpdated: "2025-04-12T16:30:45Z",
      enabled: true,
      status: "synced"
    },
    {
      id: "data-6",
      name: "Advanced Visualizations",
      description: "Complex charts and visualizations",
      size: "480 MB",
      lastUpdated: "2025-04-10T14:20:15Z",
      enabled: false,
      status: "pending"
    }
  ]);
  
  // State for offline features
  const [features, setFeatures] = useState<OfflineFeature[]>([
    {
      id: "feature-1",
      name: "Offline Trading Simulation",
      description: "Run trading simulations without internet",
      enabled: true,
      requiresDataSync: true
    },
    {
      id: "feature-2",
      name: "Offline Analytics",
      description: "Analyze historical data without connectivity",
      enabled: true,
      requiresDataSync: true
    },
    {
      id: "feature-3",
      name: "Offline Strategy Backtesting",
      description: "Test strategies against historical data",
      enabled: true,
      requiresDataSync: true
    },
    {
      id: "feature-4",
      name: "Offline Journal & Notes",
      description: "Record observations and ideas while offline",
      enabled: true,
      requiresDataSync: false
    },
    {
      id: "feature-5",
      name: "Pending Order Queue",
      description: "Queue orders to execute when back online",
      enabled: true,
      requiresDataSync: false
    },
    {
      id: "feature-6",
      name: "Offline Alerts",
      description: "Receive alerts based on cached conditions",
      enabled: false,
      requiresDataSync: true
    }
  ]);
  
  // State for offline status and settings
  const [offlineSettings, setOfflineSettings] = useState({
    offlineModeEnabled: true,
    autoSyncWhenOnline: true,
    mobileCellularSync: false,
    lowPowerMode: false,
    lastFullSync: "2025-04-12T18:00:10Z",
    totalStorageUsed: "2.4 GB",
    totalAvailable: "8 GB",
    maxOfflineTime: "7 days"
  });
  
  // Status info
  const storageUsedPercentage = Math.round((parseInt(offlineSettings.totalStorageUsed) / 
    parseInt(offlineSettings.totalAvailable)) * 100);
  
  // Toggle offline mode
  const toggleOfflineMode = () => {
    setOfflineSettings({
      ...offlineSettings,
      offlineModeEnabled: !offlineSettings.offlineModeEnabled
    });
  };
  
  // Toggle auto sync
  const toggleAutoSync = () => {
    setOfflineSettings({
      ...offlineSettings,
      autoSyncWhenOnline: !offlineSettings.autoSyncWhenOnline
    });
  };
  
  // Toggle mobile data sync
  const toggleMobileSync = () => {
    setOfflineSettings({
      ...offlineSettings,
      mobileCellularSync: !offlineSettings.mobileCellularSync
    });
  };
  
  // Toggle low power mode
  const toggleLowPowerMode = () => {
    setOfflineSettings({
      ...offlineSettings,
      lowPowerMode: !offlineSettings.lowPowerMode
    });
  };
  
  // Toggle data category enabled state
  const toggleDataCategory = (id: string) => {
    setDataCategories(categories =>
      categories.map(category =>
        category.id === id ? { ...category, enabled: !category.enabled } : category
      )
    );
  };
  
  // Toggle feature enabled state
  const toggleFeature = (id: string) => {
    setFeatures(featureList =>
      featureList.map(feature =>
        feature.id === id ? { ...feature, enabled: !feature.enabled } : feature
      )
    );
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status badge for data category
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "synced":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        );
      case "syncing":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">{status}</Badge>
        );
    }
  };
  
  // Initiate full sync
  const startFullSync = () => {
    // Simulate starting a sync for all enabled but not synced categories
    setDataCategories(categories =>
      categories.map(category => {
        if (category.enabled && category.status !== "synced") {
          return {
            ...category,
            status: "syncing",
            progress: 0
          };
        }
        return category;
      })
    );
    
    // Simulate progress updates for syncing categories
    const interval = setInterval(() => {
      setDataCategories(categories => {
        const updatedCategories = categories.map(category => {
          if (category.status === "syncing") {
            const newProgress = (category.progress || 0) + 10;
            
            if (newProgress >= 100) {
              return {
                ...category,
                status: "synced",
                progress: undefined,
                lastUpdated: new Date().toISOString()
              };
            }
            
            return {
              ...category,
              progress: newProgress
            };
          }
          return category;
        });
        
        // Check if all syncing is complete
        if (!updatedCategories.some(cat => cat.status === "syncing")) {
          clearInterval(interval);
          setOfflineSettings({
            ...offlineSettings,
            lastFullSync: new Date().toISOString()
          });
        }
        
        return updatedCategories;
      });
    }, 500);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Offline Mode</h2>
          <p className="text-muted-foreground">
            Configure offline access to trading tools and data
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={startFullSync}>
            <Download className="h-4 w-4 mr-2" />
            Sync All Data
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Advanced Settings
          </Button>
        </div>
      </div>
      
      <Alert className={offlineSettings.offlineModeEnabled ? "bg-green-50 dark:bg-green-950/30" : "bg-amber-50 dark:bg-amber-950/30"}>
        {offlineSettings.offlineModeEnabled ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500" />
        )}
        <AlertTitle>
          {offlineSettings.offlineModeEnabled ? "Offline Mode Enabled" : "Offline Mode Disabled"}
        </AlertTitle>
        <AlertDescription>
          {offlineSettings.offlineModeEnabled 
            ? `You can access your trading data and tools when offline. Last full sync: ${formatDate(offlineSettings.lastFullSync)}.`
            : "Enable offline mode to access trading data and tools when you don't have internet connectivity."}
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Storage Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offlineSettings.totalStorageUsed}</div>
            <div className="text-sm text-muted-foreground mb-2">
              of {offlineSettings.totalAvailable} allocated
            </div>
            <Progress value={storageUsedPercentage} className="h-2" />
            <div className="mt-1 text-xs text-muted-foreground text-right">
              {storageUsedPercentage}% used
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Last Full Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(offlineSettings.lastFullSync)}</div>
            <div className="text-sm text-muted-foreground">
              Data available for {offlineSettings.maxOfflineTime}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Offline Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <span className="mr-2">Ready</span>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                All Systems
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              All critical features available
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Offline Data Management</CardTitle>
            <CardDescription>
              Configure what data is available when offline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {dataCategories.map((category) => (
                <div 
                  key={category.id} 
                  className={`p-4 border rounded-lg ${category.enabled ? 'border-primary/20' : 'border-muted'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium flex items-center">
                        {category.name}
                        {getStatusBadge(category.status)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {category.description}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="text-sm text-right mr-4">
                        <div>{category.size}</div>
                        <div className="text-xs text-muted-foreground">
                          Updated: {formatDate(category.lastUpdated)}
                        </div>
                      </div>
                      <Switch 
                        checked={category.enabled} 
                        onCheckedChange={() => toggleDataCategory(category.id)} 
                      />
                    </div>
                  </div>
                  
                  {category.status === "syncing" && category.progress !== undefined && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span>Downloading...</span>
                        <span>{category.progress}%</span>
                      </div>
                      <Progress value={category.progress} className="h-1.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-5">
          <CardHeader>
            <CardTitle>Offline Settings</CardTitle>
            <CardDescription>
              Configure offline behavior and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Enable Offline Mode</div>
                  <div className="text-sm text-muted-foreground">
                    Access trading tools without internet
                  </div>
                </div>
                <Switch 
                  checked={offlineSettings.offlineModeEnabled} 
                  onCheckedChange={toggleOfflineMode}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Auto-Sync When Online</div>
                  <div className="text-sm text-muted-foreground">
                    Automatically sync data when connection is restored
                  </div>
                </div>
                <Switch 
                  checked={offlineSettings.autoSyncWhenOnline}
                  onCheckedChange={toggleAutoSync} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Sync Over Cellular Data</div>
                  <div className="text-sm text-muted-foreground">
                    Allow syncing when on mobile data (may use data plan)
                  </div>
                </div>
                <Switch 
                  checked={offlineSettings.mobileCellularSync}
                  onCheckedChange={toggleMobileSync} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Low Power Offline Mode</div>
                  <div className="text-sm text-muted-foreground">
                    Reduces functionality to conserve battery
                  </div>
                </div>
                <Switch 
                  checked={offlineSettings.lowPowerMode}
                  onCheckedChange={toggleLowPowerMode} 
                />
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="font-medium">Offline Retention Period</div>
                <div className="text-sm text-muted-foreground mb-3">
                  How long data is kept available offline
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">7 days</div>
                  <div className="text-sm">14 days</div>
                  <div className="text-sm">30 days</div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "25%" }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Offline Available Features</CardTitle>
          <CardDescription>
            Features you can use when offline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="available" className="space-y-4">
            <TabsList>
              <TabsTrigger value="available">
                <CheckCircle className="h-4 w-4 mr-2" />
                Available Features
              </TabsTrigger>
              <TabsTrigger value="limited">
                <AlertCircle className="h-4 w-4 mr-2" />
                Limited Features
              </TabsTrigger>
              <TabsTrigger value="unavailable">
                <WifiOff className="h-4 w-4 mr-2" />
                Unavailable Features
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="available" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {features.filter(f => f.enabled).map((feature) => (
                  <Card key={feature.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{feature.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                      {feature.requiresDataSync && (
                        <div className="mt-2 flex items-center text-xs text-amber-500">
                          <Info className="h-3 w-3 mr-1" />
                          Requires synced data
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="limited" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Limited Functionality</AlertTitle>
                <AlertDescription>
                  These features are available offline with limited functionality or reduced data sets.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Real-time Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Limited to cached data, no real-time updates
                    </p>
                    <div className="mt-2 flex items-center text-xs text-amber-500">
                      <Info className="h-3 w-3 mr-1" />
                      Using latest synced data
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Portfolio Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      View but not update positions
                    </p>
                    <div className="mt-2 flex items-center text-xs text-amber-500">
                      <Info className="h-3 w-3 mr-1" />
                      Updates when reconnected
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Market Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Available with cached market data only
                    </p>
                    <div className="mt-2 flex items-center text-xs text-amber-500">
                      <Info className="h-3 w-3 mr-1" />
                      Limited to synced time periods
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="unavailable" className="space-y-4">
              <Alert className="bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300">
                <WifiOff className="h-4 w-4" />
                <AlertTitle>Unavailable When Offline</AlertTitle>
                <AlertDescription>
                  These features require an active internet connection and cannot be used in offline mode.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Live Trading</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Executing live trades requires internet connectivity
                    </p>
                    <div className="mt-2 flex items-center text-xs text-red-500">
                      <Info className="h-3 w-3 mr-1" />
                      Unavailable offline
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Real-time Market Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Live price feeds and market data streams
                    </p>
                    <div className="mt-2 flex items-center text-xs text-red-500">
                      <Info className="h-3 w-3 mr-1" />
                      Unavailable offline
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Collaborative Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Team collaboration and shared analysis
                    </p>
                    <div className="mt-2 flex items-center text-xs text-red-500">
                      <Info className="h-3 w-3 mr-1" />
                      Unavailable offline
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
