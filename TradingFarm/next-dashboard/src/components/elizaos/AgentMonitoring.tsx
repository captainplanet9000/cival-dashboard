import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface AgentMonitoringProps {
  agentId: string;
}

interface HealthMetrics {
  cpu_usage: number;
  memory_usage: number;
  active_tasks: number;
  queue_length: number;
  last_command_latency_ms: number;
}

interface StatusCheck {
  is_responsive: boolean;
  last_heartbeat: string;
  error_count: number;
  warning_count: number;
}

export default function AgentMonitoring({ agentId }: AgentMonitoringProps) {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [statusCheck, setStatusCheck] = useState<StatusCheck | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 5000);
    return () => clearInterval(interval);
  }, [agentId]);

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch(`/api/elizaos/agents/monitor?agentId=${agentId}`);
      const data = await response.json();

      if (data.success) {
        setHealthMetrics(data.data.health[0]?.health.resource_usage);
        setStatusCheck(data.data.health[0]?.health.status_check);
        updateHistoricalData(data.data.health[0]?.health.resource_usage);
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    }
  };

  const updateHistoricalData = (metrics: HealthMetrics | null) => {
    if (!metrics) return;

    setHistoricalData(prev => {
      const newData = [...prev, { ...metrics, timestamp: new Date().getTime() }];
      if (newData.length > 50) newData.shift(); // Keep last 50 data points
      return newData;
    });
  };

  if (!healthMetrics || !statusCheck) {
    return <div>Loading monitoring data...</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>CPU Usage</span>
              <span>{healthMetrics.cpu_usage}%</span>
            </div>
            <Progress value={healthMetrics.cpu_usage} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Memory Usage</span>
              <span>{healthMetrics.memory_usage}MB</span>
            </div>
            <Progress value={(healthMetrics.memory_usage / 1024) * 100} />
          </div>
        </CardContent>
      </Card>

      {/* Task Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Task Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Active Tasks</div>
              <div className="text-2xl font-bold">{healthMetrics.active_tasks}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Queue Length</div>
              <div className="text-2xl font-bold">{healthMetrics.queue_length}</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Last Command Latency</div>
            <div className="text-2xl font-bold">
              {healthMetrics.last_command_latency_ms}ms
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Performance */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Resource Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                />
                <Line
                  type="monotone"
                  dataKey="cpu_usage"
                  stroke="#8884d8"
                  name="CPU Usage (%)"
                />
                <Line
                  type="monotone"
                  dataKey="memory_usage"
                  stroke="#82ca9d"
                  name="Memory Usage (MB)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Status Information */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Status Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className={`text-lg font-semibold ${statusCheck.is_responsive ? 'text-green-500' : 'text-red-500'}`}>
                {statusCheck.is_responsive ? 'Responsive' : 'Unresponsive'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Last Heartbeat</div>
              <div className="text-lg font-semibold">
                {new Date(statusCheck.last_heartbeat).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Error Count</div>
              <div className="text-lg font-semibold text-red-500">
                {statusCheck.error_count}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Warning Count</div>
              <div className="text-lg font-semibold text-yellow-500">
                {statusCheck.warning_count}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
