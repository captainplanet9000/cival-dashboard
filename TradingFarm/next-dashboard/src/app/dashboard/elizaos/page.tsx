'use client';

import { useState } from 'react';
import { ElizaOSCentricLayout, Widget } from '@/components/layouts/elizaos-centric-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortfolioData } from '@/hooks/use-portfolio-data';
import { useMarketData } from '@/hooks/use-market-data';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { useAgentStatus } from '@/hooks/use-agent-status';
import { Badge } from '@/components/ui/badge';
import { LineChart, BarChart, PieChart } from '@/components/charts';
import { Loader2 } from 'lucide-react';

export default function ElizaOSCentricDashboard() {
  const [farmId, setFarmId] = useState('default-farm');
  const { toast } = useToast();
  const { data: portfolioData, isLoading: isLoadingPortfolio } = usePortfolioData(farmId);
  const { data: marketData, isLoading: isLoadingMarket } = useMarketData();
  const { data: agentStatus, isLoading: isLoadingAgents } = useAgentStatus(farmId);

  // Sample top performing asset data
  const topAssets = [
    { asset: 'BTC', allocation: 35, performance: 12.5 },
    { asset: 'ETH', allocation: 25, performance: 8.2 },
    { asset: 'SOL', allocation: 15, performance: 24.8 },
    { asset: 'AVAX', allocation: 10, performance: 15.3 },
    { asset: 'BNB', allocation: 8, performance: 5.1 },
    { asset: 'Others', allocation: 7, performance: 4.3 },
  ];

  // Placeholder data for portfolio allocation chart
  const portfolioAllocationData = {
    labels: topAssets.map(a => a.asset),
    datasets: [
      {
        label: 'Allocation (%)',
        data: topAssets.map(a => a.allocation),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Market performance chart data (weekly)
  const marketPerformanceData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'BTC Price',
        data: [50200, 50800, 51200, 50600, 52000, 53500, 53000],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.3,
      },
      {
        label: 'ETH Price',
        data: [2700, 2750, 2780, 2760, 2850, 2900, 2880],
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.3,
      },
    ],
  };

  // Agent performance data
  const agentPerformanceData = {
    labels: ['Agent 1', 'Agent 2', 'Agent 3', 'Agent 4'],
    datasets: [
      {
        label: 'Win Rate (%)',
        data: [65, 58, 72, 61],
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
      },
    ],
  };

  return (
    <ElizaOSCentricLayout
      farmId={farmId}
      topWidgets={
        <>
          {/* Portfolio Summary Widget */}
          <Widget title="Portfolio Summary" width="medium" height="small">
            {isLoadingPortfolio ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-2">
                  <span className="text-xs text-muted-foreground">Total Value</span>
                  <span className="text-2xl font-bold">$125,890</span>
                  <span className="text-xs text-green-500">+2.4% (24h)</span>
                </div>
                <div className="flex flex-col p-2">
                  <span className="text-xs text-muted-foreground">Daily P&L</span>
                  <span className="text-2xl font-bold text-green-500">+$3,240</span>
                  <span className="text-xs text-muted-foreground">2.6%</span>
                </div>
                <div className="flex flex-col p-2">
                  <span className="text-xs text-muted-foreground">Active Positions</span>
                  <span className="text-2xl font-bold">12</span>
                  <span className="text-xs text-muted-foreground">4 in profit</span>
                </div>
                <div className="flex flex-col p-2">
                  <span className="text-xs text-muted-foreground">Risk Score</span>
                  <span className="text-2xl font-bold">Medium</span>
                  <span className="text-xs text-amber-500">Caution</span>
                </div>
              </div>
            )}
          </Widget>

          {/* Market Overview Widget */}
          <Widget title="Market Overview" width="medium" height="small">
            {isLoadingMarket ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col p-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">BTC/USD</span>
                    <Badge variant="outline" className="text-green-500">+1.8%</Badge>
                  </div>
                  <span className="text-xl">$52,890</span>
                  <span className="text-xs text-muted-foreground">Vol: $23.4B</span>
                </div>
                <div className="flex flex-col p-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">ETH/USD</span>
                    <Badge variant="outline" className="text-green-500">+3.2%</Badge>
                  </div>
                  <span className="text-xl">$2,890</span>
                  <span className="text-xs text-muted-foreground">Vol: $12.1B</span>
                </div>
                <div className="flex flex-col p-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">SOL/USD</span>
                    <Badge variant="outline" className="text-green-500">+4.5%</Badge>
                  </div>
                  <span className="text-xl">$135.20</span>
                  <span className="text-xs text-muted-foreground">Vol: $5.6B</span>
                </div>
              </div>
            )}
          </Widget>
        </>
      }
      leftWidgets={
        <>
          {/* Portfolio Allocation Widget */}
          <Widget title="Portfolio Allocation" height="medium">
            <div className="h-full flex items-center justify-center">
              <PieChart 
                data={portfolioAllocationData}
                options={{
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        boxWidth: 12,
                        padding: 10,
                      }
                    }
                  }
                }}
              />
            </div>
          </Widget>
          
          {/* Active Agents Widget */}
          <Widget title="Active Agents" height="medium">
            {isLoadingAgents ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 border rounded-md">
                  <div>
                    <div className="font-medium">Market Analyst</div>
                    <div className="text-xs text-muted-foreground">Last active: 2m ago</div>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded-md">
                  <div>
                    <div className="font-medium">Trend Follower</div>
                    <div className="text-xs text-muted-foreground">Last active: 5m ago</div>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded-md">
                  <div>
                    <div className="font-medium">Risk Manager</div>
                    <div className="text-xs text-muted-foreground">Last active: 15m ago</div>
                  </div>
                  <Badge className="bg-amber-500">Idle</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded-md">
                  <div>
                    <div className="font-medium">Portfolio Optimizer</div>
                    <div className="text-xs text-muted-foreground">Last active: 1h ago</div>
                  </div>
                  <Badge className="bg-red-500">Offline</Badge>
                </div>
              </div>
            )}
          </Widget>
        </>
      }
      rightWidgets={
        <>
          {/* Market Performance Widget */}
          <Widget title="Market Performance" height="medium">
            <div className="h-full flex items-center justify-center">
              <LineChart 
                data={marketPerformanceData}
                options={{
                  scales: {
                    y: {
                      beginAtZero: false,
                    },
                  },
                }}
              />
            </div>
          </Widget>
          
          {/* Agent Performance Widget */}
          <Widget title="Agent Performance" height="medium">
            <div className="h-full flex items-center justify-center">
              <BarChart 
                data={agentPerformanceData}
                options={{
                  indexAxis: 'y',
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                }}
              />
            </div>
          </Widget>
        </>
      }
      bottomWidgets={
        <>
          {/* Recent Trades Widget */}
          <Widget title="Recent Trades" width="full" height="small">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Pair</th>
                    <th className="text-left p-2">Side</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Value</th>
                    <th className="text-left p-2">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">13:25:44</td>
                    <td className="p-2">BTC/USD</td>
                    <td className="p-2 text-green-500">Buy</td>
                    <td className="p-2">$52,890</td>
                    <td className="p-2">0.05 BTC</td>
                    <td className="p-2">$2,644.50</td>
                    <td className="p-2">Trend Follower</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">12:18:32</td>
                    <td className="p-2">ETH/USD</td>
                    <td className="p-2 text-green-500">Buy</td>
                    <td className="p-2">$2,890</td>
                    <td className="p-2">1.2 ETH</td>
                    <td className="p-2">$3,468.00</td>
                    <td className="p-2">Market Analyst</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">11:42:15</td>
                    <td className="p-2">SOL/USD</td>
                    <td className="p-2 text-red-500">Sell</td>
                    <td className="p-2">$134.80</td>
                    <td className="p-2">10 SOL</td>
                    <td className="p-2">$1,348.00</td>
                    <td className="p-2">Portfolio Optimizer</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">09:30:08</td>
                    <td className="p-2">BNB/USD</td>
                    <td className="p-2 text-red-500">Sell</td>
                    <td className="p-2">$410.50</td>
                    <td className="p-2">2.5 BNB</td>
                    <td className="p-2">$1,026.25</td>
                    <td className="p-2">Risk Manager</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Widget>
        </>
      }
    />
  );
}
