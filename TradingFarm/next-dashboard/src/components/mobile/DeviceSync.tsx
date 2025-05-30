"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Smartphone, 
  Laptop, 
  Tablet, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Trash2,
  Plus,
  Cloud,
  Download,
  Upload,
  Info,
  WifiOff,
  Signal,
  MoreVertical,
  Settings
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Device {
  id: string;
  name: string;
  type: "mobile" | "tablet" | "desktop";
  lastSync: string;
  status: "online" | "offline";
  batteryLevel?: number;
  osVersion: string;
  model: string;
  isCurrentDevice: boolean;
}

interface SyncPreference {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export function DeviceSync() {
  // State for devices and sync preferences
  const [devices, setDevices] = useState<Device[]>([
    {
      id: "device-1",
      name: "iPhone 13 Pro",
      type: "mobile",
      lastSync: "2025-04-12T17:45:23Z",
      status: "online",
      batteryLevel: 72,
      osVersion: "iOS 18.2",
      model: "iPhone 13 Pro",
      isCurrentDevice: false
    },
    {
      id: "device-2",
      name: "MacBook Pro",
      type: "desktop",
      lastSync: "2025-04-12T18:10:05Z",
      status: "online",
      batteryLevel: 85,
      osVersion: "macOS 14.4",
      model: "MacBook Pro M3",
      isCurrentDevice: true
    },
    {
      id: "device-3",
      name: "iPad Air",
      type: "tablet",
      lastSync: "2025-04-12T15:32:18Z",
      status: "offline",
      batteryLevel: 28,
      osVersion: "iPadOS 18.2",
      model: "iPad Air (5th gen)",
      isCurrentDevice: false
    },
    {
      id: "device-4",
      name: "Android Phone",
      type: "mobile",
      lastSync: "2025-04-12T16:22:45Z",
      status: "online",
      batteryLevel: 64,
      osVersion: "Android 15",
      model: "Pixel 8 Pro",
      isCurrentDevice: false
    }
  ]);
  
  const [syncPreferences, setSyncPreferences] = useState<SyncPreference[]>([
    {
      id: "pref-1",
      name: "Trading Data",
      description: "Sync positions, orders, and trading history",
      enabled: true
    },
    {
      id: "pref-2",
      name: "Charts & Layouts",
      description: "Sync chart configurations and workspace layouts",
      enabled: true
    },
    {
      id: "pref-3",
      name: "Alerts & Notifications",
      description: "Sync custom alerts and notification preferences",
      enabled: true
    },
    {
      id: "pref-4",
      name: "Strategy Configurations",
      description: "Sync trading strategy parameters",
      enabled: true
    },
    {
      id: "pref-5",
      name: "Offline Mode Data",
      description: "Sync data for offline operation (uses more storage)",
      enabled: false
    },
    {
      id: "pref-6",
      name: "Market Analysis",
      description: "Sync research and analysis documents",
      enabled: true
    }
  ]);
  
  const [syncStatus, setSyncStatus] = useState<{
    lastSync: string;
    syncInProgress: boolean;
    progress: number;
    error: string | null;
  }>({
    lastSync: "2025-04-12T18:10:05Z",
    syncInProgress: false,
    progress: 0,
    error: null
  });
  
  // Function to toggle preference enabled state
  const togglePreference = (id: string) => {
    setSyncPreferences(preferences => 
      preferences.map(pref => 
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };
  
  // Function to format date
  const formatSyncTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Function to get relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };
  
  // Device icon based on type
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      case "desktop":
        return <Laptop className="h-5 w-5" />;
      default:
        return <Smartphone className="h-5 w-5" />;
    }
  };
  
  // Function to simulate sync
  const startSync = () => {
    if (syncStatus.syncInProgress) return;
    
    setSyncStatus({
      ...syncStatus,
      syncInProgress: true,
      progress: 0,
      error: null
    });
    
    // Simulate progress
    const interval = setInterval(() => {
      setSyncStatus(prev => {
        if (prev.progress >= 100) {
          clearInterval(interval);
          return {
            ...prev,
            progress: 100,
            syncInProgress: false,
            lastSync: new Date().toISOString()
          };
        }
        return {
          ...prev,
          progress: prev.progress + 10
        };
      });
    }, 400);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Device Sync</h2>
          <p className="text-muted-foreground">
            Manage cross-platform synchronization across all your devices
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={startSync} disabled={syncStatus.syncInProgress}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus.syncInProgress ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Advanced Settings
          </Button>
        </div>
      </div>
      
      {syncStatus.syncInProgress && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">Synchronizing data across devices...</div>
                <div className="text-sm text-muted-foreground">{syncStatus.progress}%</div>
              </div>
              <Progress value={syncStatus.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
      
      {!syncStatus.syncInProgress && (
        <Alert>
          <Cloud className="h-4 w-4" />
          <AlertTitle>Sync Status</AlertTitle>
          <AlertDescription>
            All of your data is synchronized across your devices. Last sync: {getRelativeTime(syncStatus.lastSync)}.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Connected Devices</CardTitle>
            <CardDescription>
              Devices that are synced with your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {devices.map((device) => (
                <div 
                  key={device.id} 
                  className={`flex items-center p-3 rounded-lg border ${
                    device.isCurrentDevice ? 'bg-muted/50 border-primary/50' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    device.status === 'online' ? 'bg-green-500/10' : 'bg-gray-500/10'
                  }`}>
                    {getDeviceIcon(device.type)}
                  </div>
                  
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center">
                          {device.name}
                          {device.isCurrentDevice && (
                            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
                              Current Device
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {device.model} • {device.osVersion}
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        {device.status === 'online' ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            <Signal className="h-3 w-3 mr-1" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                            <WifiOff className="h-3 w-3 mr-1" />
                            Offline
                          </Badge>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-2">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Device Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync This Device
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Info className="h-4 w-4 mr-2" />
                              Device Info
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Device
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        Last sync: {formatSyncTime(device.lastSync)}
                      </div>
                      
                      {device.batteryLevel !== undefined && (
                        <div className="flex items-center text-sm">
                          <div 
                            className={`w-8 h-3 border rounded-sm mr-1 relative overflow-hidden ${
                              device.batteryLevel < 20 ? 'border-red-500' : 'border-green-500'
                            }`}
                          >
                            <div 
                              className={`absolute top-0 left-0 bottom-0 ${
                                device.batteryLevel < 20 ? 'bg-red-500' : 'bg-green-500'
                              }`} 
                              style={{ width: `${device.batteryLevel}%` }}
                            ></div>
                          </div>
                          <span className={device.batteryLevel < 20 ? 'text-red-500' : ''}>
                            {device.batteryLevel}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" className="w-full mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add New Device
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-5">
          <CardHeader>
            <CardTitle>Sync Preferences</CardTitle>
            <CardDescription>
              Control what data is synchronized across devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {syncPreferences.map((pref) => (
                <div key={pref.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{pref.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {pref.description}
                    </div>
                  </div>
                  <Switch 
                    checked={pref.enabled} 
                    onCheckedChange={() => togglePreference(pref.id)} 
                  />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <div className="text-sm text-muted-foreground">
              <Info className="h-4 w-4 inline-block mr-1" />
              Changes apply to all devices
            </div>
            <Button variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Sync Statistics</CardTitle>
          <CardDescription>
            Data synchronization metrics and history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Synced Data</div>
              <div className="text-2xl font-bold">2.4 GB</div>
              <div className="text-sm text-muted-foreground">Across all devices</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Last 24 Hours</div>
              <div className="text-2xl font-bold">342 MB</div>
              <div className="text-sm text-green-500">+24% from average</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Average Sync Speed</div>
              <div className="text-2xl font-bold">4.8 MB/s</div>
              <div className="text-sm text-muted-foreground">Based on last 10 syncs</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Cloud Storage Used</div>
              <div className="text-2xl font-bold">18%</div>
              <div className="text-sm text-muted-foreground">4.5 GB of 25 GB</div>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Sync Activity</div>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>MacBook Pro • Full sync completed • 10 minutes ago</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>iPhone 13 Pro • Partial sync (Trading Data) • 35 minutes ago</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>Pixel 8 Pro • Full sync completed • 1 hour ago</span>
              </div>
              <div className="flex items-center text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                <span>iPad Air • Sync interrupted (battery low) • 3 hours ago</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>MacBook Pro • Partial sync (Charts & Layouts) • 5 hours ago</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
