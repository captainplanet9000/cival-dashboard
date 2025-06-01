"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, Database, Server, Cpu, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { TRADING_EVENTS } from './socket-event-stream'; // Reuse event constants for consistency

// This interface represents a node in our data pipeline
interface PipelineNode {
  id: string;
  name: string;
  type: 'source' | 'processor' | 'sink';
  status: 'healthy' | 'degraded' | 'critical';
  throughput: number;
  latency: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  lastUpdated: number;
  // Historical data for charts
  history: Array<{
    timestamp: number;
    throughput: number;
    latency: number;
    errorRate: number;
  }>;
}

// Mock data - would be replaced with real-time data from API/socket
const mockPipelineNodes: PipelineNode[] = [
  {
    id: 'node-001',
    name: 'Market Data Ingestion',
    type: 'source',
    status: 'healthy',
    throughput: 1250,
    latency: 45,
    errorRate: 0.05,
    cpuUsage: 28,
    memoryUsage: 42,
    lastUpdated: Date.now(),
    history: Array(20).fill(null).map((_, i) => ({
      timestamp: Date.now() - (20 - i) * 60000,
      throughput: 1200 + Math.random() * 200,
      latency: 40 + Math.random() * 20,
      errorRate: Math.random() * 0.2,
    })),
  },
  {
    id: 'node-002',
    name: 'Signal Processing',
    type: 'processor',
    status: 'healthy',
    throughput: 980,
    latency: 120,
    errorRate: 0.02,
    cpuUsage: 62,
    memoryUsage: 54,
    lastUpdated: Date.now(),
    history: Array(20).fill(null).map((_, i) => ({
      timestamp: Date.now() - (20 - i) * 60000,
      throughput: 950 + Math.random() * 100,
      latency: 110 + Math.random() * 30,
      errorRate: Math.random() * 0.1,
    })),
  },
  {
    id: 'node-003',
    name: 'Strategy Evaluation',
    type: 'processor',
    status: 'degraded',
    throughput: 720,
    latency: 215,
    errorRate: 1.25,
    cpuUsage: 87,
    memoryUsage: 76,
    lastUpdated: Date.now(),
    history: Array(20).fill(null).map((_, i) => ({
      timestamp: Date.now() - (20 - i) * 60000,
      throughput: 700 + Math.random() * 100,
      latency: 200 + Math.random() * 40,
      errorRate: 1 + Math.random() * 1,
    })),
  },
  {
    id: 'node-004',
    name: 'Order Execution',
    type: 'sink',
    status: 'healthy',
    throughput: 85,
    latency: 180,
    errorRate: 0.08,
    cpuUsage: 42,
    memoryUsage: 38,
    lastUpdated: Date.now(),
    history: Array(20).fill(null).map((_, i) => ({
      timestamp: Date.now() - (20 - i) * 60000,
      throughput: 80 + Math.random() * 15,
      latency: 170 + Math.random() * 25,
      errorRate: Math.random() * 0.2,
    })),
  },
  {
    id: 'node-005',
    name: 'ElizaOS Knowledge Integration',
    type: 'processor',
    status: 'healthy',
    throughput: 320,
    latency: 95,
    errorRate: 0.12,
    cpuUsage: 56,
    memoryUsage: 68,
    lastUpdated: Date.now(),
    history: Array(20).fill(null).map((_, i) => ({
      timestamp: Date.now() - (20 - i) * 60000,
      throughput: 300 + Math.random() * 50,
      latency: 90 + Math.random() * 15,
      errorRate: Math.random() * 0.3,
    })),
  },
];

interface NodeCardProps {
  node: PipelineNode;
  onSelect: (id: string) => void;
  isExpanded: boolean;
}

const NodeCard = ({ node, onSelect, isExpanded }: NodeCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-green-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'source': return <Database className="w-4 h-4" />;
      case 'processor': return <Cpu className="w-4 h-4" />;
      case 'sink': return <Server className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getProgressColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'bg-green-500';
    if (value < thresholds[1]) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="w-full">
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={() => onSelect(node.id)}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full bg-secondary ${getStatusColor(node.status)}`}>
            {getTypeIcon(node.type)}
          </div>
          <div>
            <h4 className="font-medium">{node.name}</h4>
            <p className="text-xs text-muted-foreground">
              {node.type.charAt(0).toUpperCase() + node.type.slice(1)} • {node.throughput} events/sec
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
            node.status === 'healthy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
            node.status === 'degraded' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
          }`}>
            {node.status.charAt(0).toUpperCase() + node.status.slice(1)}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      
      {isExpanded && (
        <CardContent>
          <div className="pt-2 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Throughput</p>
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">{node.throughput} events/sec</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Latency</p>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{node.latency} ms</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">Error Rate</p>
                <span className="text-xs font-medium">{node.errorRate.toFixed(2)}%</span>
              </div>
              <Progress 
                value={Math.min(node.errorRate * 10, 100)} 
                className={getProgressColor(node.errorRate, [0.5, 2])}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">CPU Usage</p>
                  <span className="text-xs font-medium">{node.cpuUsage}%</span>
                </div>
                <Progress 
                  value={node.cpuUsage} 
                  className={getProgressColor(node.cpuUsage, [70, 90])}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">Memory Usage</p>
                  <span className="text-xs font-medium">{node.memoryUsage}%</span>
                </div>
                <Progress 
                  value={node.memoryUsage} 
                  className={getProgressColor(node.memoryUsage, [70, 90])}
                />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Throughput History (events/sec)</p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={node.history}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <Line
                      type="monotone"
                      dataKey="throughput"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(23, 23, 23, 0.9)', 
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white' 
                      }}
                      formatter={(value: number) => [`${value.toFixed(0)} events/sec`, 'Throughput']}
                      labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Latency vs. Error Rate</p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={node.history}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={false}
                      yAxisId="left"
                    />
                    <Line
                      type="monotone"
                      dataKey="errorRate"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      yAxisId="right"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(23, 23, 23, 0.9)', 
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white' 
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'latency') return [`${value.toFixed(1)} ms`, 'Latency'];
                        if (name === 'errorRate') return [`${value.toFixed(2)}%`, 'Error Rate'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-right pt-1">
              Last updated: {new Date(node.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Data for the pipeline flow visualization
const pipelineData = [
  { name: 'Market Data', events: 1250 },
  { name: 'Signal Proc', events: 980 },
  { name: 'Strategy', events: 720 },
  { name: 'Knowledge', events: 320 },
  { name: 'Orders', events: 85 },
];

export interface DataPipelineMonitorProps {
  updateInterval?: number;
}

export function DataPipelineMonitor({
  updateInterval = 10000
}: DataPipelineMonitorProps): JSX.Element {
  const [pipelineNodes, setPipelineNodes] = useState<PipelineNode[]>(mockPipelineNodes);
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Simulate real-time updates to pipeline metrics
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedNodes = pipelineNodes.map(node => {
        // Create realistic variations to the metrics
        const throughputChange = (Math.random() * 0.1 - 0.05) * node.throughput;
        const latencyChange = (Math.random() * 0.1 - 0.05) * node.latency;
        const errorRateChange = (Math.random() * 0.2 - 0.1) * Math.max(0.1, node.errorRate);
        const cpuChange = (Math.random() * 10 - 5);
        const memoryChange = (Math.random() * 8 - 4);

        // Ensure values stay within reasonable ranges
        const newThroughput = Math.max(0, node.throughput + throughputChange);
        const newLatency = Math.max(10, node.latency + latencyChange);
        const newErrorRate = Math.max(0, node.errorRate + errorRateChange);
        const newCpuUsage = Math.min(100, Math.max(0, node.cpuUsage + cpuChange));
        const newMemoryUsage = Math.min(100, Math.max(0, node.memoryUsage + memoryChange));
        
        // Determine if node status needs to change based on metrics
        let newStatus = node.status;
        if (newErrorRate > 2 || newCpuUsage > 90 || newMemoryUsage > 90) {
          newStatus = 'critical';
        } else if (newErrorRate > 0.5 || newCpuUsage > 75 || newMemoryUsage > 75) {
          newStatus = 'degraded';
        } else {
          newStatus = 'healthy';
        }

        // Add new data point to history arrays
        const newHistoryPoint = {
          timestamp: Date.now(),
          throughput: newThroughput,
          latency: newLatency,
          errorRate: newErrorRate,
        };
        
        const newHistory = [...node.history.slice(1), newHistoryPoint];

        return {
          ...node,
          throughput: newThroughput,
          latency: newLatency,
          errorRate: newErrorRate,
          cpuUsage: newCpuUsage,
          memoryUsage: newMemoryUsage,
          status: newStatus,
          lastUpdated: Date.now(),
          history: newHistory,
        };
      });
      
      setPipelineNodes(updatedNodes);
      setLastUpdated(new Date());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [pipelineNodes, updateInterval]);

  const toggleNodeExpanded = (nodeId: string) => {
    if (expandedNodeIds.includes(nodeId)) {
      setExpandedNodeIds(expandedNodeIds.filter(id => id !== nodeId));
    } else {
      setExpandedNodeIds([...expandedNodeIds, nodeId]);
    }
  };

  // System-wide metrics
  const systemThroughput = pipelineNodes.reduce((sum, node) => sum + (node.type === 'source' ? node.throughput : 0), 0);
  const avgLatency = pipelineNodes.reduce((sum, node) => sum + node.latency, 0) / pipelineNodes.length;
  const totalErrorRate = pipelineNodes.reduce((sum, node) => sum + node.errorRate, 0) / pipelineNodes.length;
  const avgCpuUsage = pipelineNodes.reduce((sum, node) => sum + node.cpuUsage, 0) / pipelineNodes.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Data Pipeline Overview</CardTitle>
              <CardDescription>
                End-to-end monitoring of trading data flow
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-secondary/50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Throughput</p>
                    <p className="text-2xl font-bold">{systemThroughput.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">events/second</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-secondary/50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Latency</p>
                    <p className="text-2xl font-bold">{avgLatency.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">milliseconds</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-secondary/50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Error Rate</p>
                    <p className="text-2xl font-bold">{totalErrorRate.toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground">across all nodes</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Server className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-secondary/50">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">System Load</p>
                    <p className="text-2xl font-bold">{avgCpuUsage.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">avg CPU usage</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mb-6">
            <p className="text-sm font-medium mb-2">Data Pipeline Flow</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(23, 23, 23, 0.9)', 
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white' 
                    }}
                    formatter={(value: number) => [`${value} events/sec`, 'Throughput']}
                  />
                  <Bar dataKey="events" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">Node Status</p>
            <div className="space-y-3">
              {pipelineNodes.map((node, index) => (
                <div key={node.id}>
                  <NodeCard 
                    node={node} 
                    onSelect={toggleNodeExpanded} 
                    isExpanded={expandedNodeIds.includes(node.id)} 
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
