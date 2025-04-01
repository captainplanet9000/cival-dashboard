"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { AgentMessage, AgentRole, MessagePriority, MessageType } from "@/types/agent-coordination";
import AgentMessagingPanel from './agent-messaging-panel';
import AgentNetworkGraph from './agent-network-graph';
import TaskManagementPanel from './task-management-panel';
import ConflictResolutionPanel from './conflict-resolution-panel';

interface CoordinationDashboardProps {
  agents: {
    id: string;
    name: string;
    role: AgentRole;
    status: 'online' | 'offline' | 'busy';
    lastHeartbeat: number;
  }[];
}

export default function CoordinationDashboard({ agents }: CoordinationDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  
  // Simulate receiving a new message
  useEffect(() => {
    const interval = setInterval(() => {
      // This would eventually be replaced with WebSocket or polling
      const mockMessage: AgentMessage = {
        id: Date.now().toString(),
        senderId: agents[Math.floor(Math.random() * agents.length)]?.id || 'system',
        senderName: agents[Math.floor(Math.random() * agents.length)]?.name || 'System',
        senderRole: AgentRole.EXECUTOR,
        recipientId: 'coordinator',
        type: MessageType.NOTIFICATION,
        priority: MessagePriority.MEDIUM,
        content: `Status update at ${new Date().toLocaleTimeString()}`,
        timestamp: Date.now(),
        requiresAcknowledgment: false,
        requiresResponse: false,
        status: 'sent'
      };
      
      setMessages(prev => [...prev, mockMessage]);
      
      if (activeTab !== 'messages' && mockMessage.priority === MessagePriority.HIGH) {
        setUnreadAlerts(prev => prev + 1);
      }
    }, 15000); // Every 15 seconds
    
    return () => clearInterval(interval);
  }, [agents, activeTab]);
  
  // Reset unread alerts when viewing messages tab
  useEffect(() => {
    if (activeTab === 'messages') {
      setUnreadAlerts(0);
    }
  }, [activeTab]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Multi-Agent Coordination</CardTitle>
              <CardDescription>Manage and monitor agent interactions</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Badge variant={unreadAlerts > 0 ? "destructive" : "outline"}>
                {unreadAlerts > 0 ? `${unreadAlerts} Alert${unreadAlerts > 1 ? 's' : ''}` : 'No Alerts'}
              </Badge>
              <Button size="sm" variant="outline">
                Create Task
              </Button>
              <Button size="sm">New Protocol</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="messages">
                Messages
                {unreadAlerts > 0 && (
                  <Badge className="ml-2" variant="destructive">
                    {unreadAlerts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {agents.filter(a => a.status === 'online').length} / {agents.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {agents.filter(a => a.status === 'busy').length} agents are busy
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      2 high priority tasks
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Conflicts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      0 critical conflicts
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Agent Network</h3>
                <AgentNetworkGraph agents={agents} height={300} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recent Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {messages.slice(-5).reverse().map(message => (
                        <div key={message.id} className="flex items-start space-x-2 text-sm">
                          <Badge variant={
                            message.priority === MessagePriority.HIGH || message.priority === MessagePriority.CRITICAL 
                              ? "destructive" 
                              : message.priority === MessagePriority.MEDIUM 
                                ? "default" 
                                : "outline"
                          } className="min-w-[70px] text-center">
                            {message.type}
                          </Badge>
                          <div className="flex-1">
                            <p className="truncate font-medium">{message.content}</p>
                            <p className="text-xs text-muted-foreground">
                              From: {message.senderName} • {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Protocols</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Task Distribution Protocol</p>
                          <p className="text-xs text-muted-foreground">5 participating agents</p>
                        </div>
                        <Badge>Hierarchical</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Resource Allocation</p>
                          <p className="text-xs text-muted-foreground">3 participating agents</p>
                        </div>
                        <Badge>Market</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Risk Assessment</p>
                          <p className="text-xs text-muted-foreground">2 participating agents</p>
                        </div>
                        <Badge>Consensus</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="messages">
              <AgentMessagingPanel 
                messages={messages} 
                agents={agents} 
                onSendMessage={(message) => {
                  // In a real implementation, this would call the API
                  setMessages(prev => [...prev, {
                    ...message,
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    status: 'sent'
                  }]);
                }} 
              />
            </TabsContent>
            
            <TabsContent value="tasks">
              <TaskManagementPanel agents={agents} />
            </TabsContent>
            
            <TabsContent value="conflicts">
              <ConflictResolutionPanel agents={agents} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 