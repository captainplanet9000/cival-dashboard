"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileNavigation } from "@/components/mobile/MobileNavigation";
import { DeviceSync } from "@/components/mobile/DeviceSync";
import { OfflineMode } from "@/components/mobile/OfflineMode";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Tablet,
  QrCode,
  ArrowUpDown,
  DownloadCloud,
  WifiOff,
  Globe,
  Zap,
  Download,
  Share2,
  Settings,
  ChevronRight,
  Bell,
  Users,
  LineChart,
} from "lucide-react";

export default function MobileDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mobile Integration</h1>
        <p className="text-muted-foreground mt-1">
          Cross-platform access to Trading Farm with offline capabilities
        </p>
      </div>

      <Alert className="bg-blue-50 dark:bg-blue-950/30">
        <Zap className="h-4 w-4" />
        <AlertTitle>Phase 8: Mobile Integration</AlertTitle>
        <AlertDescription>
          Access your trading platform anytime, anywhere with cross-platform capabilities and offline mode.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Smartphone className="mr-2 h-5 w-5 text-blue-500" />
              Available Platforms
            </CardTitle>
            <CardDescription>Supported devices and platforms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Smartphone className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>iOS Devices</span>
              </div>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Available</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Smartphone className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>Android Devices</span>
              </div>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Available</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Tablet className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>iPadOS Tablets</span>
              </div>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Available</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Globe className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>Progressive Web App</span>
              </div>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Available</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Tablet className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>Android Tablets</span>
              </div>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Beta</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <ArrowUpDown className="mr-2 h-5 w-5 text-green-500" />
              Sync Status
            </CardTitle>
            <CardDescription>Data synchronization across platforms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <div className="font-medium mb-1">Last Synchronization</div>
              <div className="text-lg font-bold">Today, 18:10</div>
              <div className="text-muted-foreground">All devices are in sync</div>
            </div>
            <div className="text-sm">
              <div className="font-medium mb-1">Connected Devices</div>
              <div className="text-lg font-bold">4 Devices</div>
              <div className="text-muted-foreground">Across 3 platforms</div>
            </div>
            <Button variant="outline" className="w-full mt-2" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              View Sync Details
              <ChevronRight className="ml-auto h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <WifiOff className="mr-2 h-5 w-5 text-amber-500" />
              Offline Capabilities
            </CardTitle>
            <CardDescription>Trading when disconnected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <div className="font-medium mb-1">Offline Data</div>
              <div className="text-lg font-bold">2.4 GB</div>
              <div className="text-muted-foreground">Of 8 GB allocated</div>
            </div>
            <div className="text-sm">
              <div className="font-medium mb-1">Available Features</div>
              <div className="text-lg font-bold">5 Features</div>
              <div className="text-muted-foreground">Including offline analytics</div>
            </div>
            <Button variant="outline" className="w-full mt-2" size="sm">
              <WifiOff className="h-4 w-4 mr-2" />
              Configure Offline Mode
              <ChevronRight className="ml-auto h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs 
            defaultValue="overview" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <div className="border-b px-6">
              <TabsList className="w-full justify-start gap-4">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Platform Overview
                </TabsTrigger>
                <TabsTrigger value="devices" className="data-[state=active]:bg-primary/10">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Device Sync
                </TabsTrigger>
                <TabsTrigger value="offline" className="data-[state=active]:bg-primary/10">
                  <WifiOff className="h-4 w-4 mr-2" />
                  Offline Mode
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="overview" className="px-6 pb-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Installation</CardTitle>
                      <CardDescription>Get Trading Farm on all your devices</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 p-3 bg-muted rounded-lg">
                          <Download className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-medium mb-1">Mobile Applications</div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Native mobile applications provide the best performance and full feature set.
                          </p>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              App Store
                            </Button>
                            <Button variant="outline" size="sm">
                              Google Play
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 p-3 bg-muted rounded-lg">
                          <Globe className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <div className="font-medium mb-1">Progressive Web App</div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Install as a PWA for a native-like experience on any platform.
                          </p>
                          <div className="flex space-x-2">
                            <Button>
                              Install PWA
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 p-3 bg-muted rounded-lg">
                          <QrCode className="h-6 w-6 text-purple-500" />
                        </div>
                        <div>
                          <div className="font-medium mb-1">Quick Install</div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Scan the QR code with your mobile device to download.
                          </p>
                          <div className="h-32 w-32 bg-muted flex items-center justify-center rounded-lg">
                            <QrCode className="h-20 w-20 text-muted-foreground/50" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Features</CardTitle>
                      <CardDescription>Cross-platform capabilities</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 p-2 bg-blue-500/10 rounded-md mr-3">
                            <ArrowUpDown className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <div className="font-medium">Seamless Synchronization</div>
                            <p className="text-sm text-muted-foreground">
                              All your trading data, settings, and preferences stay in sync across all devices.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex-shrink-0 p-2 bg-green-500/10 rounded-md mr-3">
                            <WifiOff className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <div className="font-medium">Offline Trading</div>
                            <p className="text-sm text-muted-foreground">
                              Continue analyzing markets and testing strategies even without connectivity.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex-shrink-0 p-2 bg-amber-500/10 rounded-md mr-3">
                            <Bell className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <div className="font-medium">Push Notifications</div>
                            <p className="text-sm text-muted-foreground">
                              Get trading alerts and market notifications on all your devices.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex-shrink-0 p-2 bg-purple-500/10 rounded-md mr-3">
                            <Users className="h-5 w-5 text-purple-500" />
                          </div>
                          <div>
                            <div className="font-medium">Collaborative Trading</div>
                            <p className="text-sm text-muted-foreground">
                              Collaborate with team members from any device, anywhere.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex-shrink-0 p-2 bg-red-500/10 rounded-md mr-3">
                            <LineChart className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <div className="font-medium">Responsive Analytics</div>
                            <p className="text-sm text-muted-foreground">
                              Optimized trading analytics that adapt to any screen size.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>ElizaOS Mobile Integration</CardTitle>
                    <CardDescription>
                      Enhanced mobile capabilities with ElizaOS framework
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      The mobile integration with ElizaOS provides an autonomous AI-powered trading experience across all your devices.
                    </p>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <Zap className="h-5 w-5 text-primary mb-3" />
                        <div className="font-medium">Optimized AI Models</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Lightweight AI models optimized for mobile processors with minimal battery impact.
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <DownloadCloud className="h-5 w-5 text-primary mb-3" />
                        <div className="font-medium">Smart Caching</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Intelligent data caching prioritizes the most important information for offline use.
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <Share2 className="h-5 w-5 text-primary mb-3" />
                        <div className="font-medium">Cross-Device Agents</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Trading agents that operate seamlessly across desktop and mobile environments.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-muted p-4 rounded-lg mt-2">
                      <div className="font-medium mb-1">Compatibility Notes</div>
                      <p className="text-sm text-muted-foreground">
                        The full ElizaOS mobile integration requires iOS 16+, Android 12+, or the latest Progressive Web App. 
                        Some advanced features may have limited functionality on older devices.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="devices" className="px-6 pb-6">
              <DeviceSync />
            </TabsContent>
            
            <TabsContent value="offline" className="px-6 pb-6">
              <OfflineMode />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Mobile Navigation Component (hidden on desktop) */}
      <div className="md:hidden">
        <MobileNavigation />
      </div>
    </div>
  );
}
