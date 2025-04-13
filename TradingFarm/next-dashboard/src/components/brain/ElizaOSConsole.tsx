"use client";

import React, { useState, useRef, useEffect } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Brain, BrainCircuit, Send, Bot, User, Info, BookOpen, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ElizaOSConsoleProps {
  farmId?: string;
  agentId?: string;
}

interface KnowledgeSource {
  id: string;
  brain_file_id: string;
  content: string;
  similarity: number;
  brain_file_name: string;
  brain_file_title: string;
}

interface QueryResponse {
  id: string;
  query_id: string;
  user_id: string;
  response: string;
  sources: KnowledgeSource[];
  metadata: Record<string, any>;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: KnowledgeSource[];
  timestamp: Date;
}

export function ElizaOSConsole({ farmId, agentId }: ElizaOSConsoleProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isCollapsedMap, setIsCollapsedMap] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add initial welcome message
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Welcome to ElizaOS Knowledge Integration. What would you like to know about your trading farm?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Submit query mutation
  const submitQueryMutation = useMutation({
    mutationFn: async (queryText: string) => {
      // First log the query
      const { data: queryData, error: queryError } = await supabase.rpc(
        "log_query_and_get_knowledge",
        {
          query_text: queryText,
          user_id_param: (await supabase.auth.getUser()).data.user?.id,
          farm_id_param: farmId,
          agent_id_param: agentId,
          query_type_param: "knowledge_query",
          context_param: {
            source: agentId ? "agent_console" : "brain_console",
            user_input: queryText,
          },
          match_threshold: 0.7,
          match_count: 5
        }
      );

      if (queryError) throw queryError;

      // In a real implementation, we would now call an AI service to process the query and knowledge
      // For this demo, we'll simulate the response

      // Wait to simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate a mock response based on the query
      let mockResponse = "";
      if (queryText.toLowerCase().includes("trade") || queryText.toLowerCase().includes("trading")) {
        mockResponse = "Trading strategies are implemented based on various technical indicators and market conditions. Our system supports multiple exchanges and provides real-time monitoring of positions.";
      } else if (queryText.toLowerCase().includes("exchange") || queryText.toLowerCase().includes("connect")) {
        mockResponse = "The Trading Farm supports connections to major exchanges including Binance, Coinbase, and Bybit. You can manage your exchange connections in the Settings page.";
      } else if (queryText.toLowerCase().includes("farm") || queryText.toLowerCase().includes("strategy")) {
        mockResponse = "Farms in our system represent collections of trading strategies that work together. Each farm can contain multiple strategies targeting different markets and timeframes.";
      } else if (queryText.toLowerCase().includes("agent") || queryText.toLowerCase().includes("ai")) {
        mockResponse = "Agents are AI-powered entities that can execute trading strategies, monitor markets, and make decisions based on predefined rules. ElizaOS provides natural language interfaces for these agents.";
      } else {
        mockResponse = "I've analyzed your query and found some relevant information in the knowledge base. " +
          "Please check the sources below for more details or try asking a more specific question about trading, exchanges, strategies, or agents.";
      }

      // Create a response record
      const { data: responseData, error: responseError } = await supabase
        .from("knowledge_responses")
        .insert({
          query_id: queryData.query_id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          response: mockResponse,
          sources: queryData.knowledge_chunks,
        })
        .select("*, sources")
        .single();

      if (responseError) throw responseError;

      return responseData as QueryResponse;
    },
    onSuccess: (data) => {
      // Add the response to the messages
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          role: "assistant",
          content: data.response,
          sources: data.sources,
          timestamp: new Date(data.created_at),
        },
      ]);
      
      // Collapse all source sections
      const newCollapsedMap: Record<string, boolean> = {};
      data.sources.forEach((source) => {
        newCollapsedMap[source.id] = true;
      });
      setIsCollapsedMap((prev) => ({ ...prev, ...newCollapsedMap }));
      
      // Clear the input
      setQuery("");
    },
    onError: (error: any) => {
      console.error("Error submitting query:", error);
      toast({
        title: "Error",
        description: "Failed to process your query. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    // Add the user message
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: query,
        timestamp: new Date(),
      },
    ]);
    
    // Submit the query
    submitQueryMutation.mutate(query);
  };

  const toggleCollapse = (id: string) => {
    setIsCollapsedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <CardTitle>ElizaOS Knowledge Integration</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-normal">Beta</Badge>
        </div>
        <CardDescription>
          Ask questions about your trading farm and strategies. ElizaOS will search the brain files for relevant information.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-[calc(600px-160px)] px-4">
          <div className="space-y-4 pt-1 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`rounded-xl px-4 py-2 max-w-[80%] ${
                    message.role === "assistant"
                      ? "bg-muted/50 text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.role === "assistant" ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <div className="text-xs opacity-70">
                      {message.role === "assistant" ? "ElizaOS" : "You"}
                    </div>
                  </div>
                  
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1 text-xs mb-1">
                        <BookOpen className="h-3 w-3" />
                        <span>Sources ({message.sources.length})</span>
                      </div>
                      
                      <div className="space-y-2">
                        {message.sources.map((source) => (
                          <Collapsible
                            key={source.id}
                            open={!isCollapsedMap[source.id]}
                            className="bg-background rounded border text-xs"
                          >
                            <CollapsibleTrigger
                              onClick={() => toggleCollapse(source.id)}
                              className="flex items-center justify-between w-full px-2 py-1 text-left"
                            >
                              <div className="flex items-center gap-1 font-medium">
                                <span>{source.brain_file_title || source.brain_file_name}</span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 h-auto"
                                >
                                  {Math.round(source.similarity * 100)}%
                                </Badge>
                              </div>
                              <ChevronDown className={`h-3 w-3 transition-transform ${!isCollapsedMap[source.id] ? "transform rotate-180" : ""}`} />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="px-2 py-1 bg-muted/30 border-t text-muted-foreground">
                              {source.content}
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="pt-2">
        <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about your trading strategies, farms, or market data..."
            disabled={submitQueryMutation.isPending}
            className="flex-grow"
          />
          <Button
            type="submit"
            disabled={submitQueryMutation.isPending || !query.trim()}
          >
            {submitQueryMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
