"use client";

import React, { useState } from "react";
import { TrainingStageConfiguration } from "./TrainingStageConfiguration";
import { AgentVersionManager } from "./AgentVersionManager";
import { DeploymentGateControls } from "./DeploymentGateControls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Workflow, Play, Pause, Settings, BarChart2, Zap, Archive, 
  Clock, GitCommit, GitMerge, GitBranch, User, GitHub, AlertTriangle
} from "lucide-react";

interface AgentTrainingPipelineProps {
  onStartTraining?: (agentId: string) => void;
  onPauseTraining?: (agentId: string) => void;
  initialAgentId?: string;
}

export function AgentTrainingPipeline({
  onStartTraining,
  onPauseTraining,
  initialAgentId
}: AgentTrainingPipelineProps) {
  // Current pipeline state
  const [pipelineActive, setPipelineActive] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);
  const [progress, setProgress] = useState(0);
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgentId || "");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  
  // Mock agent data
  const agentData = {
    id: "agent-123",
    name: "Momentum Trader v1.5",
    description: "A momentum-based trading strategy utilizing technical indicators",
    algorithm: "PPO",
    currentStage: "Training",
    status: "active",
    createdAt: "2025-04-01T12:00:00.000Z",
    createdBy: "John Smith",
    metrics: {
      trainingEpisodes: 5000,
      validationEpisodes: 1000,
      sharpeRatio: 1.85,
      totalReturn: 78.4,
      maxDrawdown: 12.8,
      winRate: 62.3
    }
  };
  
  // Total stages in pipeline
  const totalStages = 4;
  
  // Start training pipeline
  const handleStartPipeline = () => {
    setPipelineActive(true);
    
    // Simulate progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 1;
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setPipelineActive(false);
        setProgress(100);
        
        // Move to next stage if not at the end
        if (currentStage < totalStages) {
          setCurrentStage(currentStage + 1);
          setProgress(0);
        }
      } else {
        setProgress(currentProgress);
      }
    }, 500);
  };
  
  // Pause training pipeline
  const handlePausePipeline = () => {
    setPipelineActive(false);
  };
  
  // Get stage label
  const getStageLabel = (stage: number) => {
    switch (stage) {
      case 1: return "Initial Training";
      case 2: return "Advanced Training";
      case 3: return "Validation";
      case 4: return "Production Readiness";
      default: return `Stage ${stage}`;
    }
  };
  
  // Simulate training stages for display
  const stages = [
    { id: "stage-1", name: "Initial Training", status: currentStage > 1 ? "completed" : currentStage === 1 ? "active" : "pending" },
    { id: "stage-2", name: "Advanced Training", status: currentStage > 2 ? "completed" : currentStage === 2 ? "active" : "pending" },
    { id: "stage-3", name: "Validation", status: currentStage > 3 ? "completed" : currentStage === 3 ? "active" : "pending" },
    { id: "stage-4", name: "Production Readiness", status: currentStage > 4 ? "completed" : currentStage === 4 ? "active" : "pending" }
  ];
  
  // Prepare stage status badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "active":
        return <Badge className="bg-blue-500">Active</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agent Training Pipeline</h2>
          <p className="text-muted-foreground">
            Multi-stage training and deployment workflow for trading agents
          </p>
        </div>
        <div className="flex gap-2">
          {!pipelineActive ? (
            <Button 
              onClick={handleStartPipeline}
              disabled={!selectedAgentId || progress === 100}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Pipeline
            </Button>
          ) : (
            <Button onClick={handlePausePipeline}>
              <Pause className="h-4 w-4 mr-2" />
              Pause Pipeline
            </Button>
          )}
        </div>
      </div>
      
      {selectedAgentId && (
        <div>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{agentData.name}</CardTitle>
                  <CardDescription>{agentData.description}</CardDescription>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {agentData.algorithm}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">Current Stage: <span className="font-medium">{getStageLabel(currentStage)}</span></div>
                  {pipelineActive && <Badge className="bg-green-500">Running</Badge>}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Stage Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                
                <div className="flex flex-col space-y-2">
                  {stages.map((stage, index) => (
                    <div 
                      key={stage.id}
                      className={`flex justify-between items-center p-2 rounded-md ${
                        stage.status === 'active' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200' :
                        stage.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' :
                        'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            stage.status === 'completed' ? 'bg-green-500 text-white' :
                            stage.status === 'active' ? 'bg-blue-500 text-white' :
                            'bg-muted-foreground/30 text-muted-foreground'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className={stage.status === 'active' ? 'font-medium' : ''}>{stage.name}</span>
                      </div>
                      {getStatusBadge(stage.status)}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Tabs defaultValue="pipeline">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pipeline">
            <Workflow className="h-4 w-4 mr-2" />
            Pipeline Configuration
          </TabsTrigger>
          <TabsTrigger value="versions">
            <GitBranch className="h-4 w-4 mr-2" />
            Version Management
          </TabsTrigger>
          <TabsTrigger value="deployment">
            <Zap className="h-4 w-4 mr-2" />
            Deployment Gate
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pipeline" className="space-y-6 pt-4">
          <TrainingStageConfiguration 
            onSaveStages={() => {}}
          />
        </TabsContent>
        
        <TabsContent value="versions" className="space-y-6 pt-4">
          <AgentVersionManager 
            onSelectVersion={setSelectedVersionId}
            selectedVersionId={selectedVersionId}
          />
        </TabsContent>
        
        <TabsContent value="deployment" className="space-y-6 pt-4">
          {selectedVersionId ? (
            <DeploymentGateControls />
          ) : (
            <Card className="py-12">
              <CardContent className="text-center space-y-4">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                <div className="space-y-2">
                  <h3 className="font-medium">No Version Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Please select an agent version from the Version Management tab to access deployment controls
                  </p>
                  <Button variant="outline" className="mt-2">
                    Go to Version Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Pipeline Metrics (if agent is selected) */}
      {selectedAgentId && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle>Pipeline Metrics</CardTitle>
            <CardDescription>
              Training and performance metrics for the current agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Training Episodes</div>
                <div className="text-2xl font-medium">{agentData.metrics.trainingEpisodes.toLocaleString()}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                <div className="text-2xl font-medium">{agentData.metrics.sharpeRatio.toFixed(2)}</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Total Return</div>
                <div className="text-2xl font-medium">{agentData.metrics.totalReturn.toFixed(1)}%</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Win Rate</div>
                <div className="text-2xl font-medium">{agentData.metrics.winRate.toFixed(1)}%</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm">
                <BarChart2 className="h-4 w-4 mr-2" />
                View Detailed Metrics
              </Button>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                View Training History
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Integrations Section */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle>Pipeline Integrations</CardTitle>
          <CardDescription>
            Connect with external systems and version control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-muted/50 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Git Integration</CardTitle>
                <CardDescription>
                  Sync agent versions with Git repositories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <GitHub className="h-5 w-5" />
                    <span className="text-sm">Not connected</span>
                  </div>
                  <Button size="sm" variant="outline">Connect</Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Knowledge Base</CardTitle>
                <CardDescription>
                  Connect with ElizaOS knowledge base
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <span className="text-sm">Connected (3 brains)</span>
                  </div>
                  <Button size="sm" variant="outline">Configure</Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">CI/CD Pipeline</CardTitle>
                <CardDescription>
                  Automated testing and deployment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-5 w-5" />
                    <span className="text-sm">Not configured</span>
                  </div>
                  <Button size="sm" variant="outline">Setup</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
