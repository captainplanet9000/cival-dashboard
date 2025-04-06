import React, { useState, useEffect } from 'react';
import { FarmAgent } from '@/services/farm/farm-service';
import { AgentWorkflow, WorkflowType } from './AgentWorkflow';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkflowTemplates } from './WorkflowTemplates';
import { WorkflowScheduler } from './WorkflowScheduler';
import { AgentCollaboration } from './AgentCollaboration';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditAgentConfigForm } from './EditAgentConfigForm';
import { Separator } from '@/components/ui/separator';

interface AgentDetailsProps {
  agent: FarmAgent;
  allAgents?: FarmAgent[]; // For collaboration features
  farmId?: string | number; // For collaboration features
}

export const AgentDetails: React.FC<AgentDetailsProps> = ({ 
  agent, 
  allAgents = [],
  farmId = ''
}) => {
  const [currentAgent, setCurrentAgent] = useState<FarmAgent>(agent);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWorkflows, setAvailableWorkflows] = useState<Array<{
    id: string;
    name: string;
    type: WorkflowType;
  }>>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);

  // Update the currentAgent when the agent prop changes
  useEffect(() => {
    setCurrentAgent(agent);
  }, [agent]);

  // Fetch available workflows for this agent
  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!agent.id) return;
      
      setIsLoadingWorkflows(true);
      
      try {
        const response = await fetch(`/api/agents/${agent.id}/workflows`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch workflows: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data?.workflows) {
          setAvailableWorkflows(data.data.workflows);
        } else {
          throw new Error(data.error || 'Failed to fetch available workflows');
        }
      } catch (err) {
        console.error('Error fetching workflows:', err);
      } finally {
        setIsLoadingWorkflows(false);
      }
    };
    
    fetchWorkflows();
  }, [agent.id]);

  // Handle edit modal
  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleUpdateAgent = (updatedAgent: FarmAgent) => {
    setCurrentAgent(updatedAgent);
    setIsEditModalOpen(false);
  };

  // Format date strings for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status badge variant based on agent status
  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'stopped':
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{currentAgent.name}</CardTitle>
            <CardDescription>
              {currentAgent.description || `${currentAgent.type} Agent`}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={currentAgent.isActive ? 'default' : 'secondary'}>
              {currentAgent.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleOpenEditModal}>
              Edit
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Agent Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Agent Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{currentAgent.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={currentAgent.isActive ? 'text-green-600' : 'text-gray-600'}>
                  {currentAgent.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(currentAgent.createdAt).toLocaleDateString()}</span>
              </div>
              {currentAgent.owner && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner:</span>
                  <span>{currentAgent.owner}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Capabilities</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trading:</span>
                <span className="font-medium">{currentAgent.permissions?.canTrade ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Trade:</span>
                <span className="font-medium">
                  ${currentAgent.permissions?.maxTradeAmount?.toLocaleString() || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Access:</span>
                <span className="font-medium">{currentAgent.permissions?.canAccessApi ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">LLM Access:</span>
                <span className="font-medium">{currentAgent.permissions?.canUseLlm ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Agent Workflows Section */}
        <div>
          <Tabs defaultValue="workflows" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="workflows">Run Workflows</TabsTrigger>
              <TabsTrigger value="templates">Workflow Templates</TabsTrigger>
              <TabsTrigger value="scheduler">Scheduled Workflows</TabsTrigger>
              <TabsTrigger value="collaboration">Collaborations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="workflows">
              <AgentWorkflow agent={currentAgent} />
            </TabsContent>
            
            <TabsContent value="templates">
              <WorkflowTemplates 
                agent={currentAgent} 
                onSelectTemplate={(templateId, input) => {
                  // This would be handled by navigating to the workflows tab
                  // and populating the input field - in a real implementation
                  // we'd need to have some shared state between components
                  console.log('Selected template:', templateId, input);
                }} 
              />
            </TabsContent>
            
            <TabsContent value="scheduler">
              <WorkflowScheduler 
                agent={currentAgent}
                availableWorkflows={availableWorkflows}
              />
            </TabsContent>
            
            <TabsContent value="collaboration">
              <AgentCollaboration 
                farmId={farmId || agent.farmId || '0'}
                agents={allAgents.length > 0 ? allAgents : [currentAgent]}
                currentAgent={currentAgent}
              />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      
      {/* Edit Agent Modal */}
      <EditAgentConfigForm
        agent={currentAgent}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onUpdate={handleUpdateAgent}
      />
    </Card>
  );
}; 