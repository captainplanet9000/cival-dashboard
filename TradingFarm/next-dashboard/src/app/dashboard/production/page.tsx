"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  CircleDollarSign, 
  BarChart, 
  Shield, 
  Settings, 
  Activity, 
  Zap, 
  AlertTriangle,
  GitMerge,
  Database,
  Gauge
} from "lucide-react";
import { ExchangeConnector } from "@/components/production/ExchangeConnector";
import { TradingDashboard } from "@/components/production/TradingDashboard";
import { RiskManagementConsole } from "@/components/production/RiskManagementConsole";
import { DeploymentCenter } from "@/components/production/DeploymentCenter";
import { PerformanceAnalytics } from "@/components/production/PerformanceAnalytics";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export default function ProductionDashboard() {
  const [activeTab, setActiveTab] = useState("trading");
  
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Production Environment</h1>
        <p className="text-muted-foreground mt-1">
          Live trading operations, deployment, and monitoring dashboard
        </p>
      </div>
      
      <Alert variant="warning" className="bg-amber-50 dark:bg-amber-950/30">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Production Environment Active</AlertTitle>
        <AlertDescription>
          You are now in the production environment. All actions may affect real assets and trading accounts.
        </AlertDescription>
      </Alert>
      
      <Card className="pt-4">
        <CardContent className="p-0">
          <Tabs 
            defaultValue="trading" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <div className="border-b px-6">
              <TabsList className="w-full justify-start gap-4">
                <TabsTrigger value="trading" className="data-[state=active]:bg-primary/10">
                  <Activity className="h-4 w-4 mr-2" />
                  Trading Dashboard
                </TabsTrigger>
                <TabsTrigger value="deployment" className="data-[state=active]:bg-primary/10">
                  <GitMerge className="h-4 w-4 mr-2" />
                  Deployment Center
                </TabsTrigger>
                <TabsTrigger value="exchanges" className="data-[state=active]:bg-primary/10">
                  <CircleDollarSign className="h-4 w-4 mr-2" />
                  Exchange Connectors
                </TabsTrigger>
                <TabsTrigger value="risk" className="data-[state=active]:bg-primary/10">
                  <Shield className="h-4 w-4 mr-2" />
                  Risk Management
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/10">
                  <BarChart className="h-4 w-4 mr-2" />
                  Performance Analytics
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="trading" className="px-6 pb-6">
              <TradingDashboard />
            </TabsContent>
            
            <TabsContent value="deployment" className="px-6 pb-6">
              <DeploymentCenter />
            </TabsContent>
            
            <TabsContent value="exchanges" className="px-6 pb-6">
              <ExchangeConnector />
            </TabsContent>
            
            <TabsContent value="risk" className="px-6 pb-6">
              <RiskManagementConsole />
            </TabsContent>
            
            <TabsContent value="analytics" className="px-6 pb-6">
              <PerformanceAnalytics />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              System Status
            </CardTitle>
            <CardDescription>
              Real-time production environment monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 py-2">
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <div className="text-xl font-semibold">99.97%</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Active Agents</span>
              <div className="text-xl font-semibold">5</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">API Latency</span>
              <div className="text-xl font-semibold">47ms</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Last Incident</span>
              <div className="text-xl font-semibold">21d ago</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Trading Activity
            </CardTitle>
            <CardDescription>
              Last 24 hours trading statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 py-2">
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Trades</span>
              <div className="text-xl font-semibold">47</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <div className="text-xl font-semibold">68.4%</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Volume</span>
              <div className="text-xl font-semibold">$238.5K</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">P&L</span>
              <div className="text-xl font-semibold text-green-500">+$4,285</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              ElizaOS Integration
            </CardTitle>
            <CardDescription>
              Full platform integration status
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Phase 3: Knowledge Management</span>
                  <span className="text-green-500 font-medium">Complete</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Phase 4: Agent Orchestration</span>
                  <span className="text-green-500 font-medium">Complete</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Phase 5: RL & Simulation</span>
                  <span className="text-green-500 font-medium">Complete</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Phase 6: Production & Live Trading</span>
                  <span className="text-blue-500 font-medium">In Progress</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "60%" }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
