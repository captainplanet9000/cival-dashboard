'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';

// TODO: Define proper types for monitoring data
interface SystemResource { 
  type: 'CPU' | 'Memory' | 'Disk';
  usage: number; // Percentage
  status: 'normal' | 'warning' | 'critical';
}

interface ComponentStatus {
  id: string;
  name: string;
  type: 'Agent' | 'Vault' | 'LinkedAccount' | 'ExternalService';
  status: 'online' | 'offline' | 'error' | 'warning' | 'degraded';
  lastCheck?: string;
  details?: string;
}

interface MonitoringAlert {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
}

// Mock data - replace with actual data fetching
const mockResources: SystemResource[] = [
  { type: 'CPU', usage: 45, status: 'normal' },
  { type: 'Memory', usage: 68, status: 'normal' },
  { type: 'Disk', usage: 85, status: 'warning' },
];

const mockComponentStatuses: ComponentStatus[] = [
  { id: 'agent-1', name: 'TradingAgent Alpha', type: 'Agent', status: 'online', lastCheck: '2m ago' },
  { id: 'agent-2', name: 'ArbitrageAgent Beta', type: 'Agent', status: 'warning', lastCheck: '1m ago', details: 'High latency detected' },
  { id: 'vault-main', name: 'Primary USDT Vault', type: 'Vault', status: 'online', lastCheck: '3m ago' },
  { id: 'binance-api', name: 'Binance Account', type: 'LinkedAccount', status: 'degraded', lastCheck: '5m ago', details: 'API rate limits nearing' },
  { id: 'blockchain-node', name: 'Ethereum Node', type: 'ExternalService', status: 'error', lastCheck: '10m ago', details: 'Connection failed' },
];

const mockAlerts: MonitoringAlert[] = [
  { id: 'alert-1', timestamp: '5m ago', severity: 'warning', component: 'Agent Beta', message: 'High latency detected on task execution.' },
  { id: 'alert-2', timestamp: '10m ago', severity: 'error', component: 'Ethereum Node', message: 'Failed to connect to external node.' },
  { id: 'alert-3', timestamp: '15m ago', severity: 'critical', component: 'Disk Usage', message: 'Disk space exceeding 90% threshold.' },
];

export default function MonitoringPage() {
  const [resources, setResources] = useState<SystemResource[]>(mockResources);
  const [componentStatuses, setComponentStatuses] = useState<ComponentStatus[]>(mockComponentStatuses);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>(mockAlerts);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // TODO: Implement actual data fetching logic (e.g., using SWR or React Query)
  useEffect(() => {
    // Placeholder for fetching data periodically or via WebSockets
    const interval = setInterval(() => {
      console.log('Fetching monitoring data...');
      // Simulate data update
      setLastUpdated(new Date());
    }, 30000); // Fetch every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ComponentStatus['status']): string => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'warning':
      case 'degraded': return 'bg-yellow-500';
      case 'error':
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertVariant = (severity: MonitoringAlert['severity']): "default" | "destructive" => {
      switch (severity) {
          case 'error':
          case 'critical': return "destructive";
          default: return "default";
      }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Farm Monitoring Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">Last updated: {lastUpdated.toLocaleTimeString()}</p>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle>System Resources</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map((res: SystemResource) => (
            <div key={res.type}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">{res.type} Usage</span>
                <Badge variant={res.status === 'critical' ? 'destructive' : res.status === 'warning' ? 'secondary' : 'default'}>
                  {res.usage}%
                </Badge>
              </div>
              <Progress value={res.usage} className={res.status === 'critical' ? 'progress-critical' : res.status === 'warning' ? 'progress-warning' : ''} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Component Status */}
      <Card>
        <CardHeader>
          <CardTitle>Component Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {componentStatuses.map((comp) => (
              <div key={comp.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center space-x-3">
                  <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(comp.status)}`}></span>
                  <div>
                    <p className="font-semibold">{comp.name} <span className="text-xs text-muted-foreground">({comp.type})</span></p>
                    {comp.details && <p className="text-sm text-muted-foreground">{comp.details}</p>}
                  </div>
                </div>
                <div className="text-right">
                    <Badge variant={comp.status === 'error' || comp.status === 'offline' ? 'destructive' : comp.status === 'warning' || comp.status === 'degraded' ? 'secondary' : 'default'}>
                        {comp.status}
                    </Badge>
                    {comp.lastCheck && <p className="text-xs text-muted-foreground mt-1">{comp.lastCheck}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <Alert key={alert.id} variant={getAlertVariant(alert.severity)}>
                <Terminal className="h-4 w-4" /> 
                <AlertTitle className='capitalize'>[{alert.severity}] {alert.component}</AlertTitle>
                <AlertDescription>
                  {alert.message} <span className="text-xs text-muted-foreground">({alert.timestamp})</span>
                </AlertDescription>
              </Alert>
            ))
          ) : (
            <p className="text-muted-foreground">No recent alerts.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
} 