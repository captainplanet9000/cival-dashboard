"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentCoordinationDashboard } from "@/components/agent/AgentCoordinationDashboard";
import { StrategyOptimizationEngine } from "@/components/agent/StrategyOptimizationEngine";
import { MarketConditionAnalysis } from "@/components/agent/MarketConditionAnalysis";
import { DecisionAugmentationInterface } from "@/components/agent/DecisionAugmentationInterface";
import { Brain, Settings, BarChart2, UserCheck, Sparkles } from "lucide-react";

export default function AgentOrchestrationPage() {
  const [activeTab, setActiveTab] = useState("coordination");
  
  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ElizaOS Agent Orchestration</h1>
        <p className="text-muted-foreground">
          Orchestrate AI agents to create sophisticated trading strategies and augment your decision making
        </p>
      </div>
      
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Agent Orchestration Beta</h3>
              <p className="text-sm text-muted-foreground">
                Welcome to the ElizaOS Agent Orchestration system. This platform enables you to compose teams of AI agents, 
                optimize strategies, analyze market conditions, and augment your trading decisions with AI intelligence.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="coordination" className="flex items-center gap-1">
            <Brain className="h-4 w-4" />
            <span>Agent Coordination</span>
          </TabsTrigger>
          <TabsTrigger value="strategy" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>Strategy Optimization</span>
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-1">
            <BarChart2 className="h-4 w-4" />
            <span>Market Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="decision" className="flex items-center gap-1">
            <UserCheck className="h-4 w-4" />
            <span>Decision Support</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="coordination" className="mt-6">
          <AgentCoordinationDashboard farmId="1" />
        </TabsContent>
        
        <TabsContent value="strategy" className="mt-6">
          <StrategyOptimizationEngine farmId="1" />
        </TabsContent>
        
        <TabsContent value="market" className="mt-6">
          <MarketConditionAnalysis symbol="BTC/USD" />
        </TabsContent>
        
        <TabsContent value="decision" className="mt-6">
          <DecisionAugmentationInterface farmId="1" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
