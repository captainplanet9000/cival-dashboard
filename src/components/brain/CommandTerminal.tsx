import React, { useState, useRef, useEffect } from 'react';
import { Send, TerminalSquare, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBrainFarm } from '@/hooks/useBrainFarm';
import { CommandCategory, CommandSource } from '@/services/brain/brain-service';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface CommandMessage {
  id: string;
  content: string;
  response?: string;
  category: CommandCategory;
  source: CommandSource;
  timestamp: string;
  isUser: boolean;
}

interface CommandTerminalProps {
  farmId?: string | number;
  height?: string;
}

export function CommandTerminal({ farmId, height = '500px' }: CommandTerminalProps) {
  const { commands, executeCommand } = useBrainFarm({ farmId });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<CommandMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Convert commands to message format and sort by timestamp
  useEffect(() => {
    if (commands.length > 0) {
      const formattedMessages = commands.map(cmd => ({
        id: cmd.id.toString(),
        content: cmd.content,
        response: cmd.response,
        category: cmd.category as CommandCategory,
        source: cmd.source as CommandSource,
        timestamp: cmd.created_at,
        isUser: true
      }));
      
      // Sort by timestamp
      formattedMessages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setMessages(formattedMessages);
    }
  }, [commands]);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle command submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setIsLoading(true);
    
    const userMessage: CommandMessage = {
      id: Date.now().toString(),
      content: input,
      category: 'command',
      source: 'system',
      timestamp: new Date().toISOString(),
      isUser: true
    };
    
    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    setInput('');
    
    try {
      // Execute command
      const result = await executeCommand(input, 'command', 'system');
      
      if (result.success && result.response) {
        // Add system response
        const systemMessage: CommandMessage = {
          id: Date.now().toString() + '-response',
          content: result.response,
          category: 'command',
          source: 'system',
          timestamp: new Date().toISOString(),
          isUser: false
        };
        
        setMessages(prev => [...prev, systemMessage]);
      }
    } catch (error) {
      console.error('Error executing command:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render categorized badge
  const renderCategoryBadge = (category: CommandCategory) => {
    const categoryColors: Record<CommandCategory, string> = {
      command: 'bg-blue-100 text-blue-800',
      query: 'bg-purple-100 text-purple-800',
      analysis: 'bg-green-100 text-green-800',
      alert: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={`text-xs px-2 py-0.5 ${categoryColors[category]}`}>
        {category}
      </Badge>
    );
  };
  
  // Render source badge
  const renderSourceBadge = (source: CommandSource) => {
    const sourceColors: Record<CommandSource, string> = {
      'knowledge-base': 'bg-amber-100 text-amber-800',
      'market-data': 'bg-cyan-100 text-cyan-800',
      'strategy': 'bg-indigo-100 text-indigo-800',
      'system': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={`text-xs px-2 py-0.5 ml-1 ${sourceColors[source]}`}>
        {source}
      </Badge>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="flex items-center text-lg">
          <TerminalSquare className="h-5 w-5 mr-2" />
          ElizaOS Command Terminal
        </CardTitle>
        <CardDescription>
          Execute commands and queries for your trading farm
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4">
        <ScrollArea className="h-[400px] pr-4" style={{ height }}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={message.id} 
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    message.isUser 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex gap-2 items-center text-xs mb-1">
                    {!message.isUser && (
                      <div className="font-semibold">ElizaOS</div>
                    )}
                    <div className="flex items-center text-xs opacity-70">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                  
                  <div className="mb-1">
                    {message.content}
                  </div>
                  
                  <div className="flex items-center text-xs mt-1">
                    {renderCategoryBadge(message.category)}
                    {renderSourceBadge(message.source)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-4 pt-2">
        <form onSubmit={handleSubmit} className="w-full flex gap-2">
          <div className="flex items-center w-full px-3 py-2 border rounded-md shadow-sm">
            <ChevronRight className="h-4 w-4 text-muted-foreground mr-2" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter a command or query..."
              className="border-none shadow-none w-full p-0 focus-visible:ring-0"
            />
          </div>
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
} 