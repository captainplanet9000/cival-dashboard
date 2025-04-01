'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { MessageSquare, Network, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MessagePriority, MessageType } from '@/types/agent-coordination'; 

import AgentNetworkGraph from './agent-network-graph';
import RoleAssignmentPanel from '../agents/RoleAssignmentPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface AgentCoordinationDashboardProps {
  farmId: number;
}

interface AgentMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  recipient_id: string | null;
  recipient_role: string | null;
  content: string;
  type: string;
  priority: string;
  timestamp: string;
  status: string;
  metadata: Record<string, any>;
}

const AgentCoordinationDashboard: React.FC<AgentCoordinationDashboardProps> = ({ farmId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [agents, setAgents] = useState<any[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState({
    agents: true,
    messages: true
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

  // Load agents for the farm
  useEffect(() => {
    const fetchAgents = async () => {
      if (!farmId) return;
      
      try {
        setLoading(prev => ({ ...prev, agents: true }));
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
        setLoading(prev => ({ ...prev, agents: false }));
      }
    };
    
    fetchAgents();
    
    // Set up subscription for real-time agent updates
    const supabase = createBrowserClient();
    const subscription = supabase
      .channel('agent-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agents',
        filter: `farm_id=eq.${farmId}`
      }, () => {
        fetchAgents();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [farmId, refreshTrigger]);
  
  // Load agent messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!farmId) return;
      
      try {
        setLoading(prev => ({ ...prev, messages: true }));
        
        const response = await fetch(`/api/agents/communication?farmId=${farmId}&limit=50&includeRead=true`);
        if (!response.ok) {
          throw new Error(`Error fetching messages: ${response.statusText}`);
        }
        
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast({
          variant: "destructive",
          title: "Failed to load agent communications",
          description: error instanceof Error ? error.message : "An error occurred",
        });
      } finally {
        setLoading(prev => ({ ...prev, messages: false }));
      }
    };
    
    fetchMessages();
    
    // Set up polling for new messages every 10 seconds
    const intervalId = setInterval(fetchMessages, 10000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [farmId, refreshTrigger]);
  
  const handleRolesAssigned = () => {
    // Refresh the data
    setRefreshTrigger(prev => prev + 1);
    
    toast({
      title: "Roles updated",
      description: "Agent roles have been successfully updated",
    });
  };
  
  const handleMarkAsRead = async (messageId: string) => {
    try {
      const supabase = createBrowserClient();
      
      const { error } = await supabase
        .from('agent_messages')
        .update({ status: 'read' })
        .eq('id', messageId);
        
      if (error) throw error;
      
      // Update local state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast({
        variant: "destructive",
        title: "Failed to update message",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };
  
  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Get color for message type
  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case MessageType.ALERT:
        return 'bg-red-100 text-red-800 border-red-300';
      case MessageType.WARNING:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case MessageType.ACTION:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case MessageType.INFO:
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };
  
  // Get color for message priority
  const getMessagePriorityColor = (priority: string) => {
    switch (priority) {
      case MessagePriority.HIGH:
        return 'bg-red-100 text-red-800 border-red-300';
      case MessagePriority.MEDIUM:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case MessagePriority.LOW:
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };
  
  // Find agent name from id
  const getAgentName = (id: string | null) => {
    if (!id) return 'Broadcast';
    const agent = agents.find(a => a.id === id);
    return agent ? agent.name : id;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Agent Coordination Center</h1>
        <Button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          variant="outline"
        >
          Refresh
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Network size={16} />
            <span>Network Overview</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users size={16} />
            <span>Role Management</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span>Communication</span>
            {messages.filter(m => m.status === 'sent').length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                {messages.filter(m => m.status === 'sent').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Coordination Network</CardTitle>
              <CardDescription>
                Visualize your agent network, relationships, and communication patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <AgentNetworkGraph
                  farmId={farmId}
                  height={580}
                  realTimeUpdates={true}
                />
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{agents.length}</div>
                <p className="text-sm text-muted-foreground">Total agents in farm</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{messages.length}</div>
                <p className="text-sm text-muted-foreground">Communication events</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Unread</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{messages.filter(m => m.status === 'sent').length}</div>
                <p className="text-sm text-muted-foreground">Pending messages</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="roles" className="space-y-4">
          <RoleAssignmentPanel 
            farmId={farmId} 
            onRolesAssigned={handleRolesAssigned} 
          />
        </TabsContent>
        
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Communication</CardTitle>
              <CardDescription>
                Monitor and manage agent-to-agent messages and broadcasts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading.messages ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-muted-foreground">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-muted-foreground">No messages between agents yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div 
                        key={message.id} 
                        className={`p-4 border rounded-lg ${message.status === 'sent' ? 'bg-muted/50 border-primary/30' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{message.sender_name}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{getAgentName(message.recipient_id)}</span>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getMessageTypeColor(message.type)}>
                              {message.type}
                            </Badge>
                            <Badge className={getMessagePriorityColor(message.priority)}>
                              {message.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="my-2 whitespace-pre-wrap">{message.content}</p>
                        
                        <div className="flex justify-between items-center mt-3 text-sm">
                          <span className="text-muted-foreground">
                            {formatTime(message.timestamp)}
                          </span>
                          
                          {message.status === 'sent' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleMarkAsRead(message.id)}
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgentCoordinationDashboard;
