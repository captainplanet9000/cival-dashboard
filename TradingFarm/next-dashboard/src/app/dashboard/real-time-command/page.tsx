"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/providers/socket-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Grid, Split, Layers, Zap, Brain, Code, Bot, BarChart } from "lucide-react";

import { MarketTicker } from "@/components/real-time/market-ticker";
import { LiveTradesFeed } from "@/components/real-time/live-trades-feed";
import { LivePortfolioChart } from "@/components/real-time/live-portfolio-chart";
import { AgentStatusGrid } from "@/components/real-time/agent-status-grid";
import { SystemAlertsFeed } from "@/components/real-time/system-alerts-feed";
import { CommandCenter } from "@/components/real-time/command-center";
import { SocketSimulator } from "@/components/real-time/socket-simulator";

const DEFAULT_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD"];

export default function RealTimeCommandPage() {
  const { isConnected, isLoading } = useSocket();
  const [simulatorActive, setSimulatorActive] = useState(true);
  const [layout, setLayout] = useState<"grid" | "split" | "stacked">("split");
  const [theme, setTheme] = useState<"knowledge" | "trading">("trading");
  
  const toggleSimulator = () => {
    setSimulatorActive(!simulatorActive);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Real-Time Trading Dashboard with ElizaOS Integration
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          Monitor live market data, execute trades, track portfolio performance, and access ElizaOS knowledge management capabilities through an interactive command interface.
        </p>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isLoading ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {isConnected && "Real-time data stream active"}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={simulatorActive}
              onCheckedChange={toggleSimulator}
              id="simulator-mode"
            />
            <label htmlFor="simulator-mode" className="text-sm cursor-pointer">
              Simulator Mode
            </label>
          </div>
          
          <ToggleGroup type="single" value={layout} onValueChange={(value) => value && setLayout(value as any)}>
            <ToggleGroupItem value="grid" aria-label="Grid Layout">
              <Grid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="split" aria-label="Split Layout">
              <Split className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="stacked" aria-label="Stacked Layout">
              <Layers className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          <ToggleGroup type="single" value={theme} onValueChange={(value) => value && setTheme(value as any)}>
            <ToggleGroupItem value="trading" aria-label="Trading Focus">
              <BarChart className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="knowledge" aria-label="Knowledge Focus">
              <Brain className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">
            <Zap className="h-4 w-4 mr-2" />
            Trading Dashboard
          </TabsTrigger>
          <TabsTrigger value="command">
            <Code className="h-4 w-4 mr-2" />
            Command Console
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Bot className="h-4 w-4 mr-2" />
            Agent Management
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          {layout === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MarketTicker symbols={DEFAULT_SYMBOLS} />
              <LivePortfolioChart />
              <LiveTradesFeed />
              <AgentStatusGrid />
              <div className="md:col-span-2">
                <SystemAlertsFeed />
              </div>
            </div>
          )}
          
          {layout === "split" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                <MarketTicker symbols={DEFAULT_SYMBOLS} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LiveTradesFeed />
                  <LivePortfolioChart />
                </div>
              </div>
              <div className="space-y-4">
                <AgentStatusGrid />
                <SystemAlertsFeed />
              </div>
            </div>
          )}
          
          {layout === "stacked" && (
            <div className="space-y-4">
              <MarketTicker symbols={DEFAULT_SYMBOLS} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LiveTradesFeed />
                <LivePortfolioChart />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AgentStatusGrid />
                <SystemAlertsFeed />
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="command">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CommandCenter />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>ElizaOS Knowledge Base</CardTitle>
                  <CardDescription>
                    Access trading insights and strategies from the knowledge base
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Knowledge Documents</span>
                      <Badge>2,134</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Vector Embeddings</span>
                      <Badge>18.6M</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Strategy Models</span>
                      <Badge>47</Badge>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recent Knowledge Updates</h4>
                      <ul className="space-y-2 text-xs">
                        <li className="flex items-center justify-between">
                          <span>Market sentiment analysis</span>
                          <span className="text-muted-foreground">3m ago</span>
                        </li>
                        <li className="flex items-center justify-between">
                          <span>BTC position sizing strategy</span>
                          <span className="text-muted-foreground">12m ago</span>
                        </li>
                        <li className="flex items-center justify-between">
                          <span>Liquidity pool risk assessment</span>
                          <span className="text-muted-foreground">28m ago</span>
                        </li>
                      </ul>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Brain className="mr-2 h-4 w-4" />
                      Access Knowledge Explorer
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <LiveTradesFeed compact />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="agents">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AgentStatusGrid detailedView />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>BossMan Coordination</CardTitle>
                  <CardDescription>
                    Farm-wide coordination and communication network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Farms</span>
                      <Badge>8</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Message Throughput</span>
                      <Badge>642/min</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Strategy Documents</span>
                      <Badge>218</Badge>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recent System Activities</h4>
                      <ul className="space-y-2 text-xs">
                        <li className="flex items-center justify-between">
                          <span>Farm-03 agent reallocation</span>
                          <span className="text-muted-foreground">2m ago</span>
                        </li>
                        <li className="flex items-center justify-between">
                          <span>Trading strategy update</span>
                          <span className="text-muted-foreground">8m ago</span>
                        </li>
                        <li className="flex items-center justify-between">
                          <span>Knowledge base synchronization</span>
                          <span className="text-muted-foreground">15m ago</span>
                        </li>
                      </ul>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Bot className="mr-2 h-4 w-4" />
                      View Farm Network
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <SystemAlertsFeed compact />
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {simulatorActive && <SocketSimulator className="mt-6" />}
    </div>
  );
}
