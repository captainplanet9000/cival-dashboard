"use client";

import React, { useState } from "react";
import { SimulationEngine } from "@/components/simulation/SimulationEngine";
import { ReinforcementLearningDashboard } from "@/components/simulation/ReinforcementLearningDashboard";
import { StrategyBacktestSuite } from "@/components/simulation/StrategyBacktestSuite";
import { AgentTrainingPipeline } from "@/components/simulation/AgentTrainingPipeline";
import { ScenarioManager } from "@/components/simulation/ScenarioManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Brain, 
  Layers, 
  LineChart, 
  Settings, 
  Sparkles, 
  Database,
  Workflow,
  FlaskConical,
  GitBranch
} from "lucide-react";

export default function SimulationDashboard() {
  const [activeTab, setActiveTab] = useState("simulation");
  
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simulation & RL Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive environment for market simulation, agent training, and strategy backtesting
        </p>
      </div>
      
      <Card className="pt-4">
        <CardContent className="p-0">
          <Tabs 
            defaultValue="simulation" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <div className="border-b px-6">
              <TabsList className="w-full justify-start gap-4">
                <TabsTrigger value="simulation" className="data-[state=active]:bg-primary/10">
                  <Activity className="h-4 w-4 mr-2" />
                  Simulation Engine
                </TabsTrigger>
                <TabsTrigger value="rl" className="data-[state=active]:bg-primary/10">
                  <Brain className="h-4 w-4 mr-2" />
                  RL Dashboard
                </TabsTrigger>
                <TabsTrigger value="backtest" className="data-[state=active]:bg-primary/10">
                  <LineChart className="h-4 w-4 mr-2" />
                  Strategy Backtest
                </TabsTrigger>
                <TabsTrigger value="training" className="data-[state=active]:bg-primary/10">
                  <Workflow className="h-4 w-4 mr-2" />
                  Training Pipeline
                </TabsTrigger>
                <TabsTrigger value="scenarios" className="data-[state=active]:bg-primary/10">
                  <Layers className="h-4 w-4 mr-2" />
                  Scenario Manager
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="simulation" className="px-6 pb-6">
              <SimulationEngine />
            </TabsContent>
            
            <TabsContent value="rl" className="px-6 pb-6">
              <ReinforcementLearningDashboard />
            </TabsContent>
            
            <TabsContent value="backtest" className="px-6 pb-6">
              <StrategyBacktestSuite />
            </TabsContent>
            
            <TabsContent value="training" className="px-6 pb-6">
              <AgentTrainingPipeline />
            </TabsContent>
            
            <TabsContent value="scenarios" className="px-6 pb-6">
              <ScenarioManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Reinforcement Learning Core
            </CardTitle>
            <CardDescription>
              Powered by ElizaOS AI integration
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 py-2">
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Algorithms</span>
              <div className="flex flex-wrap gap-1">
                <div className="text-xs bg-muted rounded-full px-2 py-1">PPO</div>
                <div className="text-xs bg-muted rounded-full px-2 py-1">A2C</div>
                <div className="text-xs bg-muted rounded-full px-2 py-1">DQN</div>
                <div className="text-xs bg-muted rounded-full px-2 py-1">SAC</div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Active Models</span>
              <div className="text-xl font-semibold">7</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Training Hours</span>
              <div className="text-xl font-semibold">324</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Iterations</span>
              <div className="text-xl font-semibold">12.6M</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Market Data Integration
            </CardTitle>
            <CardDescription>
              Real-time and historical data feeds
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 py-2">
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Sources</span>
              <div className="flex flex-wrap gap-1">
                <div className="text-xs bg-muted rounded-full px-2 py-1">Alpha Vantage</div>
                <div className="text-xs bg-muted rounded-full px-2 py-1">IEX</div>
                <div className="text-xs bg-muted rounded-full px-2 py-1">Yahoo</div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Asset Types</span>
              <div className="flex flex-wrap gap-1">
                <div className="text-xs bg-muted rounded-full px-2 py-1">Stocks</div>
                <div className="text-xs bg-muted rounded-full px-2 py-1">Crypto</div>
                <div className="text-xs bg-muted rounded-full px-2 py-1">Forex</div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Years Coverage</span>
              <div className="text-xl font-semibold">10+</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Data Points</span>
              <div className="text-xl font-semibold">8.2B</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Integration Status
            </CardTitle>
            <CardDescription>
              ElizaOS integration progress
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
                  <span className="text-blue-500 font-medium">In Progress</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: "80%" }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
