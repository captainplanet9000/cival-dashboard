'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/providers/socket-provider';
import { elizaOSMessagingAdapter } from '@/services/elizaos-messaging-adapter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  ArrowUpRight, 
  Bot, 
  MessageCircle, 
  Send, 
  Settings,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { useElizaMessaging } from '@/hooks/useElizaMessaging';

interface AgentCommunicationProps {
  agentId: string;
  agentName: string;
  farmId: number;
  className?: string;
}

type MessageType = 'alert' | 'insight' | 'update' | 'question';

interface AgentMessage {
  id: string;
  content: string;
  type: MessageType;
  timestamp: string;
  isRead: boolean;
  requiresAction: boolean;
  sender_id?: string;
  metadata?: any;
}

export default function AgentCommunication({ 
  agentId,
  agentName,
  farmId,
  className
}: AgentCommunicationProps) {
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [userInput, setUserInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { send, isConnected } = useSocket();
  const { toast } = useToast();
  
  // Use our ElizaOS messaging adapter hook
  const {
    messages: elizaMessages,
    loading,
    error,
    sendMessage,
    sendCommand,
    refreshMessages
  } = useElizaMessaging({
    agentId,
    refreshInterval: 10000, // Refresh every 10 seconds
    initialMessageLimit: 50
  });
  
  // Convert ElizaOS messages to our component format
  const [messages, setMessages] = useState<AgentMessage[]>([]);

  // Convert ElizaOS messages to our format with proper dependency management
  useEffect(() => {
    if (elizaMessages && elizaMessages.length > 0) {
      const convertedMessages: AgentMessage[] = elizaMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        // Map message types
        type: mapMessageType(msg.message_type, msg.metadata?.source),
        timestamp: msg.timestamp,
        isRead: msg.read,
        requiresAction: msg.requires_response || false,
        sender_id: msg.sender_id,
        metadata: msg.metadata
      }));
      
      setMessages(convertedMessages);
    }
  }, [elizaMessages]);
  
  // Helper to map message types from ElizaOS to our UI format
  const mapMessageType = (messageType: string, source?: string): MessageType => {
    if (messageType === 'alert' || source === 'system') return 'alert';
    if (messageType === 'analysis' || source === 'strategy') return 'insight';
    if (messageType === 'command' || messageType === 'status' || messageType === 'direct') return 'update';
    if (messageType === 'query') return 'question';
    return 'update';
  };
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Show errors from messaging API
  useEffect(() => {
    if (error) {
      toast({
        title: "Communication Error",
        description: error,
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  // Send message to agent
  const handleSendMessage = async () => {
    if (!userInput.trim() || !isConnected) return;
    
    setIsSubmitting(true);
    
    try {
      // Add user message to the conversation
      const userMessage: AgentMessage = {
        id: `user-${Date.now()}`,
        content: userInput,
        type: 'question',
        timestamp: new Date().toISOString(),
        isRead: true,
        requiresAction: false
      };
      
      setMessages(prev => [userMessage, ...prev]);
      
      // Send to API for agent processing
      const response = await fetch('/api/elizaos/agents/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          farmId,
          message: userInput,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message to agent');
      }
      
      // Clear input after successful send
      setUserInput('');
      
      // For development - simulate agent response after a delay
      setTimeout(() => {
        const agentResponse: AgentMessage = {
          id: `agent-${Date.now()}`,
          content: `I've received your message and I'm processing your request regarding "${userInput.substring(0, 30)}${userInput.length > 30 ? '...' : ''}". I'll update you shortly with my analysis.`,
          type: 'update',
          timestamp: new Date().toISOString(),
          isRead: false,
          requiresAction: false
        };
        
        setMessages(prev => [agentResponse, ...prev]);
      }, 1500);
      
    } catch (error) {
      console.error('Error sending message to agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message to agent. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Mark a message as read
  const markAsRead = async (messageId: string) => {
    try {
      // First update the UI optimistically
      setMessages((prev: AgentMessage[]) => 
        prev.map((msg: AgentMessage) => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
      
      // Then use the adapter to update the message status
      await elizaOSMessagingAdapter.markAsRead(messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };
  
  // Handle action button click
  const handleActionResponse = (messageId: string, accepted: boolean) => {
    // Mark message as read
    markAsRead(messageId);
    
    // Get the message
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;
    
    // Add response message
    const responseMessage: AgentMessage = {
      id: `response-${Date.now()}`,
      content: accepted 
        ? `I've accepted the recommendation to ${message.content.toLowerCase().includes('stop loss') ? 'adjust stop loss parameters' : 'take the suggested action'}.`
        : `I've declined the recommendation and will maintain current settings.`,
      type: 'update',
      timestamp: new Date().toISOString(),
      isRead: true,
      requiresAction: false
    };
    
    setMessages(prev => [responseMessage, ...prev]);
    
    // Show toast
    toast({
      title: accepted ? 'Action Accepted' : 'Action Declined',
      description: accepted 
        ? 'The agent will proceed with the recommended action'
        : 'No changes will be made to your current settings',
    });
  };
  
  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'insight':
        return <Bot className="h-5 w-5 text-blue-500" />;
      case 'update':
        return <MessageCircle className="h-5 w-5 text-green-500" />;
      case 'question':
        return <MessageCircle className="h-5 w-5 text-purple-500" />;
      default:
        return <MessageCircle className="h-5 w-5" />;
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Count unread messages
  const unreadCount = messages.filter(msg => !msg.isRead).length;
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg flex items-center">
          <Bot className="mr-2 h-5 w-5 text-primary" />
          Agent Communication
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
        <Link href={`/dashboard/agents/${agentId}/settings`}>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <Textarea
            placeholder={`Ask ${agentName} a question...`}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="resize-none"
            disabled={!isConnected || isSubmitting}
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSendMessage}
              disabled={!userInput.trim() || !isConnected || isSubmitting}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>
        
        <div className="border rounded-md">
          <div className="p-2 border-b bg-muted/30 flex justify-between items-center">
            <h4 className="text-sm font-medium">Recent Communications</h4>
            <Link href={`/dashboard/agents/${agentId}/communications`}>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                View All
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto p-0">
            {messages.length > 0 ? (
              <div className="divide-y">
                {messages.map((message: AgentMessage) => (
                  <div 
                    key={message.id} 
                    className={`p-3 ${message.isRead ? '' : 'bg-muted/30'}`}
                    onClick={() => markAsRead(message.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {getMessageIcon(message.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs h-5">
                              {message.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          
                          {message.requiresAction && (
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-500 hover:text-green-600 hover:bg-green-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionResponse(message.id, true);
                                }}
                                title="Accept"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionResponse(message.id, false);
                                }}
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                <MessageCircle className="mx-auto h-8 w-8 opacity-50 mb-2" />
                <p>No messages yet</p>
                <p className="text-sm">Start a conversation with your agent</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
