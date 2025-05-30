import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AgentAnalyticsProps {
  agentId: string;
}

interface PerformanceMetrics {
  total_trades: number;
  successful_trades: number;
  failed_trades: number;
  total_pnl: number;
  win_rate: number;
  average_trade_duration: number;
  risk_reward_ratio: number;
}

interface TimeSeriesData {
  timestamp: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AgentAnalytics({ agentId }: AgentAnalyticsProps) {
  const [timeframe, setTimeframe] = useState('24h');
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [pnlHistory, setPnlHistory] = useState<TimeSeriesData[]>([]);
  const [tradeDistribution, setTradeDistribution] = useState<any[]>([]);
  const [commandStats, setCommandStats] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [agentId, timeframe]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/elizaos/agents/analytics?agentId=${agentId}&timeframe=${timeframe}`
      );
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data.metrics);
        setPnlHistory(data.data.pnl_history);
        setTradeDistribution(data.data.trade_distribution);
        setCommandStats(data.data.command_stats);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  if (!metrics) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Timeframe Selection */}
      <div className="flex justify-end">
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total Trades</div>
            <div className="text-2xl font-bold">{metrics.total_trades}</div>
            <div className="text-sm text-gray-500">
              Win Rate: {(metrics.win_rate * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total P&L</div>
            <div className={`text-2xl font-bold ${metrics.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.total_pnl.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Avg Trade Duration</div>
            <div className="text-2xl font-bold">
              {(metrics.average_trade_duration / 60).toFixed(1)}m
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Risk/Reward Ratio</div>
            <div className="text-2xl font-bold">
              {metrics.risk_reward_ratio.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Chart */}
      <Card>
        <CardHeader>
          <CardTitle>P&L History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pnlHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  name="P&L"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Trade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tradeDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {tradeDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Command Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Command Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commandStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="success_rate" fill="#82ca9d" name="Success Rate" />
                  <Bar dataKey="avg_latency" fill="#8884d8" name="Avg Latency (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
