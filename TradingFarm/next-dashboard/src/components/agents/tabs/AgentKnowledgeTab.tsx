/**
 * Agent Knowledge Tab Component
 * Displays and manages agent's knowledge base
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Loader2, Search, FileText, Plus, Brain, Sparkles, Trash } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { ElizaAgent } from '@/services/agent-service';
import { agentKnowledgeIntegration } from '@/services/agent-knowledge-integration';
import { agentService } from '@/services/agent-service';

interface AgentKnowledgeTabProps {
  agent: ElizaAgent;
  onAgentUpdated: () => void;
}

type Document = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  metadata?: Record<string, any>;
};

export function AgentKnowledgeTab({ agent, onAgentUpdated }: AgentKnowledgeTabProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<Document[]>([]);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [knowledgeStats, setKnowledgeStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [recommendedDocuments, setRecommendedDocuments] = useState<any[]>([]);
  
  // Load documents on mount
  useEffect(() => {
    loadDocuments();
    loadAgentKnowledgeStats();
    
    // Set initial selection based on agent's knowledge_ids
    if (agent && Array.isArray(agent.knowledge_ids)) {
      setSelectedDocumentIds(agent.knowledge_ids);
    }
  }, [agent]);
  
  // Update linked documents whenever docs or selected IDs change
  useEffect(() => {
    if (documents.length > 0 && Array.isArray(agent.knowledge_ids)) {
      const linked = documents.filter(doc => agent.knowledge_ids.includes(doc.id));
      setLinkedDocuments(linked);
    }
  }, [documents, agent]);
  
  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge/documents');
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
      } else {
        setError('Failed to load documents');
      }
    } catch (error: any) {
      console.error('Error loading documents:', error);
      setError('An error occurred while loading documents');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadAgentKnowledgeStats = async () => {
    if (!agent.id) return;
    
    setIsLoadingStats(true);
    try {
      const response = await agentKnowledgeIntegration.getAgentKnowledgeStats(agent.id);
      if (response.success && response.stats) {
        setKnowledgeStats(response.stats);
      }
    } catch (error) {
      console.error('Error loading knowledge stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };
  
  const generateKnowledgeRecommendations = async () => {
    if (!agent.id) return;
    
    setIsLoadingStats(true);
    try {
      // Generate context query based on agent type and description
      const contextQuery = `Trading agent with focus on ${agent.description || 'general trading strategies'}`;
      
      const response = await agentKnowledgeIntegration.recommendKnowledge(agent.id, contextQuery);
      if (response.success && response.recommendations) {
        setRecommendedDocuments(response.recommendations);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to generate recommendations',
        });
      }
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsLoadingStats(false);
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
    if (!agent.id) return;
    
    setIsLinking(true);
    setError(null);
    
    try {
      const response = await agentService.updateElizaAgent(agent.id, {
        knowledge_ids: selectedDocumentIds
      });
      
      if (response.success) {
        toast({
          title: 'Knowledge Updated',
          description: `Agent knowledge base has been updated successfully.`,
        });
        
        setIsLinkDialogOpen(false);
        onAgentUpdated();
      } else {
        setError(response.error || 'Failed to link documents');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to link documents',
        });
      }
    } catch (error: any) {
      console.error('Error linking documents:', error);
      setError('An error occurred while linking documents');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsLinking(false);
    }
  };
  
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const filteredLinkedDocuments = linkedDocuments.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Knowledge Base</h3>
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-2 items-center">
              <Plus className="h-4 w-4" />
              <span>Link Knowledge</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Link Knowledge to Agent</DialogTitle>
              <DialogDescription>
                Select documents to link to this agent's knowledge base
              </DialogDescription>
            </DialogHeader>
            
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
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No documents found</p>
                </div>
              ) : (
                <>
                  <Card>
                    <ScrollArea className="h-[300px]">
                      <div className="p-1">
                        {filteredDocuments.map((doc) => (
                          <div 
                            key={doc.id}
                            className={`flex items-start p-3 border-b last:border-0 hover:bg-accent/50 cursor-pointer ${
                              selectedDocumentIds.includes(doc.id) ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => handleToggleDocument(doc.id)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDocumentIds.includes(doc.id)}
                              onChange={() => handleToggleDocument(doc.id)}
                              className="mr-3 mt-1"
                            />
                            <div>
                              <div className="font-medium">{doc.name}</div>
                              {doc.description && (
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                  {doc.description}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                Added: {new Date(doc.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>
                  
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
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Knowledge */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Linked Documents
            </CardTitle>
            <CardDescription>
              Documents the agent can access for knowledge retrieval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchTerm && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Filtering results for "{searchTerm}"
                </p>
              </div>
            )}
            
            {filteredLinkedDocuments.length === 0 ? (
              <div className="text-center py-8 border rounded-md">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'No documents match your search' 
                    : 'No documents linked to this agent'}
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-4"
                  onClick={() => setIsLinkDialogOpen(true)}
                >
                  {searchTerm 
                    ? 'Clear Search' 
                    : 'Link Documents'}
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-1">
                  {filteredLinkedDocuments.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-start p-3 border-b last:border-0 hover:bg-accent/50"
                    >
                      <FileText className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{doc.name}</div>
                        {doc.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {doc.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Added: {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="ml-2 flex-shrink-0"
                        onClick={() => {
                          setSelectedDocumentIds(prev => prev.filter(id => id !== doc.id));
                          handleLinkDocuments();
                        }}
                      >
                        <Trash className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
          <CardFooter>
            <div className="w-full flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Total: {linkedDocuments.length} documents
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className={searchTerm ? '' : 'invisible'}
                >
                  Clear Filter
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsLinkDialogOpen(true)}
                >
                  Manage
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
        
        {/* Knowledge Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Recommendations
            </CardTitle>
            <CardDescription>
              AI-driven knowledge recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recommendedDocuments.length > 0 ? (
              <ScrollArea className="h-[250px]">
                <div className="space-y-3">
                  {recommendedDocuments.map((doc) => (
                    <div key={doc.documentId} className="border rounded-md p-3 hover:bg-accent/50">
                      <div className="font-medium">{doc.documentName}</div>
                      {doc.description && (
                        <div className="text-sm text-muted-foreground truncate">
                          {doc.description}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="outline">
                          {Math.round(doc.relevance * 100)}% match
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (!selectedDocumentIds.includes(doc.documentId)) {
                              setSelectedDocumentIds(prev => [...prev, doc.documentId]);
                              handleLinkDocuments();
                            }
                          }}
                          disabled={selectedDocumentIds.includes(doc.documentId)}
                        >
                          {selectedDocumentIds.includes(doc.documentId) ? 'Linked' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground mb-4">
                  Get AI-powered document recommendations based on this agent's role
                </p>
                <Button 
                  onClick={generateKnowledgeRecommendations}
                  className="w-full"
                >
                  Generate Recommendations
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
