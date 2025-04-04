import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

// Define TypeScript interfaces based on your database schema
interface Farm {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  configuration?: Record<string, any>;
}

interface Agent {
  id: string;
  name: string;
  farm_id?: string;
  status: string;
  type: string;
  model?: string;
  configuration?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function FarmAgentManager() {
  // State setup
  const [farms, setFarms] = useState<Farm[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState({
    farms: true,
    agents: true,
    operations: false
  });

  // New farm/agent forms
  const [newFarm, setNewFarm] = useState({
    name: '',
    description: '',
    status: 'active',
  });
  
  const [newAgent, setNewAgent] = useState({
    name: '',
    farm_id: '',
    status: 'idle',
    type: 'trading',
    model: 'gpt-4',
  });

  // Initialize Supabase client
  const supabase = createBrowserClient();

  // Fetch farms
  const fetchFarms = async () => {
    setLoading(prev => ({ ...prev, farms: true }));
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setFarms(data || []);
    } catch (error) {
      console.error('Error fetching farms:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch farms',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, farms: false }));
    }
  };

  // Fetch agents
  const fetchAgents = async (farmId?: string) => {
    setLoading(prev => ({ ...prev, agents: true }));
    try {
      let query = supabase.from('agents').select('*');
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch agents',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, agents: false }));
    }
  };

  // Create a new farm
  const createFarm = async () => {
    if (!newFarm.name) {
      toast({
        title: 'Validation Error',
        description: 'Farm name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(prev => ({ ...prev, operations: true }));
    try {
      const { data, error } = await supabase
        .from('farms')
        .insert([
          {
            name: newFarm.name,
            description: newFarm.description,
            status: newFarm.status,
            configuration: {},
          }
        ])
        .select();
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Farm created successfully',
      });

      // Reset form and refresh farms
      setNewFarm({
        name: '',
        description: '',
        status: 'active',
      });
      fetchFarms();
    } catch (error) {
      console.error('Error creating farm:', error);
      toast({
        title: 'Error',
        description: 'Failed to create farm',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, operations: false }));
    }
  };

  // Create a new agent
  const createAgent = async () => {
    if (!newAgent.name || !newAgent.farm_id) {
      toast({
        title: 'Validation Error',
        description: 'Agent name and farm are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(prev => ({ ...prev, operations: true }));
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert([
          {
            name: newAgent.name,
            farm_id: newAgent.farm_id,
            status: newAgent.status,
            type: newAgent.type,
            model: newAgent.model,
            configuration: {},
          }
        ])
        .select();
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Agent created successfully',
      });

      // Reset form and refresh agents
      setNewAgent({
        name: '',
        farm_id: newAgent.farm_id, // Keep the current farm selected
        status: 'idle',
        type: 'trading',
        model: 'gpt-4',
      });
      fetchAgents(newAgent.farm_id);
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, operations: false }));
    }
  };

  // Update farm status
  const updateFarmStatus = async (id: string, status: string) => {
    setLoading(prev => ({ ...prev, operations: true }));
    try {
      const { error } = await supabase
        .from('farms')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Farm status updated to ${status}`,
      });

      // Refresh farms
      fetchFarms();
    } catch (error) {
      console.error('Error updating farm status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update farm status',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, operations: false }));
    }
  };

  // Update agent status
  const updateAgentStatus = async (id: string, status: string) => {
    setLoading(prev => ({ ...prev, operations: true }));
    try {
      const { error } = await supabase
        .from('agents')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Agent status updated to ${status}`,
      });

      // Refresh agents
      fetchAgents(selectedFarm?.id);
    } catch (error) {
      console.error('Error updating agent status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update agent status',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, operations: false }));
    }
  };

  // Delete a farm (with confirmation)
  const deleteFarm = async (id: string) => {
    if (!confirm('Are you sure you want to delete this farm? This will also delete all associated agents.')) {
      return;
    }

    setLoading(prev => ({ ...prev, operations: true }));
    try {
      // First delete all agents associated with this farm
      const { error: agentsError } = await supabase
        .from('agents')
        .delete()
        .eq('farm_id', id);
      
      if (agentsError) throw agentsError;
      
      // Then delete the farm
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Farm and associated agents deleted successfully',
      });

      // Reset selected farm if it was deleted
      if (selectedFarm?.id === id) {
        setSelectedFarm(null);
      }

      // Refresh farms and agents
      fetchFarms();
      fetchAgents();
    } catch (error) {
      console.error('Error deleting farm:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete farm',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, operations: false }));
    }
  };

  // Delete an agent (with confirmation)
  const deleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    setLoading(prev => ({ ...prev, operations: true }));
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Agent deleted successfully',
      });

      // Refresh agents
      fetchAgents(selectedFarm?.id);
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete agent',
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, operations: false }));
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    // Fetch initial data
    fetchFarms();
    fetchAgents();

    // Set up real-time subscription for farms
    const farmsSubscription = supabase
      .channel('farms-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'farms' }, 
        (payload) => {
          console.log('Farms change received:', payload);
          fetchFarms();
        }
      )
      .subscribe();

    // Set up real-time subscription for agents
    const agentsSubscription = supabase
      .channel('agents-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agents' }, 
        (payload) => {
          console.log('Agents change received:', payload);
          fetchAgents(selectedFarm?.id);
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(farmsSubscription);
      supabase.removeChannel(agentsSubscription);
    };
  }, []);

  // Update agents when selected farm changes
  useEffect(() => {
    if (selectedFarm) {
      fetchAgents(selectedFarm.id);
      // Update the farm_id in the newAgent form
      setNewAgent(prev => ({ ...prev, farm_id: selectedFarm.id }));
    } else {
      fetchAgents();
    }
  }, [selectedFarm]);

  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="farms" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="farms">Farms</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>
        
        {/* Farms Tab */}
        <TabsContent value="farms">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create Farm Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create Farm</CardTitle>
                <CardDescription>Add a new farm to your Trading Farm dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="farm-name">Farm Name</Label>
                  <Input 
                    id="farm-name" 
                    placeholder="Enter farm name" 
                    value={newFarm.name}
                    onChange={(e) => setNewFarm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farm-description">Description</Label>
                  <Input 
                    id="farm-description" 
                    placeholder="Enter farm description" 
                    value={newFarm.description}
                    onChange={(e) => setNewFarm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farm-status">Status</Label>
                  <Select 
                    value={newFarm.status}
                    onValueChange={(value) => setNewFarm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger id="farm-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={createFarm} 
                  disabled={loading.operations || !newFarm.name}
                >
                  {loading.operations ? 'Creating...' : 'Create Farm'}
                </Button>
              </CardFooter>
            </Card>

            {/* Farms List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Farms</CardTitle>
                <CardDescription>Manage your existing farms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading.farms ? (
                  // Loading skeleton
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))
                ) : farms.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No farms found. Create your first farm!
                  </div>
                ) : (
                  farms.map(farm => (
                    <Card key={farm.id} className={`border ${selectedFarm?.id === farm.id ? 'border-primary' : ''}`}>
                      <CardHeader className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{farm.name}</CardTitle>
                            <CardDescription>{farm.description || 'No description'}</CardDescription>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${
                              farm.status === 'active' ? 'bg-green-500' : 
                              farm.status === 'paused' ? 'bg-yellow-500' : 
                              farm.status === 'maintenance' ? 'bg-blue-500' : 'bg-red-500'
                            }`} />
                            <span className="text-xs text-muted-foreground capitalize">{farm.status}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardFooter className="p-4 pt-0 flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedFarm(farm)}
                        >
                          View Agents
                        </Button>
                        <div className="flex space-x-2">
                          <Select 
                            value={farm.status}
                            onValueChange={(status) => updateFarmStatus(farm.id, status)}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteFarm(farm.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Agents Tab */}
        <TabsContent value="agents">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create Agent Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create Agent</CardTitle>
                <CardDescription>Add a new agent to your farms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input 
                    id="agent-name" 
                    placeholder="Enter agent name" 
                    value={newAgent.name}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-farm">Farm</Label>
                  <Select 
                    value={newAgent.farm_id}
                    onValueChange={(value) => setNewAgent(prev => ({ ...prev, farm_id: value }))}
                  >
                    <SelectTrigger id="agent-farm">
                      <SelectValue placeholder="Select farm" />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map(farm => (
                        <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-type">Agent Type</Label>
                  <Select 
                    value={newAgent.type}
                    onValueChange={(value) => setNewAgent(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger id="agent-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trading">Trading</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-model">AI Model</Label>
                  <Select 
                    value={newAgent.model}
                    onValueChange={(value) => setNewAgent(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger id="agent-model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="claude-3">Claude 3</SelectItem>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-status">Status</Label>
                  <Select 
                    value={newAgent.status}
                    onValueChange={(value) => setNewAgent(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger id="agent-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idle">Idle</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={createAgent} 
                  disabled={loading.operations || !newAgent.name || !newAgent.farm_id}
                >
                  {loading.operations ? 'Creating...' : 'Create Agent'}
                </Button>
              </CardFooter>
            </Card>

            {/* Agents List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Your Agents</CardTitle>
                  <CardDescription>
                    {selectedFarm 
                      ? `Agents for ${selectedFarm.name}` 
                      : 'All agents across farms'}
                  </CardDescription>
                </div>
                {selectedFarm && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedFarm(null)}
                  >
                    View All Farms
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {loading.agents ? (
                  // Loading skeleton
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))
                ) : agents.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {selectedFarm 
                      ? `No agents found for ${selectedFarm.name}. Create your first agent!`
                      : 'No agents found. Create your first agent!'}
                  </div>
                ) : (
                  agents.map(agent => {
                    // Find the farm this agent belongs to
                    const agentFarm = farms.find(f => f.id === agent.farm_id);
                    
                    return (
                      <Card key={agent.id}>
                        <CardHeader className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{agent.name}</CardTitle>
                              <CardDescription className="flex items-center space-x-1">
                                <span>{agent.type}</span>
                                <span>•</span>
                                <span>{agentFarm?.name || 'Unknown Farm'}</span>
                                <span>•</span>
                                <span>{agent.model}</span>
                              </CardDescription>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${
                                agent.status === 'active' ? 'bg-green-500' : 
                                agent.status === 'idle' ? 'bg-blue-500' : 
                                agent.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardFooter className="p-4 pt-0 flex justify-between">
                          <div className="flex space-x-2">
                            {agent.status === 'idle' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateAgentStatus(agent.id, 'active')}
                              >
                                Activate
                              </Button>
                            )}
                            {agent.status === 'active' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateAgentStatus(agent.id, 'paused')}
                              >
                                Pause
                              </Button>
                            )}
                            {agent.status === 'paused' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateAgentStatus(agent.id, 'active')}
                              >
                                Resume
                              </Button>
                            )}
                          </div>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteAgent(agent.id)}
                          >
                            Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
