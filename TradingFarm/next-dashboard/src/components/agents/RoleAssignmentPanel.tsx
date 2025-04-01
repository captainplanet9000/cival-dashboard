'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgentRole } from '@/types/agent-coordination';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Shield, ShieldCheck, ShieldX, LineChart, Brain, Radar, Users, Activity } from 'lucide-react';

interface RoleAssignmentPanelProps {
  farmId: number;
  onRolesAssigned?: () => void;
}

interface Agent {
  id: number;
  name: string;
  status: string;
  type: string;
  configuration: Record<string, any>;
  created_at: string;
  farm_id: number;
}

export default function RoleAssignmentPanel({ farmId, onRolesAssigned }: RoleAssignmentPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<AgentRole | ''>('');
  const [roleCapabilities, setRoleCapabilities] = useState<{[key: string]: number}>({
    'decision_making': 50,
    'risk_tolerance': 50,
    'analysis_depth': 50,
    'communication_frequency': 50
  });
  const [saving, setSaving] = useState(false);
  
  const roleIcons = {
    [AgentRole.COORDINATOR]: <Users className="h-4 w-4" />,
    [AgentRole.EXECUTOR]: <Activity className="h-4 w-4" />,
    [AgentRole.ANALYZER]: <LineChart className="h-4 w-4" />,
    [AgentRole.RISK_MANAGER]: <ShieldCheck className="h-4 w-4" />,
    [AgentRole.OBSERVER]: <Radar className="h-4 w-4" />
  };
  
  const roleColors = {
    [AgentRole.COORDINATOR]: "bg-blue-100 text-blue-800 border-blue-300",
    [AgentRole.EXECUTOR]: "bg-green-100 text-green-800 border-green-300",
    [AgentRole.ANALYZER]: "bg-purple-100 text-purple-800 border-purple-300",
    [AgentRole.RISK_MANAGER]: "bg-red-100 text-red-800 border-red-300",
    [AgentRole.OBSERVER]: "bg-amber-100 text-amber-800 border-amber-300"
  };
  
  const roleDescriptions = {
    [AgentRole.COORDINATOR]: "Manages agent collaboration and assigns tasks",
    [AgentRole.EXECUTOR]: "Executes trading operations and strategy implementation",
    [AgentRole.ANALYZER]: "Analyzes market data and provides insights",
    [AgentRole.RISK_MANAGER]: "Monitors risk levels and prevents excessive losses",
    [AgentRole.OBSERVER]: "Monitors system and reports activity without intervention"
  };
  
  // Load agents for the farm
  useEffect(() => {
    const fetchAgents = async () => {
      if (!farmId) return;
      
      try {
        setLoading(true);
        const supabase = createBrowserClient();
        
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('farm_id', farmId);
          
        if (error) throw error;
        
        setAgents(data || []);
      } catch (error) {
        console.error('Error fetching agents:', error);
        toast({
          variant: "destructive",
          title: "Failed to load agents",
          description: error instanceof Error ? error.message : "An error occurred",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgents();
  }, [farmId]);
  
  const handleRoleChange = (role: AgentRole) => {
    setSelectedRole(role);
    
    // Set default capabilities based on role
    switch (role) {
      case AgentRole.COORDINATOR:
        setRoleCapabilities({
          'decision_making': 90,
          'risk_tolerance': 60,
          'analysis_depth': 70,
          'communication_frequency': 90
        });
        break;
      case AgentRole.EXECUTOR:
        setRoleCapabilities({
          'decision_making': 50,
          'risk_tolerance': 50,
          'analysis_depth': 40,
          'communication_frequency': 70
        });
        break;
      case AgentRole.ANALYZER:
        setRoleCapabilities({
          'decision_making': 30,
          'risk_tolerance': 20,
          'analysis_depth': 90,
          'communication_frequency': 50
        });
        break;
      case AgentRole.RISK_MANAGER:
        setRoleCapabilities({
          'decision_making': 80,
          'risk_tolerance': 10,
          'analysis_depth': 80,
          'communication_frequency': 60
        });
        break;
      case AgentRole.OBSERVER:
        setRoleCapabilities({
          'decision_making': 0,
          'risk_tolerance': 0,
          'analysis_depth': 60,
          'communication_frequency': 30
        });
        break;
      default:
        setRoleCapabilities({
          'decision_making': 50,
          'risk_tolerance': 50,
          'analysis_depth': 50,
          'communication_frequency': 50
        });
    }
  };
  
  const handleCapabilityChange = (capability: string, value: number[]) => {
    setRoleCapabilities(prev => ({
      ...prev,
      [capability]: value[0]
    }));
  };
  
  const saveRoleAssignment = async () => {
    if (!selectedAgent || !selectedRole) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select both an agent and a role",
      });
      return;
    }
    
    try {
      setSaving(true);
      const supabase = createBrowserClient();
      
      // Get the agent's current configuration
      const agent = agents.find(a => a.id === selectedAgent);
      if (!agent) throw new Error('Agent not found');
      
      // Prepare the updated configuration
      const configuration = {
        ...(agent.configuration || {}),
        role: selectedRole,
        role_capabilities: roleCapabilities,
        role_assigned_at: new Date().toISOString()
      };
      
      // Update the agent
      const { error } = await supabase
        .from('agents')
        .update({ configuration })
        .eq('id', selectedAgent);
        
      if (error) throw error;
      
      // Refresh the agents list
      const { data: updatedAgents, error: fetchError } = await supabase
        .from('agents')
        .select('*')
        .eq('farm_id', farmId);
        
      if (fetchError) throw fetchError;
      
      setAgents(updatedAgents || []);
      
      toast({
        title: "Role assigned successfully",
        description: `The agent now has the ${selectedRole} role`,
      });
      
      // Reset selection
      setSelectedAgent(null);
      setSelectedRole('');
      
      // Notify parent component
      if (onRolesAssigned) {
        onRolesAssigned();
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        variant: "destructive",
        title: "Failed to assign role",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setSaving(false);
    }
  };
  
  const getAgentRole = (agent: Agent): AgentRole | null => {
    return agent.configuration?.role || null;
  };
  
  const renderAgentRoleBadge = (agent: Agent) => {
    const role = getAgentRole(agent);
    if (!role) return null;
    
    return (
      <Badge className={`flex gap-1 items-center ${roleColors[role]}`}>
        {roleIcons[role]}
        <span className="capitalize">{role}</span>
      </Badge>
    );
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent Roles</CardTitle>
          <CardDescription>
            Assign specialized roles to your agents to create a coordinated trading team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-muted-foreground">Loading agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-muted-foreground">No agents found for this farm</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map(agent => (
                  <div 
                    key={agent.id}
                    className={`border rounded-md p-3 cursor-pointer transition-all ${
                      selectedAgent === agent.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setSelectedAgent(agent.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">Status: {agent.status}</p>
                      </div>
                      {renderAgentRoleBadge(agent)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-4">Assign Role</h3>
                
                {selectedAgent ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="role-select">Select Role</Label>
                        <Select
                          value={selectedRole}
                          onValueChange={(value) => handleRoleChange(value as AgentRole)}
                        >
                          <SelectTrigger id="role-select">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(AgentRole).map((role) => (
                              <SelectItem key={role} value={role}>
                                <div className="flex items-center gap-2">
                                  {roleIcons[role]}
                                  <span className="capitalize">{role}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {selectedRole && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {roleDescriptions[selectedRole]}
                          </p>
                        )}
                      </div>
                      
                      {selectedRole && (
                        <div className="space-y-4 pt-4">
                          <h4 className="font-medium">Role Capabilities</h4>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <Label htmlFor="decision-making">Decision Making</Label>
                                <span className="text-sm text-muted-foreground">{roleCapabilities.decision_making}%</span>
                              </div>
                              <Slider
                                id="decision-making"
                                value={[roleCapabilities.decision_making]}
                                min={0}
                                max={100}
                                step={5}
                                onValueChange={(value) => handleCapabilityChange('decision_making', value)}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <Label htmlFor="risk-tolerance">Risk Tolerance</Label>
                                <span className="text-sm text-muted-foreground">{roleCapabilities.risk_tolerance}%</span>
                              </div>
                              <Slider
                                id="risk-tolerance"
                                value={[roleCapabilities.risk_tolerance]}
                                min={0}
                                max={100}
                                step={5}
                                onValueChange={(value) => handleCapabilityChange('risk_tolerance', value)}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <Label htmlFor="analysis-depth">Analysis Depth</Label>
                                <span className="text-sm text-muted-foreground">{roleCapabilities.analysis_depth}%</span>
                              </div>
                              <Slider
                                id="analysis-depth"
                                value={[roleCapabilities.analysis_depth]}
                                min={0}
                                max={100}
                                step={5}
                                onValueChange={(value) => handleCapabilityChange('analysis_depth', value)}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <Label htmlFor="communication-frequency">Communication Frequency</Label>
                                <span className="text-sm text-muted-foreground">{roleCapabilities.communication_frequency}%</span>
                              </div>
                              <Slider
                                id="communication-frequency"
                                value={[roleCapabilities.communication_frequency]}
                                min={0}
                                max={100}
                                step={5}
                                onValueChange={(value) => handleCapabilityChange('communication_frequency', value)}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <Button 
                        onClick={saveRoleAssignment} 
                        disabled={!selectedRole || saving}
                      >
                        {saving ? 'Saving...' : 'Assign Role'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Select an agent to assign a role</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
