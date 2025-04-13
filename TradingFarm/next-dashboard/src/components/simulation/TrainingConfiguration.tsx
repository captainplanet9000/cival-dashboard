"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Workflow, PlusCircle, Trash2, Settings, HelpCircle, 
  Play, Brain, ArrowRight, Gauge, Dumbbell, Zap
} from "lucide-react";

interface TrainingConfigurationProps {
  onStartTraining: (config: any) => void;
  onSaveConfiguration: (config: any) => void;
  defaultConfig?: any;
}

export function TrainingConfiguration({
  onStartTraining,
  onSaveConfiguration,
  defaultConfig
}: TrainingConfigurationProps) {
  // Training algorithm options
  const algorithms = [
    { value: "ppo", label: "Proximal Policy Optimization (PPO)" },
    { value: "dqn", label: "Deep Q-Network (DQN)" },
    { value: "a2c", label: "Advantage Actor-Critic (A2C)" },
    { value: "td3", label: "Twin Delayed DDPG (TD3)" },
    { value: "sac", label: "Soft Actor-Critic (SAC)" }
  ];
  
  // Reward function options
  const rewardFunctions = [
    { value: "sharpe", label: "Sharpe Ratio" },
    { value: "profit", label: "Total Profit" },
    { value: "win_rate", label: "Win Rate" },
    { value: "custom", label: "Custom Reward Function" }
  ];
  
  // Environment options
  const environments = [
    { value: "historical", label: "Historical Data" },
    { value: "synthetic", label: "Synthetic Data" },
    { value: "mixed", label: "Mixed (Historical + Synthetic)" }
  ];
  
  // Form state
  const [algorithm, setAlgorithm] = useState(defaultConfig?.algorithm || "ppo");
  const [batchSize, setBatchSize] = useState(defaultConfig?.batchSize || 64);
  const [learningRate, setLearningRate] = useState(defaultConfig?.learningRate || 0.0003);
  const [episodes, setEpisodes] = useState(defaultConfig?.episodes || 1000);
  const [rewardFunction, setRewardFunction] = useState(defaultConfig?.rewardFunction || "sharpe");
  const [environment, setEnvironment] = useState(defaultConfig?.environment || "historical");
  const [useGPU, setUseGPU] = useState(defaultConfig?.useGPU || true);
  const [enableEarlyStopping, setEnableEarlyStopping] = useState(defaultConfig?.enableEarlyStopping || true);
  const [saveCheckpoints, setSaveCheckpoints] = useState(defaultConfig?.saveCheckpoints || true);
  const [checkpointInterval, setCheckpointInterval] = useState(defaultConfig?.checkpointInterval || 100);
  const [configName, setConfigName] = useState(defaultConfig?.name || "New Configuration");
  
  // Custom reward function settings
  const [rewardWeights, setRewardWeights] = useState({
    profit: defaultConfig?.rewardWeights?.profit || 1.0,
    drawdown: defaultConfig?.rewardWeights?.drawdown || 0.5,
    volatility: defaultConfig?.rewardWeights?.volatility || 0.3,
    trades: defaultConfig?.rewardWeights?.trades || 0.2,
  });
  
  // Network architecture
  const [hiddenLayers, setHiddenLayers] = useState(defaultConfig?.hiddenLayers || [64, 64]);
  const [activationFunction, setActivationFunction] = useState(defaultConfig?.activationFunction || "relu");
  
  // Handle start training
  const handleStartTraining = () => {
    const config = {
      name: configName,
      algorithm,
      batchSize,
      learningRate,
      episodes,
      rewardFunction,
      environment,
      useGPU,
      enableEarlyStopping,
      saveCheckpoints,
      checkpointInterval,
      rewardWeights,
      hiddenLayers,
      activationFunction
    };
    
    onStartTraining(config);
  };
  
  // Handle save configuration
  const handleSaveConfiguration = () => {
    const config = {
      name: configName,
      algorithm,
      batchSize,
      learningRate,
      episodes,
      rewardFunction,
      environment,
      useGPU,
      enableEarlyStopping,
      saveCheckpoints,
      checkpointInterval,
      rewardWeights,
      hiddenLayers,
      activationFunction
    };
    
    onSaveConfiguration(config);
  };
  
  // Handle hidden layer update
  const updateHiddenLayer = (index: number, value: number) => {
    const updatedLayers = [...hiddenLayers];
    updatedLayers[index] = value;
    setHiddenLayers(updatedLayers);
  };
  
  // Add hidden layer
  const addHiddenLayer = () => {
    setHiddenLayers([...hiddenLayers, 64]);
  };
  
  // Remove hidden layer
  const removeHiddenLayer = (index: number) => {
    const updatedLayers = [...hiddenLayers];
    updatedLayers.splice(index, 1);
    setHiddenLayers(updatedLayers);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Training Configuration</CardTitle>
        <CardDescription>
          Configure reinforcement learning parameters for agent training
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">
              <Settings className="h-4 w-4 mr-2" />
              Basic Settings
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Brain className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="reward">
              <Gauge className="h-4 w-4 mr-2" />
              Reward Function
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="config-name">Configuration Name</Label>
              </div>
              <Input
                id="config-name"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Enter a name for this configuration"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="algorithm">Algorithm</Label>
                <Select value={algorithm} onValueChange={setAlgorithm}>
                  <SelectTrigger id="algorithm">
                    <SelectValue placeholder="Select Algorithm" />
                  </SelectTrigger>
                  <SelectContent>
                    {algorithms.map((algo) => (
                      <SelectItem key={algo.value} value={algo.value}>
                        {algo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="environment">Training Environment</Label>
                <Select value={environment} onValueChange={setEnvironment}>
                  <SelectTrigger id="environment">
                    <SelectValue placeholder="Select Environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((env) => (
                      <SelectItem key={env.value} value={env.value}>
                        {env.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="episodes" className="flex items-center">
                  <span>Training Episodes</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of complete training episodes to run</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <span className="text-sm text-muted-foreground">{episodes}</span>
              </div>
              <Slider
                id="episodes"
                min={100}
                max={10000}
                step={100}
                value={[episodes]}
                onValueChange={(value) => setEpisodes(value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100</span>
                <span>10,000</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="batch-size" className="flex items-center">
                    <span>Batch Size</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Number of samples per gradient update</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
                <Input
                  id="batch-size"
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="learning-rate" className="flex items-center">
                    <span>Learning Rate</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Step size for gradient descent</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
                <Input
                  id="learning-rate"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max="0.1"
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-gpu" className="flex items-center cursor-pointer">
                  <Zap className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Use GPU Acceleration</span>
                </Label>
                <Switch
                  id="use-gpu"
                  checked={useGPU}
                  onCheckedChange={setUseGPU}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="early-stopping" className="flex items-center cursor-pointer">
                  <ArrowRight className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Enable Early Stopping</span>
                </Label>
                <Switch
                  id="early-stopping"
                  checked={enableEarlyStopping}
                  onCheckedChange={setEnableEarlyStopping}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="flex items-center">
                <span>Network Architecture</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Configure neural network architecture</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              
              <div className="space-y-2 border p-3 rounded-md">
                <div className="text-sm font-medium">Hidden Layers</div>
                {hiddenLayers.map((size, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="bg-muted rounded-md px-2 py-1 text-xs flex-none">Layer {index + 1}</div>
                    <Input
                      type="number"
                      min="8"
                      max="512"
                      step="8"
                      value={size}
                      onChange={(e) => updateHiddenLayer(index, parseInt(e.target.value))}
                      className="h-8"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => removeHiddenLayer(index)}
                      disabled={hiddenLayers.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2" 
                  onClick={addHiddenLayer}
                  disabled={hiddenLayers.length >= 5}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Hidden Layer
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="activation">Activation Function</Label>
              <Select value={activationFunction} onValueChange={setActivationFunction}>
                <SelectTrigger id="activation">
                  <SelectValue placeholder="Select Activation Function" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relu">ReLU</SelectItem>
                  <SelectItem value="tanh">Tanh</SelectItem>
                  <SelectItem value="sigmoid">Sigmoid</SelectItem>
                  <SelectItem value="leaky_relu">Leaky ReLU</SelectItem>
                  <SelectItem value="elu">ELU</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="save-checkpoints" className="flex items-center cursor-pointer">
                  <Workflow className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Save Checkpoints</span>
                </Label>
                <Switch
                  id="save-checkpoints"
                  checked={saveCheckpoints}
                  onCheckedChange={setSaveCheckpoints}
                />
              </div>
              
              {saveCheckpoints && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="checkpoint-interval" className="text-xs text-muted-foreground">
                      Checkpoint Interval (episodes)
                    </Label>
                    <span className="text-xs text-muted-foreground">{checkpointInterval}</span>
                  </div>
                  <Slider
                    id="checkpoint-interval"
                    min={10}
                    max={500}
                    step={10}
                    value={[checkpointInterval]}
                    onValueChange={(value) => setCheckpointInterval(value[0])}
                    disabled={!saveCheckpoints}
                  />
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="reward" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="reward-function">Reward Function</Label>
              <Select value={rewardFunction} onValueChange={setRewardFunction}>
                <SelectTrigger id="reward-function">
                  <SelectValue placeholder="Select Reward Function" />
                </SelectTrigger>
                <SelectContent>
                  {rewardFunctions.map((func) => (
                    <SelectItem key={func.value} value={func.value}>
                      {func.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {rewardFunction !== 'custom' && (
                <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded-md">
                  {rewardFunction === 'sharpe' && 'Optimizes for risk-adjusted returns using the Sharpe ratio.'}
                  {rewardFunction === 'profit' && 'Maximizes total profit regardless of risk or drawdown.'}
                  {rewardFunction === 'win_rate' && 'Optimizes for highest percentage of winning trades.'}
                </div>
              )}
            </div>
            
            {rewardFunction === 'custom' && (
              <div className="space-y-4 border p-3 rounded-md">
                <div className="text-sm font-medium">Custom Reward Weights</div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="weight-profit" className="text-xs">Profit Weight</Label>
                      <span className="text-xs text-muted-foreground">{rewardWeights.profit.toFixed(1)}</span>
                    </div>
                    <Slider
                      id="weight-profit"
                      min={0}
                      max={2}
                      step={0.1}
                      value={[rewardWeights.profit]}
                      onValueChange={(value) => setRewardWeights({...rewardWeights, profit: value[0]})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="weight-drawdown" className="text-xs">Drawdown Penalty</Label>
                      <span className="text-xs text-muted-foreground">{rewardWeights.drawdown.toFixed(1)}</span>
                    </div>
                    <Slider
                      id="weight-drawdown"
                      min={0}
                      max={2}
                      step={0.1}
                      value={[rewardWeights.drawdown]}
                      onValueChange={(value) => setRewardWeights({...rewardWeights, drawdown: value[0]})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="weight-volatility" className="text-xs">Volatility Penalty</Label>
                      <span className="text-xs text-muted-foreground">{rewardWeights.volatility.toFixed(1)}</span>
                    </div>
                    <Slider
                      id="weight-volatility"
                      min={0}
                      max={2}
                      step={0.1}
                      value={[rewardWeights.volatility]}
                      onValueChange={(value) => setRewardWeights({...rewardWeights, volatility: value[0]})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="weight-trades" className="text-xs">Trade Frequency Bonus</Label>
                      <span className="text-xs text-muted-foreground">{rewardWeights.trades.toFixed(1)}</span>
                    </div>
                    <Slider
                      id="weight-trades"
                      min={0}
                      max={2}
                      step={0.1}
                      value={[rewardWeights.trades]}
                      onValueChange={(value) => setRewardWeights({...rewardWeights, trades: value[0]})}
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleSaveConfiguration}>
            Save Configuration
          </Button>
          <Button onClick={handleStartTraining}>
            <Play className="h-4 w-4 mr-2" />
            Start Training
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
