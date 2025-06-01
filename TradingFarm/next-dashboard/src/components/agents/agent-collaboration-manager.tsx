'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Users, MessageCircle, PlusCircle, Send, UserPlus, Settings, Bot, BrainCircuit } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { agentService, ExtendedAgent } from '@/services/agent-service';
import { agentCollaborationService, AgentCollaboration, AgentCollaborationMember, AgentCommunication } from '@/services/agent-collaboration-service';
import { toast } from '@/components/ui/use-toast';

interface AgentCollaborationManagerProps {
  farmId: string;
  agentId?: string; // Current agent ID if viewing from agent page
  agents?: ExtendedAgent[]; // Pre-loaded agents if available
}

export function AgentCollaborationManager({ farmId, agentId, agents: initialAgents }: AgentCollaborationManagerProps) {
  // State for collaborations list
  const [collaborations, setCollaborations] = useState<AgentCollaboration[]>([]);
  const [agents, setAgents] = useState<ExtendedAgent[]>(initialAgents || []);
  const [selectedCollaboration, setSelectedCollaboration] = useState<AgentCollaboration | null>(null);
  const [isCreatingCollaboration, setIsCreatingCollaboration] = useState<boolean>(false);
  const [isCreatingMessage, setIsCreatingMessage] = useState<boolean>(false);
  const [isLoadingCollaborations, setIsLoadingCollaborations] = useState<boolean>(true);
  const [isLoadingAgents, setIsLoadingAgents] = useState<boolean>(!initialAgents);
  
  // New collaboration form
  const [newCollabName, setNewCollabName] = useState<string>('');
  const [newCollabDescription, setNewCollabDescription] = useState<string>('');
  
  // Add agent form
  const [showAddAgentDialog, setShowAddAgentDialog] = useState<boolean>(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedAgentRole, setSelectedAgentRole] = useState<string>('member');
  
  // Message form
  const [messageContent, setMessageContent] = useState<string>('');
  const [messageType, setMessageType] = useState<string>('direct');
  const [messagePriority, setMessagePriority] = useState<string>('medium');

  // Fetch collaborations and agents if not provided
  useEffect(() => {
    const loadCollaborations = async () => {
      setIsLoadingCollaborations(true);
      const { data, error } = await agentCollaborationService.getCollaborationsForFarm(farmId);
      
      if (error) {
        toast({
          title: "Error",
          description: `Failed to load collaborations: ${error}`,
          variant: "destructive",
        });
      } else if (data) {
        setCollaborations(data);
        
        // Auto-select the first collaboration if viewing from agent page
        if (agentId && data.length > 0) {
          const agentCollabs = data.filter(collab => 
            collab.members?.some(member => member.agent_id === agentId)
          );
          
          if (agentCollabs.length > 0) {
            handleSelectCollaboration(agentCollabs[0].id);
          }
        }
      }
      
      setIsLoadingCollaborations(false);
    };
    
    const loadAgents = async () => {
      if (!initialAgents) {
        setIsLoadingAgents(true);
        const { data, error } = await agentService.getAgents();
        
        if (error) {
          toast({
            title: "Error",
            description: `Failed to load agents: ${error}`,
            variant: "destructive",
          });
        } else if (data) {
          setAgents(data.filter(agent => agent.farm_id === farmId));
        }
        
        setIsLoadingAgents(false);
      }
    };
    
    loadCollaborations();
    loadAgents();
  }, [farmId, agentId, initialAgents]);

  // Select a collaboration
  const handleSelectCollaboration = async (collabId: string) => {
    const { data, error } = await agentCollaborationService.getCollaboration(collabId);
    
    if (error) {
      toast({
        title: "Error",
        description: `Failed to load collaboration details: ${error}`,
        variant: "destructive",
      });
    } else if (data) {
      setSelectedCollaboration(data);
    }
  };

  // Create a new collaboration
  const handleCreateCollaboration = async () => {
    if (!newCollabName.trim()) {
      toast({
        title: "Validation Error",
        description: "Collaboration name is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingCollaboration(true);
    
    const { data, error } = await agentCollaborationService.createCollaboration(
      newCollabName,
      farmId,
      newCollabDescription
    );
    
    if (error) {
      toast({
        title: "Error",
        description: `Failed to create collaboration: ${error}`,
        variant: "destructive",
      });
    } else if (data) {
      setCollaborations([...collaborations, data]);
      setNewCollabName('');
      setNewCollabDescription('');
      
      // If current agent is specified, add it to the collaboration
      if (agentId) {
        await handleAddAgentToCollaboration(data.id, agentId, 'leader');
      }
      
      // Select the newly created collaboration
      handleSelectCollaboration(data.id);
      
      toast({
        title: "Success",
        description: "Collaboration created successfully",
      });
    }
    
    setIsCreatingCollaboration(false);
  };

  // Add an agent to the selected collaboration
  const handleAddAgentToCollaboration = async (collabId: string, agentId: string, role: string) => {
    if (!agentId || !role) {
      toast({
        title: "Validation Error",
        description: "Agent and role are required",
        variant: "destructive",
      });
      return;
    }
    
    const { data, error } = await agentCollaborationService.addAgentToCollaboration(
      collabId,
      agentId,
      role as AgentCollaborationMember['role'],
      {}
    );
    
    if (error) {
      toast({
        title: "Error",
        description: `Failed to add agent to collaboration: ${error}`,
        variant: "destructive",
      });
    } else {
      // Refresh the collaboration details
      handleSelectCollaboration(collabId);
      
      toast({
        title: "Success",
        description: "Agent added to collaboration",
      });
      
      setShowAddAgentDialog(false);
      setSelectedAgentId('');
      setSelectedAgentRole('member');
    }
  };

  // Remove an agent from the selected collaboration
  const handleRemoveAgentFromCollaboration = async (collabId: string, agentId: string) => {
    const { error } = await agentCollaborationService.removeAgentFromCollaboration(collabId, agentId);
    
    if (error) {
      toast({
        title: "Error",
        description: `Failed to remove agent from collaboration: ${error}`,
        variant: "destructive",
      });
    } else {
      // Refresh the collaboration details
      handleSelectCollaboration(collabId);
      
      toast({
        title: "Success",
        description: "Agent removed from collaboration",
      });
    }
  };

  // Send a message to all agents in the collaboration
  const handleSendCollaborationMessage = async () => {
    if (!selectedCollaboration || !messageContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Collaboration and message content are required",
        variant: "destructive",
      });
      return;
    }
    
    if (!agentId) {
      toast({
        title: "Error",
        description: "Sender agent ID is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingMessage(true);
    
    const { data, error } = await agentCollaborationService.sendCollaborationMessage(
      agentId,
      selectedCollaboration.id,
      messageContent,
      messageType,
      messagePriority
    );
    
    if (error) {
      toast({
        title: "Error",
        description: `Failed to send message: ${error}`,
        variant: "destructive",
      });
    } else {
      setMessageContent('');
      
      toast({
        title: "Success",
        description: "Message sent to collaboration",
      });
    }
    
    setIsCreatingMessage(false);
  };

  // Format agent name for display
  const getAgentDisplayName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || `Agent ${agentId.substring(0, 6)}...`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Agent Collaboration Manager
        </CardTitle>
        <CardDescription>
          Manage agent teams and facilitate agent-to-agent communication
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="collaborations">
          <TabsList className="mb-4">
            <TabsTrigger value="collaborations">Collaborations</TabsTrigger>
            <TabsTrigger value="messages" disabled={!selectedCollaboration || !agentId}>Messages</TabsTrigger>
          </TabsList>
          
          <TabsContent value="collaborations">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Collaborations List */}
              <div className="border rounded-md p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium">Available Collaborations</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <PlusCircle className="h-4 w-4 mr-1" />
                        New
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Collaboration</DialogTitle>
                        <DialogDescription>
                          Create a new team of collaborative agents to work together on tasks
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Collaboration Name</Label>
                          <Input
                            id="name"
                            placeholder="Market Analysis Team"
                            value={newCollabName}
                            onChange={(e) => setNewCollabName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            placeholder="A team of agents that collaborate on market analysis and trading decisions"
                            value={newCollabDescription}
                            onChange={(e) => setNewCollabDescription(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleCreateCollaboration}
                          disabled={isCreatingCollaboration}
                        >
                          {isCreatingCollaboration && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Create Collaboration
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {isLoadingCollaborations ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : collaborations.length === 0 ? (
                  <div className="text-center text-muted-foreground p-4">
                    No collaborations found. Create your first team!
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {collaborations.map((collab) => (
                        <div
                          key={collab.id}
                          className={`p-3 rounded-md cursor-pointer flex items-center justify-between ${
                            selectedCollaboration?.id === collab.id
                              ? 'bg-primary/10'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => handleSelectCollaboration(collab.id)}
                        >
                          <div className="flex items-center">
                            <div className="relative">
                              <Users className="h-8 w-8 text-primary" />
                              <Badge
                                className="absolute -bottom-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                                variant="secondary"
                              >
                                {collab.members?.length || 0}
                              </Badge>
                            </div>
                            <div className="ml-3">
                              <div className="font-medium">{collab.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(collab.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
              
              {/* Collaboration Details */}
              <div className="border rounded-md p-4 md:col-span-2">
                {selectedCollaboration ? (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">{selectedCollaboration.name}</h3>
                      <div className="flex gap-2">
                        <Dialog open={showAddAgentDialog} onOpenChange={setShowAddAgentDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <UserPlus className="h-4 w-4 mr-1" />
                              Add Agent
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Agent to Collaboration</DialogTitle>
                              <DialogDescription>
                                Select an agent to add to this collaboration team
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="agent">Agent</Label>
                                <Select
                                  value={selectedAgentId}
                                  onValueChange={setSelectedAgentId}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an agent" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {agents
                                      .filter(agent => 
                                        !selectedCollaboration.members?.some(
                                          member => member.agent_id === agent.id
                                        )
                                      )
                                      .map(agent => (
                                        <SelectItem key={agent.id} value={agent.id}>
                                          {agent.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                  value={selectedAgentRole}
                                  onValueChange={setSelectedAgentRole}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="leader">Leader</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="observer">Observer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => 
                                  handleAddAgentToCollaboration(
                                    selectedCollaboration.id,
                                    selectedAgentId,
                                    selectedAgentRole
                                  )
                                }
                                disabled={!selectedAgentId}
                              >
                                Add to Collaboration
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-1" />
                          Settings
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">
                        {selectedCollaboration.description || 'No description provided.'}
                      </p>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <h4 className="text-sm font-medium mb-2">Team Members</h4>
                    {selectedCollaboration.members && selectedCollaboration.members.length > 0 ? (
                      <div className="space-y-2">
                        {selectedCollaboration.members.map(member => (
                          <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10">
                                  <Bot className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {member.agent?.name || getAgentDisplayName(member.agent_id)}
                                </div>
                                <Badge variant={
                                  member.role === 'leader' 
                                    ? 'default' 
                                    : member.role === 'member' 
                                      ? 'secondary' 
                                      : 'outline'
                                }>
                                  {member.role}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => 
                                handleRemoveAgentFromCollaboration(selectedCollaboration.id, member.agent_id)
                              }
                              disabled={agentId === member.agent_id} // Can't remove yourself
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground p-4">
                        No agents in this collaboration yet. Add some agents to get started!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <Users className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Collaboration Selected</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Select a collaboration from the list or create a new one to get started
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Create New Collaboration
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Collaboration</DialogTitle>
                          <DialogDescription>
                            Create a new team of collaborative agents to work together on tasks
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Collaboration Name</Label>
                            <Input
                              id="name"
                              placeholder="Market Analysis Team"
                              value={newCollabName}
                              onChange={(e) => setNewCollabName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              placeholder="A team of agents that collaborate on market analysis and trading decisions"
                              value={newCollabDescription}
                              onChange={(e) => setNewCollabDescription(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleCreateCollaboration}
                            disabled={isCreatingCollaboration}
                          >
                            {isCreatingCollaboration && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Create Collaboration
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="messages">
            {selectedCollaboration && agentId ? (
              <div className="grid grid-cols-1 gap-4">
                <div className="border rounded-md p-4">
                  <div className="flex items-center mb-4">
                    <Users className="h-5 w-5 mr-2" />
                    <h3 className="text-lg font-medium">{selectedCollaboration.name} - Communication</h3>
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="messageContent">Message</Label>
                    <Textarea
                      id="messageContent"
                      placeholder="Type your message to all agents in this collaboration..."
                      className="mt-1"
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="messageType">Message Type</Label>
                      <Select
                        value={messageType}
                        onValueChange={setMessageType}
                      >
                        <SelectTrigger id="messageType">
                          <SelectValue placeholder="Select message type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct Message</SelectItem>
                          <SelectItem value="command">Command</SelectItem>
                          <SelectItem value="query">Query</SelectItem>
                          <SelectItem value="analysis">Analysis</SelectItem>
                          <SelectItem value="alert">Alert</SelectItem>
                          <SelectItem value="status">Status Update</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="messagePriority">Priority</Label>
                      <Select
                        value={messagePriority}
                        onValueChange={setMessagePriority}
                      >
                        <SelectTrigger id="messagePriority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleSendCollaborationMessage}
                    disabled={isCreatingMessage || !messageContent.trim()}
                    className="w-full"
                  >
                    {isCreatingMessage ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send to All Agents in Collaboration
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Collaboration</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Select a collaboration first to enable agent-to-agent messaging
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
