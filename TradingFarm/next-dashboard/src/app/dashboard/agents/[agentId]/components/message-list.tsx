"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageCircle } from "lucide-react";
import { AgentMessage } from "@/services/elizaos-messaging-adapter";

interface MessageListProps {
  messages: AgentMessage[];
  loading: boolean;
  containerClassName?: string;
  agentName: string;
}

export function MessageList({ 
  messages, 
  loading, 
  containerClassName,
  agentName
}: MessageListProps) {
  // Format timestamp to human-readable format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Determine message type badge
  const getMessageTypeBadge = (type: string) => {
    switch (type) {
      case 'command':
        return <Badge variant="outline" className="text-blue-500 border-blue-200">Command</Badge>;
      case 'query':
        return <Badge variant="outline" className="text-purple-500 border-purple-200">Query</Badge>;
      case 'alert':
        return <Badge variant="outline" className="text-orange-500 border-orange-200">Alert</Badge>;
      case 'analysis':
        return <Badge variant="outline" className="text-emerald-500 border-emerald-200">Analysis</Badge>;
      default:
        return <Badge variant="outline">Message</Badge>;
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-40", containerClassName)}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-40", containerClassName)}>
        <MessageCircle className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
        <p className="text-muted-foreground text-sm">No messages yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Send a message to start a conversation with {agentName}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", containerClassName)}>
      {messages.map((message) => {
        const isUserMessage = message.sender_id === "user";
        
        return (
          <div 
            key={message.id}
            className={cn(
              "flex items-start gap-3",
              isUserMessage ? "flex-row-reverse" : "flex-row"
            )}
          >
            <Avatar className="h-8 w-8 mt-1">
              {isUserMessage ? (
                <>
                  <AvatarFallback>U</AvatarFallback>
                  <AvatarImage src="/avatars/user.png" alt="User" />
                </>
              ) : (
                <>
                  <AvatarFallback>A</AvatarFallback>
                  <AvatarImage src="/avatars/agent.png" alt={agentName} />
                </>
              )}
            </Avatar>
            
            <div className={cn(
              "rounded-lg p-3 max-w-[80%]",
              isUserMessage 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted"
            )}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              <div className="flex items-center mt-2 gap-2">
                {!isUserMessage && getMessageTypeBadge(message.message_type)}
                <span className="text-xs opacity-70">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
