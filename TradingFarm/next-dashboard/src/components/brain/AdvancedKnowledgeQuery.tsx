"use client";

import React, { useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search, Brain, BookOpen, Code, MessageSquare, BarChart3, Zap } from "lucide-react";

interface AdvancedKnowledgeQueryProps {
  farmId?: string;
  agentId?: string;
}

interface QueryParams {
  query: string;
  matchThreshold: number;
  maxResults: number;
  includeSources: boolean;
  queryType: string;
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

interface QueryResult {
  id: string;
  response: string;
  sources: KnowledgeSource[];
  query_type: string;
  metadata: {
    generated_by: string;
    processing_time: number;
    model?: string;
    tokens_used?: number;
    analysis?: Record<string, any>;
    [key: string]: any;
  };
  created_at: string;
}

export function AdvancedKnowledgeQuery({ farmId, agentId }: AdvancedKnowledgeQueryProps) {
  const [query, setQuery] = useState("");
  const [matchThreshold, setMatchThreshold] = useState(0.7);
  const [maxResults, setMaxResults] = useState(5);
  const [includeSources, setIncludeSources] = useState(true);
  const [queryType, setQueryType] = useState("knowledge_query");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [tabValue, setTabValue] = useState("response");
  
  const { toast } = useToast();
  const supabase = createBrowserClient();
  
  // Execute query mutation
  const executeQueryMutation = useMutation({
    mutationFn: async (params: QueryParams) => {
      // First log the query and get knowledge chunks
      const { data: queryData, error: queryError } = await supabase.rpc(
        "log_query_and_get_knowledge",
        {
          query_text: params.query,
          user_id_param: (await supabase.auth.getUser()).data.user?.id,
          farm_id_param: params.farmId,
          agent_id_param: params.agentId,
          query_type_param: params.queryType,
          context_param: {
            source: "advanced_query_interface",
            include_sources: params.includeSources,
            max_results: params.maxResults,
            match_threshold: params.matchThreshold,
          },
          match_threshold: params.matchThreshold,
          match_count: params.maxResults
        }
      );

      if (queryError) throw queryError;

      // Call ElizaOS to process the query
      // For this implementation, we're simulating the response
      // In a real application, this would call an external API or service
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const generateMockResponse = (queryText: string, queryType: string) => {
        let response = "";
        let analysis = {};
        
        switch (queryType) {
          case "knowledge_query":
            response = `Based on the knowledge base, here's what I found about "${queryText}": This appears to be a query about ${queryText.toLowerCase().includes("strategy") ? "trading strategies" : "market conditions"}. The knowledge base contains several relevant documents discussing ${queryText.toLowerCase().includes("technical") ? "technical indicators" : "fundamental analysis"} that might be helpful for your questions.`;
            break;
          case "strategy_analysis":
            response = `Analysis of strategies related to "${queryText}": The most effective strategies for ${queryText.toLowerCase().includes("volatile") ? "volatile markets" : "stable markets"} typically involve ${queryText.toLowerCase().includes("short") ? "shorter timeframes and quick adjustments" : "longer timeframes and trend following"}. Consider implementing risk management rules to protect against unexpected market movements.`;
            analysis = {
              risk_level: Math.random() * 10,
              win_rate: 0.4 + Math.random() * 0.4,
              profit_factor: 1 + Math.random() * 2,
              recommendations: [
                "Implement tight stop losses",
                "Use position sizing based on volatility",
                "Consider correlation between markets"
              ]
            };
            break;
          case "code_generation":
            response = "```javascript\n// Generated trading strategy based on your query\nfunction " + 
              (queryText.toLowerCase().includes("ma") ? "movingAverageCrossover" : "volatilityBreakout") + 
              "(data, params = {}) {\n  const { period1 = 20, period2 = 50, threshold = 0.01 } = params;\n  \n  // Calculate indicators\n  const shortMA = calculateSMA(data, period1);\n  const longMA = calculateSMA(data, period2);\n  \n  // Generate signals\n  const signals = [];\n  for (let i = Math.max(period1, period2); i < data.length; i++) {\n    if (shortMA[i] > longMA[i] && shortMA[i-1] <= longMA[i-1]) {\n      signals.push({ position: 'buy', price: data[i].close, time: data[i].time });\n    } else if (shortMA[i] < longMA[i] && shortMA[i-1] >= longMA[i-1]) {\n      signals.push({ position: 'sell', price: data[i].close, time: data[i].time });\n    }\n  }\n  \n  return signals;\n}\n```";
            break;
          default:
            response = `Here's what I found about "${queryText}": The query seems to explore ${queryText.toLowerCase().includes("market") ? "market conditions" : "trading strategies"}. Consider using ElizaOS's specialized query types for more targeted results.`;
        }
        
        return { response, analysis };
      };
      
      const { response, analysis } = generateMockResponse(params.query, params.queryType);

      // Create a response record
      const { data: responseData, error: responseError } = await supabase
        .from("knowledge_responses")
        .insert({
          query_id: queryData.query_id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          response: response,
          sources: queryData.knowledge_chunks,
          metadata: {
            generated_by: "ElizaOS",
            processing_time: 0.8 + Math.random() * 1.2,
            model: "eliza-7b",
            tokens_used: 150 + Math.floor(Math.random() * 800),
            query_type: params.queryType,
            analysis: analysis
          }
        })
        .select("*, sources")
        .single();

      if (responseError) throw responseError;

      return responseData as QueryResult;
    },
    onSuccess: (data) => {
      setQueryResult(data);
      setTabValue("response");
      
      toast({
        title: "Query executed successfully",
        description: `Found ${data.sources?.length || 0} relevant knowledge sources`,
      });
    },
    onError: (error: any) => {
      console.error("Error executing query:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to execute query",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: "Query required",
        description: "Please enter a query to search the knowledge base",
        variant: "destructive",
      });
      return;
    }
    
    executeQueryMutation.mutate({
      query,
      matchThreshold,
      maxResults,
      includeSources,
      queryType,
      farmId,
      agentId
    });
  };
  
  const getQueryTypeIcon = (type: string) => {
    switch (type) {
      case "knowledge_query":
        return <BookOpen className="h-4 w-4" />;
      case "strategy_analysis":
        return <BarChart3 className="h-4 w-4" />;
      case "code_generation":
        return <Code className="h-4 w-4" />;
      case "chat":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Advanced Knowledge Query</CardTitle>
            <CardDescription>
              Leverage ElizaOS's powerful knowledge retrieval capabilities
            </CardDescription>
          </div>
          <Search className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="query-type">Query Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                type="button"
                variant={queryType === "knowledge_query" ? "default" : "outline"}
                className="justify-start h-auto py-2"
                onClick={() => setQueryType("knowledge_query")}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="text-sm font-medium">Knowledge</div>
                  <div className="text-xs text-muted-foreground">Search knowledge base</div>
                </div>
              </Button>
              
              <Button
                type="button"
                variant={queryType === "strategy_analysis" ? "default" : "outline"}
                className="justify-start h-auto py-2"
                onClick={() => setQueryType("strategy_analysis")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="text-sm font-medium">Analysis</div>
                  <div className="text-xs text-muted-foreground">Analyze strategies</div>
                </div>
              </Button>
              
              <Button
                type="button"
                variant={queryType === "code_generation" ? "default" : "outline"}
                className="justify-start h-auto py-2"
                onClick={() => setQueryType("code_generation")}
              >
                <Code className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="text-sm font-medium">Code</div>
                  <div className="text-xs text-muted-foreground">Generate strategy code</div>
                </div>
              </Button>
              
              <Button
                type="button"
                variant={queryType === "chat" ? "default" : "outline"}
                className="justify-start h-auto py-2"
                onClick={() => setQueryType("chat")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="text-sm font-medium">Chat</div>
                  <div className="text-xs text-muted-foreground">Conversational mode</div>
                </div>
              </Button>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="query">Query</Label>
            <div className="flex gap-2">
              <Input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  queryType === "knowledge_query" 
                    ? "What trading strategies work best for volatile markets?" 
                    : queryType === "strategy_analysis"
                    ? "Analyze mean reversion strategies for cryptocurrency markets"
                    : queryType === "code_generation"
                    ? "Generate a moving average crossover strategy with RSI filter"
                    : "Help me understand how to optimize my trading strategy"
                }
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={executeQueryMutation.isPending || !query.trim()}
              >
                {executeQueryMutation.isPending 
                  ? <Loader2 className="h-4 w-4 animate-spin" /> 
                  : <Zap className="h-4 w-4" />}
                Execute
              </Button>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="match-threshold">Match Threshold</Label>
                <span className="text-xs text-muted-foreground">{(matchThreshold * 100).toFixed(0)}%</span>
              </div>
              <Slider
                id="match-threshold"
                value={[matchThreshold]}
                onValueChange={(value) => setMatchThreshold(value[0])}
                min={0.5}
                max={0.95}
                step={0.05}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>More Results</span>
                <span>Higher Relevance</span>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label htmlFor="max-results">Max Results</Label>
                <span className="text-xs text-muted-foreground">{maxResults}</span>
              </div>
              <Slider
                id="max-results"
                value={[maxResults]}
                onValueChange={(value) => setMaxResults(value[0])}
                min={1}
                max={10}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Focused</span>
                <span>Comprehensive</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="include-sources" className="flex-1">Include Source References</Label>
              <Switch
                id="include-sources"
                checked={includeSources}
                onCheckedChange={setIncludeSources}
              />
            </div>
          </div>
        </form>
        
        {queryResult && (
          <>
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="font-normal">
                    {getQueryTypeIcon(queryResult.query_type)}
                    <span className="ml-1">{queryResult.query_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                  </Badge>
                  
                  {queryResult.metadata.model && (
                    <Badge variant="secondary" className="font-normal text-xs">
                      {queryResult.metadata.model}
                    </Badge>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {queryResult.metadata.processing_time.toFixed(2)}s
                  {queryResult.metadata.tokens_used && ` • ${queryResult.metadata.tokens_used} tokens`}
                </div>
              </div>
              
              <Tabs value={tabValue} onValueChange={setTabValue}>
                <TabsList className="h-8">
                  <TabsTrigger value="response" className="text-xs">Response</TabsTrigger>
                  {includeSources && queryResult.sources && queryResult.sources.length > 0 && (
                    <TabsTrigger value="sources" className="text-xs">
                      Sources ({queryResult.sources.length})
                    </TabsTrigger>
                  )}
                  {queryResult.metadata.analysis && Object.keys(queryResult.metadata.analysis).length > 0 && (
                    <TabsTrigger value="analysis" className="text-xs">Analysis</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="response" className="mt-3">
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    {queryResult.response.startsWith("```") ? (
                      <pre className="text-sm font-mono overflow-auto whitespace-pre bg-muted p-2 rounded-md">
                        {queryResult.response.replace(/```\w*\n?/, "").replace(/\n?```$/, "")}
                      </pre>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap">{queryResult.response}</div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="sources" className="mt-3">
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <div className="space-y-3">
                      {queryResult.sources && queryResult.sources.map((source) => (
                        <div key={source.id} className="text-sm border rounded-md overflow-hidden">
                          <div className="flex justify-between items-center bg-muted px-3 py-1.5">
                            <div className="font-medium truncate">{source.brain_file_title || source.brain_file_name}</div>
                            <Badge variant="outline" className="ml-2">
                              {Math.round(source.similarity * 100)}% match
                            </Badge>
                          </div>
                          <div className="p-3 text-sm text-muted-foreground">
                            {source.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="analysis" className="mt-3">
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    {queryResult.metadata.analysis && (
                      <div className="space-y-4">
                        {Object.entries(queryResult.metadata.analysis).map(([key, value]) => {
                          if (Array.isArray(value)) {
                            return (
                              <div key={key} className="space-y-1">
                                <h4 className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</h4>
                                <ul className="text-sm text-muted-foreground pl-5 list-disc">
                                  {value.map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          } else if (typeof value === 'object') {
                            return (
                              <div key={key} className="space-y-1">
                                <h4 className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</h4>
                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              </div>
                            );
                          } else {
                            return (
                              <div key={key} className="space-y-1">
                                <h4 className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {typeof value === 'number' && !isNaN(value) && value <= 1 && value >= 0
                                    ? `${(value * 100).toFixed(0)}%`
                                    : String(value)}
                                </p>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
