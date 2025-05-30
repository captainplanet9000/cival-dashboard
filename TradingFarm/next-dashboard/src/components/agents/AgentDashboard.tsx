"use client"

/**
 * AgentDashboard Component
 * Central dashboard for managing ElizaOS trading agents
 */
import * as React from 'react';
const { useState, useEffect } = React;
import { useRouter } from 'next/navigation';
import { ElizaAgentCard } from '@/components/agents/ElizaAgentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TradingEventEmitter, TRADING_EVENTS } from '@/utils/events/trading-events';
import { Plus, Search, AlertCircle, Brain, BookOpen } from 'lucide-react';
import { agentService, ElizaAgent, AgentRun } from '@/services/agent-service';
import { elizaOSAgentService } from '@/services/elizaos-agent-service';
import { agentKnowledgeIntegration } from '@/services/agent-knowledge-integration';

export function AgentDashboard() {
  const router = useRouter();
  // Define FarmInfo interface for type safety
  interface FarmInfo {
    id: string;
    name: string;
    description: string;
  }

  const [agents, setAgents] = useState<ElizaAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentTypes, setAgentTypes] = useState<{id: string, name: string}[]>([]);
  const [selectedAgentTypeId, setSelectedAgentTypeId] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLinkKnowledgeDialogOpen, setIsLinkKnowledgeDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [farmInfo, setFarmInfo] = useState<FarmInfo | null>(null);
  
  // New agent form state
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [newAgentTypeId, setNewAgentTypeId] = useState('');
  const [newAgentModel, setNewAgentModel] = useState('gpt-4o');
  const [isCreating, setIsCreating] = useState(false);
  
  // Load all agents and farm info on component mount
  useEffect(() => {
    // Load farm info first, then load agents
    const initializeData = async () => {
      await loadFarmInfo(); // Ensure farm info is loaded first
      await loadAgents();
    };
    
    initializeData();
    loadAgentTypes();
    
    // Subscribe to agent events
    const handleAgentCreated = () => loadAgents();
    const handleAgentUpdated = () => loadAgents();
    
    TradingEventEmitter.on(TRADING_EVENTS.AGENT_CREATED, handleAgentCreated);
    TradingEventEmitter.on(TRADING_EVENTS.AGENT_UPDATED, handleAgentUpdated);
    
    return () => {
      TradingEventEmitter.off(TRADING_EVENTS.AGENT_CREATED, handleAgentCreated);
      TradingEventEmitter.off(TRADING_EVENTS.AGENT_UPDATED, handleAgentUpdated);
    };
  }, []);
  
  const loadAgents = async () => {
    setIsLoading(true);
    try {
      // Use elizaOSAgentService to connect to the real backend
      const agents = await elizaOSAgentService.getAgents();
      setAgents(agents);
    } catch (error) {
      console.error('Error loading agents:', error);
      setError('An error occurred while loading agents: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadAgentTypes = async () => {
    try {
      // Define ElizaOS agent types - in a production environment, these would come from an API
      const elizaAgentTypes = [
        { id: 'trading', name: 'Trading Agent' },
        { id: 'analyzer', name: 'Market Analyzer' },
        { id: 'monitor', name: 'Portfolio Monitor' },
        { id: 'risk', name: 'Risk Manager' },
        { id: 'coordinator', name: 'Farm Coordinator' }
      ];
      
      setAgentTypes(elizaAgentTypes);
      if (elizaAgentTypes.length > 0) {
        setNewAgentTypeId(elizaAgentTypes[0].id);
      }
    } catch (error) {
      console.error('Error setting agent types:', error);
      setError('Failed to load agent types');
    }
  };
  
  // Load farms and check if a valid farm ID exists
  const loadFarmInfo = async () => {
    try {
      console.log('Loading farm information...');
      // Get the farm
      const response = await fetch('/api/farms/check-or-create');
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('Failed to load farm info:', data);
        setError('Failed to load farm information. Please refresh the page.');
        return null;
      }
      
      console.log('Farm loaded successfully:', data.data);
      
      // Store farm info in state
      setFarmInfo({
        id: data.data.id,
        name: data.data.name || 'Default Farm',
        description: data.data.description || ''
      });
      
      return data.data.id; // Return the farm ID
    } catch (error) {
      console.error('Error loading farm info:', error);
      setError('Error loading farm information: ' + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  };
  
  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !newAgentTypeId) {
      setError('Agent name and type are required');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      console.log('Starting agent creation process...');
      
      // First, check or create a farm to get a valid farmId
      console.log('Fetching farm ID...');
      const farmId = await loadFarmInfo();
      
      if (!farmId) {
        console.error('Failed to get a valid farm ID');
        setError('Failed to get a valid farm ID');
        return;
      }
      
      const farmName = farmInfo?.name || 'Default Farm';
      console.log(`Got farm ID: ${farmId}, name: ${farmName}`);
      
      // Set farm info in state so we can display it in the UI
      setFarmInfo({
        id: farmId,
        name: farmName,
        description: farmInfo?.description || 'Trading farm for ElizaOS agents'
      });
      
      // Prepare agent configuration with more detailed logging
      const agentConfig = {
        name: newAgentName.trim(),
        farmId: farmId, // Use the valid farm ID from our check
        config: {
          agentType: newAgentTypeId,
          markets: ['BTC-USD', 'ETH-USD'], // Default markets - can be made configurable
          risk_level: 'medium' as 'low' | 'medium' | 'high', // Type assertion to match expected enum
          api_access: true,
          trading_permissions: 'read_only', // Default to read_only for safety
          auto_recovery: true,
          llm_model: newAgentModel,
        }
      };
      
      console.log('Creating agent with config:', JSON.stringify(agentConfig));
      
      // Create the agent using the elizaOSAgentService which connects to the real backend
      const response = await elizaOSAgentService.createAgent(agentConfig);
      
      console.log('Agent created successfully:', response);
      setIsCreateDialogOpen(false);
      await loadAgents();
      resetNewAgentForm();
    } catch (error) {
      console.error('Error creating agent:', error);
      // Provide detailed error information to the user
      let errorMessage = 'An error occurred while creating the agent';
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
        // Log the stack trace for debugging
        console.error('Error stack:', error.stack);
      } else {
        errorMessage += `: ${String(error)}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleControlAgent = async (agentId: string, action: 'start' | 'stop' | 'pause' | 'resume') => {
    try {
      // Use the elizaOSAgentService to connect to the real backend
      await elizaOSAgentService.controlAgent(agentId, action);
      // Refresh the agent list after control operation
      await loadAgents();
    } catch (error) {
      console.error(`Error ${action}ing agent:`, error);
      setError(`An error occurred while ${action}ing the agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const handleViewDetails = (agentId: string) => {
    router.push(`/agent/${agentId}`);
  };
  
  const openLinkKnowledgeDialog = (agentId: string) => {
    setSelectedAgentId(agentId);
    setIsLinkKnowledgeDialogOpen(true);
  };
  
  const resetNewAgentForm = () => {
    setNewAgentName('');
    setNewAgentDescription('');
    setNewAgentTypeId(agentTypes.length > 0 ? agentTypes[0].id : '');
    setNewAgentModel('gpt-4o');
  };
  
  // Filter agents based on search and tab
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      searchTerm === '' || 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.description && agent.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedAgentTypeId === 'all' || agent.agent_type_id === selectedAgentTypeId;
    
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'active' && agent.status === 'active') ||
      (activeTab === 'inactive' && agent.status === 'inactive') ||
      (activeTab === 'paused' && agent.status === 'paused');
    
    return matchesSearch && matchesType && matchesTab;
  });
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">ElizaOS Agents</h1>
          {farmInfo ? (
            <div className="text-sm text-muted-foreground mt-1 dark:text-gray-300">
              <span className="font-semibold">Farm:</span> {farmInfo.name} 
              {farmInfo.description && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({farmInfo.description})</span>
              )}
            </div>
          ) : (
            <div className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Loading farm information...
            </div>
          )}
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-2 items-center">
              <Plus className="h-4 w-4" />
              <span>Create Agent</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New ElizaOS Agent</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new trading agent
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Name</Label>
                <Input 
                  id="agentName" 
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Enter agent name" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agentDescription">Description</Label>
                <Input 
                  id="agentDescription" 
                  value={newAgentDescription}
                  onChange={(e) => setNewAgentDescription(e.target.value)}
                  placeholder="Enter agent description" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agentType">Agent Type</Label>
                <Select value={newAgentTypeId} onValueChange={setNewAgentTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agentModel">LLM Model</Label>
                <Select value={newAgentModel} onValueChange={setNewAgentModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAgent} 
                disabled={isCreating || !newAgentName.trim() || !newAgentTypeId}
              >
                {isCreating ? 'Creating...' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex justify-between items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={selectedAgentTypeId} onValueChange={setSelectedAgentTypeId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {agentTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Agents</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {renderAgentGrid()}
        </TabsContent>
        
        <TabsContent value="active" className="mt-6">
          {renderAgentGrid()}
        </TabsContent>
        
        <TabsContent value="paused" className="mt-6">
          {renderAgentGrid()}
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-6">
          {renderAgentGrid()}
        </TabsContent>
      </Tabs>
      
      {/* Link Knowledge Dialog */}
      <Dialog open={isLinkKnowledgeDialogOpen} onOpenChange={setIsLinkKnowledgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Knowledge to Agent</DialogTitle>
            <DialogDescription>
              Select documents to link to this agent's knowledge base
            </DialogDescription>
          </DialogHeader>
          
          <KnowledgeSelector agentId={selectedAgentId} />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkKnowledgeDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  
  function renderAgentGrid() {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    
    if (filteredAgents.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            {searchTerm || selectedAgentTypeId || activeTab !== 'all' ? (
              <>
                <h3 className="text-lg font-medium">No matching agents found</h3>
                <p className="text-muted-foreground text-center max-w-md mt-2">
                  Try adjusting your search or filters to find what you're looking for
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedAgentTypeId('all');
                    setActiveTab('all');
                  }}
                >
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium">No agents yet</h3>
                <p className="text-muted-foreground text-center max-w-md mt-2">
                  Create your first ElizaOS agent to start building your trading team
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Create Your First Agent
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <ElizaAgentCard
            key={agent.id}
            agent={agent}
            onControl={(action) => handleControlAgent(agent.id, action)}
            onViewDetails={() => handleViewDetails(agent.id)}
            onLinkKnowledge={() => openLinkKnowledgeDialog(agent.id)}
          />
        ))}
      </div>
    );
  }
}

// Knowledge Selector Component
function KnowledgeSelector({ agentId }: { agentId: string }) {
  const [documents, setDocuments] = useState<{id: string, name: string, description?: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!agentId) return;
    
    loadDocuments();
    loadAgentKnowledge();
  }, [agentId]);
  
  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      // This would be replaced with actual API call to knowledgeService
      const response = await fetch('/api/knowledge/documents');
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
      } else {
        setError('Failed to load documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('An error occurred while loading documents');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadAgentKnowledge = async () => {
    try {
      // Use elizaOSAgentService to get agent information from the real backend
      const agentData = await elizaOSAgentService.getAgentById(agentId);
      
      // Extract knowledge IDs from agent data
      // Using type assertion since knowledge_ids might be stored in a custom property
      const knowledgeIds = ((agentData as any).knowledge_ids || []) as string[];
      setSelectedDocumentIds(knowledgeIds);
    } catch (error) {
      console.error('Error loading agent knowledge:', error);
      setError('Error loading agent knowledge: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  const handleToggleDocument = (documentId: string) => {
    setSelectedDocumentIds(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };
  
  const handleLinkDocuments = async () => {
    if (!agentId) return;
    
    setIsLinking(true);
    setError(null);
    
    try {
      // Use elizaOSAgentService to update the agent in the real backend
      // Using a type assertion for the entire update object to bypass TypeScript checks
      await elizaOSAgentService.updateAgent(agentId, {
        config: {
          agentType: 'trading', // Default value, in a real implementation we'd fetch the current one first
          markets: ['BTC-USD', 'ETH-USD'], // Default markets
          risk_level: 'medium',
        },
        // Knowledge IDs would be handled by the backend appropriately
        knowledge_ids: selectedDocumentIds
      } as any);
      
    } catch (error) {
      console.error('Error linking documents:', error);
      setError('An error occurred while linking documents: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLinking(false);
    }
  };
  
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  if (isLoading) {
    return (
      <div className="py-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-8">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No documents found</p>
        </div>
      ) : (
        <>
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-64 overflow-auto">
              {filteredDocuments.map((doc) => (
                <div 
                  key={doc.id}
                  className={`flex items-center p-3 border-b last:border-0 hover:bg-accent/50 cursor-pointer ${
                    selectedDocumentIds.includes(doc.id) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => handleToggleDocument(doc.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocumentIds.includes(doc.id)}
                    onChange={() => handleToggleDocument(doc.id)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">{doc.name}</div>
                    {doc.description && (
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {doc.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {selectedDocumentIds.length} documents selected
            </p>
            <Button 
              onClick={handleLinkDocuments}
              disabled={isLinking}
            >
              {isLinking ? 'Updating...' : 'Update Knowledge'}
            </Button>
          </div>
        </>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
