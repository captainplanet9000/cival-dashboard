/**
 * AgentDashboard Component
 * Central dashboard for managing ElizaOS trading agents
 */
import React, { useState, useEffect } from 'react';
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
  const [agents, setAgents] = useState<ElizaAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentTypes, setAgentTypes] = useState<{id: string, name: string}[]>([]);
  const [selectedAgentTypeId, setSelectedAgentTypeId] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLinkKnowledgeDialogOpen, setIsLinkKnowledgeDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  // New agent form state
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [newAgentTypeId, setNewAgentTypeId] = useState('');
  const [newAgentModel, setNewAgentModel] = useState('gpt-4o');
  const [isCreating, setIsCreating] = useState(false);
  
  useEffect(() => {
    loadAgents();
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
      const response = await agentService.getElizaAgents();
      if (response.success && response.data) {
        setAgents(response.data);
      } else {
        setError(response.error || 'Failed to load agents');
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      setError('An error occurred while loading agents');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadAgentTypes = async () => {
    try {
      const response = await agentService.getAgentTypes();
      if (response.success && response.data) {
        setAgentTypes(response.data);
        if (response.data.length > 0) {
          setNewAgentTypeId(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading agent types:', error);
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
      const response = await agentService.createElizaAgent({
        name: newAgentName.trim(),
        description: newAgentDescription.trim(),
        agent_type_id: newAgentTypeId,
        model: newAgentModel,
        parameters: {},
        knowledge_ids: [],
      });
      
      if (response.success && response.data) {
        setIsCreateDialogOpen(false);
        await loadAgents();
        resetNewAgentForm();
      } else {
        setError(response.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      setError('An error occurred while creating the agent');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleControlAgent = async (agentId: string, action: 'start' | 'stop' | 'pause' | 'resume') => {
    try {
      const response = await agentService.controlElizaAgent(agentId, action);
      if (response.success) {
        await loadAgents();
      } else {
        setError(`Failed to ${action} agent: ${response.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing agent:`, error);
      setError(`An error occurred while ${action}ing the agent`);
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
    
    const matchesType = selectedAgentTypeId === '' || agent.agent_type_id === selectedAgentTypeId;
    
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
          <h1 className="text-2xl font-bold">ElizaOS Agents</h1>
          <p className="text-muted-foreground">Manage your trading agents and their knowledge</p>
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
            <SelectItem value="">All Types</SelectItem>
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
                    setSelectedAgentTypeId('');
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
      const response = await agentService.getElizaAgentById(agentId);
      if (response.success && response.data) {
        setSelectedDocumentIds(
          Array.isArray(response.data.knowledge_ids) ? response.data.knowledge_ids : []
        );
      }
    } catch (error) {
      console.error('Error loading agent knowledge:', error);
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
      const response = await agentService.updateElizaAgent(agentId, {
        knowledge_ids: selectedDocumentIds
      });
      
      if (!response.success) {
        setError(response.error || 'Failed to link documents');
      }
    } catch (error) {
      console.error('Error linking documents:', error);
      setError('An error occurred while linking documents');
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
