'use client';

import * as React from 'react';
import { RefreshCw, ExternalLink, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeployAgentButton } from '@/components/deploy-agent-button';

interface Agent {
  id: string;
  name: string;
  description: string;
  strategy: string;
  budget: number;
  risk_level: string;
  status: string;
  last_active: string;
  trades: number;
  performance?: string;
}

export default function AgentsTab() {
  const [loading, setLoading] = React.useState(false);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const formatLastActive = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 60) return `${diffMins} mins ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      return `${diffDays} days ago`;
    } catch (e) {
      return 'unknown time ago';
    }
  };

  const loadAgents = () => {
    setIsLoading(true);
    try {
      // Get agents from localStorage
      const storedAgents = localStorage.getItem('tradingFarmAgents');
      if (storedAgents) {
        const parsedAgents: Agent[] = JSON.parse(storedAgents);
        
        // Add performance calculations
        const agentsWithPerformance = parsedAgents.map(agent => ({
          ...agent,
          performance: `+${(Math.random() * 20).toFixed(1)}%` // Just for demo
        }));
        
        setAgents(agentsWithPerformance);
      } else {
        setAgents([]);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load agents on initial render
  React.useEffect(() => {
    loadAgents();
  }, []);

  return (
    <Card className="dashboard-card trading-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agent Management</CardTitle>
            <CardDescription>Your automated trading agents</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={loadAgents}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <DeployAgentButton />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading agents...</span>
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center p-8 border rounded-lg bg-muted/10">
              <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium">No agents deployed</h3>
              <p className="text-sm text-muted-foreground mb-4">Deploy your first agent to get started with automated trading</p>
              <DeployAgentButton />
            </div>
          ) : (
            agents.map((agent, index) => (
              <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg bg-card stats-card">
                <div className="flex items-center gap-3">
                  <div className={`status-indicator ${agent.status === 'active' ? 'status-active animate-pulse' : 'status-pending'}`} />
                  <div>
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-muted-foreground">{agent.trades} trades • Last active: {formatLastActive(agent.last_active)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="positive-change font-medium">{agent.performance}</div>
                  <Button variant="outline" size="sm" className="outline-button">
                    <ExternalLink className="h-4 w-4 mr-1" /> Details
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
