"use client";

import React, { useState } from "react";
import { ResponsiveLayout, ResponsiveContainer } from "@/components/layout/responsive-layout";
import { MobileTradingInterface } from "@/components/trading/mobile-trading-interface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeviceType, useBreakpoint } from "@/utils/responsive";
import { Smartphone, Tablet, Laptop, Sun, Moon, CircleDollarSign, ArrowUpDown, LineChart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ResponsiveTradingPage() {
  const deviceType = useDeviceType();
  const breakpoint = useBreakpoint();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [selectedExchange, setSelectedExchange] = useState("bybit");
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USDT");
  const [layout, setLayout] = useState("standard");
  
  // Mock credentials - in production these would be retrieved securely
  const mockCredentials = {
    apiKey: 'demo-api-key',
    apiSecret: 'demo-api-secret'
  };

  // Mock market data for demo purposes
  const mockMarketData = {
    lastPrice: 63542.75,
    change24h: 1.25,
    high24h: 64102.38,
    low24h: 62984.52,
    volume24h: 12587463.45,
    bid: 63540.50,
    ask: 63545.25
  };

  // Get the appropriate icon for the current device
  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5 text-primary" />;
      case 'tablet':
        return <Tablet className="h-5 w-5 text-primary" />;
      case 'desktop':
        return <Laptop className="h-5 w-5 text-primary" />;
      default:
        return <Laptop className="h-5 w-5 text-primary" />;
    }
  };

  // Handle order placement
  const handleOrderPlaced = (order: any) => {
    console.log('Order placed:', order);
  };

  // Handle symbol change
  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  // Sidebar content
  const sidebar = (
    <div className="h-full py-4">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Trading Farm
        </h2>
        <div className="space-y-1">
          <Button variant="secondary" className="w-full justify-start">
            <Smartphone className="mr-2 h-4 w-4" />
            Mobile Trading
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <LineChart className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Clock className="mr-2 h-4 w-4" />
            Order History
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <CircleDollarSign className="mr-2 h-4 w-4" />
            Portfolio
          </Button>
        </div>
      </div>
    </div>
  );

  // Header content
  const header = (
    <div className="flex h-16 items-center px-4 justify-between w-full">
      <div className="flex items-center gap-2">
        {getDeviceIcon()}
        <h2 className="text-sm font-medium">
          Responsive Trading Interface
          <span className="ml-2 text-xs text-muted-foreground">
            {deviceType} • {breakpoint}
          </span>
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="theme-switch"
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
          <Label htmlFor="theme-switch" className="cursor-pointer">
            {theme === 'dark' ? 
              <Moon className="h-4 w-4" /> : 
              <Sun className="h-4 w-4" />
            }
          </Label>
        </div>

        <Select value={selectedExchange} onValueChange={setSelectedExchange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Select exchange" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bybit">Bybit</SelectItem>
            <SelectItem value="coinbase">Coinbase</SelectItem>
            <SelectItem value="binance">Binance</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <ResponsiveLayout
      sidebar={sidebar}
      header={header}
      className="bg-muted/30"
    >
      <ResponsiveContainer>
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {selectedExchange.charAt(0).toUpperCase() + selectedExchange.slice(1)} Trading
            </h2>
            <p className="text-muted-foreground">
              Adaptive trading interface optimized for {deviceType} devices
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <ArrowUpDown className="mr-2 h-5 w-5 text-primary" />
                  Layout Options
                </div>
                <div className="text-sm font-normal text-muted-foreground">
                  Optimized for {deviceType}
                </div>
              </CardTitle>
              <CardDescription>
                Customize your trading view based on device and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="standard" value={layout} onValueChange={setLayout}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="standard">Standard</TabsTrigger>
                  <TabsTrigger value="compact">Compact</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Trading Interface */}
          <div className={cn(
            layout === 'compact' ? 'max-w-sm mx-auto' : '',
            layout === 'advanced' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''
          )}>
            {/* Mobile Trading Interface Component */}
            <MobileTradingInterface
              exchangeId={selectedExchange}
              symbol={selectedSymbol}
              credentials={mockCredentials}
              initialMarketData={mockMarketData}
              onOrderPlaced={handleOrderPlaced}
              onSymbolChange={handleSymbolChange}
            />

            {/* Additional components for advanced layout */}
            {layout === 'advanced' && (
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Trading Data</CardTitle>
                  <CardDescription>
                    Real-time market analytics and order book
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] flex items-center justify-center border rounded-md bg-muted/30">
                    <LineChart className="h-16 w-16 text-muted" />
                    <p className="ml-4 text-muted-foreground">
                      Advanced trading charts will be displayed here
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Responsive Trading Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Adaptive UI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Trading interface automatically adjusts to your device's screen size and orientation.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Touch Optimized</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Large touch targets and gesture support for seamless mobile trading experience.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Offline Capability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Queue orders when offline and sync automatically when connection is restored.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </ResponsiveContainer>
    </ResponsiveLayout>
  );
}
