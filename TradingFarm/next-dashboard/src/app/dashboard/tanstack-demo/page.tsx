'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Info, ChevronDown } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import PositionsTableAdvanced from '@/components/positions/positions-table-advanced';
import StrategyAnalyzer from '@/components/strategy/strategy-analyzer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/utils/react-query/query-keys';

export default function TanStackDemoPage() {
  const [activeDemoTab, setActiveDemoTab] = useState('positions');
  const [activeStrategyId, setActiveStrategyId] = useState('strategy-123'); // Example ID
  const queryClient = useQueryClient();
  
  // This function triggers a refetch of all query data
  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard._def });
    queryClient.invalidateQueries({ queryKey: queryKeys.positions._def });
    queryClient.invalidateQueries({ queryKey: queryKeys.strategies._def });
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics._def });
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TanStack Query Demo</h1>
          <p className="text-muted-foreground">
            Exploring complex query patterns, filtering, sorting, and pagination
          </p>
        </div>
        <Button variant="outline" onClick={refreshAllData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh All Data
        </Button>
      </div>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-primary">Implementation Overview</CardTitle>
          <CardDescription>
            Phase 2 of TanStack Query integration for components with complex data requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="features">
              <AccordionTrigger>
                <span className="font-medium">Key Features Demonstrated</span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Dependent Queries</strong> - Loading data conditionally based on previous query results
                  </li>
                  <li>
                    <strong>Filtering & Sorting</strong> - Server-side filtering and sorting with preserved cache per filter combination
                  </li>
                  <li>
                    <strong>Pagination</strong> - Efficient data loading with pagination support
                  </li>
                  <li>
                    <strong>Query Invalidation</strong> - Strategic cache updates when data changes
                  </li>
                  <li>
                    <strong>Centralized Query Keys</strong> - Type-safe query key factory for consistent cache management
                  </li>
                  <li>
                    <strong>Loading & Error States</strong> - Consistent handling across components
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="code-pattern">
              <AccordionTrigger>
                <span className="font-medium">Code Pattern Overview</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Query Hooks Structure</h3>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                      {`// 1. Query hook with filtering, sorting and pagination
export function usePositions(filters: PositionsFilter) {
  return useQuery({
    queryKey: queryKeys.positions.list(filters),
    queryFn: () => fetchPositions(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// 2. Dependent query pattern
export function useStrategyAnalytics(strategyId: string) {
  // First query - load strategy
  const strategyQuery = useQuery({
    queryKey: queryKeys.strategies.detail(strategyId),
    queryFn: () => fetchStrategy(strategyId),
  });

  // Second query - depends on first query
  const backtestsQuery = useQuery({
    queryKey: queryKeys.strategies.backtests(strategyId),
    queryFn: () => fetchBacktests(strategyId),
    // Only run this query if the first one succeeds
    enabled: !!strategyQuery.data,
  });

  // Third query - also depends on first query
  const executionsQuery = useQuery({
    queryKey: queryKeys.strategies.executions(strategyId),
    queryFn: () => fetchExecutions(strategyId),
    enabled: !!strategyQuery.data,
  });

  return {
    strategy: strategyQuery.data,
    backtests: backtestsQuery.data,
    executions: executionsQuery.data,
    isLoading: strategyQuery.isLoading || 
               backtestsQuery.isLoading || 
               executionsQuery.isLoading,
    isError: strategyQuery.isError ||
             backtestsQuery.isError ||
             executionsQuery.isError,
    refetch: () => {
      strategyQuery.refetch();
      backtestsQuery.refetch();
      executionsQuery.refetch();
    }
  };
}`}
                    </pre>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Type-Safe Query Keys</h3>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                      {`// Type-safe query key factory
export const queryKeys = {
  dashboard: createQueryKeys('dashboard', {
    detail: (farmId: string) => [farmId],
    riskMetrics: (farmId: string) => ['risk', farmId],
  }),
  
  positions: createQueryKeys('positions', {
    list: (filters: PositionsFilter) => ['list', filters],
    detail: (id: string) => ['detail', id],
  }),
  
  strategies: createQueryKeys('strategies', {
    list: (filters?: StrategiesFilter) => ['list', filters],
    detail: (id: string) => ['detail', id],
    backtests: (id: string) => ['backtests', id],
    executions: (id: string) => ['executions', id],
  }),
}`}
                    </pre>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="next-steps">
              <AccordionTrigger>
                <span className="font-medium">Next Steps in Implementation</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Badge className="mt-0.5">Phase 3</Badge>
                    <div>
                      <p className="font-medium">Implement Mutations</p>
                      <p className="text-sm text-muted-foreground">
                        Add data creation and update capabilities with useMutation and optimistic updates
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Badge variant="outline" className="mt-0.5">Phase 4</Badge>
                    <div>
                      <p className="font-medium">Advanced Optimizations</p>
                      <p className="text-sm text-muted-foreground">
                        Implement prefetching, cache optimization, and request cancellation
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Badge variant="outline" className="mt-0.5">Phase 5</Badge>
                    <div>
                      <p className="font-medium">Cleanup & Refinement</p>
                      <p className="text-sm text-muted-foreground">
                        Remove old fetching code and ensure consistent patterns
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Badge variant="secondary" className="mt-0.5">WebSockets</Badge>
                    <div>
                      <p className="font-medium">Real-time Updates Integration</p>
                      <p className="text-sm text-muted-foreground">
                        Connect WebSocket events to query invalidation for live data updates
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Tabs value={activeDemoTab} onValueChange={setActiveDemoTab}>
        <TabsList className="w-full">
          <TabsTrigger value="positions" className="flex-1">
            Filter & Pagination Demo
          </TabsTrigger>
          <TabsTrigger value="strategy-analyzer" className="flex-1">
            Dependent Queries Demo
          </TabsTrigger>
          <TabsTrigger value="query-devtools" className="flex-1">
            Query Inspector
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="positions" className="mt-0">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Advanced Positions Table</CardTitle>
                  <CardDescription>
                    Demonstrates server-side filtering, sorting, and pagination
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 border rounded-md p-4 mb-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Implementation Highlights:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Filter state is included in query keys for proper caching</li>
                          <li>Each filter combination creates a separate cache entry</li>
                          <li>Sorting and pagination controlled via query parameters</li>
                          <li>Loading states are automatically handled by TanStack Query</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <PositionsTableAdvanced />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="strategy-analyzer" className="mt-0">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Strategy Analyzer with Dependent Queries</CardTitle>
                  <CardDescription>
                    Demonstrates dependent query patterns for related data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 border rounded-md p-4 mb-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Implementation Highlights:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Primary query fetches strategy details</li>
                          <li>Secondary queries for backtests and executions only run if strategy exists</li>
                          <li>All loading states are synchronized in the component</li>
                          <li>The hook abstracts away query complexity from the component</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start space-y-2 sm:space-y-0 sm:space-x-2">
                      <p className="text-sm font-medium">Select Strategy:</p>
                      <div className="flex space-x-2">
                        <Button 
                          variant={activeStrategyId === "strategy-123" ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setActiveStrategyId("strategy-123")}
                        >
                          Golden Cross
                        </Button>
                        <Button 
                          variant={activeStrategyId === "strategy-456" ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setActiveStrategyId("strategy-456")}
                        >
                          MACD Momentum
                        </Button>
                        <Button 
                          variant={activeStrategyId === "strategy-789" ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setActiveStrategyId("strategy-789")}
                        >
                          RSI Reversal
                        </Button>
                      </div>
                    </div>
                    
                    <StrategyAnalyzer strategyId={activeStrategyId} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="query-devtools" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>TanStack Query Cache Inspector</CardTitle>
                <CardDescription>
                  Explore the query cache structure and data flow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 border rounded-md p-4 mb-4">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p>
                        The TanStack Query DevTools would normally appear here in development mode.
                        They provide a visual way to inspect queries, their states, and cache content.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-6 h-[500px] flex items-center justify-center bg-muted/30">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-medium mb-2">TanStack Query DevTools</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      In development mode, you would see the TanStack Query DevTools here,
                      allowing you to inspect the cache structure, active queries, and data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
