"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from "recharts";
import { 
  LineChart as LineChartIcon, BarChart2, RefreshCw, Download, TrendingUp, 
  TrendingDown, ZoomIn, ZoomOut, ChevronRight, ChevronLeft, Save, Copy
} from "lucide-react";

interface LearningProgressChartProps {
  trainingData?: any[];
  modelId?: string;
  episode?: number;
  status?: "running" | "completed" | "stopped" | "not_started";
  compareModels?: boolean;
  comparisonData?: {
    [key: string]: any[];
  };
}

export function LearningProgressChart({
  trainingData,
  modelId,
  episode = 0,
  status = "not_started",
  compareModels = false,
  comparisonData = {}
}: LearningProgressChartProps) {
  const [metricType, setMetricType] = useState<string>("reward");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [smoothing, setSmoothing] = useState<number>(0);
  
  // Create default training data if none provided
  const defaultData = Array.from({ length: 1000 }, (_, i) => {
    const noise = Math.sin(i / 30) * 10 + (Math.random() * 15 - 7.5);
    const progress = i / 10;
    
    return {
      episode: i + 1,
      reward: Math.min(50, Math.max(-20, progress + noise)),
      loss: Math.max(0.1, 5 - (progress / 20) + Math.abs(noise / 10)),
      entropy: Math.max(0.1, 2 - (progress / 50) + Math.abs(noise / 20)),
      value_loss: Math.max(0.1, 3 - (progress / 30) + Math.abs(noise / 15))
    };
  });
  
  // Use provided data or default
  const data = trainingData || defaultData;
  
  // Metric options
  const metrics = [
    { value: "reward", label: "Reward", color: "#2563eb", description: "Average episode reward" },
    { value: "loss", label: "Policy Loss", color: "#ef4444", description: "Policy network loss" },
    { value: "entropy", label: "Entropy", color: "#8b5cf6", description: "Policy entropy (exploration)" },
    { value: "value_loss", label: "Value Loss", color: "#f59e0b", description: "Value network loss" }
  ];
  
  // Get current metric details
  const currentMetric = metrics.find(m => m.value === metricType) || metrics[0];
  
  // Apply smoothing to data if needed
  const smoothData = (data: any[], factor: number) => {
    if (factor <= 0) return data;
    
    const smoothed = [...data];
    const windowSize = Math.max(2, Math.floor(factor * 10));
    
    for (let i = 0; i < smoothed.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - windowSize); j <= Math.min(data.length - 1, i + windowSize); j++) {
        sum += data[j][metricType];
        count++;
      }
      
      if (count > 0) {
        smoothed[i] = {
          ...smoothed[i],
          [`${metricType}_smoothed`]: sum / count
        };
      }
    }
    
    return smoothed;
  };
  
  // Apply zoom and smoothing
  const processData = () => {
    const smoothedData = smoothing > 0 ? smoothData(data, smoothing) : data;
    
    // Apply zoom
    const visibleDataPoints = Math.floor(smoothedData.length * (100 / zoomLevel));
    const startIndex = Math.max(0, smoothedData.length - visibleDataPoints);
    return smoothedData.slice(startIndex);
  };
  
  const processedData = processData();
  
  // Generate model comparison data
  const generateComparisonData = () => {
    const models = [
      { id: "model-1", name: "PPO Agent", color: "#2563eb" },
      { id: "model-2", name: "DQN Agent", color: "#ef4444" },
      { id: "model-3", name: "A2C Agent", color: "#8b5cf6" }
    ];
    
    return models.map(model => {
      // Generate some variation in the data for each model
      const variation = model.id === "model-1" ? 1 : 
                        model.id === "model-2" ? 0.8 : 0.9;
      
      const modelData = Array.from({ length: 1000 }, (_, i) => {
        const noise = Math.sin(i / 30) * 10 + (Math.random() * 15 - 7.5);
        const progress = i / 10;
        const adjustedProgress = progress * variation;
        
        return {
          episode: i + 1,
          reward: Math.min(50, Math.max(-20, adjustedProgress + noise)),
          loss: Math.max(0.1, 5 - (adjustedProgress / 20) + Math.abs(noise / 10)),
          entropy: Math.max(0.1, 2 - (adjustedProgress / 50) + Math.abs(noise / 20)),
          value_loss: Math.max(0.1, 3 - (adjustedProgress / 30) + Math.abs(noise / 15))
        };
      });
      
      return {
        ...model,
        data: modelData
      };
    });
  };
  
  const comparisonModels = Object.keys(comparisonData).length > 0 
    ? Object.entries(comparisonData).map(([id, data]) => ({ id, data }))
    : generateComparisonData();
  
  // Handle zoom in/out
  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 20, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 20, 40));
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    // Find the metric being displayed
    const metric = metrics.find(m => m.value === metricType);
    
    return (
      <div className="bg-background p-3 border rounded-md shadow-md">
        <p className="text-sm font-medium">Episode {label}</p>
        
        {compareModels ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
            {payload.map((entry: any, index: number) => (
              <React.Fragment key={`metric-${index}`}>
                <div className="text-xs flex items-center gap-1">
                  <div 
                    className="h-2 w-2 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}</span>
                </div>
                <div className="text-xs text-right font-mono">
                  {entry.value.toFixed(3)}
                </div>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
            <div className="text-xs text-muted-foreground">{metric?.label || metricType}</div>
            <div className="text-xs text-right font-mono">
              {payload[0].value.toFixed(3)}
            </div>
            
            {/* If using smoothing, show both raw and smoothed values */}
            {smoothing > 0 && payload[1] && (
              <>
                <div className="text-xs text-muted-foreground">Smoothed</div>
                <div className="text-xs text-right font-mono">
                  {payload[1].value.toFixed(3)}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Learning Progress</CardTitle>
            <CardDescription>
              Performance metrics during training
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={metricType} onValueChange={setMetricType}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                {metrics.map(metric => (
                  <SelectItem key={metric.value} value={metric.value}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={smoothing.toString()} 
              onValueChange={(val) => setSmoothing(parseFloat(val))}
            >
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="Smoothing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No Smoothing</SelectItem>
                <SelectItem value="0.2">Light Smoothing</SelectItem>
                <SelectItem value="0.5">Medium Smoothing</SelectItem>
                <SelectItem value="1">Heavy Smoothing</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-r-none" 
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-l-none" 
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Current episode and status */}
        {status !== "not_started" && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  status === "running" ? "default" : 
                  status === "completed" ? "success" : 
                  status === "stopped" ? "destructive" : 
                  "outline"
                }
              >
                {status === "running" && "Training"}
                {status === "completed" && "Completed"}
                {status === "stopped" && "Stopped"}
                {status === "not_started" && "Not Started"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Episode: {episode.toLocaleString()} / 1,000
              </span>
            </div>
            
            <div className="text-xs text-muted-foreground">
              {currentMetric.description}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="progress">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="progress">
              <LineChartIcon className="h-4 w-4 mr-2" />
              Training Progress
            </TabsTrigger>
            <TabsTrigger value="comparison" disabled={!compareModels}>
              <BarChart2 className="h-4 w-4 mr-2" />
              Model Comparison
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="progress" className="h-[400px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={processedData}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="episode" 
                  label={{ value: "Episode", position: "insideBottomRight", offset: -5 }}
                />
                <YAxis 
                  label={{ 
                    value: currentMetric.label, 
                    angle: -90, 
                    position: "insideLeft" 
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                <Line 
                  type="monotone" 
                  dataKey={metricType} 
                  stroke={currentMetric.color}
                  strokeWidth={2}
                  dot={false}
                  name={currentMetric.label}
                />
                
                {smoothing > 0 && (
                  <Line 
                    type="monotone" 
                    dataKey={`${metricType}_smoothed`} 
                    stroke={currentMetric.color}
                    strokeWidth={3}
                    dot={false}
                    name={`${currentMetric.label} (Smoothed)`}
                    strokeDasharray="5 5"
                  />
                )}
                
                {/* Add zero reference line for reward metric */}
                {metricType === "reward" && (
                  <ReferenceLine y={0} stroke="#888888" strokeDasharray="3 3" />
                )}
              </LineChart>
            </ResponsiveContainer>
            
            {/* Controls under chart */}
            <div className="flex justify-between mt-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Current Performance</div>
                <div className="flex gap-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                    <span className="text-xs">Max: {(Math.max(...data.map(d => d[metricType]))).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center">
                    <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
                    <span className="text-xs">Min: {(Math.min(...data.map(d => d[metricType]))).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground">
                      Avg: {(data.reduce((acc, d) => acc + d[metricType], 0) / data.length).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save Checkpoint
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="comparison" className="h-[400px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="episode" 
                  label={{ value: "Episode", position: "insideBottomRight", offset: -5 }}
                />
                <YAxis 
                  label={{ 
                    value: currentMetric.label, 
                    angle: -90, 
                    position: "insideLeft" 
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {comparisonModels.map((model: any, index: number) => (
                  <Line 
                    key={model.id}
                    data={model.data}
                    type="monotone" 
                    dataKey={metricType} 
                    stroke={model.color || metrics[index % metrics.length].color}
                    strokeWidth={2}
                    dot={false}
                    name={model.name || `Model ${index + 1}`}
                  />
                ))}
                
                {/* Add zero reference line for reward metric */}
                {metricType === "reward" && (
                  <ReferenceLine y={0} stroke="#888888" strokeDasharray="3 3" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
