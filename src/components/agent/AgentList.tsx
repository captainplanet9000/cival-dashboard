import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentDetails } from "./AgentDetails";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineIcon } from 'lineicons-react';

import { Database } from "../../types/database.types";
import { createBrowserClient } from "@/utils/supabase/client"; // Import Supabase client

type Agent = Database['public']['Tables']['agents']['Row'];

type AgentMetadata = {
  name: string;
  performance?: string;
  [key: string]: any; 
};

interface AgentListProps {
  farmId: string; 
}

export function AgentList({ farmId }: AgentListProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null); 
  const [agents, setAgents] = useState<Agent[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wrap loadAgents in useCallback
  const loadAgents = useCallback(async () => {
    if (!farmId) {
      setIsLoading(false);
      setAgents([]);
      console.log('AgentList: No farmId provided.');
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log(`AgentList: Fetching agents for farm ID: ${farmId}`);
    try {
      // Create Supabase client
      const supabase = createBrowserClient();

      // Fetch agents for the specific farm
      const { data, error: dbError } = await supabase
        .from('agents')
        .select('*')
        .eq('farm_id', farmId);

      if (dbError) {
        throw dbError;
      }

      setAgents(data || []);
      console.log(`AgentList: Fetched ${data?.length || 0} agents for farm ID: ${farmId}`);

    } catch (err) {
      console.error("Error loading agents:", err); // Log the actual error
      setError(err instanceof Error ? `Database Error: ${err.message}` : 'An unexpected error occurred');
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  }, [farmId]); // Dependency array includes farmId

  useEffect(() => {
    loadAgents(); // Call the memoized loadAgents function
  }, [loadAgents]); // useEffect dependency is now the stable loadAgents function

  const getStatusColor = (status: string) => { 
    switch (status.toLowerCase()) { 
      case "active":
        return "bg-green-500";
      case "idle":
        return "bg-gray-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatTimestamp = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <LineIcon name="spinner" className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading agents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <LineIcon name="terminal" className="h-4 w-4" />
        <AlertTitle>Error Loading Agents</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length > 0 ? agents.map((agent) => ( 
              <TableRow key={agent.id}>
                <TableCell>{(agent.metadata as AgentMetadata)?.name ?? 'N/A'}</TableCell>
                <TableCell>{agent.agent_type}</TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(agent.status)} text-white`}>
                    {agent.status}
                  </Badge>
                </TableCell>
                <TableCell>{(agent.metadata as AgentMetadata)?.performance ?? 'N/A'}</TableCell>
                <TableCell>{formatTimestamp(agent.last_heartbeat_at)}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedAgent(agent)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No agents found for this farm.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AgentDetails 
        agent={selectedAgent} 
        onClose={() => setSelectedAgent(null)} 
        onAgentUpdate={loadAgents} // Pass loadAgents as onAgentUpdate
      />
    </div>
  );
}