import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceData {
  date: string;
  value: number;
}

interface StrategyData {
  date: string;
  success: number;
  failure: number;
}

interface TradeData {
  date: string;
  volume: number;
  trades: number;
}

const mockPerformanceData: PerformanceData[] = [
  { date: "2024-01-01", value: 0 },
  { date: "2024-01-02", value: 2.5 },
  { date: "2024-01-03", value: 1.8 },
  { date: "2024-01-04", value: 4.2 },
  { date: "2024-01-05", value: 3.7 },
  { date: "2024-01-06", value: 5.1 },
  { date: "2024-01-07", value: 6.3 },
];

const mockStrategyData: StrategyData[] = [
  { date: "2024-01-01", success: 8, failure: 2 },
  { date: "2024-01-02", success: 12, failure: 3 },
  { date: "2024-01-03", success: 10, failure: 4 },
  { date: "2024-01-04", success: 15, failure: 2 },
  { date: "2024-01-05", success: 11, failure: 3 },
  { date: "2024-01-06", success: 14, failure: 1 },
  { date: "2024-01-07", success: 13, failure: 2 },
];

const mockTradeData: TradeData[] = [
  { date: "2024-01-01", volume: 150000, trades: 25 },
  { date: "2024-01-02", volume: 180000, trades: 30 },
  { date: "2024-01-03", volume: 160000, trades: 28 },
  { date: "2024-01-04", volume: 220000, trades: 35 },
  { date: "2024-01-05", volume: 190000, trades: 32 },
  { date: "2024-01-06", volume: 210000, trades: 33 },
  { date: "2024-01-07", volume: 200000, trades: 31 },
];

export function AgentMetrics() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Agent Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Current Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(6.3)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Peak Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPercentage(6.3)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Average Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatPercentage(3.4)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Performance History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockPerformanceData}>
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={formatPercentage} />
                        <Tooltip
                          formatter={(value: number) => [formatPercentage(value), "Performance"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#2563eb"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strategies">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Success Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(83)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Strategies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">83</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Failed Strategies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">17</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Strategy Success/Failure</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockStrategyData}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="success" fill="#22c55e" stackId="a" name="Success" />
                        <Bar dataKey="failure" fill="#ef4444" stackId="a" name="Failure" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trades">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(1310000)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Trades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">214</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Average Trade Size
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(6121)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Trading Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockTradeData}>
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={formatCurrency}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) =>
                            [name === "volume" ? formatCurrency(value) : value, name]
                          }
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="trades"
                          stroke="#2563eb"
                          strokeWidth={2}
                          name="Trades"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="volume"
                          stroke="#22c55e"
                          strokeWidth={2}
                          name="Volume"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 