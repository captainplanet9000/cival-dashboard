import { Suspense } from 'react';
import DryRunTradingPanel from '@/components/dry-run-trading-panel';
import SimulationSettingsPanel from '@/components/simulation/simulation-settings-panel';
import SimulationPerformancePanel from '@/components/simulation/simulation-performance-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const metadata = {
  title: 'Dry Run Trading - Trading Farm',
  description: 'Test your trading strategies in a risk-free environment',
};

function TradeHistoryLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

function PanelLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  );
}

export default function DryRunPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgentName, setSelectedAgentName] = useState<string>('');
  const [selectedExchange, setSelectedExchange] = useState<string>('bybit');
  
  // This will receive the selected agent information from the DryRunTradingPanel
  const handleAgentSelect = (agentId: string, agentName: string, exchange: string) => {
    setSelectedAgentId(agentId);
    setSelectedAgentName(agentName);
    setSelectedExchange(exchange || 'bybit');
  };
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dry Run Trading</h1>
        <p className="text-muted-foreground mt-2">
          Safely test your trading strategies using real market data without risking actual funds.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Suspense fallback={<PanelLoading />}>
            <DryRunTradingPanel onAgentSelect={handleAgentSelect} />
          </Suspense>
        </div>

        <div>
          <Tabs defaultValue="history">
            <TabsList className="mb-4">
              <TabsTrigger value="history">Trade History</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history" className="space-y-4">
              <Suspense fallback={<TradeHistoryLoading />}>
                <Card>
                  <CardHeader>
                    <CardTitle>Simulated Trade History</CardTitle>
                    <CardDescription>
                      Record of all trades executed in dry-run mode
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Place a trade to see your trade history appear here.
                    </p>
                  </CardContent>
                </Card>
              </Suspense>
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4">
              {selectedAgentId ? (
                <SimulationPerformancePanel agentId={selectedAgentId} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>
                      Analyze your trading strategy performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Select an agent from the panel to view performance metrics.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              {selectedAgentId ? (
                <SimulationSettingsPanel 
                  agentId={selectedAgentId} 
                  agentName={selectedAgentName}
                  exchange={selectedExchange}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Simulation Settings</CardTitle>
                    <CardDescription>
                      Configure your dry-run trading environment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Select an agent from the panel to configure simulation settings.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
