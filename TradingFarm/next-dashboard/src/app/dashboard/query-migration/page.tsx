'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  ChartPieIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ClockIcon,
  ServerIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { webSocketValidation } from '@/utils/react-query/websocket-validation';
import { queryPerformanceMonitor } from '@/utils/react-query/performance-monitor';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Mock data that would come from the PowerShell script
interface ComponentStatus {
  component: string;
  status: '🔲 Pending' | '🔄 In Progress' | '✅ Migrated' | '➖ No fetching';
  legacyPatterns: number;
  queryPatterns: number;
  path: string;
}

export default function QueryMigrationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();
  const [mockComponentData, setMockComponentData] = useState<ComponentStatus[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [wsValidation, setWsValidation] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate fetching component status data
  useEffect(() => {
    // This would be replaced with actual data from your PowerShell script
    const mockData: ComponentStatus[] = [
      { 
        component: 'DashboardOverview', 
        status: '🔄 In Progress', 
        legacyPatterns: 3, 
        queryPatterns: 2,
        path: 'src/components/dashboard/dashboard-overview.tsx'
      },
      { 
        component: 'PositionManager', 
        status: '✅ Migrated', 
        legacyPatterns: 0, 
        queryPatterns: 5,
        path: 'src/components/positions/position-manager.tsx'
      },
      { 
        component: 'StrategyList', 
        status: '✅ Migrated', 
        legacyPatterns: 0, 
        queryPatterns: 3,
        path: 'src/components/strategy/strategy-list.tsx'
      },
      { 
        component: 'AgentDetail', 
        status: '🔲 Pending', 
        legacyPatterns: 4, 
        queryPatterns: 0,
        path: 'src/components/agents/agent-detail.tsx'
      },
      { 
        component: 'TradeHistory', 
        status: '🔄 In Progress', 
        legacyPatterns: 2, 
        queryPatterns: 3,
        path: 'src/components/trades/trade-history.tsx'
      },
      { 
        component: 'PerformanceWidget', 
        status: '✅ Migrated', 
        legacyPatterns: 0, 
        queryPatterns: 1,
        path: 'src/components/dashboard/widgets/performance-widget.tsx'
      },
      { 
        component: 'MarketData', 
        status: '🔲 Pending', 
        legacyPatterns: 5, 
        queryPatterns: 0,
        path: 'src/components/market/market-data.tsx'
      },
      { 
        component: 'GoalManager', 
        status: '➖ No fetching', 
        legacyPatterns: 0, 
        queryPatterns: 0,
        path: 'src/components/goals/goal-manager.tsx'
      },
    ];
    
    setMockComponentData(mockData);
  }, []);

  // Fetch performance data from the performance monitor
  const refreshPerformanceData = () => {
    if (!queryClient) return;
    
    setIsRefreshing(true);
    
    setTimeout(() => {
      // In a real implementation, this would be actual data
      const performanceReport = queryPerformanceMonitor.generateReport();
      setPerformanceData(performanceReport);
      
      // WebSocket validation data
      const wsReport = webSocketValidation.getReport();
      setWsValidation(wsReport);
      
      setIsRefreshing(false);
    }, 500);
  };

  useEffect(() => {
    refreshPerformanceData();
  }, [queryClient]);

  // Calculate migration progress statistics
  const totalComponents = mockComponentData.length;
  const migratedCount = mockComponentData.filter(c => c.status === '✅ Migrated').length;
  const inProgressCount = mockComponentData.filter(c => c.status === '🔄 In Progress').length;
  const pendingCount = mockComponentData.filter(c => c.status === '🔲 Pending').length;
  const noFetchingCount = mockComponentData.filter(c => c.status === '➖ No fetching').length;
  
  const progressPercentage = Math.round(((migratedCount + noFetchingCount) / totalComponents) * 100);

  // Group components by status
  const pendingComponents = mockComponentData.filter(c => c.status === '🔲 Pending')
    .sort((a, b) => a.legacyPatterns - b.legacyPatterns);
  
  const inProgressComponents = mockComponentData.filter(c => c.status === '🔄 In Progress');
  const migratedComponents = mockComponentData.filter(c => c.status === '✅ Migrated');

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">TanStack Query Migration Dashboard</h1>
        <Button 
          onClick={refreshPerformanceData}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Migration Overview</TabsTrigger>
          <TabsTrigger value="performance">Query Performance</TabsTrigger>
          <TabsTrigger value="websocket">WebSocket Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progressPercentage}%</div>
                <Progress value={progressPercentage} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Migrated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <div className="text-2xl font-bold">{migratedCount}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round((migratedCount / totalComponents) * 100)}% of components
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  <div className="text-2xl font-bold">{inProgressCount}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round((inProgressCount / totalComponents) * 100)}% of components
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                  <div className="text-2xl font-bold">{pendingCount}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round((pendingCount / totalComponents) * 100)}% of components
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Migration Plan</CardTitle>
              <CardDescription>
                Components to migrate, sorted by complexity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {pendingComponents.length > 0 ? (
                  <>
                    <div>
                      <h3 className="font-medium mb-2">Next Components to Migrate</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Legacy Patterns</TableHead>
                            <TableHead>Complexity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingComponents.map((component) => (
                            <TableRow key={component.component}>
                              <TableCell className="font-medium">{component.component}</TableCell>
                              <TableCell>{component.status}</TableCell>
                              <TableCell>{component.legacyPatterns}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  component.legacyPatterns <= 2 ? "outline" : 
                                  component.legacyPatterns <= 5 ? "secondary" : 
                                  "destructive"
                                }>
                                  {component.legacyPatterns <= 2 ? "Low" : 
                                   component.legacyPatterns <= 5 ? "Medium" : 
                                   "High"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <Alert>
                    <CheckCircleIcon className="h-4 w-4" />
                    <AlertTitle>All done!</AlertTitle>
                    <AlertDescription>
                      All components have been migrated or are in progress. Great work!
                    </AlertDescription>
                  </Alert>
                )}

                {inProgressComponents.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">In Progress</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Component</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Legacy Patterns</TableHead>
                          <TableHead>Query Patterns</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inProgressComponents.map((component) => (
                          <TableRow key={component.component}>
                            <TableCell className="font-medium">{component.component}</TableCell>
                            <TableCell>{component.status}</TableCell>
                            <TableCell>{component.legacyPatterns}</TableCell>
                            <TableCell>{component.queryPatterns}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Query Performance Metrics</CardTitle>
              <CardDescription>
                Analyze query performance to optimize refetching strategies and cache times
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performanceData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-md p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Average Query Time</div>
                      <div className="text-2xl font-bold">{performanceData.averageQueryTime ? performanceData.averageQueryTime.toFixed(2) : 0}ms</div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Cache Hit Rate</div>
                      <div className="text-2xl font-bold">{performanceData.cacheHitRate ? (performanceData.cacheHitRate * 100).toFixed(2) : 0}%</div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Total Queries</div>
                      <div className="text-2xl font-bold">{performanceData.totalQueries || 0}</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Slowest Queries</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Query Key</TableHead>
                          <TableHead>Avg. Time (ms)</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Cache Hit Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(performanceData.slowestQueries || []).map((query: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs max-w-[300px] truncate">
                              {query.queryKey}
                            </TableCell>
                            <TableCell>{query.averageTime.toFixed(2)}</TableCell>
                            <TableCell>{query.count}</TableCell>
                            <TableCell>
                              {query.cacheHits + query.cacheMisses > 0 
                                ? ((query.cacheHits / (query.cacheHits + query.cacheMisses)) * 100).toFixed(2) 
                                : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Most Frequent Queries</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Query Key</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Avg. Time (ms)</TableHead>
                          <TableHead>Last Executed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(performanceData.mostFrequentQueries || []).map((query: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs max-w-[300px] truncate">
                              {query.queryKey}
                            </TableCell>
                            <TableCell>{query.count}</TableCell>
                            <TableCell>{query.averageTime.toFixed(2)}</TableCell>
                            <TableCell>
                              {query.lastExecuted 
                                ? new Date(query.lastExecuted).toLocaleTimeString() 
                                : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <ServerIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <div className="text-muted-foreground">No performance data available yet</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Cache Optimization Recommendations</CardTitle>
              <CardDescription>
                Based on performance metrics, these are suggested cache optimizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-start gap-2">
                  <BeakerIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Increase stale time for infrequently changing data</div>
                    <div className="text-sm text-muted-foreground">
                      For reference data with low update frequency, increase stale time to reduce unnecessary fetches.
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <BeakerIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Optimize pagination with infinite queries</div>
                    <div className="text-sm text-muted-foreground">
                      Replace standard pagination with infinite queries for trade history and logs to improve UX.
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <BeakerIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Use WebSocket updates for real-time data</div>
                    <div className="text-sm text-muted-foreground">
                      Reduce polling frequency for market data and active positions by leveraging WebSocket events.
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <BeakerIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Implement selective refetching</div>
                    <div className="text-sm text-muted-foreground">
                      For dashboard overview, set a 60-second refetch interval to keep data fresh without polling too frequently.
                    </div>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="websocket" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Integration Status</CardTitle>
              <CardDescription>
                Monitor how WebSocket events are updating the query cache in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wsValidation ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-md p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">WebSocket Status</div>
                      <div className="flex items-center">
                        <div className={`h-3 w-3 rounded-full mr-2 ${wsValidation.isEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div className="text-lg font-medium">
                          {wsValidation.isEnabled ? 'Connected' : 'Disconnected'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">WS Updates Received</div>
                      <div className="text-2xl font-bold">{wsValidation.updatesReceived?.websocket || 0}</div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Pending Expectations</div>
                      <div className="text-2xl font-bold">{wsValidation.pendingExpectations || 0}</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Recent Cache Updates</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Query Key</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(wsValidation.recentCacheUpdates || []).map((update: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge variant={
                                update.source === 'websocket' ? "success" : 
                                update.source === 'mutation' ? "secondary" : 
                                "outline"
                              }>
                                {update.source}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(update.timestamp).toLocaleTimeString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-[400px] truncate">
                              {Array.isArray(update.queryKey) 
                                ? JSON.stringify(update.queryKey) 
                                : 'Unknown'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <ServerIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <div className="text-muted-foreground">No WebSocket data available yet</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Integration Tests</CardTitle>
              <CardDescription>
                Verify that WebSocket events are properly updating the query cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center justify-center">
                    <div className="text-sm font-medium mb-2">Test Market Updates</div>
                    <div className="text-xs text-muted-foreground text-center">
                      Simulate market price updates and verify real-time cache updates
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center justify-center">
                    <div className="text-sm font-medium mb-2">Test Entity Updates</div>
                    <div className="text-xs text-muted-foreground text-center">
                      Simulate entity updates (e.g., strategy status changes) and verify cache invalidation
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center justify-center">
                    <div className="text-sm font-medium mb-2">Test Trade Updates</div>
                    <div className="text-xs text-muted-foreground text-center">
                      Simulate trade execution events and verify position and dashboard data updates
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center justify-center">
                    <div className="text-sm font-medium mb-2">Test Connection Recovery</div>
                    <div className="text-xs text-muted-foreground text-center">
                      Simulate WebSocket disconnection and verify automatic reconnection
                    </div>
                  </Button>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">WebSocket Integration Validation Steps</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Verify cache updates on WebSocket events</div>
                        <div className="text-sm text-muted-foreground">
                          When a WebSocket event is received, the query cache should be automatically updated
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Verify optimistic updates with WebSocket confirmation</div>
                        <div className="text-sm text-muted-foreground">
                          Mutations should use optimistic updates, which are then confirmed by WebSocket events
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Verify connection recovery</div>
                        <div className="text-sm text-muted-foreground">
                          If the WebSocket connection is lost, it should automatically reconnect and resume updates
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Verify selective cache invalidation</div>
                        <div className="text-sm text-muted-foreground">
                          WebSocket events should only invalidate the relevant queries, not the entire cache
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
