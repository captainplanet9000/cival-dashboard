'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  RefreshCw, 
  Database, 
  Zap, 
  Network, 
  ArrowUpDown,
  Plus,
  AlertTriangle,
  HelpCircle,
  Info
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Import prefetching utilities
import { prefetchEntityData, prefetchListData, prefetchDashboardData } from '@/utils/react-query/prefetching';
// Import enhanced infinite query hooks
import { 
  useTradeHistory, 
  usePerformanceData, 
  flattenInfiniteQueryData, 
  getTotalCount,
  hasLoadedAllData 
} from '@/hooks/react-query/use-enhanced-infinite-queries';

export default function AdvancedFeaturesDemo() {
  const [activeTab, setActiveTab] = useState('prefetching');
  const queryClient = useQueryClient();
  
  // Demo farm ID for examples
  const demoFarmId = 'farm-123';
  const demoStrategyId = 'strategy-456';
  const demoAgentId = 'agent-789';
  
  // Infinite query demo state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Trade history infinite query
  const tradeHistory = useTradeHistory({
    farmId: demoFarmId,
    sort: { field: 'date', direction: 'desc' }
  });
  
  // Performance data infinite query with timeframe
  const performanceData = usePerformanceData({
    farmId: demoFarmId,
    timeframe: 'daily'
  });
  
  // Prefetching handlers
  const handlePrefetchDashboard = () => {
    prefetchDashboardData(queryClient, demoFarmId);
  };
  
  const handlePrefetchStrategy = () => {
    prefetchEntityData(queryClient, 'strategy', demoStrategyId);
  };
  
  const handlePrefetchPositions = () => {
    prefetchListData(queryClient, 'positions', { farmId: demoFarmId });
  };
  
  // Load more data for infinite query demo
  const handleLoadMore = async () => {
    if (tradeHistory.hasNextPage && !tradeHistory.isFetchingNextPage) {
      setIsLoadingMore(true);
      await tradeHistory.fetchNextPage();
      setIsLoadingMore(false);
    }
  };
  
  // WebSocket simulation
  const [wsConnected, setWsConnected] = useState(false);
  const [wsMessages, setWsMessages] = useState<string[]>([]);
  
  useEffect(() => {
    // Simulate WebSocket connection
    const timeout = setTimeout(() => {
      setWsConnected(true);
    }, 1500);
    
    // Simulate WebSocket messages
    const interval = setInterval(() => {
      if (wsConnected) {
        const messageTypes = [
          'Position update for BTC-USDT',
          'Market price update for ETH-USDT',
          'New order created for SOL-USDT',
          'Strategy execution started',
          'Dashboard metrics updated'
        ];
        
        setWsMessages(prev => {
          const newMessage = messageTypes[Math.floor(Math.random() * messageTypes.length)];
          const newMessages = [newMessage, ...prev];
          // Keep only the last 10 messages
          return newMessages.slice(0, 10);
        });
      }
    }, 3000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [wsConnected]);
  
  // Flattened data for display
  const trades = flattenInfiniteQueryData(tradeHistory.data);
  const totalTrades = getTotalCount(tradeHistory.data);
  const hasLoadedAllTrades = hasLoadedAllData(tradeHistory.data);

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced TanStack Query Features</h1>
          <p className="text-muted-foreground">
            Phase 4: Enhanced performance and data loading optimizations
          </p>
        </div>
      </div>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-primary">Phase 4 Implementation Overview</CardTitle>
          <CardDescription>
            Advanced features, optimization techniques, and real-time data integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="features">
              <AccordionTrigger>
                <span className="font-medium">Phase 4 Features Implemented</span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Prefetching</strong> - Preload data for anticipated navigation paths
                  </li>
                  <li>
                    <strong>Enhanced Infinite Queries</strong> - Optimized infinite scroll with utility functions
                  </li>
                  <li>
                    <strong>Request Cancellation</strong> - Cancel in-flight requests during navigation
                  </li>
                  <li>
                    <strong>Cache Configuration</strong> - Domain-specific cache settings for optimal performance
                  </li>
                  <li>
                    <strong>WebSocket Integration</strong> - Real-time data updates via WebSockets
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="prefetching" className="flex-1">
            <Zap className="h-4 w-4 mr-2" />
            Prefetching
          </TabsTrigger>
          <TabsTrigger value="infinite-queries" className="flex-1">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Infinite Queries
          </TabsTrigger>
          <TabsTrigger value="cache-config" className="flex-1">
            <Database className="h-4 w-4 mr-2" />
            Cache Optimization
          </TabsTrigger>
          <TabsTrigger value="websockets" className="flex-1">
            <Network className="h-4 w-4 mr-2" />
            WebSocket Integration
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          {/* Prefetching Demo */}
          <TabsContent value="prefetching" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Prefetching</CardTitle>
                <CardDescription>
                  Preload data for anticipated user journeys to improve perceived performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertTitle>How prefetching works</AlertTitle>
                  <AlertDescription>
                    When you hover over a link or UI element, we can prefetch the data that will be needed on the next page.
                    This makes page transitions feel instant as the data is already in the cache when the user navigates.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Dashboard Prefetch</CardTitle>
                      <CardDescription>Preload dashboard data</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        onClick={handlePrefetchDashboard}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Prefetch Dashboard
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        This prefetches dashboard overview, risk metrics, and recent positions
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Strategy Prefetch</CardTitle>
                      <CardDescription>Preload strategy details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        onClick={handlePrefetchStrategy}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Prefetch Strategy
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        This prefetches strategy details, backtests, and executions
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Positions Prefetch</CardTitle>
                      <CardDescription>Preload positions list</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        onClick={handlePrefetchPositions}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Prefetch Positions
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        This prefetches the positions list with default filters
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2">Implementation Highlights</h3>
                  <pre className="text-xs overflow-x-auto bg-muted p-2 rounded-md">
{`// Prefetching utility function
export function prefetchEntityData(
  queryClient: QueryClient,
  entityType: 'strategy' | 'position' | 'agent' | 'farm',
  entityId: string,
  options?: {
    staleTime?: number;
    includeRelatedData?: boolean;
  }
) {
  // Prefetch entity data and related entities
  switch (entityType) {
    case 'strategy':
      queryClient.prefetchQuery({
        queryKey: queryKeys.strategies.detail(entityId)._def,
        queryFn: () => apiService.get(\`/api/strategies/\${entityId}\`).then(res => res.data),
        staleTime: options?.staleTime ?? 1000 * 60 * 5,
      });
      
      // Also prefetch related data if requested
      if (options?.includeRelatedData) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.strategies.backtests(entityId)._def,
          queryFn: () => apiService.get(\`/api/strategies/\${entityId}/backtests\`).then(res => res.data),
        });
      }
      break;
    // ...other entity types
  }
}`}
                  </pre>
                </div>
                
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2">Usage in Components</h3>
                  <pre className="text-xs overflow-x-auto bg-muted p-2 rounded-md">
{`// In a navigation component
function NavLink({ to, children, entityId, entityType }) {
  const queryClient = useQueryClient();
  
  const handleMouseEnter = () => {
    // Prefetch data when hovering over a link
    if (entityType && entityId) {
      prefetchEntityData(queryClient, entityType, entityId);
    }
  };
  
  return (
    <Link 
      href={to} 
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </Link>
  );
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Infinite Queries Demo */}
          <TabsContent value="infinite-queries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Infinite Queries</CardTitle>
                <CardDescription>
                  Optimized infinite scroll with improved performance and UX
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Enhanced Infinite Queries</AlertTitle>
                  <AlertDescription>
                    This demo uses the enhanced infinite query hooks with optimized caching, request cancellation,
                    and utility functions for data manipulation.
                  </AlertDescription>
                </Alert>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Trade History</h3>
                    <div className="flex items-center">
                      <Badge variant="outline">
                        {tradeHistory.data
                          ? `${trades.length} of ${totalTrades} trades`
                          : 'Loading...'}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-2"
                        onClick={() => tradeHistory.refetch()}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="rounded-md border">
                    <div className="bg-muted/50 p-2 border-b">
                      <div className="grid grid-cols-5 gap-4 font-medium text-sm">
                        <div>Date</div>
                        <div>Symbol</div>
                        <div>Side</div>
                        <div>Amount</div>
                        <div>P&L</div>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[300px]">
                      {tradeHistory.isLoading ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : tradeHistory.isError ? (
                        <div className="flex flex-col items-center justify-center p-8">
                          <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                          <p className="text-muted-foreground">
                            Error loading trade history
                          </p>
                        </div>
                      ) : trades.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8">
                          <p className="text-muted-foreground">No trades found</p>
                        </div>
                      ) : (
                        <div>
                          {trades.map((trade, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-5 gap-4 p-3 border-b text-sm hover:bg-muted/50 transition-colors"
                            >
                              <div>{new Date(trade.date).toLocaleDateString()}</div>
                              <div>{trade.symbol}</div>
                              <div>
                                <Badge
                                  variant={trade.side === 'buy' ? 'default' : 'destructive'}
                                  className="capitalize"
                                >
                                  {trade.side}
                                </Badge>
                              </div>
                              <div>{trade.amount.toFixed(4)}</div>
                              <div className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                              </div>
                            </div>
                          ))}
                          
                          {tradeHistory.isFetchingNextPage && (
                            <div className="flex items-center justify-center p-4 border-b">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span className="text-sm text-muted-foreground">
                                Loading more...
                              </span>
                            </div>
                          )}
                          
                          {!tradeHistory.isFetchingNextPage && tradeHistory.hasNextPage && (
                            <div className="p-4 flex justify-center">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                              >
                                {isLoadingMore ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Plus className="h-4 w-4 mr-2" />
                                )}
                                Load More
                              </Button>
                            </div>
                          )}
                          
                          {!tradeHistory.isFetchingNextPage && !tradeHistory.hasNextPage && (
                            <div className="p-4 flex justify-center">
                              <span className="text-sm text-muted-foreground">
                                All trades loaded
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-md p-4 mt-4">
                  <h3 className="text-sm font-medium mb-2">Enhanced Infinite Query Implementation</h3>
                  <pre className="text-xs overflow-x-auto bg-muted p-2 rounded-md">
{`export function useTradeHistory(filters: TradeFilter) {
  const limit = 20;
  const requestId = \`trade-history-\${JSON.stringify(filters)}\`;
  const cacheSettings = entityCacheConfig.analyticalData;
  
  return useInfiniteQuery<PaginatedResponse<any>>({
    queryKey: queryKeys.analytics.trades(filters)._def,
    queryFn: ({ pageParam = 1 }) => {
      const queryParams = {
        ...filters,
        page: pageParam,
        limit,
      };
      
      // Use withCancellation for request cancellation
      const fetchFn = withCancellation(
        (config) => apiService.get('/api/analytics/trades', { 
          ...config, 
          params: queryParams 
        }).then(res => res.data),
        requestId
      );
      
      return fetchFn();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    staleTime: cacheSettings.staleTime,
    gcTime: cacheSettings.gcTime,
  });
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Cache Configuration Demo */}
          <TabsContent value="cache-config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cache Optimization</CardTitle>
                <CardDescription>
                  Domain-specific cache settings for optimal performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertTitle>Cache Configuration</AlertTitle>
                  <AlertDescription>
                    Different types of data have different freshness requirements. We've configured
                    the cache with domain-specific settings to balance performance and freshness.
                  </AlertDescription>
                </Alert>
                
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-3 text-left font-medium">Cache Group</th>
                        <th className="p-3 text-left font-medium">Stale Time</th>
                        <th className="p-3 text-left font-medium">GC Time</th>
                        <th className="p-3 text-left font-medium">Best For</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-3">Core Entities</td>
                        <td className="p-3">5 minutes</td>
                        <td className="p-3">30 minutes</td>
                        <td className="p-3">Strategies, Agents, Farms</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3">Dashboard Data</td>
                        <td className="p-3">2 minutes</td>
                        <td className="p-3">10 minutes</td>
                        <td className="p-3">Overview metrics, risk data</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3">Market Data</td>
                        <td className="p-3">30 seconds</td>
                        <td className="p-3">5 minutes</td>
                        <td className="p-3">Price feeds, market indicators</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3">Active Positions</td>
                        <td className="p-3">1 minute</td>
                        <td className="p-3">10 minutes</td>
                        <td className="p-3">Open trading positions</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3">Reference Data</td>
                        <td className="p-3">30 minutes</td>
                        <td className="p-3">2 hours</td>
                        <td className="p-3">Exchange info, static data</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2">Cache Configuration Implementation</h3>
                  <pre className="text-xs overflow-x-auto bg-muted p-2 rounded-md">
{`export const entityCacheConfig = {
  // Core entities - keep fresh but don't fetch excessively
  core: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  },
  
  // Dashboard data - keep reasonably fresh
  dashboard: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  },
  
  // Market data - keep very fresh
  marketData: {
    staleTime: 1000 * 30,     // 30 seconds
    gcTime: 1000 * 60 * 5,    // 5 minutes
  },
  
  // ...other cache groups
};

// Custom QueryClient configuration
export function createConfiguredQueryClient(options?: {
  environment?: 'development' | 'production';
}): QueryClient {
  const environment = options?.environment || 
    (process.env.NODE_ENV === 'production' ? 'production' : 'development');
    
  // Calculate cache times based on environment
  const staleTime = environment === 'production' 
    ? 1000 * 60 * 5   // 5 minutes in production
    : 1000 * 60 * 2;  // 2 minutes in development
  
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime,
        // ...other options
      }
    }
  });
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* WebSocket Demo */}
          <TabsContent value="websockets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>WebSocket Integration</CardTitle>
                <CardDescription>
                  Real-time data updates with WebSockets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Network className="h-4 w-4" />
                  <AlertTitle>WebSocket Integration</AlertTitle>
                  <AlertDescription>
                    WebSockets enable real-time updates without polling. When data changes on the server,
                    we update the query cache automatically to keep the UI in sync.
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center">
                    <div className={`h-3 w-3 rounded-full mr-2 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWsConnected(!wsConnected)}
                  >
                    {wsConnected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
                
                <div className="rounded-md border">
                  <div className="bg-muted/50 p-3 border-b">
                    <h3 className="font-medium">WebSocket Events</h3>
                  </div>
                  <ScrollArea className="h-[250px]">
                    {wsMessages.length === 0 ? (
                      <div className="flex items-center justify-center p-8 text-muted-foreground">
                        {wsConnected ? 'Waiting for events...' : 'Connect to receive events'}
                      </div>
                    ) : (
                      <div className="p-0">
                        {wsMessages.map((message, index) => (
                          <div key={index} className="p-3 border-b text-sm">
                            <div className="flex justify-between">
                              <span>{message}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date().toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
                
                <div className="bg-muted/50 rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2">WebSocket Integration Implementation</h3>
                  <pre className="text-xs overflow-x-auto bg-muted p-2 rounded-md">
{`// Connect WebSocket to TanStack Query client
export function connectWebSocketToQueryClient(
  queryClient: QueryClient,
  socket: WebSocket
): () => void {
  const handleMessage = (event: MessageEvent) => {
    try {
      const wsEvent = JSON.parse(event.data);
      
      // Process different event types
      switch (wsEvent.type) {
        case 'entity_update':
          // Handle entity updates (create, update, delete)
          handleEntityUpdate(queryClient, wsEvent.data);
          break;
          
        case 'market_update':
          // Handle market price updates
          handleMarketUpdate(queryClient, wsEvent.data);
          break;
          
        // ...other event types
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };
  
  // Add event listener
  socket.addEventListener('message', handleMessage);
  
  // Return cleanup function
  return () => socket.removeEventListener('message', handleMessage);
}

// Example handler for market updates
function handleMarketUpdate(queryClient, update) {
  // Update market data in the cache
  queryClient.setQueriesData(
    { queryKey: ['market', update.symbol] },
    (oldData) => oldData ? { ...oldData, ...update } : update
  );
  
  // Also update any positions with this symbol
  queryClient.setQueriesData(
    { queryKey: queryKeys.positions.list._def },
    (oldData) => {
      if (!oldData || !oldData.positions) return oldData;
      
      // Update positions with this symbol
      const updatedPositions = oldData.positions.map(position => {
        if (position.symbol === update.symbol) {
          // Calculate new P&L with updated price
          return {
            ...position,
            current_price: update.price,
            // ...other updated fields
          };
        }
        return position;
      });
      
      return { ...oldData, positions: updatedPositions };
    }
  );
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
