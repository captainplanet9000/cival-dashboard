// @ts-nocheck
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ComposedChart, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter } from "recharts";
import { 
  TrendingUp, TrendingDown, AlertTriangle, Shield, BarChart2, 
  PieChart as PieChartIcon, Activity, ArrowDown, ArrowUp
} from "lucide-react";

interface RiskMetricsDisplayProps {
  strategy?: {
    id: string;
    name: string;
    color: string;
    riskMetrics?: {
      sharpeRatio: number;
      sortino: number;
      maxDrawdown: number;
      recoveryTime: number;
      returnToDrawdownRatio: number;
      dailyVaR: number;
      winLossRatio: number;
      worstTrade: number;
      bestTrade: number;
      calmar: number;
      beta: number;
      annualVolatility: number;
      downsideDeviation: number;
      skewness: number;
      kurtosis: number;
      tailRisk: number;
      streaks: {
        longestWinStreak: number;
        longestLossStreak: number;
        averageWinStreak: number;
        averageLossStreak: number;
      };
      drawdownDistribution: {
        range: string;
        count: number;
        duration: number;
      }[];
      monthlyReturns: number[];
      riskScores: {
        volatility: number;
        drawdown: number;
        consistency: number;
        resilience: number;
        recovery: number;
      };
    };
  };
  benchmarkRisk?: {
    sharpeRatio: number;
    maxDrawdown: number;
    annualVolatility: number;
  };
}

export function RiskMetricsDisplay({
  strategy,
  benchmarkRisk
}: RiskMetricsDisplayProps) {
  // Default data if none provided
  const defaultRiskMetrics = {
    sharpeRatio: 1.8,
    sortino: 2.3,
    maxDrawdown: 15.2,
    recoveryTime: 28,
    returnToDrawdownRatio: 5.7,
    dailyVaR: 1.8,
    winLossRatio: 1.7,
    worstTrade: -4.2,
    bestTrade: 6.8,
    calmar: 1.4,
    beta: 0.85,
    annualVolatility: 12.3,
    downsideDeviation: 2.8,
    skewness: 0.2,
    kurtosis: 3.4,
    tailRisk: 3.5,
    streaks: {
      longestWinStreak: 8,
      longestLossStreak: 3,
      averageWinStreak: 2.3,
      averageLossStreak: 1.5
    },
    drawdownDistribution: [
      { range: "0-2%", count: 18, duration: 3 },
      { range: "2-5%", count: 12, duration: 5 },
      { range: "5-10%", count: 5, duration: 8 },
      { range: "10-15%", count: 2, duration: 16 },
      { range: ">15%", count: 1, duration: 28 }
    ],
    monthlyReturns: [2.3, 1.8, -0.9, 3.2, 1.5, -1.1, 2.8, 4.5, 2.2, -2.4, 3.6, 1.9],
    riskScores: {
      volatility: 75,
      drawdown: 82,
      consistency: 68,
      resilience: 78,
      recovery: 72
    }
  };
  
  const defaultBenchmarkRisk = {
    sharpeRatio: 1.2,
    maxDrawdown: 22.5,
    annualVolatility: 18.2
  };
  
  // Use provided data or defaults
  const riskMetrics = strategy?.riskMetrics || defaultRiskMetrics;
  const benchmarkMetrics = benchmarkRisk || defaultBenchmarkRisk;
  
  // Helper function to determine risk rating
  const getRiskRating = (value: number, thresholds: number[], reverse: boolean = false) => {
    const ratings = ["Very Low", "Low", "Moderate", "High", "Very High"];
    let index = 0;
    
    for (let i = 0; i < thresholds.length; i++) {
      if ((reverse && value <= thresholds[i]) || (!reverse && value >= thresholds[i])) {
        index = i;
      }
    }
    
    return {
      rating: ratings[index],
      index
    };
  };
  
  // Get risk ratings for main metrics
  const sharpeRating = getRiskRating(riskMetrics.sharpeRatio, [0.5, 1.0, 1.5, 2.0]);
  const drawdownRating = getRiskRating(riskMetrics.maxDrawdown, [5, 10, 20, 30], true);
  const volatilityRating = getRiskRating(riskMetrics.annualVolatility, [5, 10, 20, 30], true);
  
  // Prepare data for radar chart
  const radarData = [
    {
      subject: 'Sharpe',
      value: riskMetrics.riskScores.volatility,
      fullMark: 100
    },
    {
      subject: 'Drawdown',
      value: riskMetrics.riskScores.drawdown,
      fullMark: 100
    },
    {
      subject: 'Consistency',
      value: riskMetrics.riskScores.consistency,
      fullMark: 100
    },
    {
      subject: 'Resilience',
      value: riskMetrics.riskScores.resilience,
      fullMark: 100
    },
    {
      subject: 'Recovery',
      value: riskMetrics.riskScores.recovery,
      fullMark: 100
    }
  ];
  
  // Prepare data for drawdown distribution chart
  const drawdownData = riskMetrics.drawdownDistribution.map(item => ({
    name: item.range,
    count: item.count,
    duration: item.duration
  }));
  
  // Prepare monthly returns data
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyReturnsData = riskMetrics.monthlyReturns.map((value, index) => ({
    name: monthNames[index],
    value: value
  }));
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-background p-3 border rounded-md shadow-md">
        <p className="text-sm font-medium">{label}</p>
        <div className="mt-1">
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center gap-2 text-xs">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: entry.color }} 
              />
              <span>{entry.name}: {entry.value.toFixed(2)}{entry.unit || ''}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Risk Analysis</CardTitle>
        <CardDescription>
          Comprehensive risk metrics and exposure analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Sharpe Ratio</span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    sharpeRating.index >= 3 ? "text-green-600" : 
                    sharpeRating.index === 2 ? "text-amber-600" : 
                    "text-red-600"
                  }
                >
                  {sharpeRating.rating}
                </Badge>
                <span className="font-medium">{riskMetrics.sharpeRatio.toFixed(2)}</span>
              </div>
            </div>
            <Progress 
              value={(riskMetrics.sharpeRatio / 3) * 100} 
              className="h-2 bg-muted" 
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>vs Benchmark: {benchmarkMetrics.sharpeRatio.toFixed(2)}</span>
              <span className={riskMetrics.sharpeRatio > benchmarkMetrics.sharpeRatio ? "text-green-600" : "text-red-600"}>
                {((riskMetrics.sharpeRatio - benchmarkMetrics.sharpeRatio) / benchmarkMetrics.sharpeRatio * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Max Drawdown</span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    drawdownRating.index >= 3 ? "text-green-600" : 
                    drawdownRating.index === 2 ? "text-amber-600" : 
                    "text-red-600"
                  }
                >
                  {drawdownRating.rating}
                </Badge>
                <span className="font-medium text-red-600">-{riskMetrics.maxDrawdown.toFixed(2)}%</span>
              </div>
            </div>
            <Progress 
              value={(riskMetrics.maxDrawdown / 30) * 100} 
              className="h-2 bg-red-100" 
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>vs Benchmark: -{benchmarkMetrics.maxDrawdown.toFixed(2)}%</span>
              <span className={riskMetrics.maxDrawdown < benchmarkMetrics.maxDrawdown ? "text-green-600" : "text-red-600"}>
                {((benchmarkMetrics.maxDrawdown - riskMetrics.maxDrawdown) / benchmarkMetrics.maxDrawdown * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Volatility (Annual)</span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    volatilityRating.index >= 3 ? "text-green-600" : 
                    volatilityRating.index === 2 ? "text-amber-600" : 
                    "text-red-600"
                  }
                >
                  {volatilityRating.rating}
                </Badge>
                <span className="font-medium">{riskMetrics.annualVolatility.toFixed(2)}%</span>
              </div>
            </div>
            <Progress 
              value={(riskMetrics.annualVolatility / 30) * 100} 
              className="h-2 bg-amber-100" 
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>vs Benchmark: {benchmarkMetrics.annualVolatility.toFixed(2)}%</span>
              <span className={riskMetrics.annualVolatility < benchmarkMetrics.annualVolatility ? "text-green-600" : "text-red-600"}>
                {((benchmarkMetrics.annualVolatility - riskMetrics.annualVolatility) / benchmarkMetrics.annualVolatility * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="risk-profile">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="risk-profile">
              <Shield className="h-4 w-4 mr-2" />
              Risk Profile
            </TabsTrigger>
            <TabsTrigger value="drawdowns">
              <ArrowDown className="h-4 w-4 mr-2" />
              Drawdowns
            </TabsTrigger>
            <TabsTrigger value="returns">
              <BarChart2 className="h-4 w-4 mr-2" />
              Returns Distribution
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="risk-profile" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={90} data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} />
                    <Radar
                      name="Risk Profile"
                      dataKey="value"
                      stroke={strategy?.color || "#2563eb"}
                      fill={strategy?.color || "#2563eb"}
                      fillOpacity={0.5}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Key Risk Metrics</div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Sortino Ratio</div>
                      <div className="font-medium">{riskMetrics.sortino.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Calmar Ratio</div>
                      <div className="font-medium">{riskMetrics.calmar.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Beta</div>
                      <div className="font-medium">{riskMetrics.beta.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Daily VaR (95%)</div>
                      <div className="font-medium">{riskMetrics.dailyVaR.toFixed(2)}%</div>
                    </div>
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Win/Loss Ratio</div>
                      <div className="font-medium">{riskMetrics.winLossRatio.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Tail Risk</div>
                      <div className="font-medium">{riskMetrics.tailRisk.toFixed(2)}%</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Trade Streaks</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between text-xs bg-muted/50 rounded-md p-2">
                        <span className="text-muted-foreground">Longest Win Streak</span>
                        <span className="font-medium text-green-600">
                          {riskMetrics.streaks.longestWinStreak}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs bg-muted/50 rounded-md p-2">
                        <span className="text-muted-foreground">Longest Loss Streak</span>
                        <span className="font-medium text-red-600">
                          {riskMetrics.streaks.longestLossStreak}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm">
                <Shield className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Risk Strengths</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This strategy shows strong risk-adjusted returns with a favorable Sharpe ratio,
                    above-market win/loss ratio, and moderate volatility exposure.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Risk Concerns</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notable tail risk exposure during extreme market downturns.
                    Strategy performs best in moderate volatility environments.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="drawdowns" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium mb-2">Drawdown Distribution</div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={drawdownData}
                      margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="count" 
                        name="Frequency" 
                        fill="#ef4444" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Drawdown Recovery Time (Days)</div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={drawdownData}
                      margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="duration" 
                        name="Days to Recover" 
                        fill="#8b5cf6" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="p-3 rounded-md bg-muted/50 text-sm">
              <div className="font-medium flex items-center">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                Drawdown Recovery Analysis
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum drawdown of {riskMetrics.maxDrawdown.toFixed(2)}% took {riskMetrics.recoveryTime} days to recover.
                The strategy shows a return-to-drawdown ratio of {riskMetrics.returnToDrawdownRatio.toFixed(2)}, indicating
                good compensation for risk taken. Small drawdowns (0-5%) typically recover within a week, while
                larger drawdowns (>10%) can take several weeks to months to recover.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="returns" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium mb-2">Monthly Returns Distribution</div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyReturnsData}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        name="Return %" 
                        radius={[4, 4, 0, 0]}
                      >
                        {monthlyReturnsData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.value >= 0 ? "#16a34a" : "#ef4444"} 
                          />
                        ))}
                      </Bar>
                      <ReferenceLine y={0} stroke="#888888" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Return Statistics</div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Best Trade</div>
                      <div className="font-medium text-green-600">+{riskMetrics.bestTrade}%</div>
                    </div>
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Worst Trade</div>
                      <div className="font-medium text-red-600">{riskMetrics.worstTrade}%</div>
                    </div>
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Skewness</div>
                      <div className="font-medium">{riskMetrics.skewness.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted p-2 rounded-md">
                      <div className="text-xs text-muted-foreground">Kurtosis</div>
                      <div className="font-medium">{riskMetrics.kurtosis.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-md bg-muted/50 text-sm">
                    <div className="font-medium">Return Distribution Analysis</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Returns show a slightly positive skew ({riskMetrics.skewness.toFixed(2)}), indicating more positive outliers than negative ones.
                      Kurtosis of {riskMetrics.kurtosis.toFixed(2)} suggests a moderate tail risk compared to a normal distribution.
                      Monthly returns are positive {monthlyReturnsData.filter(m => m.value > 0).length} out of {monthlyReturnsData.length} months.
                    </p>
                  </div>
                  
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Volatility vs Return</div>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            type="number" 
                            dataKey="x" 
                            name="Volatility" 
                            unit="%" 
                            domain={[0, 20]}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="y" 
                            name="Return" 
                            unit="%" 
                            domain={[-10, 30]}
                          />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter 
                            name="Strategies" 
                            data={[
                              { x: riskMetrics.annualVolatility, y: riskMetrics.maxDrawdown, z: 'This Strategy' },
                              { x: benchmarkMetrics.annualVolatility, y: benchmarkMetrics.maxDrawdown, z: 'Benchmark' },
                              { x: 15.2, y: 13.8, z: 'Strategy A' },
                              { x: 8.7, y: 9.2, z: 'Strategy B' },
                              { x: 18.3, y: 22.5, z: 'Strategy C' }
                            ]} 
                            fill="#8884d8"
                          >
                            {[
                              { x: riskMetrics.annualVolatility, y: riskMetrics.maxDrawdown, z: 'This Strategy' },
                              { x: benchmarkMetrics.annualVolatility, y: benchmarkMetrics.maxDrawdown, z: 'Benchmark' },
                              { x: 15.2, y: 13.8, z: 'Strategy A' },
                              { x: 8.7, y: 9.2, z: 'Strategy B' },
                              { x: 18.3, y: 22.5, z: 'Strategy C' }
                            ].map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={index === 0 ? strategy?.color || "#2563eb" : 
                                      index === 1 ? "#9ca3af" : 
                                      ["#ef4444", "#f59e0b", "#16a34a", "#8b5cf6"][index - 2]}
                              />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
