'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Import strategy form component
import { StrategyForm } from '@/components/strategy/strategy-form';
// Import order form component
import { OrderForm } from '@/components/positions/order-form';
// Import agent form component
import { AgentForm } from '@/components/agents/agent-form';

// Import query client to demonstrate manual cache manipulation
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/utils/react-query/query-keys';

export default function MutationsDemoPage() {
  const [activeDemoTab, setActiveDemoTab] = useState('strategy');
  const queryClient = useQueryClient();
  
  // Mock demo farm ID
  const demoFarmId = 'farm-123';
  
  // This function triggers a refetch of all query data
  const invalidateAllCaches = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard._def });
    queryClient.invalidateQueries({ queryKey: queryKeys.positions._def });
    queryClient.invalidateQueries({ queryKey: queryKeys.strategies._def });
    queryClient.invalidateQueries({ queryKey: queryKeys.agents._def });
  };

  // Example mutation pattern for code display
  const mutationPattern = `
export function useCreateEntity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await apiService.post('/api/entities', data);
      return response.data;
    },
    onMutate: async (newEntity) => {
      // 1. Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.entities.list._def,
      });
      
      // 2. Snapshot the previous value
      const previousEntities = queryClient.getQueryData(
        queryKeys.entities.list._def
      );
      
      // 3. Optimistically update to the new value
      queryClient.setQueryData(
        queryKeys.entities.list._def,
        old => [...(old || []), newEntity]
      );
      
      // 4. Return a context object with the snapshotted value
      return { previousEntities };
    },
    onSuccess: (data) => {
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.list._def,
      });
      
      // Show success toast
      toast({
        title: 'Entity created',
        description: 'Your entity was created successfully',
      });
    },
    onError: (error, newEntity, context) => {
      // If the mutation fails, use the context we saved
      // to roll back the optimistic update
      if (context?.previousEntities) {
        queryClient.setQueryData(
          queryKeys.entities.list._def,
          context.previousEntities
        );
      }
      
      // Show error toast
      toast({
        title: 'Error',
        description: error.message || 'Failed to create entity',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success for consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.entities.list._def,
      });
    },
  });
}`;

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TanStack Query Mutations Demo</h1>
          <p className="text-muted-foreground">
            Implementing data creation, updates, and optimistic updates with useMutation
          </p>
        </div>
        <Button variant="outline" onClick={invalidateAllCaches}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Invalidate All Caches
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Demo Environment</AlertTitle>
        <AlertDescription>
          This is a demonstration environment. Form submissions will simulate API calls but won't persist data.
        </AlertDescription>
      </Alert>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-primary">Mutations Implementation Overview</CardTitle>
          <CardDescription>
            Phase 3 of TanStack Query integration: Adding data mutations with useMutation
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
                    <strong>Basic Mutations</strong> - Creating, updating, and deleting data with useMutation
                  </li>
                  <li>
                    <strong>Optimistic Updates</strong> - Updating the UI immediately before the server confirms changes
                  </li>
                  <li>
                    <strong>Cache Invalidation</strong> - Intelligent refreshing of query data after mutations
                  </li>
                  <li>
                    <strong>Error Handling</strong> - Reliable error handling and recovery for failed mutations
                  </li>
                  <li>
                    <strong>Loading States</strong> - Managing loading states during mutations
                  </li>
                  <li>
                    <strong>Mutation Hooks Integration</strong> - Integrating mutation hooks with form components
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="code-pattern">
              <AccordionTrigger>
                <span className="font-medium">Mutation Pattern</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Complete Mutation Pattern with Optimistic Updates</h3>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                      {mutationPattern}
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
                    <Badge className="mt-0.5">Phase 4</Badge>
                    <div>
                      <p className="font-medium">Advanced Features & Optimization</p>
                      <p className="text-sm text-muted-foreground">
                        Implement prefetching, advanced pagination, and request cancellation
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
                      <p className="font-medium">WebSocket Integration</p>
                      <p className="text-sm text-muted-foreground">
                        Connect WebSocket events to query invalidation and mutations
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
          <TabsTrigger value="strategy" className="flex-1">
            Strategy Mutations
          </TabsTrigger>
          <TabsTrigger value="order" className="flex-1">
            Order Mutations
          </TabsTrigger>
          <TabsTrigger value="agent" className="flex-1">
            Agent Mutations
          </TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="strategy" className="mt-0">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Strategy Creation & Updates</CardTitle>
                  <CardDescription>
                    Demonstrates creating and updating strategies with mutations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 border rounded-md p-4 mb-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Implementation Highlights:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Form is connected to useCreateStrategy and useUpdateStrategy hooks</li>
                          <li>Mutations automatically update the query cache on success</li>
                          <li>Error handling with form validation and API errors</li>
                          <li>Loading states during submission are properly managed</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <StrategyForm farmId={demoFarmId} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="order" className="mt-0">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Order Creation</CardTitle>
                  <CardDescription>
                    Demonstrates creating orders with mutations and handling side effects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 border rounded-md p-4 mb-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Implementation Highlights:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Form uses the useCreateOrder mutation hook</li>
                          <li>Order creation invalidates both orders and positions caches</li>
                          <li>Dynamic form fields based on order type</li>
                          <li>Demonstrates cross-entity cache updates</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <OrderForm 
                    farmId={demoFarmId} 
                    initialSymbol="BTCUSDT"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="agent" className="mt-0">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Agent Management</CardTitle>
                  <CardDescription>
                    Demonstrates creating and updating agents with optimistic updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 border rounded-md p-4 mb-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Implementation Highlights:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Form connected to useCreateAgent and useUpdateAgent hooks</li>
                          <li>Agent status changes use optimistic updates for instant UI feedback</li>
                          <li>Proper error recovery if mutation fails</li>
                          <li>Related entity queries (farms, exchanges) are properly updated</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <AgentForm farmId={demoFarmId} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Optimistic Updates Example</CardTitle>
          <CardDescription>
            How to provide instant UI feedback while waiting for server confirmation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">For demonstration purposes only</p>
              <p className="text-sm text-muted-foreground">
                This example shows the pattern for implementing optimistic updates, which is 
                already built into the actual mutation hooks. See the useClosePosition and 
                useReconcilePosition hooks for real implementation examples.
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-md overflow-x-auto">
            <pre className="text-xs">
{`// Inside a component:
const positionId = 'position-123';
const closePosition = useClosePosition();

function handleClosePosition() {
  closePosition.mutate(positionId, {
    onSuccess: () => {
      // Navigate or show confirmation
    }
  });
}

// In the useClosePosition hook:
return useMutation({
  mutationFn: async (positionId) => {
    const response = await apiService.post(\`/api/positions/\${positionId}/close\`);
    return response.data;
  },
  onMutate: async (positionId) => {
    // 1. Cancel any outgoing refetches to avoid overwriting optimistic update
    await queryClient.cancelQueries({
      queryKey: queryKeys.positions.detail(positionId)._def,
    });
    
    // 2. Save current position state
    const previousPosition = queryClient.getQueryData(
      queryKeys.positions.detail(positionId)._def
    );
    
    // 3. Optimistically update to show as "closing"
    queryClient.setQueryData(
      queryKeys.positions.detail(positionId)._def,
      {
        ...previousPosition,
        status: 'closing',
      }
    );
    
    // 4. Return context to use if there's an error
    return { previousPosition };
  },
  // ... rest of implementation
});
`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
