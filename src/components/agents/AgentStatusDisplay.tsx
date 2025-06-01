'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Define an interface for the expected agent data from the API
interface AgentInfo {
  id: string;
  agent_type: string;
  status: string;
  last_heartbeat_at: string | null;
  // Add other relevant fields if returned by the API
}

const AgentStatusDisplay: React.FC = () => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgentStatuses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/agents/status');
        if (!response.ok) {
          throw new Error(`Failed to fetch agent statuses: ${response.statusText}`);
        }
        const data: AgentInfo[] = await response.json();
        setAgents(data);
      } catch (err: any) {
        console.error("Error fetching agent statuses:", err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgentStatuses();
    // Optionally, set up polling
    const intervalId = setInterval(fetchAgentStatuses, 10000); // Poll every 10 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array means this runs once on mount + cleanup

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'idle':
        return 'default';
      case 'busy':
        return 'secondary';
      case 'error':
      case 'recovering':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  // Helper to format the heartbeat timestamp
  const formatHeartbeat = (isoString: string | null): string => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
      
      if (diffSeconds < 60) return `${diffSeconds}s ago`;
      const diffMinutes = Math.round(diffSeconds / 60);
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      // Could add hours/days etc. if needed
      return date.toLocaleString(); // Fallback to full timestamp
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Status Monitor</CardTitle>
        <CardDescription>Live status of registered agents.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && agents.length === 0 && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading agent statuses...</span>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && agents.length === 0 && (
          <p className="text-center text-muted-foreground">No agents found.</p>
        )}
        {!error && agents.length > 0 && (
          <ul className="space-y-3">
            {agents.map((agent) => (
              <li key={agent.id} className="flex items-center justify-between p-2 border rounded-md">
                <div>
                  <span className="font-medium">{agent.id}</span>
                  <span className="text-sm text-muted-foreground ml-2">({agent.agent_type})</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">Heartbeat: {formatHeartbeat(agent.last_heartbeat_at)}</span>
                    <Badge>{agent.status || 'Unknown'}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentStatusDisplay; 