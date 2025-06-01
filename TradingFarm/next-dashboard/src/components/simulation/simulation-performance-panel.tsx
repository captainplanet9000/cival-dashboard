'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { SimulationService, SimulationRun, SimulationMetric } from '@/services/simulation-service';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface SimulationPerformancePanelProps {
  agentId: string;
  simulationRunId?: string;
}

export default function SimulationPerformancePanel({ 
  agentId,
  simulationRunId
}: SimulationPerformancePanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [simulationRuns, setSimulationRuns] = useState<SimulationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(simulationRunId);
  const [metrics, setMetrics] = useState<SimulationMetric[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [cumulativePnL, setCumulativePnL] = useState<any[]>([]);
  const [winLossDistribution, setWinLossDistribution] = useState<any[]>([]);
  const { toast } = useToast();
  
  // Load simulation runs
  useEffect(() => {
    const loadSimulationRuns = async () => {
      try {
        setIsLoading(true);
        const { runs } = await SimulationService.getSimulationRuns({ 
          agentId, 
          status: 'completed',
          limit: 10 
        });
        
        setSimulationRuns(runs);
        
        // If no run ID is provided but runs exist, select the most recent one
        if (!selectedRunId && runs.length > 0) {
          setSelectedRunId(runs[0].id);
        }
      } catch (error) {
        console.error('Error loading simulation runs:', error);
        toast({
          title: 'Error',
          description: 'Failed to load simulation runs',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSimulationRuns();
  }, [agentId, selectedRunId, toast]);
  
  // Load selected run data
  useEffect(() => {
    const loadSimulationData = async () => {
      if (!selectedRunId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch metrics
        const metricsData = await SimulationService.getSimulationMetrics(selectedRunId);
        setMetrics(metricsData);
        
        // Fetch trade history
        const { trades } = await SimulationService.getSimulationTradeHistory(selectedRunId, 100);
        setTradeHistory(trades);
        
        // Only load PnL data if we have trades
        if (trades.length > 0) {
          // Get the most traded symbol
          const symbolCounts: Record<string, number> = {};
          trades.forEach(trade => {
            symbolCounts[trade.symbol] = (symbolCounts[trade.symbol] || 0) + 1;
          });
          
          const mostTradedSymbol = Object.entries(symbolCounts)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0])[0];
          
          // Fetch cumulative PnL
          const pnlData = await SimulationService.getSimulationCumulativePnL(
            selectedRunId, 
            mostTradedSymbol
          );
          setCumulativePnL(pnlData);
          
          // Calculate win/loss distribution
          const wins = trades.filter(t => 
            (t.side === 'buy' && t.price < t.average) || 
            (t.side === 'sell' && t.price > t.average)
          ).length;
          
          const losses = trades.length - wins;
          
          setWinLossDistribution([
            { name: 'Wins', value: wins },
            { name: 'Losses', value: losses }
          ]);
        }
      } catch (error) {
        console.error('Error loading simulation data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load simulation performance data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSimulationData();
  }, [selectedRunId, toast]);
  
  // Format currency value
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Format percentage value
  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };
  
  // Get metric by name
  const getMetricValue = (name: string) => {
    const metric = metrics.find(m => m.metricName === name);
    return metric ? metric.metricValue : 0;
  };
  
  // Generate data for daily performance chart
  const getDailyPerformanceData = () => {
    // Group trades by day
    const dailyData: Record<string, any> = {};
    
    tradeHistory.forEach(trade => {
      const date = new Date(trade.timestamp).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          trades: 0,
          pnl: 0
        };
      }
      
      dailyData[date].trades++;
      const pnl = trade.side === 'buy' ? -trade.cost : trade.cost;
      dailyData[date].pnl += pnl - trade.fee;
    });
    
    return Object.values(dailyData);
  };
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Performance Analytics</CardTitle>
        <CardDescription>
          Analyze your trading strategy performance in simulation
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Simulation Run Selector */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-1/2">
              <Select 
                value={selectedRunId} 
                onValueChange={setSelectedRunId}
                disabled={isLoading || simulationRuns.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a simulation run" />
                </SelectTrigger>
                <SelectContent>
                  {simulationRuns.map(run => (
                    <SelectItem key={run.id} value={run.id}>
                      {run.name} ({new Date(run.startTime).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedRunId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = `/dashboard/dry-run/runs/${selectedRunId}`}
              >
                View Detailed Report
              </Button>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <div className="h-64 w-full flex items-center justify-center">
            <p>Loading analytics data...</p>
          </div>
        ) : !selectedRunId || metrics.length === 0 ? (
          <div className="h-64 w-full flex items-center justify-center">
            <p>No performance data available. Complete a simulation run first.</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
              <TabsTrigger value="charts">Performance Charts</TabsTrigger>
              <TabsTrigger value="trades">Trade History</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className={`text-2xl font-bold ${getMetricValue('total_pnl') >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(getMetricValue('total_pnl'))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">
                      {formatPercent(getMetricValue('win_rate'))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">
                      {getMetricValue('profit_factor').toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold text-red-500">
                      {formatPercent(getMetricValue('max_drawdown'))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cumulative P&L Chart */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Cumulative P&L</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 h-64">
                    {cumulativePnL.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cumulativePnL}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: any) => [formatCurrency(value), 'PnL']}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="cumulativePnl" 
                            name="Cumulative P&L" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">Insufficient data for P&L chart</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Win/Loss Distribution */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Win/Loss Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 h-64">
                    {winLossDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={winLossDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {winLossDistribution.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.name === 'Wins' ? '#00C49F' : '#FF8042'} 
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [value, 'Trades']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground">Insufficient data for win/loss chart</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Metrics Tab */}
            <TabsContent value="metrics" className="mt-4">
              <Table>
                <TableCaption>Performance metrics for the selected simulation run</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map(metric => (
                    <TableRow key={metric.metricName}>
                      <TableCell className="font-medium">{metric.metricLabel}</TableCell>
                      <TableCell>
                        {metric.metricName.includes('percent') || metric.metricName.includes('rate') || metric.metricName === 'win_rate' || metric.metricName === 'max_drawdown'
                          ? formatPercent(metric.metricValue)
                          : metric.metricName.includes('pnl') || metric.metricName.includes('balance') || metric.metricName === 'total_pnl' || metric.metricName === 'avg_win' || metric.metricName === 'avg_loss'
                            ? formatCurrency(metric.metricValue)
                            : metric.metricValue.toFixed(2)
                        }
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getMetricDescription(metric.metricName)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            {/* Charts Tab */}
            <TabsContent value="charts" className="space-y-6 mt-4">
              {/* Daily Performance Chart */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 h-80">
                  {tradeHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getDailyPerformanceData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip 
                          formatter={(value: any, name: string) => [
                            name === 'pnl' ? formatCurrency(value) : value,
                            name === 'pnl' ? 'Profit/Loss' : 'Trade Count'
                          ]}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="trades" name="Trades" fill="#8884d8" />
                        <Bar yAxisId="right" dataKey="pnl" name="P&L" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">Insufficient data for daily performance chart</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Add more charts as needed */}
            </TabsContent>
            
            {/* Trade History Tab */}
            <TabsContent value="trades" className="mt-4">
              <Table>
                <TableCaption>Recent trades from the simulation</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeHistory.slice(0, 10).map((trade, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(trade.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell className={trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                        {trade.side.toUpperCase()}
                      </TableCell>
                      <TableCell>{trade.type}</TableCell>
                      <TableCell>{trade.price.toFixed(2)}</TableCell>
                      <TableCell>{trade.amount.toFixed(6)}</TableCell>
                      <TableCell>{trade.cost.toFixed(2)}</TableCell>
                      <TableCell>{trade.fee.toFixed(2)}</TableCell>
                      <TableCell>{trade.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {tradeHistory.length > 10 && (
                <div className="mt-4 text-center">
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = `/dashboard/dry-run/runs/${selectedRunId}/trades`}
                  >
                    View All {tradeHistory.length} Trades
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function for metric descriptions
function getMetricDescription(metricName: string): string {
  const descriptions: Record<string, string> = {
    total_trades: 'Total number of trades executed during the simulation',
    win_rate: 'Percentage of trades that resulted in profit',
    profit_factor: 'Ratio of gross profits to gross losses (values > 1 indicate profitability)',
    expectancy: 'Average amount you can expect to win or lose per trade',
    avg_win: 'Average profit on winning trades',
    avg_loss: 'Average loss on losing trades',
    max_drawdown: 'Maximum percentage decline from a peak to a trough',
    total_pnl: 'Total profit or loss for the simulation period',
    final_balance: 'Final account balance at the end of simulation'
  };
  
  return descriptions[metricName] || 'Performance metric';
}
