"use client";

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Briefcase, Settings, Play, PauseCircle, BarChart4, AlertCircle, Coins, TrendingUp, Repeat } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStrategies } from '@/hooks/use-strategies';
import { useYieldStrategies } from '@/hooks/use-yield-strategies';
import { YieldStrategiesList } from '@/components/yield/yield-strategies-list';
import CreateStrategyModal from '@/components/strategies/CreateStrategyModal';

export default function FarmStrategiesPage() {
  const params = useParams();
  const farmId = params.id as string;
  
  // Traditional trading strategies
  const { 
    strategies, 
    activeStrategies, 
    inactiveStrategies, 
    counts, 
    loading, 
    error, 
    refresh 
  } = useStrategies({ farmId });
  
  // Cross-chain yield optimization strategies
  const {
    strategies: yieldStrategies,
    loading: yieldLoading,
    error: yieldError,
    refresh: refreshYield
  } = useYieldStrategies(parseInt(farmId));
  
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('trading');
  
  if (loading || yieldLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error || yieldError) {
    return (
      <div className="rounded-md bg-destructive/15 p-4">
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
          <div className="text-sm font-medium text-destructive">Error loading strategies</div>
        </div>
        <div className="mt-2 text-sm text-destructive/80">{error}</div>
        <Button variant="outline" size="sm" onClick={() => refresh()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Strategies</CardTitle>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Strategy
            </Button>
          </div>
          <CardDescription>
            Manage and optimize trading and yield strategies for this farm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{counts.total + yieldStrategies.length}</CardTitle>
                <CardDescription>Total Strategies</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{counts.active + yieldStrategies.filter((s: { isActive: boolean }) => s.isActive).length}</CardTitle>
                <CardDescription>Active Strategies</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{counts.inactive + yieldStrategies.filter((s: { isActive: boolean }) => !s.isActive).length}</CardTitle>
                <CardDescription>Inactive Strategies</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="trading">
                <Briefcase className="mr-2 h-4 w-4" />
                Trading Strategies
              </TabsTrigger>
              <TabsTrigger value="yield">
                <Coins className="mr-2 h-4 w-4" />
                Yield Optimization
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <TabsContent value="trading" className="mt-0">
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Strategies ({counts.total})</TabsTrigger>
                <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
                <TabsTrigger value="inactive">Inactive ({counts.inactive})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <StrategyList strategies={strategies} farmId={farmId} onRefresh={refresh} />
              </TabsContent>
              <TabsContent value="active" className="mt-4">
                <StrategyList strategies={activeStrategies} farmId={farmId} onRefresh={refresh} />
              </TabsContent>
              <TabsContent value="inactive" className="mt-4">
                <StrategyList strategies={inactiveStrategies} farmId={farmId} onRefresh={refresh} />
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="yield" className="mt-0">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Cross-Chain Yield Optimization</h3>
              </div>
              <p className="text-muted-foreground">
                Maximize returns by optimizing yield across multiple chains and protocols. Our advanced strategies automatically allocate funds to the highest-yielding opportunities while managing risk.
              </p>
            </div>
            
            <YieldStrategiesList 
              strategies={yieldStrategies} 
              farmId={farmId} 
            />
          </TabsContent>
        </CardContent>
      </Card>
      
      {/* Create Strategy Modal */}
      <CreateStrategyModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        farmId={farmId} 
        onSuccess={() => {
          refresh();
          refreshYield();
        }}
      />
    </div>
  );
}

interface StrategyListProps {
  strategies: any[];
  farmId: string;
  onRefresh: () => void;
}

function StrategyList({ strategies, farmId, onRefresh }: StrategyListProps) {
  if (!strategies.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No strategies found.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {strategies.map((strategy) => (
        <Card key={strategy.id} className="overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6">
            <div className="space-y-1">
              <div className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-primary" />
                <h3 className="font-medium">{strategy.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{strategy.description || 'No description'}</p>
              <div className="flex items-center text-sm text-muted-foreground">
                <Badge variant={strategy.status === 'active' ? "default" : "outline"} className="mr-2">
                  {strategy.status === 'active' ? "Active" : "Inactive"}
                </Badge>
                <span>Type: {strategy.type || "Standard"}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Toggle strategy status
                  console.log(`Toggling strategy ${strategy.id} status`);
                  onRefresh();
                }}
              >
                {strategy.status === 'active' ? (
                  <><PauseCircle className="mr-2 h-4 w-4" /> Pause</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Activate</>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  window.location.href = `/dashboard/farms/${farmId}/strategies/${strategy.id}/settings`;
                }}
              >
                <Settings className="mr-2 h-4 w-4" /> Configure
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  window.location.href = `/dashboard/farms/${farmId}/strategies/${strategy.id}/performance`;
                }}
              >
                <BarChart4 className="mr-2 h-4 w-4" /> Performance
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
