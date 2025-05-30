"use client"

import React, { useRef, useState, useEffect } from 'react'
import { useKnowledgeChat } from './knowledge-chat-provider'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, Send, Trash2, Bot, LineChart, Database, Server } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface ElizaChatInterfaceProps {
  title?: string
  placeholder?: string
  className?: string
  maxMessages?: number
  autoScroll?: boolean
  showAvatar?: boolean
  showTimestamp?: boolean
  enableClear?: boolean
  height?: string
  context?: 'strategy' | 'agent' | 'market' | 'general'
}

export function ElizaChatInterface({
  title = 'ElizaOS Knowledge Assistant',
  placeholder = 'Ask about strategies, markets, or trading concepts...',
  className,
  maxMessages = 50,
  autoScroll = true,
  showAvatar = true,
  showTimestamp = true,
  enableClear = true,
  height = '400px',
  context = 'general'
}: ElizaChatInterfaceProps) {
  const { messages, isLoading, sendMessage, clearMessages } = useKnowledgeChat()
  const [input, setInput] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, autoScroll]);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage(input)
      setInput('')
    }
  }
  
  // Get message source icon
  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'knowledge-base':
        return <Brain className="h-4 w-4 text-purple-500" />
      case 'market-data':
        return <LineChart className="h-4 w-4 text-green-500" />
      case 'strategy':
        return <Database className="h-4 w-4 text-blue-500" />
      case 'system':
        return <Server className="h-4 w-4 text-orange-500" />
      default:
        return null
    }
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Brain className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      
      <ScrollArea 
        ref={scrollAreaRef} 
        className="flex-1 p-4"
        style={{ height }}
      >
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
              <Brain className="h-12 w-12 mb-3 text-muted-foreground/50" />
              <p className="mb-1">Ask ElizaOS about trading strategies, markets, or concepts.</p>
              <p className="text-sm">Try questions like "How do trend-following strategies work?" or "What are the key metrics for strategy evaluation?"</p>
            </div>
          ) : (
            messages.slice(-maxMessages).map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "flex gap-3 max-w-full",
                  message.type === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {showAvatar && message.type !== 'user' && (
                  <Avatar className="h-8 w-8 bg-primary/10 border">
                    <Bot className="h-4 w-4 text-primary" />
                  </Avatar>
                )}
                
                <div className={cn(
                  "rounded-lg px-3 py-2 max-w-[80%]",
                  message.type === 'user' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                )}>
                  {message.source && (
                    <div className="flex items-center gap-1 text-xs mb-1 text-muted-foreground">
                      {getSourceIcon(message.source)}
                      <span className="capitalize">{message.source.replace('-', ' ')}</span>
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap break-words text-sm">
                    {message.content}
                  </div>
                  
                  {showTimestamp && (
                    <div className="text-xs mt-1 text-right opacity-70">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </div>
                  )}
                </div>
                
                {showAvatar && message.type === 'user' && (
                  <Avatar className="h-8 w-8 bg-primary">
                    <span className="text-xs text-primary-foreground">You</span>
                  </Avatar>
                )}
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
              <Avatar className="h-8 w-8 bg-primary/10 border">
                <Bot className="h-4 w-4 text-primary" />
              </Avatar>
              <div className="rounded-lg px-3 py-2 bg-muted">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <CardFooter className="p-2 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          {enableClear && messages.length > 0 && (
            <Button 
              type="button"
              variant="ghost" 
              size="icon"
              onClick={clearMessages}
              className="flex-shrink-0"
              title="Clear chat history"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
            disabled={isLoading}
          />
          
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
