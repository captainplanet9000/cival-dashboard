"use client";

import { useState } from "react";
import { MarketTicker } from "@/components/real-time/market-ticker";
import { LiveTradesFeed } from "@/components/real-time/live-trades-feed";
import { LivePortfolioChart } from "@/components/real-time/live-portfolio-chart";
import { AgentStatusGrid } from "@/components/real-time/agent-status-grid";
import { SystemAlertsFeed } from "@/components/real-time/system-alerts-feed";
import { SocketSimulator } from "@/components/real-time/socket-simulator";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RealTimeDemoPage() {
  const [activeTab, setActiveTab] = useState("simulator");
  
  return (
    <div className="container p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Real-Time Components Demo</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Test real-time components with the Socket.IO simulator
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="simulator" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:w-[400px]">
          <TabsTrigger value="simulator">Socket.IO Simulator</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
        </TabsList>
        
        <TabsContent value="simulator" className="space-y-6 mt-6">
          <div className="max-w-3xl">
            <SocketSimulator />
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-2">How to Use the Simulator</h2>
              <p className="text-muted-foreground mb-4">
                This simulator helps you test real-time components without a backend server. Here's how to use it:
              </p>
              
              <ol className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className="font-semibold">1.</span>
                  <div>
                    <p className="font-semibold">Enable the simulator</p>
                    <p className="text-muted-foreground">Toggle the switch to start generating mock Socket.IO events</p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">2.</span>
                  <div>
                    <p className="font-semibold">Adjust the frequency</p>
                    <p className="text-muted-foreground">Control how often updates are emitted using the slider</p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">3.</span>
                  <div>
                    <p className="font-semibold">Emit specific events</p>
                    <p className="text-muted-foreground">Use the tabs to manually emit different types of events</p>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">4.</span>
                  <div>
                    <p className="font-semibold">Switch to Components tab</p>
                    <p className="text-muted-foreground">View the real-time components responding to the simulated events</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-2">Integration with Socket.IO Hooks</h2>
              <p className="text-muted-foreground mb-4">
                The Trading Farm dashboard includes the following Socket.IO hooks:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-semibold">useSocketMarket</p>
                  <p className="text-xs text-muted-foreground">Real-time market data updates including price, volume, and order book data</p>
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-semibold">useSocketTrades</p>
                  <p className="text-xs text-muted-foreground">Trade execution notifications and history</p>
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-semibold">useSocketPortfolio</p>
                  <p className="text-xs text-muted-foreground">Portfolio value changes and rebalancing updates</p>
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-semibold">useSocketAgents</p>
                  <p className="text-xs text-muted-foreground">Agent status updates and control</p>
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-semibold">useSocketAlerts</p>
                  <p className="text-xs text-muted-foreground">System alerts and notifications with ElizaOS knowledge integration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="components" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MarketTicker className="lg:col-span-2" />
            <LiveTradesFeed />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <LivePortfolioChart className="lg:col-span-2" />
            <SystemAlertsFeed />
          </div>
          
          <div className="pt-4">
            <AgentStatusGrid />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
