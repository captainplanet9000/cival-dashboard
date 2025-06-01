"use client";

import { useEffect, useState, useMemo } from "react";
import { useSocketPortfolio } from "@/hooks/use-socket-portfolio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowUp, ArrowDown, DollarSign, TrendingUp, Percent } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface LivePortfolioChartProps {
  className?: string;
  showPercentageChange?: boolean;
  timeRanges?: Array<{label: string, value: string, days: number}>;
}

export function LivePortfolioChart({ 
  className,
  showPercentageChange = true,
  timeRanges = [
    { label: "1D", value: "1d", days: 1 },
    { label: "1W", value: "1w", days: 7 },
    { label: "1M", value: "1m", days: 30 },
    { label: "3M", value: "3m", days: 90 },
  ]
}: LivePortfolioChartProps) {
  const { portfolio, portfolioHistory, isLoading, isConnected } = useSocketPortfolio();
  const [timeRange, setTimeRange] = useState(timeRanges[0].value);
  const [chartData, setChartData] = useState<Array<{value: number, timestamp: number}>>([]);
  
  // Calculate stats for selected time range
  const stats = useMemo(() => {
    if (!portfolio || chartData.length === 0) {
      return { change: 0, changePercent: 0, startValue: 0, endValue: 0 };
    }
    
    const startValue = chartData[0]?.value || 0;
    const endValue = chartData[chartData.length - 1]?.value || 0;
    const change = endValue - startValue;
    const changePercent = (change / startValue) * 100;
    
    return { change, changePercent, startValue, endValue };
  }, [portfolio, chartData]);
  
  // Filter portfolio history based on selected time range
  useEffect(() => {
    if (portfolioHistory.length === 0) return;
    
    const selectedRange = timeRanges.find(range => range.value === timeRange);
    if (!selectedRange) return;
    
    const cutoffTime = Date.now() - (selectedRange.days * 24 * 60 * 60 * 1000);
    const filteredData = portfolioHistory.filter(item => item.timestamp >= cutoffTime);
    
    setChartData(filteredData);
  }, [portfolioHistory, timeRange, timeRanges]);
  
  // Format date for chart tooltip
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };
  
  // Format currency value
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Portfolio Value</CardTitle>
            <CardDescription>Real-time portfolio performance</CardDescription>
          </div>
          {isConnected ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
              Connecting...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {portfolio && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex flex-col">
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> Total Value
              </div>
              <div className="text-2xl font-semibold">
                {formatCurrency(portfolio.totalValue)}
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> Change ({timeRange})
              </div>
              <div className="flex items-center">
                <span className={cn(
                  "text-2xl font-semibold",
                  stats.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {formatCurrency(stats.change)}
                </span>
                
                {showPercentageChange && (
                  <div className={cn(
                    "ml-2 flex items-center text-sm",
                    stats.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {stats.change >= 0 ? <ArrowUp className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDown className="h-3.5 w-3.5 mr-0.5" />}
                    <span>{Math.abs(stats.changePercent).toFixed(2)}%</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" /> All-Time Change
              </div>
              <div className="flex items-center">
                <span className={cn(
                  "text-2xl font-semibold",
                  portfolio.pnlTotalPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {portfolio.pnlTotalPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
        
        <Tabs value={timeRange} onValueChange={setTimeRange} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            {timeRanges.map((range) => (
              <TabsTrigger key={range.value} value={range.value}>
                {range.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="h-[250px] w-full">
            {isLoading || chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Loading portfolio data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="timestamp"
                    axisLine={false}
                    tickLine={false}
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      return (
                        <text x={x} y={y + 10} fill="#888" fontSize={12} textAnchor="middle">
                          {payload.value}
                        </text>
                      );
                    }}
                  />
                  <YAxis 
                    dataKey="value"
                    axisLine={false}
                    tickLine={false}
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      return (
                        <text x={x} y={y} dy={3} fill="#888" fontSize={12} textAnchor="end">
                          ${(payload.value / 1000).toFixed(1)}k
                        </text>
                      );
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Value"]}
                    labelFormatter={(label: number) => formatDate(label)}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <ReferenceLine y={stats.startValue} stroke="#888888" strokeDasharray="3 3" />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={stats.change >= 0 ? 'var(--success)' : 'var(--danger)'} 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
