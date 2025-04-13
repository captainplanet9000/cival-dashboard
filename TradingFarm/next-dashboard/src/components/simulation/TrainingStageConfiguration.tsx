"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Settings, AlertTriangle, HelpCircle, BarChart2, 
  Gauge, Workflow, PlusCircle, Info, Zap, Trash2
} from "lucide-react";

interface StageThresholds {
  accuracy?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  profitFactor?: number;
  winRate?: number;
  [key: string]: number | undefined;
}

interface TrainingStage {
  id: string;
  name: string;
  description: string;
  environment: string;
  duration: number;
  validationDataset: string;
  thresholds: StageThresholds;
  requiresApproval: boolean;
}

interface TrainingStageConfigurationProps {
  stages?: TrainingStage[];
  onSaveStages: (stages: TrainingStage[]) => void;
}

export function TrainingStageConfiguration({
  stages: initialStages,
  onSaveStages
}: TrainingStageConfigurationProps) {
  // Default stages if none provided
  const defaultStages: TrainingStage[] = [
    {
      id: "stage-1",
      name: "Initial Training",
      description: "Basic model training with simplified market conditions",
      environment: "synthetic",
      duration: 500,
      validationDataset: "validation-1",
      thresholds: {
        accuracy: 60,
        sharpeRatio: 0.8,
        maxDrawdown: 15,
        profitFactor: 1.2,
        winRate: 52
      },
      requiresApproval: false
    },
    {
      id: "stage-2",
      name: "Advanced Training",
      description: "Training with more complex market scenarios including volatility events",
      environment: "mixed",
      duration: 1000,
      validationDataset: "validation-2",
      thresholds: {
        accuracy: 65,
        sharpeRatio: 1.0,
        maxDrawdown: 12,
        profitFactor: 1.5,
        winRate: 55
      },
      requiresApproval: true
    },
    {
      id: "stage-3",
      name: "Production Readiness",
      description: "Final tuning with real market data and stress tests",
      environment: "historical",
      duration: 1500,
      validationDataset: "validation-3",
      thresholds: {
        accuracy: 70,
        sharpeRatio: 1.2,
        maxDrawdown: 10,
        profitFactor: 1.8,
        winRate: 58
      },
      requiresApproval: true
    }
  ];
  
  const [stages, setStages] = useState<TrainingStage[]>(initialStages || defaultStages);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  
  // Available environments
  const environments = [
    { value: "synthetic", label: "Synthetic Data" },
    { value: "historical", label: "Historical Data" },
    { value: "mixed", label: "Mixed (Historical + Synthetic)" }
  ];
  
  // Available validation datasets
  const validationDatasets = [
    { value: "validation-1", label: "Basic Validation Set" },
    { value: "validation-2", label: "Advanced Validation Set" },
    { value: "validation-3", label: "Production Validation Set" },
    { value: "validation-4", label: "Stress Test Validation Set" },
    { value: "validation-5", label: "Custom Validation Set" }
  ];
  
  // Create a new stage with default values
  const createNewStage = () => {
    const newStage: TrainingStage = {
      id: `stage-${stages.length + 1}`,
      name: `Stage ${stages.length + 1}`,
      description: "New training stage",
      environment: "synthetic",
      duration: 1000,
      validationDataset: "validation-1",
      thresholds: {
        accuracy: 60,
        sharpeRatio: 1.0,
        maxDrawdown: 15,
        profitFactor: 1.2,
        winRate: 55
      },
      requiresApproval: false
    };
    
    setStages([...stages, newStage]);
    setEditingStageIndex(stages.length);
  };
  
  // Delete a stage
  const deleteStage = (index: number) => {
    if (stages.length <= 1) {
      // Don't allow deleting the last stage
      return;
    }
    
    const updatedStages = [...stages];
    updatedStages.splice(index, 1);
    setStages(updatedStages);
    
    if (editingStageIndex === index) {
      setEditingStageIndex(null);
    } else if (editingStageIndex !== null && editingStageIndex > index) {
      setEditingStageIndex(editingStageIndex - 1);
    }
  };
  
  // Edit a specific field in a stage
  const editStageField = (index: number, field: string, value: any) => {
    const updatedStages = [...stages];
    updatedStages[index] = {
      ...updatedStages[index],
      [field]: value
    };
    setStages(updatedStages);
  };
  
  // Edit a threshold value in a stage
  const editStageThreshold = (index: number, threshold: string, value: number) => {
    const updatedStages = [...stages];
    updatedStages[index] = {
      ...updatedStages[index],
      thresholds: {
        ...updatedStages[index].thresholds,
        [threshold]: value
      }
    };
    setStages(updatedStages);
  };
  
  // Save all stages
  const saveStages = () => {
    onSaveStages(stages);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Training Pipeline Configuration</CardTitle>
        <CardDescription>
          Configure the multi-stage training pipeline for agent development
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col space-y-4">
          {stages.map((stage, index) => (
            <Card key={stage.id} className={`border ${editingStageIndex === index ? 'border-primary' : 'border-border'}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base">{stage.name}</CardTitle>
                    <CardDescription>{stage.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setEditingStageIndex(editingStageIndex === index ? null : index)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteStage(index)}
                      disabled={stages.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingStageIndex === index ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`stage-name-${index}`}>Stage Name</Label>
                        <Input
                          id={`stage-name-${index}`}
                          value={stage.name}
                          onChange={(e) => editStageField(index, 'name', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`environment-${index}`}>Training Environment</Label>
                        <Select 
                          value={stage.environment} 
                          onValueChange={(value) => editStageField(index, 'environment', value)}
                        >
                          <SelectTrigger id={`environment-${index}`}>
                            <SelectValue placeholder="Select Environment" />
                          </SelectTrigger>
                          <SelectContent>
                            {environments.map(env => (
                              <SelectItem key={env.value} value={env.value}>
                                {env.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`description-${index}`}>Description</Label>
                      <Textarea
                        id={`description-${index}`}
                        value={stage.description}
                        onChange={(e) => editStageField(index, 'description', e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor={`duration-${index}`} className="flex items-center">
                            <span>Training Episodes</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Number of training episodes for this stage</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <span className="text-sm text-muted-foreground">{stage.duration}</span>
                        </div>
                        <Slider
                          id={`duration-${index}`}
                          min={100}
                          max={10000}
                          step={100}
                          value={[stage.duration]}
                          onValueChange={(value) => editStageField(index, 'duration', value[0])}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`validation-${index}`}>Validation Dataset</Label>
                        <Select 
                          value={stage.validationDataset} 
                          onValueChange={(value) => editStageField(index, 'validationDataset', value)}
                        >
                          <SelectTrigger id={`validation-${index}`}>
                            <SelectValue placeholder="Select Dataset" />
                          </SelectTrigger>
                          <SelectContent>
                            {validationDatasets.map(dataset => (
                              <SelectItem key={dataset.value} value={dataset.value}>
                                {dataset.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center">
                          <Gauge className="h-4 w-4 mr-2" />
                          <span>Performance Thresholds</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Minimum performance requirements to advance to the next stage</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor={`sharpe-${index}`} className="text-xs">
                              Sharpe Ratio
                            </Label>
                            <span className="text-xs">{stage.thresholds.sharpeRatio}</span>
                          </div>
                          <Slider
                            id={`sharpe-${index}`}
                            min={0}
                            max={3}
                            step={0.1}
                            value={[stage.thresholds.sharpeRatio || 1.0]}
                            onValueChange={(value) => editStageThreshold(index, 'sharpeRatio', value[0])}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor={`drawdown-${index}`} className="text-xs">
                              Max Drawdown (%)
                            </Label>
                            <span className="text-xs">{stage.thresholds.maxDrawdown}</span>
                          </div>
                          <Slider
                            id={`drawdown-${index}`}
                            min={5}
                            max={30}
                            step={1}
                            value={[stage.thresholds.maxDrawdown || 15]}
                            onValueChange={(value) => editStageThreshold(index, 'maxDrawdown', value[0])}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor={`profit-factor-${index}`} className="text-xs">
                              Profit Factor
                            </Label>
                            <span className="text-xs">{stage.thresholds.profitFactor}</span>
                          </div>
                          <Slider
                            id={`profit-factor-${index}`}
                            min={1}
                            max={3}
                            step={0.1}
                            value={[stage.thresholds.profitFactor || 1.2]}
                            onValueChange={(value) => editStageThreshold(index, 'profitFactor', value[0])}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor={`win-rate-${index}`} className="text-xs">
                              Win Rate (%)
                            </Label>
                            <span className="text-xs">{stage.thresholds.winRate}</span>
                          </div>
                          <Slider
                            id={`win-rate-${index}`}
                            min={40}
                            max={80}
                            step={1}
                            value={[stage.thresholds.winRate || 55]}
                            onValueChange={(value) => editStageThreshold(index, 'winRate', value[0])}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <Label htmlFor={`requires-approval-${index}`} className="flex items-center cursor-pointer">
                        <AlertTriangle className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>Requires Manual Approval</span>
                      </Label>
                      <Switch
                        id={`requires-approval-${index}`}
                        checked={stage.requiresApproval}
                        onCheckedChange={(checked) => editStageField(index, 'requiresApproval', checked)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Environment:</span>
                        <span className="font-medium">
                          {environments.find(env => env.value === stage.environment)?.label || stage.environment}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Episodes:</span>
                        <span className="font-medium">{stage.duration.toLocaleString()}</span>
                      </div>
                      
                      {stage.requiresApproval && (
                        <div className="flex items-center gap-2 text-amber-500">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Requires Manual Approval</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Thresholds:</span>
                      </div>
                      
                      <div className="text-xs space-y-1 pl-6">
                        <div className="flex justify-between">
                          <span>Sharpe Ratio:</span>
                          <span className="font-mono">{stage.thresholds.sharpeRatio}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max Drawdown:</span>
                          <span className="font-mono">{stage.thresholds.maxDrawdown}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Win Rate:</span>
                          <span className="font-mono">{stage.thresholds.winRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          <Button 
            variant="outline" 
            className="w-full mt-2" 
            onClick={createNewStage}
            disabled={stages.length >= 5}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Training Stage
          </Button>
        </div>
        
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={saveStages}>
            Save Pipeline Configuration
          </Button>
        </div>
        
        <div className="bg-muted/50 p-3 rounded-md flex items-start gap-2 text-sm">
          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Training Pipeline Flow</p>
            <p className="text-xs text-muted-foreground mt-1">
              Agents progress through each configured stage sequentially. Performance thresholds must be met at each stage before proceeding. Stages with manual approval require human validation before continuing. Configure stages that gradually increase in complexity and performance requirements.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
