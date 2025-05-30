"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, ReferenceLine, Scatter } from "recharts";
import { 
  LineChart as LineChartIcon, BarChart2, Activity, TrendingUp, TrendingDown, 
  ZoomIn, ZoomOut, Eye, EyeOff, Info, Calendar, DollarSign, Save, Download
} from "lucide-react";

interface StrategyComparisonChartProps {
  strategies?: Array<{
    id: string;
    name: string;
    color: string;
    type: string;
    data: Array<{
      date: string;
      equity: number;
      drawdown: number;
      return_pct: number;
    }>;
    metrics?: {
      totalReturn: number;
      maxDrawdown: number;
      sharpeRatio: number;
      winRate: number;
      profitFactor: number;
      averageTrade: number;
    };
  }>;
  benchmarkData?: Array<{
    date: string;
    value: number;
  }>;
  benchmarkName?: string;
}

export function StrategyComparisonChart({
  strategies = [],
  benchmarkData = [],
  benchmarkName = "Market"
}: StrategyComparisonChartProps) {
  const [chartType, setChartType] = useState<string>("equity");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showBenchmark, setShowBenchmark] = useState<boolean>(true);
  const [showDrawdown, setShowDrawdown] = useState<boolean>(false);
  const [visibleStrategies, setVisibleStrategies] = useState<{ [key: string]: boolean }>({});
  const [normalizePlot, setNormalizePlot] = useState<boolean>(true);
  
  // Default data if none provided
  const defaultStrategies = [
    {
      id: "strat-1",
      name: "Momentum Strategy",
      color: "#2563eb",
      type: "momentum",
      data: generateMockData(0),
      metrics: {
        totalReturn: 86.4,
        maxDrawdown: 15.2,
        sharpeRatio: 1.85,
        winRate: 62.3,
        profitFactor: 2.3,
        averageTrade: 0.71
      }
    },
    {
      id: "strat-2",
      name: "Mean Reversion",
      color: "#db2777",
      type: "mean_reversion",
      data: generateMockData(1),
      metrics: {
        totalReturn: 52.8,
        maxDrawdown: 12.5,
        sharpeRatio: 1.42,
        winRate: 58.7,
        profitFactor: 1.9,
        averageTrade: 0.54
      }
    },
    {
      id: "strat-3",
      name: "Breakout Strategy",
      color: "#16a34a",
      type: "breakout",
      data: generateMockData(2),
      metrics: {
        totalReturn: 68.5,
        maxDrawdown: 22.4,
        sharpeRatio: 1.63,
        winRate: 48.2,
        profitFactor: 2.1,
        averageTrade: 1.12
      }
    }
  ];
  
  // Generate mock equity data
  function generateMockData(seedOffset: number = 0) {
    const data = [];
    let equity = 10000;
    const days = 180;
    
    const seedVariance = seedOffset * 0.2; // Adjust the seed to make strategies different
    
    for (let i = 0; i < days; i++) {
      const date = new Date(2024, 0, 1 + i);
      
      // Generate different return patterns based on seed
      let dailyReturn;
      if (seedOffset === 0) { // Momentum - performs well in trending markets
        dailyReturn = (Math.sin(i / 20) * 0.5 + Math.random() * 1.2 - 0.4 + seedVariance) / 100;
      } else if (seedOffset === 1) { // Mean reversion - more stable, lower returns
        dailyReturn = (Math.sin(i / 10) * 0.3 + Math.random() * 0.8 - 0.3 + seedVariance) / 100;
      } else { // Breakout - higher volatility, higher returns
        dailyReturn = (Math.sin(i / 15) * 0.7 + Math.random() * 1.5 - 0.6 + seedVariance) / 100;
      }
      
      // Calculate new equity
      equity = equity * (1 + dailyReturn);
      
      // Calculate drawdown
      const peakEquity = Math.max(...data.map(d => d.equity).concat(equity));
      const drawdown = ((peakEquity - equity) / peakEquity) * 100;
      
      data.push({
        date: date.toISOString(),
        equity,
        drawdown,
        return_pct: dailyReturn * 100
      });
    }
    
    return data;
  }
  
  // Generate mock benchmark data
  const defaultBenchmarkData = Array.from({ length: 180 }, (_, i) => {
    const date = new Date(2024, 0, 1 + i);
    const value = 10000 * (1 + (Math.sin(i / 25) * 0.2 + i * 0.001 + Math.random() * 0.4 - 0.2) / 100) ** i;
    return { date: date.toISOString(), value };
  });
  
  // Use provided data or defaults
  const strategyData = strategies.length > 0 ? strategies : defaultStrategies;
  const marketBenchmark = benchmarkData.length > 0 ? benchmarkData : defaultBenchmarkData;
  
  // Initialize visible strategies if not set
  React.useEffect(() => {
    if (Object.keys(visibleStrategies).length === 0 && strategyData.length > 0) {
      const initialVisibility = strategyData.reduce((acc, strategy) => {
        acc[strategy.id] = true;
        return acc;
      }, {} as { [key: string]: boolean });
      
      setVisibleStrategies(initialVisibility);
    }
  }, [strategyData, visibleStrategies]);
  
  // Handle zoom in/out
  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 20, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 20, 40));
  };
  
  // Handle strategy visibility toggle
  const toggleStrategyVisibility = (id: string) => {
    setVisibleStrategies(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Apply zoom level to data
  const applyZoom = (data: any[]) => {
    if (zoomLevel === 100) return data;
    
    const visibleDataPoints = Math.floor(data.length * (100 / zoomLevel));
    const startIndex = Math.max(0, data.length - visibleDataPoints);
    return data.slice(startIndex);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    // Format date from ISO string
    const date = new Date(label);
    const formattedDate = date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    return (
      <div className="bg-background p-3 border rounded-md shadow-md">
        <p className="text-sm font-medium">{formattedDate}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry: any, index: number) => (
            <div 
              key={`tooltip-${index}`} 
              className="flex justify-between items-center gap-4 text-xs"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: entry.color }} 
                />
                <span>{entry.name}</span>
              </div>
              <span className="font-mono">
                {chartType === "equity" && `$${entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                {chartType === "drawdown" && `${entry.value.toFixed(2)}%`}
                {chartType === "returns" && `${entry.value.toFixed(2)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Generate chart data based on selected type
  const getChartData = () => {
    // Filter visible strategies
    const filteredStrategies = strategyData.filter(strat => 
      visibleStrategies[strat.id] !== false
    );
    
    switch (chartType) {
      case "equity":
        if (normalizePlot) {
          // Normalize all strategies to start at 100%
          return applyZoom(filteredStrategies[0].data.map((item, i) => {
            const result: any = {
              date: item.date
            };
            
            filteredStrategies.forEach(strat => {
              const initialEquity = strat.data[0].equity;
              const normalizedValue = (strat.data[i].equity / initialEquity) * 100;
              result[strat.id] = normalizedValue;
            });
            
            if (showBenchmark) {
              const initialBenchmark = marketBenchmark[0].value;
              const normalizedBenchmark = (marketBenchmark[i].value / initialBenchmark) * 100;
              result["benchmark"] = normalizedBenchmark;
            }
            
            return result;
          }));
        } else {
          // Regular equity curve
          return applyZoom(filteredStrategies[0].data.map((item, i) => {
            const result: any = {
              date: item.date
            };
            
            filteredStrategies.forEach(strat => {
              result[strat.id] = strat.data[i].equity;
            });
            
            if (showBenchmark) {
              result["benchmark"] = marketBenchmark[i].value;
            }
            
            return result;
          }));
        }
        
      case "drawdown":
        return applyZoom(filteredStrategies[0].data.map((item, i) => {
          const result: any = {
            date: item.date
          };
          
          filteredStrategies.forEach(strat => {
            result[strat.id] = strat.data[i].drawdown;
          });
          
          return result;
        }));
        
      case "returns":
        return applyZoom(filteredStrategies[0].data.map((item, i) => {
          const result: any = {
            date: item.date
          };
          
          filteredStrategies.forEach(strat => {
            result[strat.id] = strat.data[i].return_pct;
          });
          
          return result;
        }));
        
      default:
        return [];
    }
  };
  
  const chartData = getChartData();
  
  // Get Y-axis label based on chart type
  const getYAxisLabel = () => {
    switch (chartType) {
      case "equity":
        return normalizePlot ? "Performance (%)" : "Equity ($)";
      case "drawdown":
        return "Drawdown (%)";
      case "returns":
        return "Return (%)";
      default:
        return "";
    }
  };
  
  // Calculate key metrics summary
  const getMetricsSummary = () => {
    return strategyData.map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      color: strategy.color,
      visible: visibleStrategies[strategy.id] !== false,
      metrics: strategy.metrics
    }));
  };
  
  const metricsSummary = getMetricsSummary();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Strategy Performance</CardTitle>
            <CardDescription>
              Compare backtest results across strategies
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="w-[150px] h-8">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equity">Equity Curve</SelectItem>
                <SelectItem value="drawdown">Drawdown</SelectItem>
                <SelectItem value="returns">Returns</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm" 
              className={normalizePlot ? "bg-muted" : ""} 
              onClick={() => setNormalizePlot(!normalizePlot)}
            >
              <Activity className="h-4 w-4 mr-2" />
              {normalizePlot ? "Absolute" : "Normalized"}
            </Button>
            
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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-2">
            {strategyData.map(strategy => (
              <Badge
                key={strategy.id}
                variant={visibleStrategies[strategy.id] !== false ? "default" : "outline"}
                className="cursor-pointer"
                style={{ 
                  backgroundColor: visibleStrategies[strategy.id] !== false ? strategy.color : "transparent",
                  color: visibleStrategies[strategy.id] !== false ? "white" : strategy.color,
                  borderColor: strategy.color
                }}
                onClick={() => toggleStrategyVisibility(strategy.id)}
              >
                {visibleStrategies[strategy.id] !== false ? (
                  <Eye className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                )}
                {strategy.name}
              </Badge>
            ))}
            
            {benchmarkData.length > 0 && (
              <Badge
                variant={showBenchmark ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setShowBenchmark(!showBenchmark)}
              >
                {showBenchmark ? (
                  <Eye className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                )}
                {benchmarkName}
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save Report
            </Button>
          </div>
        </div>
        
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                minTickGap={50}
                scale="time"
                type="category"
                domain={['dataMin', 'dataMax']}
              />
              <YAxis
                label={{ 
                  value: getYAxisLabel(), 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
                domain={chartType === 'drawdown' ? [0, 'auto'] : chartType === 'returns' ? ['auto', 'auto'] : ['dataMin', 'dataMax']}
                tickFormatter={(value) => 
                  chartType === 'equity' && !normalizePlot
                    ? `$${(value / 1000).toFixed(1)}k`
                    : `${value.toFixed(1)}${chartType === 'equity' && normalizePlot ? '%' : '%'}`
                }
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Draw strategies */}
              {strategyData.map(strategy => 
                visibleStrategies[strategy.id] !== false && (
                  <Line
                    key={strategy.id}
                    type="monotone"
                    dataKey={strategy.id}
                    name={strategy.name}
                    stroke={strategy.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )
              )}
              
              {/* Draw benchmark if enabled */}
              {showBenchmark && chartType === "equity" && (
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name={benchmarkName}
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
              
              {/* For drawdown chart, invert the y-axis */}
              {chartType === "drawdown" && (
                <ReferenceLine y={0} stroke="#888888" />
              )}
              
              {/* For returns chart, add zero line */}
              {chartType === "returns" && (
                <ReferenceLine y={0} stroke="#888888" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <Tabs defaultValue="metrics">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">
              <BarChart2 className="h-4 w-4 mr-2" />
              Performance Metrics
            </TabsTrigger>
            <TabsTrigger value="trades">
              <Activity className="h-4 w-4 mr-2" />
              Trades
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar Returns
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="metrics" className="pt-4">
            <div className="border rounded-md">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-xs font-medium text-left p-2">Strategy</th>
                    <th className="text-xs font-medium text-right p-2">Total Return</th>
                    <th className="text-xs font-medium text-right p-2">Max Drawdown</th>
                    <th className="text-xs font-medium text-right p-2">Sharpe Ratio</th>
                    <th className="text-xs font-medium text-right p-2">Win Rate</th>
                    <th className="text-xs font-medium text-right p-2">Profit Factor</th>
                    <th className="text-xs font-medium text-right p-2">Avg Trade</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsSummary.map((strategy) => (
                    <tr 
                      key={strategy.id} 
                      className={`border-b hover:bg-muted/20 ${strategy.visible ? '' : 'opacity-50'}`}
                    >
                      <td className="p-2 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: strategy.color }} 
                          />
                          <span>{strategy.name}</span>
                        </div>
                      </td>
                      <td className="p-2 text-sm text-right font-mono">
                        <span className={strategy.metrics?.totalReturn && strategy.metrics.totalReturn >= 0 ? "text-green-600" : "text-red-600"}>
                          {strategy.metrics?.totalReturn ? `${strategy.metrics.totalReturn.toFixed(2)}%` : "-"}
                        </span>
                      </td>
                      <td className="p-2 text-sm text-right font-mono text-red-600">
                        {strategy.metrics?.maxDrawdown ? `-${strategy.metrics.maxDrawdown.toFixed(2)}%` : "-"}
                      </td>
                      <td className="p-2 text-sm text-right font-mono">
                        {strategy.metrics?.sharpeRatio ? strategy.metrics.sharpeRatio.toFixed(2) : "-"}
                      </td>
                      <td className="p-2 text-sm text-right font-mono">
                        {strategy.metrics?.winRate ? `${strategy.metrics.winRate.toFixed(1)}%` : "-"}
                      </td>
                      <td className="p-2 text-sm text-right font-mono">
                        {strategy.metrics?.profitFactor ? strategy.metrics.profitFactor.toFixed(2) : "-"}
                      </td>
                      <td className="p-2 text-sm text-right font-mono">
                        <span className={strategy.metrics?.averageTrade && strategy.metrics.averageTrade >= 0 ? "text-green-600" : "text-red-600"}>
                          {strategy.metrics?.averageTrade ? `${strategy.metrics.averageTrade.toFixed(2)}%` : "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          <TabsContent value="trades" className="pt-4">
            <div className="text-center py-6 text-muted-foreground">
              <p>Detailed trade analysis will appear here after running a backtest</p>
            </div>
          </TabsContent>
          
          <TabsContent value="calendar" className="pt-4">
            <div className="text-center py-6 text-muted-foreground">
              <p>Calendar return analysis will appear here after running a backtest</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
