/**
 * ElizaAgentCard Component
 * Displays an ElizaOS agent card with interactive knowledge capabilities
 */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ElizaAgent } from '@/services/agent-service';
import { agentKnowledgeIntegration } from '@/services/agent-knowledge-integration';
import { Loader2, Brain, PlayCircle, PauseCircle, Database, FileText, HelpCircle, Zap } from 'lucide-react';

interface ElizaAgentCardProps {
  agent: ElizaAgent;
  onControl?: (action: 'start' | 'stop' | 'pause' | 'resume') => Promise<void>;
  onViewDetails?: () => void;
  onLinkKnowledge?: () => void;
}

export function ElizaAgentCard({ agent, onControl, onViewDetails, onLinkKnowledge }: ElizaAgentCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeStats, setKnowledgeStats] = useState<{
    totalDocuments: number;
    recentQueries: string[];
    topDocuments: { documentId: string; documentName: string; usageCount: number }[];
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'paused': return 'bg-amber-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  const handleControlClick = async (action: 'start' | 'stop' | 'pause' | 'resume') => {
    if (!onControl) return;
    setIsLoading(true);
    try {
      await onControl(action);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadKnowledgeStats = async () => {
    if (knowledgeStats || !agent.id) return;
    
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
  
  // Get agent initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Get agent model display name
  const getModelDisplayName = (model: string) => {
    switch (model) {
      case 'gpt-4o': return 'GPT-4o';
      case 'claude-3-5-sonnet': return 'Claude 3.5 Sonnet';
      case 'claude-3-opus': return 'Claude 3 Opus';
      case 'gemini-pro': return 'Gemini Pro';
      default: return model;
    }
  };
  
  return (
    <Card className="w-full max-w-md hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`/agents/${agent.agent_type_id || 'default'}.png`} alt={agent.name} />
              <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-lg">{agent.name}</CardTitle>
          </div>
          <Badge variant="outline" className={`${getStatusColor(agent.status)} text-white`}>
            {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 pt-1">{agent.description || 'No description provided'}</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Model</span>
            <span className="text-sm font-medium">{getModelDisplayName(agent.model)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Knowledge</span>
            <span className="text-sm font-medium">{Array.isArray(agent.knowledge_ids) ? agent.knowledge_ids.length : 0} documents</span>
          </div>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full flex gap-2 items-center" 
              onClick={loadKnowledgeStats}
            >
              <Brain className="h-4 w-4" />
              <span>Knowledge Base</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Knowledge Base: {agent.name}</DialogTitle>
              <DialogDescription>
                Connected knowledge sources and usage analytics
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="documents">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="usage">Usage</TabsTrigger>
                <TabsTrigger value="recommend">Recommendations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="documents" className="mt-4">
                {isLoadingStats ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="mb-2 text-sm font-medium">
                      {knowledgeStats?.totalDocuments || 0} Connected Documents
                    </div>
                    <ScrollArea className="h-[200px] rounded-md border p-2">
                      {knowledgeStats?.topDocuments?.length ? (
                        <ul className="space-y-2">
                          {knowledgeStats.topDocuments.map((doc) => (
                            <li key={doc.documentId} className="flex justify-between items-center text-sm p-1 hover:bg-accent rounded">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <span>{doc.documentName}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {doc.usageCount} uses
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          No documents used yet
                        </div>
                      )}
                    </ScrollArea>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4 w-full"
                      onClick={onLinkKnowledge}
                    >
                      Link New Document
                    </Button>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="usage" className="mt-4">
                {isLoadingStats ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="mb-2 text-sm font-medium">
                      Recent Knowledge Queries
                    </div>
                    <ScrollArea className="h-[200px] rounded-md border p-2">
                      {knowledgeStats?.recentQueries?.length ? (
                        <ul className="space-y-2">
                          {knowledgeStats.recentQueries.map((query, index) => (
                            <li key={index} className="text-sm p-1.5 hover:bg-accent rounded">
                              <div className="flex items-start gap-2">
                                <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{query}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          No recent queries
                        </div>
                      )}
                    </ScrollArea>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="recommend" className="mt-4">
                <div className="mb-2 text-sm font-medium">
                  Recommended Knowledge
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Based on this agent's role and recent queries, we can recommend relevant trading knowledge
                </p>
                <Button 
                  className="w-full flex gap-2 items-center"
                  size="sm"
                >
                  <Zap className="h-4 w-4" />
                  <span>Generate Recommendations</span>
                </Button>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                View Full Details
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <TooltipProvider>
          <div className="flex gap-2">
            {agent.status === 'active' || agent.status === 'paused' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isLoading}
                    onClick={() => handleControlClick('stop')}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stop Agent</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isLoading}
                    onClick={() => handleControlClick('start')}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Start Agent</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onViewDetails}
                >
                  <Database className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Details</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
        
        <div className="flex items-center text-xs text-muted-foreground">
          <span>Last Updated: {new Date(agent.updated_at).toLocaleDateString()}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
