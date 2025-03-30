import React, { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoordinatorService, Agent, Task } from "@/services/mcp/coordinator-service";
import { MessageQueueService, Message } from "@/services/mcp/message-queue-service";

const MCPManagement = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState({
    agents: true,
    tasks: true,
    messages: true
  });
  const [error, setError] = useState({
    agents: null as string | null,
    tasks: null as string | null,
    messages: null as string | null
  });

  useEffect(() => {
    // Fetch agents
    const fetchAgents = async () => {
      try {
        const agentsData = await CoordinatorService.getAgents();
        setAgents(agentsData);
        setLoading(prev => ({ ...prev, agents: false }));
      } catch (err) {
        console.error("Error fetching agents:", err);
        setError(prev => ({ ...prev, agents: "Error fetching agents. Is the MCP server running?" }));
        setLoading(prev => ({ ...prev, agents: false }));
      }
    };

    // Fetch tasks
    const fetchTasks = async () => {
      try {
        const tasksData = await CoordinatorService.getTasks();
        setTasks(tasksData);
        setLoading(prev => ({ ...prev, tasks: false }));
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError(prev => ({ ...prev, tasks: "Error fetching tasks. Is the MCP server running?" }));
        setLoading(prev => ({ ...prev, tasks: false }));
      }
    };

    // Fetch messages (for demo, getting the first agent's messages, if any)
    const fetchMessages = async () => {
      try {
        // This would typically be the current user's agent ID
        const tempAgentId = "coordinator";
        const messagesData = await MessageQueueService.getMessagesForAgent(tempAgentId);
        setMessages(messagesData);
        setLoading(prev => ({ ...prev, messages: false }));
      } catch (err) {
        console.error("Error fetching messages:", err);
        setError(prev => ({ ...prev, messages: "Error fetching messages. Is the MCP server running?" }));
        setLoading(prev => ({ ...prev, messages: false }));
      }
    };

    fetchAgents();
    fetchTasks();
    fetchMessages();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'suspended':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'waiting':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getMessagePriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-blue-500';
      case 4:
        return 'bg-green-500';
      case 5:
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">MCP Management</h1>
        <Button variant="outline">Server Health</Button>
      </div>
      
      <Tabs defaultValue="agents">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
        
        {/* Agents Tab */}
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Agent Registry</CardTitle>
              <CardDescription>View and manage the registered agents in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.agents ? (
                <div className="text-center py-4">Loading agents...</div>
              ) : error.agents ? (
                <div className="text-center py-4 text-red-500">{error.agents}</div>
              ) : (
                <Table>
                  <TableCaption>List of registered agents</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.length > 0 ? (
                      agents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-medium">{agent.agent_id}</TableCell>
                          <TableCell>{agent.name}</TableCell>
                          <TableCell>{agent.specialization}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(agent.status)}>
                              {agent.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {agent.last_active_at 
                              ? new Date(agent.last_active_at).toLocaleString() 
                              : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No agents found. Try registering an agent first.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Task Management</CardTitle>
              <CardDescription>Monitor tasks assigned to agents</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.tasks ? (
                <div className="text-center py-4">Loading tasks...</div>
              ) : error.tasks ? (
                <div className="text-center py-4 text-red-500">{error.tasks}</div>
              ) : (
                <Table>
                  <TableCaption>Current tasks in the system</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.task_id}</TableCell>
                          <TableCell>{task.task_type}</TableCell>
                          <TableCell>{task.agent_id}</TableCell>
                          <TableCell>
                            <Badge className={getTaskStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{task.priority}</TableCell>
                          <TableCell>
                            {new Date(task.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          No tasks found. Create a task to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Message Queue</CardTitle>
              <CardDescription>View messages in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.messages ? (
                <div className="text-center py-4">Loading messages...</div>
              ) : error.messages ? (
                <div className="text-center py-4 text-red-500">{error.messages}</div>
              ) : (
                <Table>
                  <TableCaption>Messages in the queue</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.length > 0 ? (
                      messages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell className="font-medium">{message.message_id}</TableCell>
                          <TableCell>{message.sender_id}</TableCell>
                          <TableCell>{message.recipient_id || 'Broadcast'}</TableCell>
                          <TableCell>{message.message_type}</TableCell>
                          <TableCell>
                            <Badge className={getMessagePriorityColor(message.priority)}>
                              {message.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{message.status}</TableCell>
                          <TableCell>
                            {new Date(message.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No messages found. Send a message to see it here.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MCPManagement; 