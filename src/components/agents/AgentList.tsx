import React, { useState, useEffect } from 'react';
import { FarmAgent } from '@/services/farm/farm-service'; // Adjust import path if needed
// Import actual UI components from shadcn/ui
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Play, Pause } from 'lucide-react'; // Import icons

interface AgentListProps {
  farmId: number | string;
  // Add prop to trigger agent creation modal
  onTriggerCreateAgent: () => void; 
  // Add prop to trigger agent config edit modal
  onTriggerEditAgentConfig: (agent: FarmAgent) => void; 
}

export const AgentList: React.FC<AgentListProps> = ({ 
    farmId, 
    onTriggerCreateAgent, 
    onTriggerEditAgentConfig 
}) => {
  const [agents, setAgents] = useState<FarmAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    // ... (fetch logic remains the same) ...
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/farms/${farmId}/agents`);
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        setAgents(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch agents');
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Fetch agents error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (farmId) {
      fetchAgents();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]); // Only refetch when farmId changes

  const handleUpdateStatus = async (agentId: number | string, newStatus: string) => {
     // ... (update status logic remains the same) ...
     console.log(`Updating agent ${agentId} status to ${newStatus}...`);
     try {
       const response = await fetch(`/api/agents/${agentId}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ status: newStatus }),
       });
       if (!response.ok) throw new Error('Failed to update status');
       fetchAgents(); // Refresh list
     } catch (err) {
       console.error("Update status error:", err);
       setError(`Failed to update status for agent ${agentId}`);
     }
  };

  const handleDeleteAgent = async (agentId: number | string) => {
     // ... (delete logic remains the same) ...
     if (!window.confirm(`Are you sure you want to delete agent ${agentId}?`)) return;
     console.log(`Deleting agent ${agentId}...`);
     try {
        const response = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
        if (!response.ok && response.status !== 204) throw new Error('Failed to delete agent');
        fetchAgents(); // Refresh list
     } catch (err) {
        console.error("Delete agent error:", err);
        setError(`Failed to delete agent ${agentId}`);
     }
  };
  
  // Trigger the edit modal passed down via props
  const handleEditConfig = (agent: FarmAgent) => {
      onTriggerEditAgentConfig(agent);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Farm Agents</CardTitle>
        <Button onClick={onTriggerCreateAgent} size="sm">
           Create Agent
        </Button>
      </CardHeader>
      <CardContent>
        {loading && <p>Loading agents...</p>}
        {error && <p className="text-sm font-medium text-destructive">Error: {error}</p>}
        {!loading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">No agents found for this farm.</TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{/* Truncate ID if too long */}{agent.id.toString().substring(0, 8)}...</TableCell>
                      <TableCell>{agent.name}</TableCell>
                      <TableCell>
                         <Badge variant="secondary">{agent.type?.toUpperCase()}</Badge>
                       </TableCell>
                      <TableCell>
                         <Badge variant={agent.status === 'active' ? 'default' : 'outline'}>{agent.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                 <span className="sr-only">Open menu</span>
                                 <MoreHorizontal className="h-4 w-4" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEditConfig(agent)}>
                                 <Edit className="mr-2 h-4 w-4" />
                                 <span>Edit Config</span>
                              </DropdownMenuItem>
                              {agent.status === 'active' ? (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(agent.id, 'inactive')}>
                                    <Pause className="mr-2 h-4 w-4" />
                                    <span>Pause Agent</span>
                                 </DropdownMenuItem>
                              ) : (
                                 <DropdownMenuItem onClick={() => handleUpdateStatus(agent.id, 'active')}>
                                    <Play className="mr-2 h-4 w-4" />
                                    <span>Activate Agent</span>
                                 </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                 className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                 onClick={() => handleDeleteAgent(agent.id)}
                                >
                                 <Trash2 className="mr-2 h-4 w-4" />
                                 <span>Delete Agent</span>
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        )}
      </CardContent>
    </Card>
  );
}; 