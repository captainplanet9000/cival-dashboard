"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  PieChart, 
  Lightbulb, 
  MessageSquare, 
  Share2, 
  Brain,
  BarChart2,
  Workflow,
  Network,
  GitMerge,
  Bot
} from "lucide-react";
import { TeamworkHub } from "@/components/collaboration/TeamworkHub";
import { PredictiveInsights } from "@/components/collaboration/PredictiveInsights";
import { ResearchCollaboration } from "@/components/collaboration/ResearchCollaboration";
import { StrategyMarketplace } from "@/components/collaboration/StrategyMarketplace";
import { AdvancedAnalytics } from "@/components/collaboration/AdvancedAnalytics";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export default function CollaborationDashboard() {
  const [activeTab, setActiveTab] = useState("teamwork");
  
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Collaborative Intelligence</h1>
        <p className="text-muted-foreground mt-1">
          Multi-user collaboration and advanced AI-powered trading insights
        </p>
      </div>
      
      <Alert className="bg-blue-50 dark:bg-blue-950/30">
        <Network className="h-4 w-4" />
        <AlertTitle>Collaborative Mode Active</AlertTitle>
        <AlertDescription>
          You are connected with 5 other team members. All actions and insights are shared in real-time.
        </AlertDescription>
      </Alert>
      
      <Card className="pt-4">
        <CardContent className="p-0">
          <Tabs 
            defaultValue="teamwork" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <div className="border-b px-6">
              <TabsList className="w-full justify-start gap-4">
                <TabsTrigger value="teamwork" className="data-[state=active]:bg-primary/10">
                  <Users className="h-4 w-4 mr-2" />
                  Teamwork Hub
                </TabsTrigger>
                <TabsTrigger value="insights" className="data-[state=active]:bg-primary/10">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Predictive Insights
                </TabsTrigger>
                <TabsTrigger value="research" className="data-[state=active]:bg-primary/10">
                  <Brain className="h-4 w-4 mr-2" />
                  Research Collaboration
                </TabsTrigger>
                <TabsTrigger value="marketplace" className="data-[state=active]:bg-primary/10">
                  <Share2 className="h-4 w-4 mr-2" />
                  Strategy Marketplace
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/10">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Advanced Analytics
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="teamwork" className="px-6 pb-6">
              <TeamworkHub />
            </TabsContent>
            
            <TabsContent value="insights" className="px-6 pb-6">
              <PredictiveInsights />
            </TabsContent>
            
            <TabsContent value="research" className="px-6 pb-6">
              <ResearchCollaboration />
            </TabsContent>
            
            <TabsContent value="marketplace" className="px-6 pb-6">
              <StrategyMarketplace />
            </TabsContent>
            
            <TabsContent value="analytics" className="px-6 pb-6">
              <AdvancedAnalytics />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Collaboration Status
            </CardTitle>
            <CardDescription>
              Current teamwork metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 py-2">
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Active Users</span>
              <div className="text-xl font-semibold">6</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Active Sessions</span>
              <div className="text-xl font-semibold">3</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Shared Insights</span>
              <div className="text-xl font-semibold">24</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Contributions</span>
              <div className="text-xl font-semibold">128</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Assistance
            </CardTitle>
            <CardDescription>
              ElizaOS Intelligence metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 py-2">
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Active Agents</span>
              <div className="text-xl font-semibold">8</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Insights Generated</span>
              <div className="text-xl font-semibold">42</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Accuracy Rate</span>
              <div className="text-xl font-semibold">92.8%</div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm text-muted-foreground">Queries Handled</span>
              <div className="text-xl font-semibold">215</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-primary" />
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
                  <span className="text-green-500 font-medium">Complete</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Phase 7: Collaborative Intelligence</span>
                  <span className="text-green-500 font-medium">Complete</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Phase 8: Mobile Integration</span>
                  <span className="text-green-500 font-medium">Complete</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
