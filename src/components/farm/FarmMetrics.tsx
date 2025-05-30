'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockPerformanceData = [
  { date: '2024-01', value: 10.5 },
  { date: '2024-02', value: 15.2 },
  { date: '2024-03', value: 12.8 },
  { date: '2024-04', value: 18.4 },
  { date: '2024-05', value: 16.9 },
  { date: '2024-06', value: 22.3 },
];

const mockAgentMetrics = [
  { date: '2024-01', active: 8, total: 10 },
  { date: '2024-02', active: 12, total: 15 },
  { date: '2024-03', active: 18, total: 20 },
  { date: '2024-04', active: 22, total: 25 },
  { date: '2024-05', active: 28, total: 30 },
  { date: '2024-06', active: 35, total: 40 },
];

const mockStrategyMetrics = [
  { date: '2024-01', successful: 15, total: 20 },
  { date: '2024-02', successful: 18, total: 25 },
  { date: '2024-03', successful: 22, total: 30 },
  { date: '2024-04', successful: 28, total: 35 },
  { date: '2024-05', successful: 32, total: 40 },
  { date: '2024-06', successful: 38, total: 45 },
];

export function FarmMetrics() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Farm Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={mockPerformanceData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('default', { month: 'short' });
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Performance']}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={mockAgentMetrics}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('default', { month: 'short' });
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="active"
                    name="Active Agents"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Agents"
                    stroke="#64748b"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="strategies" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={mockStrategyMetrics}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('default', { month: 'short' });
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="successful"
                    name="Successful Strategies"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Strategies"
                    stroke="#64748b"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 