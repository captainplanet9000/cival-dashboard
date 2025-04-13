"use client";

import React, { useState } from "react";
import { TrainingConfiguration } from "./TrainingConfiguration";
import { LearningProgressChart } from "./LearningProgressChart";
import { ModelEvaluationMetrics } from "./ModelEvaluationMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Play, Pause, Save, Download, Send, AlertTriangle, Share2,
  CheckCircle, XCircle, Brain, Cpu, Database, Clock
} from "lucide-react";

interface ReinforcementLearningDashboardProps {
  onSaveModel?: (modelData: any) => void;
  onExportModel?: (modelData: any) => void;
  initialModelId?: string;
}

export function ReinforcementLearningDashboard({
  onSaveModel,
  onExportModel,
  initialModelId
}: ReinforcementLearningDashboardProps) {
  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [trainingCompleted, setTrainingCompleted] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(initialModelId || "");
  const [compareModels, setCompareModels] = useState(false);
  
  // Mock models for display
  const availableModels = [
    { id: "model-1", name: "PPO Agent v1.0", algorithm: "PPO", status: "ready", createdAt: "2025-04-01T10:00:00.000Z" },
    { id: "model-2", name: "DQN Agent v0.9", algorithm: "DQN", status: "ready", createdAt: "2025-03-28T08:30:00.000Z" },
    { id: "model-3", name: "A2C Agent v1.2", algorithm: "A2C", status: "training", createdAt: "2025-04-12T14:15:00.000Z" }
  ];
  
  // Handle start training
  const handleStartTraining = (config: any) => {
    setIsTraining(true);
    setTrainingCompleted(false);
    setCurrentEpisode(0);
    setProgress(0);
    
    // Simulate training progress
    const totalEpisodes = config.episodes;
    let episode = 0;
    
    const interval = setInterval(() => {
      episode += 10;
      const newProgress = (episode / totalEpisodes) * 100;
      
      if (newProgress >= 100) {
        clearInterval(interval);
        setCurrentEpisode(totalEpisodes);
        setProgress(100);
        setIsTraining(false);
        setTrainingCompleted(true);
      } else {
        setCurrentEpisode(episode);
        setProgress(newProgress);
      }
    }, 500);
  };
  
  // Handle pause training
  const handlePauseTraining = () => {
    setIsTraining(false);
  };
  
  // Handle resume training
  const handleResumeTraining = () => {
    setIsTraining(true);
  };
  
  // Handle save model
  const handleSaveModel = () => {
    if (onSaveModel) {
      onSaveModel({
        id: `model-${Date.now()}`,
        name: "New Trained Model",
        algorithm: "PPO",
        status: "ready",
        createdAt: new Date().toISOString()
      });
    }
  };
  
  // Handle export model
  const handleExportModel = () => {
    if (onExportModel) {
      onExportModel({
        id: `model-${Date.now()}`,
        name: "New Trained Model",
        algorithm: "PPO",
        status: "ready",
        createdAt: new Date().toISOString()
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reinforcement Learning Dashboard</h2>
          <p className="text-muted-foreground">
            Train and evaluate trading agents using reinforcement learning
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!trainingCompleted}>
            <Download className="h-4 w-4 mr-2" />
            Export Model
          </Button>
          <Button variant="outline" size="sm" disabled={!trainingCompleted}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Model
          </Button>
          <Button variant="default" size="sm" disabled={!trainingCompleted}>
            <Save className="h-4 w-4 mr-2" />
            Save Model
          </Button>
        </div>
      </div>
      
      {/* Training progress indicator */}
      {progress > 0 && progress < 100 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant={isTraining ? "default" : "outline"}>
                {isTraining ? "Training" : "Paused"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Episode: {currentEpisode.toLocaleString()} / 1,000
              </span>
            </div>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-end gap-2">
            {isTraining ? (
              <Button variant="outline" size="sm" onClick={handlePauseTraining}>
                <Pause className="h-4 w-4 mr-2" />
                Pause Training
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleResumeTraining}>
                <Play className="h-4 w-4 mr-2" />
                Resume Training
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Training completed message */}
      {trainingCompleted && (
        <Card className="bg-muted/50 border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div className="flex-1">
                <div className="font-medium">Training Completed Successfully</div>
                <p className="text-sm text-muted-foreground">
                  Your model has completed training and is ready for evaluation and deployment.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Brain className="h-4 w-4 mr-2" />
                  Evaluate
                </Button>
                <Button size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save Model
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main dashboard grid */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <TrainingConfiguration 
            onStartTraining={handleStartTraining}
            onSaveConfiguration={() => {}}
          />
        </div>
        
        <div className="col-span-2">
          <Tabs defaultValue="progress">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="progress">
                <Brain className="h-4 w-4 mr-2" />
                Training Progress
              </TabsTrigger>
              <TabsTrigger value="models">
                <Database className="h-4 w-4 mr-2" />
                Trained Models
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="progress" className="space-y-6 pt-4">
              <LearningProgressChart 
                episode={currentEpisode}
                status={isTraining ? "running" : progress === 100 ? "completed" : progress > 0 ? "stopped" : "not_started"}
              />
            </TabsContent>
            
            <TabsContent value="models" className="space-y-6 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Trained Models</CardTitle>
                  <CardDescription>
                    Compare and manage your trained reinforcement learning models
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Brain className="h-4 w-4 mr-2" />
                          New Training
                        </Button>
                        
                        <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                          <SelectTrigger className="w-[240px]">
                            <SelectValue placeholder="Select Model" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map(model => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex items-center gap-2">
                                  <span>{model.name}</span>
                                  <Badge
                                    variant={
                                      model.status === "ready" ? "default" :
                                      model.status === "training" ? "outline" :
                                      "secondary"
                                    }
                                    className="ml-auto"
                                  >
                                    {model.status}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={!selectedModelId}>
                          <Cpu className="h-4 w-4 mr-2" />
                          {compareModels ? "Single View" : "Compare Models"}
                        </Button>
                      </div>
                    </div>
                    
                    {selectedModelId && (
                      <ModelEvaluationMetrics />
                    )}
                    
                    {!selectedModelId && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Select a model to view evaluation metrics</p>
                        <Button variant="outline" className="mt-4">
                          <Brain className="h-4 w-4 mr-2" />
                          Start New Training
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Additional information */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        <Card className="col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Training Resources</CardTitle>
            <CardDescription>
              Computation and data resources used for reinforcement learning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">CPU Usage</span>
                  <span className="font-medium">78%</span>
                </div>
                <Progress value={78} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>8 cores</span>
                  <span>3.5 GHz</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">GPU Usage</span>
                  <span className="font-medium">92%</span>
                </div>
                <Progress value={92} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>CUDA Enabled</span>
                  <span>12GB VRAM</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Memory Usage</span>
                  <span className="font-medium">45%</span>
                </div>
                <Progress value={45} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>7.2 GB</span>
                  <span>16 GB Total</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Training Time</span>
                  <span className="font-medium">01:45:23</span>
                </div>
                <Progress value={65} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Estimated remaining: 00:55:12</span>
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
