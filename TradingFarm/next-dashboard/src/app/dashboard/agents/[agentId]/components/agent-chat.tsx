"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useElizaMessaging } from "@/hooks/useElizaMessaging";
import { MessageList } from "./message-list";

interface AgentChatProps {
  agentId: string;
  agentName: string;
}

export function AgentChat({ agentId, agentName }: AgentChatProps) {
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Use our ElizaOS messaging adapter hook with proper dependency management
  const {
    messages,
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
  
  // Send message to agent using our adapter
  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Determine if it's a command (starts with "/" or "?") or regular message
      const isCommand = userInput.startsWith('/') || userInput.startsWith('?');
      
      let response;
      
      if (isCommand) {
        // Send as a command
        response = await sendCommand(userInput, {});
      } else {
        // Send as a regular message
        response = await sendMessage(userInput, 'direct', {});
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }
      
      // Clear input
      setUserInput("");
      
      // Refresh messages to show the new one (after a short delay to avoid re-render issues)
      setTimeout(() => refreshMessages(), 500);
      
    } catch (error: any) {
      console.error('Error sending message to agent:', error);
      
      toast({
        title: 'Error sending message',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Chat with {agentName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 px-4 pb-4 space-y-4">
        <MessageList 
          messages={messages} 
          loading={loading} 
          containerClassName="flex-1 overflow-y-auto pr-2"
          agentName={agentName}
        />
        
        <div className="mt-auto">
          <div className="flex items-center space-x-2">
            <Textarea
              placeholder={`Message ${agentName}...`}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-1 min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!userInput.trim() || isSubmitting}
              className="self-end"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        <div ref={messageEndRef} />
      </CardContent>
    </Card>
  );
}
