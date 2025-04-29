'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AgentMonitoring from './AgentMonitoring';
import AgentCommands from './AgentCommands';
import AgentKnowledge from './AgentKnowledge';
import AgentTrading from './AgentTrading';
import AgentAnalytics from './AgentAnalytics';
import AgentConfig from './AgentConfig';

type Alert = {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
};

type Agent = {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  last_heartbeat: string;
};

interface AgentDashboardProps {
  initialAgents: Agent[];
  initialAlerts: Alert[];
}

export default function AgentDashboard({ initialAgents, initialAlerts }: AgentDashboardProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(initialAgents[0]?.id || null);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const supabase = createBrowserClient();

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgents();
      fetchAlerts();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from('elizaos_agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAgents(data);
      if (!selectedAgent && data.length > 0) {
        setSelectedAgent(data[0].id);
      }
    }
  };

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('elizaos_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAlerts(data);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      idle: 'bg-green-500',
      busy: 'bg-yellow-500',
      error: 'bg-red-500',
      offline: 'bg-gray-500',
      learning: 'bg-blue-500',
      analyzing: 'bg-purple-500',
      trading: 'bg-indigo-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert key={alert.id} variant={alert.type}>
              <AlertTitle>{alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Agent Overview */}
      <Card>
        <CardHeader>
          <CardTitle>ElizaOS Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {agents.map((agent) => (
              <Button
                key={agent.id}
                variant={selectedAgent === agent.id ? 'default' : 'outline'}
                onClick={() => setSelectedAgent(agent.id)}
                className="flex items-center gap-2"
              >
                <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                {agent.name}
                <Badge variant={agent.status === 'online' ? 'default' : 'destructive'}>
                  {agent.status}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Details */}
      {selectedAgent && (
        <Tabs defaultValue="monitoring" className="space-y-4">
          <TabsList className="grid grid-cols-5 gap-4">
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring">
            <AgentMonitoring agentId={selectedAgent} />
          </TabsContent>

          <TabsContent value="commands">
            <AgentCommands agentId={selectedAgent} />
          </TabsContent>

          <TabsContent value="knowledge">
            <AgentKnowledge agentId={selectedAgent} />
          </TabsContent>

          <TabsContent value="trading">
            <AgentTrading agentId={selectedAgent} />
          </TabsContent>

          <TabsContent value="analytics">
            <AgentAnalytics agentId={selectedAgent} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
