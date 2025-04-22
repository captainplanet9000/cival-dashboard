"use client";

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Power, Pause, BarChart2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgents } from '@/hooks/use-agents';
import CreateAgentModal from '@/components/agents/CreateAgentModal';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FarmAgentsPage() {
  const params = useParams();
  const farmId = params.id as string;
  
  const { agents, activeAgents, inactiveAgents, counts, loading, error, refresh } = useAgents({ farmId });
  
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-800 my-4">
        <h3 className="font-semibold mb-2">Error Loading Agents</h3>
        <p className="mb-2">{error.message || "Failed to load agents data. Please try again."}</p>
        <Button variant="outline" size="sm" onClick={() => refresh()}>Retry</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Agents for this Farm</CardTitle>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Agent
            </Button>
          </div>
          <CardDescription>
            Manage autonomous trading agents assigned to this farm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{counts.total}</CardTitle>
                <CardDescription>Total Agents</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{counts.active}</CardTitle>
                <CardDescription>Active Agents</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{counts.inactive}</CardTitle>
                <CardDescription>Inactive Agents</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Agents ({counts.total})</TabsTrigger>
              <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({counts.inactive})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <TabsContent value="all" className="mt-0">
            <AgentList agents={agents} farmId={farmId} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="active" className="mt-0">
            <AgentList agents={activeAgents} farmId={farmId} onRefresh={refresh} />
          </TabsContent>
          <TabsContent value="inactive" className="mt-0">
            <AgentList agents={inactiveAgents} farmId={farmId} onRefresh={refresh} />
          </TabsContent>
        </CardContent>
      </Card>
      
      {/* Create Agent Modal */}
      <CreateAgentModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        farmId={farmId} 
        onSuccess={refresh}
      />
    </div>
  );
}

interface AgentListProps {
  agents: any[];
  farmId: string;
  onRefresh: () => void;
}

function AgentList({ agents, farmId, onRefresh }: AgentListProps) {
  if (!agents.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No agents found.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {agents.map((agent) => (
        <Card key={agent.id} className="overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6">
            <div className="space-y-1">
              <h3 className="font-medium">{agent.name || `Agent ${agent.id}`}</h3>
              <div className="flex items-center text-sm text-muted-foreground">
                <Badge variant={agent.is_active ? "default" : "outline"} className="mr-2">
                  {agent.is_active ? "Active" : "Inactive"}
                </Badge>
                <span>Type: {agent.type || "Standard"}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  // Toggle agent status
                  try {
                    await fetch(`/api/agents/${agent.id}/control`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        action: agent.is_active ? 'pause' : 'resume' 
                      })
                    });
                    onRefresh();
                  } catch (error) {
                    console.error("Failed to toggle agent status", error);
                  }
                }}
              >
                {agent.is_active ? (
                  <><Pause className="mr-2 h-4 w-4" /> Pause</>
                ) : (
                  <><Power className="mr-2 h-4 w-4" /> Activate</>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  window.location.href = `/dashboard/farms/${farmId}/agents/${agent.id}`;
                }}
              >
                <BarChart2 className="mr-2 h-4 w-4" /> Details
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
