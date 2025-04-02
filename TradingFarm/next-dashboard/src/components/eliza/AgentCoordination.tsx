'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Users, AlertCircle, ArrowRightLeft, Plus } from 'lucide-react';

// Types for agent coordination
type Agent = {
  id: number;
  name: string;
  farm_id: number;
  is_active: boolean;
  capabilities: string[];
  config: Record<string, any>;
};

type AgentGroup = {
  id: number;
  name: string;
  description: string;
  agents: number[];
  created_at: string;
  config: {
    coordination_type: 'hierarchical' | 'collaborative' | 'competitive';
    lead_agent_id?: number;
    voting_threshold?: number;
  };
};

export function AgentCoordination() {
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentGroups, setAgentGroups] = useState<AgentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    agents: [] as number[],
    coordinationType: 'collaborative' as 'hierarchical' | 'collaborative' | 'competitive',
    leadAgentId: undefined as number | undefined
  });

  // Fetch agents and agent groups
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all active agents
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('is_active', true);
        
        if (agentError) throw agentError;
        setAgents(agentData || []);
        
        // Use a custom RPC function to get agent groups (you would need to create this in your Supabase)
        // For now, we'll simulate with local data
        const mockAgentGroups: AgentGroup[] = [
          {
            id: 1,
            name: 'Trend Analysis Team',
            description: 'Agents that collaborate on market trend analysis',
            agents: [1, 2],
            created_at: new Date().toISOString(),
            config: {
              coordination_type: 'collaborative',
              voting_threshold: 0.75
            }
          },
          {
            id: 2,
            name: 'Risk Management Hierarchy',
            description: 'Hierarchical structure for managing trading risk',
            agents: [3, 4, 5],
            created_at: new Date().toISOString(),
            config: {
              coordination_type: 'hierarchical',
              lead_agent_id: 3
            }
          }
        ];
        
        setAgentGroups(mockAgentGroups);
      } catch (error: any) {
        toast({
          title: 'Error loading data',
          description: error.message,
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle creating a new agent group
  const handleCreateGroup = async () => {
    try {
      if (!newGroup.name) {
        toast({
          title: 'Missing name',
          description: 'Please provide a name for the agent group',
          variant: 'destructive'
        });
        return;
      }
      
      if (newGroup.agents.length < 2) {
        toast({
          title: 'Not enough agents',
          description: 'A group must contain at least 2 agents',
          variant: 'destructive'
        });
        return;
      }
      
      // In a real implementation, you would create this group in your database
      // For now, we'll simulate adding to the local state
      const newAgentGroup: AgentGroup = {
        id: agentGroups.length + 1,
        name: newGroup.name,
        description: newGroup.description,
        agents: newGroup.agents,
        created_at: new Date().toISOString(),
        config: {
          coordination_type: newGroup.coordinationType,
          lead_agent_id: newGroup.coordinationType === 'hierarchical' ? newGroup.leadAgentId : undefined,
          voting_threshold: newGroup.coordinationType === 'collaborative' ? 0.66 : undefined
        }
      };
      
      setAgentGroups([...agentGroups, newAgentGroup]);
      setShowNewGroupDialog(false);
      setNewGroup({
        name: '',
        description: '',
        agents: [],
        coordinationType: 'collaborative',
        leadAgentId: undefined
      });
      
      toast({
        title: 'Group created',
        description: `${newGroup.name} has been created successfully`
      });
    } catch (error: any) {
      toast({
        title: 'Error creating group',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Helper to get agent name by ID
  const getAgentName = (id: number) => {
    return agents.find(agent => agent.id === id)?.name || `Agent ${id}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Agent Coordination</CardTitle>
              <CardDescription>
                Manage agent groups and coordination patterns
              </CardDescription>
            </div>
            <Button onClick={() => setShowNewGroupDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Agent Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="groups">
            <TabsList className="mb-4">
              <TabsTrigger value="groups">Agent Groups</TabsTrigger>
              <TabsTrigger value="interactions">Interactions</TabsTrigger>
              <TabsTrigger value="metrics">Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="groups">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agentGroups.map(group => (
                    <Card key={group.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            <CardDescription>{group.description}</CardDescription>
                          </div>
                          <Badge>{group.config.coordination_type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Agents:</div>
                          <div className="flex flex-wrap gap-2">
                            {group.agents.map(agentId => (
                              <Badge key={agentId} variant="outline" className="flex items-center gap-1">
                                {group.config.lead_agent_id === agentId && (
                                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                                )}
                                {getAgentName(agentId)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="interactions">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center p-12">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-lg font-semibold">Agent interactions coming soon</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      This feature will allow you to monitor real-time communications between agents
                      and track decision-making processes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="metrics">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center p-12">
                    <ArrowRightLeft className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-lg font-semibold">Coordination metrics coming soon</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      Track performance metrics for agent groups and compare efficiency against
                      individual agent performance.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* New Group Dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Create Agent Group</DialogTitle>
            <DialogDescription>
              Create a new group of coordinating agents to achieve better trading results.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input 
                value={newGroup.name}
                onChange={e => setNewGroup({...newGroup, name: e.target.value})}
                placeholder="e.g., Market Analysis Team"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input 
                value={newGroup.description}
                onChange={e => setNewGroup({...newGroup, description: e.target.value})}
                placeholder="What will this group do?"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Coordination Type</label>
              <Select 
                value={newGroup.coordinationType}
                onValueChange={value => setNewGroup({
                  ...newGroup, 
                  coordinationType: value as any,
                  // Reset lead agent if not hierarchical
                  leadAgentId: value !== 'hierarchical' ? undefined : newGroup.leadAgentId
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select coordination type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collaborative">Collaborative (Consensus)</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical (Leader/Followers)</SelectItem>
                  <SelectItem value="competitive">Competitive (Best Result Wins)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newGroup.coordinationType === 'hierarchical' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Lead Agent</label>
                <Select 
                  value={newGroup.leadAgentId?.toString() || ''}
                  onValueChange={value => setNewGroup({
                    ...newGroup, 
                    leadAgentId: parseInt(value)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Agents</label>
              <div className="border rounded-md p-4">
                <div className="space-y-2">
                  {agents.map(agent => (
                    <div key={agent.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`agent-${agent.id}`}
                        className="mr-2"
                        checked={newGroup.agents.includes(agent.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewGroup({...newGroup, agents: [...newGroup.agents, agent.id]});
                          } else {
                            setNewGroup({
                              ...newGroup, 
                              agents: newGroup.agents.filter(id => id !== agent.id),
                              leadAgentId: newGroup.leadAgentId === agent.id ? undefined : newGroup.leadAgentId
                            });
                          }
                        }}
                      />
                      <label htmlFor={`agent-${agent.id}`} className="flex-1">
                        {agent.name}
                      </label>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {agent.capabilities?.[0] || 'Trading'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
