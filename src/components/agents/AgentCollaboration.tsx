import React, { useState, useEffect } from 'react';
import { FarmAgent } from '@/services/farm/farm-service';
import { 
  CollaborationTask, 
  CollaborationFlow,
  AgentRole,
  agentCollaborationService 
} from '@/services/agent-collaboration-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, AlertCircle, Clock, PlusCircle, Play, Eye, XCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface AgentCollaborationProps {
  farmId: string | number;
  agents: FarmAgent[];
  currentAgent: FarmAgent;
}

export const AgentCollaboration: React.FC<AgentCollaborationProps> = ({
  farmId,
  agents,
  currentAgent
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collaborationFlows, setCollaborationFlows] = useState<CollaborationFlow[]>([]);
  const [collaborationTasks, setCollaborationTasks] = useState<CollaborationTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<CollaborationTask | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  
  // Form data for creating a new collaboration
  const [formData, setFormData] = useState<{
    flowId: string;
    name: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    agentAssignments: Record<string, AgentRole>;
    metadata: {
      assets?: string;
      tradingAmount?: string;
      notes?: string;
    };
  }>({
    flowId: '',
    name: '',
    description: '',
    priority: 'MEDIUM',
    agentAssignments: {},
    metadata: {}
  });

  // Load collaboration flows
  useEffect(() => {
    const fetchFlows = async () => {
      try {
        // Filter flows by the current agent's type to show relevant flows
        const response = await fetch(`/api/collaborations/flows?agentType=${currentAgent.type}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch collaboration flows: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setCollaborationFlows(data.data);
        } else {
          setError(data.error || 'Failed to fetch collaboration flows');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch collaboration flows');
        console.error('Error fetching collaboration flows:', err);
      }
    };
    
    fetchFlows();
  }, [currentAgent.type]);

  // Load collaboration tasks for the current agent
  useEffect(() => {
    if (currentAgent?.id) {
      fetchCollaborationTasks();
    }
  }, [currentAgent.id]);

  // Load selected flow details
  useEffect(() => {
    if (formData.flowId) {
      const selectedFlow = agentCollaborationService.getCollaborationFlowById(formData.flowId);
      
      if (selectedFlow) {
        setFormData(prev => ({
          ...prev,
          name: selectedFlow.name,
          description: selectedFlow.description
        }));
      }
    }
  }, [formData.flowId]);

  // Fetch collaboration tasks
  const fetchCollaborationTasks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/collaborations?agentId=${currentAgent.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch collaborations: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCollaborationTasks(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch collaborations');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch collaboration tasks');
      console.error('Error fetching collaboration tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form field changes
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle agent role assignment
  const handleAgentRoleChange = (agentId: string, role: AgentRole | null) => {
    setFormData(prev => {
      const newAssignments = { ...prev.agentAssignments };
      
      if (role === null) {
        // Remove agent assignment
        delete newAssignments[agentId];
      } else {
        // Add or update agent assignment
        newAssignments[agentId] = role;
      }
      
      return {
        ...prev,
        agentAssignments: newAssignments
      };
    });
  };

  // Handle metadata field changes
  const handleMetadataChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value
      }
    }));
  };

  // Create a new collaboration task
  const handleCreateCollaboration = async () => {
    setError(null);
    
    try {
      // Validate form data
      if (!formData.flowId || !formData.name) {
        setError('Flow and name are required');
        return;
      }
      
      // Create the collaboration via API
      const response = await fetch('/api/collaborations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmId,
          flowId: formData.flowId,
          initiatorAgentId: currentAgent.id,
          name: formData.name,
          description: formData.description,
          priority: formData.priority,
          agentAssignments: formData.agentAssignments,
          metadata: formData.metadata
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create collaboration' }));
        throw new Error(errorData.error || `Failed to create collaboration (${response.status})`);
      }
      
      // Refresh tasks
      await fetchCollaborationTasks();
      
      // Close dialog
      setIsCreateDialogOpen(false);
      
      // Reset form
      setFormData({
        flowId: '',
        name: '',
        description: '',
        priority: 'MEDIUM',
        agentAssignments: {},
        metadata: {}
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create collaboration');
      console.error('Error creating collaboration:', err);
    }
  };

  // Start a collaboration task
  const handleStartTask = async (taskId: string) => {
    setError(null);
    
    try {
      const response = await fetch(`/api/collaborations/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'START'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start collaboration' }));
        throw new Error(errorData.error || `Failed to start collaboration (${response.status})`);
      }
      
      await fetchCollaborationTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to start collaboration');
      console.error('Error starting collaboration:', err);
    }
  };

  // Execute current step of a collaboration task
  const handleExecuteStep = async (taskId: string, input: string) => {
    setError(null);
    
    try {
      const response = await fetch(`/api/collaborations/${taskId}/steps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'EXECUTE',
          agentId: currentAgent.id,
          input
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to execute step' }));
        throw new Error(errorData.error || `Failed to execute step (${response.status})`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute step');
      }
      
      await fetchCollaborationTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to execute step');
      console.error('Error executing step:', err);
    }
  };

  // View task details
  const handleViewTask = (task: CollaborationTask) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  // Cancel a collaboration task
  const handleCancelTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to cancel this collaboration?')) {
      return;
    }
    
    setError(null);
    
    try {
      const response = await fetch(`/api/collaborations/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'CANCEL',
          reason: 'Cancelled by user'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to cancel collaboration' }));
        throw new Error(errorData.error || `Failed to cancel collaboration (${response.status})`);
      }
      
      await fetchCollaborationTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel collaboration');
      console.error('Error cancelling collaboration:', err);
    }
  };

  // Filter tasks based on active tab
  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'pending':
        return collaborationTasks.filter(task => task.status === 'PENDING');
      case 'active':
        return collaborationTasks.filter(task => task.status === 'IN_PROGRESS');
      case 'completed':
        return collaborationTasks.filter(task => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(task.status));
      default:
        return collaborationTasks;
    }
  };

  // Get the status badge for a task
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-amber-50"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="secondary" className="bg-blue-50"><Play className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-50 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'FAILED':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-gray-100"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get available agents by type
  const getAgentsByType = (type: string) => {
    return agents.filter(agent => agent.type?.toUpperCase() === type.toUpperCase());
  };

  // Check if the current user is assigned to a task
  const isCurrentAgentAssigned = (task: CollaborationTask) => {
    return task.agentAssignments.some(assignment => assignment.agentId === currentAgent.id);
  };

  // Check if the current agent can perform actions on a task
  const canCurrentAgentAct = (task: CollaborationTask) => {
    const assignment = task.agentAssignments.find(a => a.agentId === currentAgent.id);
    return assignment?.status === 'IN_PROGRESS';
  };

  // Generate a summary for a completed collaboration
  const handleGenerateSummary = async (taskId: string) => {
    setError(null);
    
    try {
      const response = await fetch(`/api/collaborations/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'GENERATE_SUMMARY'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate summary' }));
        throw new Error(errorData.error || `Failed to generate summary (${response.status})`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data?.summary) {
        // In a real implementation, you would display this summary to the user
        // For now, we'll just log it and show an alert
        console.log('Generated summary:', result.data.summary);
        alert('Summary generated successfully!');
      } else {
        throw new Error(result.error || 'Failed to generate summary');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate summary');
      console.error('Error generating summary:', err);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Agent Collaborations</CardTitle>
          <CardDescription>
            Collaborate with other agents in your farm
          </CardDescription>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              New Collaboration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Create New Collaboration</DialogTitle>
              <DialogDescription>
                Start a multi-agent workflow with defined steps and roles
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="flowId">Collaboration Type</Label>
                <Select
                  value={formData.flowId}
                  onValueChange={(value) => handleFormChange('flowId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a collaboration type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {collaborationFlows.map(flow => (
                      <SelectItem key={flow.id} value={flow.id}>
                        {flow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {formData.flowId && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="Enter collaboration name..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      placeholder="Enter collaboration description..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => handleFormChange('priority', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <Label>Agent Assignments</Label>
                    <div className="max-h-[250px] overflow-y-auto border rounded-lg p-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px]">Step</TableHead>
                            <TableHead className="w-[120px]">Role</TableHead>
                            <TableHead>Assigned Agent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.flowId && agentCollaborationService.getCollaborationFlowById(formData.flowId)?.steps.map(step => (
                            <TableRow key={step.stepNumber}>
                              <TableCell className="font-medium">
                                {step.stepNumber}. {step.action}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {step.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={Object.entries(formData.agentAssignments)
                                    .find(([aid, role]) => role === step.role)?.[0] || ''}
                                  onValueChange={(value) => {
                                    // Remove existing agent with this role
                                    Object.entries(formData.agentAssignments).forEach(([aid, r]) => {
                                      if (r === step.role) {
                                        handleAgentRoleChange(aid, null);
                                      }
                                    });
                                    
                                    // Assign new agent if selected
                                    if (value) {
                                      handleAgentRoleChange(value, step.role);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Select ${step.agentType}...`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getAgentsByType(step.agentType).map(agent => (
                                      <SelectItem key={agent.id} value={String(agent.id)}>
                                        {agent.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <Label>Additional Information</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="assets">Assets</Label>
                        <Input
                          id="assets"
                          value={formData.metadata.assets || ''}
                          onChange={(e) => handleMetadataChange('assets', e.target.value)}
                          placeholder="E.g., BTC, ETH, SOL"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tradingAmount">Trading Amount (USD)</Label>
                        <Input
                          id="tradingAmount"
                          value={formData.metadata.tradingAmount || ''}
                          onChange={(e) => handleMetadataChange('tradingAmount', e.target.value)}
                          placeholder="E.g., 1000"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.metadata.notes || ''}
                        onChange={(e) => handleMetadataChange('notes', e.target.value)}
                        placeholder="Additional notes for collaborators..."
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {error && (
              <div className="text-sm font-medium text-destructive">
                {error}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCollaboration}
                disabled={!formData.flowId || !formData.name}
              >
                Create Collaboration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-6">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : getFilteredTasks().length === 0 ? (
            <div className="text-center p-8">
              <p className="text-muted-foreground">No collaboration tasks found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create a new collaboration or check another tab.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredTasks().map(task => (
                <Card key={task.id} className="overflow-hidden">
                  <div className="flex border-b">
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{task.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {task.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(task.status)}
                          {task.priority === 'HIGH' && (
                            <Badge variant="destructive">High Priority</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-2">
                        {task.agentAssignments.map(assignment => (
                          <Badge 
                            key={`${task.id}-${assignment.agentId}`} 
                            variant={assignment.agentId === currentAgent.id ? "default" : "outline"}
                            className="flex items-center"
                          >
                            {assignment.role}: {
                              agents.find(a => a.id === assignment.agentId)?.name || 
                              `Agent #${assignment.agentId}`
                            }
                            {assignment.status === 'IN_PROGRESS' && (
                              <span className="ml-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center p-4 bg-accent/20">
                      <div className="flex flex-col space-y-2">
                        {task.status === 'PENDING' && isCurrentAgentAssigned(task) && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStartTask(task.id)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                        )}
                        
                        {task.status === 'IN_PROGRESS' && canCurrentAgentAct(task) && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedTask(task);
                              setIsTaskDetailOpen(true);
                            }}
                          >
                            Take Action
                          </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewTask(task)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        
                        {(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCancelTask(task.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/20">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div>
                        Created {new Date(task.initiatedAt).toLocaleString()}
                      </div>
                      <div>
                        {task.deadline && (
                          <span className="font-medium">
                            Due {new Date(task.deadline).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Tabs>
        
        {error && (
          <div className="mt-4 p-2 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
      </CardContent>
      
      {/* Task detail dialog */}
      {selectedTask && (
        <Dialog open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Collaboration Details</DialogTitle>
              <DialogDescription>
                View and manage collaboration: {selectedTask.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{selectedTask.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTask.description || 'No description'}
                  </p>
                </div>
                <div>
                  {getStatusBadge(selectedTask.status)}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Process</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Step</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTask.collaborationType && agentCollaborationService.getCollaborationFlowById(selectedTask.collaborationType)?.steps.map(step => {
                        const assignment = selectedTask.agentAssignments.find(a => a.role === step.role);
                        const agent = agents.find(a => a.id === assignment?.agentId);
                        
                        return (
                          <TableRow key={step.stepNumber}>
                            <TableCell className="font-medium">
                              {step.stepNumber}. {step.action}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {step.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {agent?.name || (assignment ? `Agent #${assignment.agentId}` : 'Not assigned')}
                            </TableCell>
                            <TableCell>
                              {assignment ? getStatusBadge(assignment.status) : <Badge variant="outline">N/A</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {/* Action section for current agent if they are in-progress */}
              {selectedTask.status === 'IN_PROGRESS' && canCurrentAgentAct(selectedTask) && (
                <>
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Your Action Required</h4>
                    <div className="p-4 border rounded-lg bg-accent/10">
                      <div className="mb-4">
                        <Label htmlFor="actionInput">Input/Notes</Label>
                        <Textarea
                          id="actionInput"
                          className="mt-1"
                          placeholder="Enter your notes or input for this step..."
                          rows={4}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={() => {
                            const input = (document.getElementById('actionInput') as HTMLTextAreaElement)?.value || '';
                            handleExecuteStep(selectedTask.id, input);
                            setIsTaskDetailOpen(false);
                          }}
                        >
                          Complete Step
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Results section if available */}
              {selectedTask.results && (
                <>
                  <Separator />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Results</h4>
                    <div className="p-4 border rounded-lg">
                      <p className="font-medium">{selectedTask.results.summary}</p>
                      
                      {selectedTask.results.details && (
                        <div className="mt-4 text-sm">
                          <pre className="bg-muted p-2 rounded overflow-auto max-h-[300px]">
                            {JSON.stringify(selectedTask.results.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTaskDetailOpen(false)}>
                Close
              </Button>
              {selectedTask.status === 'COMPLETED' && (
                <Button onClick={() => handleGenerateSummary(selectedTask.id)}>
                  Generate Summary
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}; 