'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BacktestResult, Trade } from '@/services/backtest-service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

interface BacktestResultsProps {
  result: BacktestResult;
}

export function BacktestResults({ result }: BacktestResultsProps) {
  // Prepare data for equity curve chart
  const equityData = result.equityCurve.map((point) => ({
    date: new Date(point.timestamp).toLocaleDateString(),
    equity: Number(point.equity.toFixed(2)),
    drawdown: Number(point.drawdown.toFixed(2)),
  }));

  // Sample equity data at regular intervals if there are too many points
  const sampledEquityData = sampleData(equityData, 100);
  
  // Prepare data for trade distribution
  const tradesData = prepareTradesTotalsByDate(result.trades);
  
  // Classify the backtest result
  const resultClass = classifyBacktestResult(result);
  
  // Format dates
  const formattedStartDate = new Date(result.startDate).toLocaleDateString();
  const formattedEndDate = new Date(result.endDate).toLocaleDateString();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Backtest Results</CardTitle>
            <CardDescription>
              {result.symbol} {result.timeframe} • {formattedStartDate} to {formattedEndDate}
            </CardDescription>
          </div>
          <Badge className={getBadgeColor(resultClass)}>
            {resultClass.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="equity">Equity Curve</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="assets">Brain Assets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Key metrics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Initial Capital</span>
                      <span>${result.initialCapital.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Final Capital</span>
                      <span>${result.finalCapital.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Total Return</span>
                      <span className={result.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}>
                        ${result.totalReturn.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Return %</span>
                      <span className={result.totalReturnPercentage >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {result.totalReturnPercentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Max Drawdown</span>
                      <span className="text-red-500">
                        ${result.maxDrawdown.toLocaleString()} ({result.maxDrawdownPercentage.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Sharpe Ratio</span>
                      <span>{result.sharpeRatio.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Trade statistics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Trade Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Total Trades</span>
                      <span>{result.totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Win Rate</span>
                      <span>{result.winRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Winning Trades</span>
                      <span className="text-green-500">{result.winningTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Losing Trades</span>
                      <span className="text-red-500">{result.losingTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Average Win</span>
                      <span className="text-green-500">${result.averageWin.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">Average Loss</span>
                      <span className="text-red-500">${result.averageLoss.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Trade distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Trade Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tradesData}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(value) => [`${value} trades`, 'Count']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Bar dataKey="trades" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Strategy Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(result.strategyParams).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-muted-foreground text-sm">{formatParamName(key)}</div>
                      <div>{formatParamValue(key, value)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="equity">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sampledEquityData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`$${value}`, 'Value']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                      name="Portfolio Value"
                    />
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#ff5252"
                      fill="#ff5252"
                      fillOpacity={0.1}
                      name="Drawdown"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cumulative Return</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sampledEquityData.map((point, i, arr) => ({
                      ...point,
                      return: (point.equity / result.initialCapital - 1) * 100
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis 
                      tickFormatter={(value) => `${value.toFixed(1)}%`}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value.toFixed(2)}%`, 'Return']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="return"
                      stroke="#00bfa5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trades">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Trade List</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Entry Date</TableHead>
                        <TableHead>Exit Date</TableHead>
                        <TableHead>Entry Price</TableHead>
                        <TableHead>Exit Price</TableHead>
                        <TableHead className="text-right">P&L ($)</TableHead>
                        <TableHead className="text-right">P&L (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.trades.map((trade, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'}>
                              {trade.direction.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(trade.entryTime)}</TableCell>
                          <TableCell>{formatDate(trade.exitTime)}</TableCell>
                          <TableCell>${trade.entryPrice.toFixed(2)}</TableCell>
                          <TableCell>${trade.exitPrice.toFixed(2)}</TableCell>
                          <TableCell className={`text-right ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right ${trade.pnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.pnlPercentage >= 0 ? '+' : ''}{trade.pnlPercentage.toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="assets">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Brain Assets Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.brainAssets.map((asset) => (
                    <Card key={asset.id} className="overflow-hidden">
                      <div className="bg-primary/10 p-2 flex items-center justify-between">
                        <div className="font-medium">{asset.title}</div>
                        <Badge variant="outline">{asset.assetType}</Badge>
                      </div>
                      <CardContent className="p-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">ID:</span>
                          <span>{asset.id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Role:</span>
                          <span>{asset.role}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {result.brainAssets.length === 0 && (
                    <div className="col-span-2 text-center py-8 border rounded-md">
                      <p className="text-muted-foreground">No brain assets were used in this backtest</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Helper functions

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString(undefined, { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

function sampleData<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  
  const samplingRate = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % samplingRate === 0);
}

function formatParamName(key: string): string {
  // Convert camelCase to Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
}

function formatParamValue(key: string, value: any): string {
  if (typeof value === 'number') {
    // Format percentages
    if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('percentage')) {
      return `${(value * 100).toFixed(2)}%`;
    }
    
    // Format dollar values
    if (key.toLowerCase().includes('capital') || key.toLowerCase().includes('money')) {
      return `$${value.toLocaleString()}`;
    }
    
    // Default number formatting
    return value.toString();
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return value.toString();
}

function prepareTradesTotalsByDate(trades: Trade[]): { date: string, trades: number }[] {
  // Group trades by date
  const tradesByDate = trades.reduce((acc, trade) => {
    const date = new Date(trade.entryTime).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Convert to array format for charting
  return Object.entries(tradesByDate).map(([date, count]) => ({
    date,
    trades: count
  }));
}

function classifyBacktestResult(result: BacktestResult): string {
  // Simple classification based on multiple factors
  if (result.totalReturnPercentage > 50 && result.winRate > 60) {
    return 'excellent';
  } else if (result.totalReturnPercentage > 20 && result.winRate > 50) {
    return 'good';
  } else if (result.totalReturnPercentage > 0) {
    return 'neutral';
  } else if (result.totalReturnPercentage > -20) {
    return 'poor';
  } else {
    return 'bad';
  }
}

function getBadgeColor(classification: string): string {
  switch (classification) {
    case 'excellent':
      return 'bg-green-500 hover:bg-green-600';
    case 'good':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'neutral':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'poor':
      return 'bg-orange-500 hover:bg-orange-600';
    case 'bad':
      return 'bg-red-500 hover:bg-red-600';
    default:
      return '';
  }
}
