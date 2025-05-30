"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { TrendingUp, TrendingDown, BarChart2, PieChart as PieChartIcon, Activity, Award, AlertTriangle, Shield } from "lucide-react";

interface ModelEvaluationMetricsProps {
  model?: {
    id: string;
    name: string;
    version: string;
    algorithm: string;
    status: "training" | "evaluating" | "ready" | "failed";
    createdAt: string;
    updatedAt: string;
    metrics?: {
      reward: {
        mean: number;
        max: number;
        min: number;
        std: number;
      };
      returns: {
        mean: number;
        max: number;
        min: number;
        std: number;
      };
      drawdown: {
        max: number;
        average: number;
      };
      success: {
        profitableEpisodes: number;
        totalEpisodes: number;
      };
      performance: {
        risk: number;
        consistency: number;
        adaptability: number;
        efficiency: number;
        robustness: number;
      };
      time: {
        trainingHours: number;
        evalEpisodes: number;
      };
    };
  };
}

export function ModelEvaluationMetrics({ model }: ModelEvaluationMetricsProps) {
  // Mock model data if none provided
  const defaultModel = {
    id: "model-1",
    name: "PPO Trading Agent",
    version: "1.0.0",
    algorithm: "PPO",
    status: "ready",
    createdAt: "2025-04-01T12:00:00.000Z",
    updatedAt: "2025-04-12T08:30:00.000Z",
    metrics: {
      reward: {
        mean: 12.5,
        max: 38.7,
        min: -8.2,
        std: 6.8
      },
      returns: {
        mean: 18.3,
        max: 42.6,
        min: -12.5,
        std: 9.2
      },
      drawdown: {
        max: 15.3,
        average: 5.2
      },
      success: {
        profitableEpisodes: 82,
        totalEpisodes: 100
      },
      performance: {
        risk: 72,
        consistency: 85,
        adaptability: 68,
        efficiency: 79,
        robustness: 77
      },
      time: {
        trainingHours: 3.5,
        evalEpisodes: 100
      }
    }
  };

  const modelData = model || defaultModel;
  const metrics = modelData.metrics;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate success rate
  const successRate = metrics ? 
    Math.round((metrics.success.profitableEpisodes / metrics.success.totalEpisodes) * 100) : 0;

  // Format performance data for radar chart
  const performanceData = metrics ? [
    {
      subject: 'Risk',
      value: metrics.performance.risk,
      fullMark: 100
    },
    {
      subject: 'Consistency',
      value: metrics.performance.consistency,
      fullMark: 100
    },
    {
      subject: 'Adaptability',
      value: metrics.performance.adaptability,
      fullMark: 100
    },
    {
      subject: 'Efficiency',
      value: metrics.performance.efficiency,
      fullMark: 100
    },
    {
      subject: 'Robustness',
      value: metrics.performance.robustness,
      fullMark: 100
    }
  ] : [];

  // Dataset for distribution chart
  const rewardDistribution = metrics ? [
    { name: 'High Negative', value: 5, color: '#ef4444' },
    { name: 'Low Negative', value: 13, color: '#f97316' },
    { name: 'Neutral', value: 22, color: '#a1a1aa' },
    { name: 'Low Positive', value: 35, color: '#22c55e' },
    { name: 'High Positive', value: 25, color: '#10b981' }
  ] : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-background p-3 border rounded-md shadow-md">
        <p className="text-sm font-medium">{payload[0].name}</p>
        <div className="text-xs">Value: {payload[0].value}</div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{modelData.name}</CardTitle>
            <CardDescription>
              <span className="block">v{modelData.version} • {modelData.algorithm} Algorithm</span>
              <span className="block text-xs mt-1">Created: {formatDate(modelData.createdAt)}</span>
            </CardDescription>
          </div>
          <Badge
            variant={
              modelData.status === "ready" ? "default" :
              modelData.status === "training" ? "outline" :
              modelData.status === "evaluating" ? "secondary" :
              "destructive"
            }
            className="ml-auto"
          >
            {modelData.status === "ready" && "Ready"}
            {modelData.status === "training" && "Training"}
            {modelData.status === "evaluating" && "Evaluating"}
            {modelData.status === "failed" && "Failed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Average Return</span>
                <Badge
                  variant="outline"
                  className={metrics?.returns.mean && metrics.returns.mean >= 0 ? "text-green-600" : "text-red-600"}
                >
                  {metrics?.returns.mean && metrics.returns.mean >= 0 ? <TrendingUp className="h-3.5 w-3.5 mr-1" /> : <TrendingDown className="h-3.5 w-3.5 mr-1" />}
                  {metrics?.returns.mean ? `${metrics.returns.mean.toFixed(1)}%` : '0%'}
                </Badge>
              </div>
              <Progress 
                value={metrics?.returns.mean ? Math.min(Math.abs(metrics.returns.mean) * 2, 100) : 0} 
                className={`h-2 ${metrics?.returns.mean && metrics.returns.mean >= 0 ? "bg-green-100" : "bg-red-100"}`}
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium">{successRate}%</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Max Drawdown</span>
                <span className="font-medium text-red-600">-{metrics?.drawdown.max || 0}%</span>
              </div>
              <Progress value={metrics?.drawdown.max || 0} className="h-2 bg-red-100" />
            </div>
          </div>
          
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius={60} data={performanceData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <Tabs defaultValue="distribution">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="distribution" className="text-xs">
              <PieChartIcon className="h-3.5 w-3.5 mr-1" />
              Reward Distribution
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs">
              <BarChart2 className="h-3.5 w-3.5 mr-1" />
              Key Metrics
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              <Shield className="h-3.5 w-3.5 mr-1" />
              Risk Profile
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="distribution" className="mt-3">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rewardDistribution}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Episodes">
                    {rewardDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="metrics" className="mt-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-medium">Reward Statistics</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Mean</div>
                    <div className="font-medium">{metrics?.reward.mean.toFixed(2)}</div>
                  </div>
                  <div className="bg-muted p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Max</div>
                    <div className="font-medium">{metrics?.reward.max.toFixed(2)}</div>
                  </div>
                  <div className="bg-muted p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Min</div>
                    <div className="font-medium">{metrics?.reward.min.toFixed(2)}</div>
                  </div>
                  <div className="bg-muted p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Std Dev</div>
                    <div className="font-medium">{metrics?.reward.std.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs font-medium">Training Stats</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Episodes</div>
                    <div className="font-medium">{metrics?.time.evalEpisodes}</div>
                  </div>
                  <div className="bg-muted p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Hours</div>
                    <div className="font-medium">{metrics?.time.trainingHours}</div>
                  </div>
                  <div className="bg-muted p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Wins</div>
                    <div className="font-medium">{metrics?.success.profitableEpisodes}</div>
                  </div>
                  <div className="bg-muted p-2 rounded-md">
                    <div className="text-xs text-muted-foreground">Losses</div>
                    <div className="font-medium">
                      {metrics ? metrics.success.totalEpisodes - metrics.success.profitableEpisodes : 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="insights" className="mt-3">
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm">
                <Award className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Strengths</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This model performs well in consistent market conditions and shows good risk management.
                    It maintains a positive return rate in most test scenarios.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Weaknesses</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    The model struggles with sudden market shifts and extreme volatility events.
                    Potential overfitting to training data may reduce real-world performance.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm">
                <Activity className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Recommendations</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Consider further training with more volatile market scenarios.
                    Implement a stop-loss strategy to mitigate maximum drawdown risk.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
