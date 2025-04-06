import React, { useState, useEffect } from 'react';
import { Farm, FarmAgent, farmService } from '@/services/farm/farm-service';
import { AgentList } from '@/components/agents/AgentList';
import { CreateAgentForm } from '@/components/agents/CreateAgentForm';
import { EditAgentConfigForm } from '@/components/agents/EditAgentConfigForm';
import { AgentDetails } from '@/components/agents/AgentDetails';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FarmDetailsViewProps {
  farm: Farm;
}

export const FarmDetailsView: React.FC<FarmDetailsViewProps> = ({ farm }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<FarmAgent | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [agents, setAgents] = useState<FarmAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAgentDetails, setShowAgentDetails] = useState(false);

  // Fetch agents when component mounts or farm changes
  useEffect(() => {
    fetchAgents();
  }, [farm.id]);

  // Function to fetch agents
  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await farmService.getAgents(farm.id);
      if (result.success && result.data) {
        setAgents(result.data);
      } else {
        setError(result.error || 'Failed to fetch agents');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleAgentCreated = () => {
    // Refresh agent data when a new agent is created
    fetchAgents();
  };

  const handleEditAgent = (agent: FarmAgent) => {
    setSelectedAgent(agent);
    setIsEditModalOpen(true);
  };

  const handleViewAgentDetails = (agent: FarmAgent) => {
    setSelectedAgent(agent);
    setShowAgentDetails(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedAgent(null);
  };

  const handleCloseAgentDetails = () => {
    setShowAgentDetails(false);
    setSelectedAgent(null);
  };

  const handleAgentUpdated = () => {
    // Refresh agent data when an agent is updated
    fetchAgents();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Farm: {farm.name}</h1>
      <p className="text-muted-foreground">{farm.description}</p>

      <Alert className="mb-6">
        <AlertTitle>Advanced Agent Workflow System</AlertTitle>
        <AlertDescription>
          <p className="mb-2">This farm is powered by our advanced agent workflow system with the following features:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>LLM-powered Workflows</strong> - Agents use large language models for planning and execution</li>
            <li><strong>MCP Tool Integration</strong> - Integrate with external market data, exchanges, and DeFi protocols</li>
            <li><strong>Workflow Templates</strong> - Pre-configured templates for common trading operations</li>
            <li><strong>Scheduled Workflows</strong> - Automate workflows to run on custom schedules</li>
            <li><strong>Multi-agent Collaboration</strong> - Analysts, traders, and monitors work together seamlessly</li>
          </ul>
        </AlertDescription>
      </Alert>

      {showAgentDetails && selectedAgent ? (
        <div>
          <Button 
            variant="outline" 
            className="mb-4"
            onClick={handleCloseAgentDetails}
          >
            ← Back to Farm Dashboard
          </Button>
          <AgentDetails 
            agent={selectedAgent} 
            allAgents={agents}
            farmId={farm.id}
            onAgentUpdated={handleAgentUpdated} 
          />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Farm Overview</CardTitle>
                <CardDescription>
                  Key metrics and status for your trading farm
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <h3 className="font-medium">Status</h3>
                    <p>{farm.status}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Exchange</h3>
                    <p>{farm.exchange || 'Not configured'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Balance</h3>
                    <p>{farm.balance?.total || 0} {farm.balance?.currency || 'USD'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Performance</h3>
                    <p>Win Rate: {farm.performance?.winRate || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Active Agents</CardTitle>
                <CardDescription>
                  Quick overview of your active agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-4">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : agents.length === 0 ? (
                  <p className="text-muted-foreground">No agents found. Create your first agent to get started.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {agents.filter(a => a.status === 'active').slice(0, 3).map(agent => (
                      <Card key={agent.id} className="bg-muted">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <CardDescription className="text-xs">{agent.type}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-2 w-full" 
                            onClick={() => handleViewAgentDetails(agent)}
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4 mt-4">
            {error && (
              <div className="text-red-500 bg-red-50 p-3 rounded mb-4">
                Error: {error}
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center p-8">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1">
                  <AgentList 
                    agents={agents} 
                    onSelectAgent={handleEditAgent} 
                    selectedAgentId={selectedAgent?.id}
                    isLoading={loading}
                    error={error}
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  {selectedAgent ? (
                    <AgentDetails 
                      agent={selectedAgent} 
                      allAgents={agents}
                      farmId={farm.id}
                    />
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">Select an agent to view details</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="wallets" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Farm Wallets</CardTitle>
                <CardDescription>
                  Manage your connected wallets and balances
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Wallet management functionality will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Detailed performance analysis for your farm
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Performance analytics will be implemented here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Modals for agent management */}
      <CreateAgentForm 
        farmId={farm.id}
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onAgentCreated={handleAgentCreated}
      />

      {selectedAgent && (
        <EditAgentConfigForm
          agent={selectedAgent}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onAgentUpdated={handleAgentUpdated}
        />
      )}
    </div>
  );
}; 