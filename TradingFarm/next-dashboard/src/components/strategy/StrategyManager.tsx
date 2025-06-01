'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, PlayCircle, PauseCircle, Trash2, Edit, BarChart3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { StrategyFactory } from '@/lib/strategy/strategy-factory';
import { StrategyInstance, StrategyMeta, Timeframe } from '@/lib/strategy/types';
import { createBrowserClient } from '@/utils/supabase/client';
import StrategyFormDialog from './StrategyFormDialog';

export default function StrategyManager() {
  const [availableStrategies, setAvailableStrategies] = useState<StrategyMeta[]>([]);
  const [userStrategies, setUserStrategies] = useState<StrategyInstance[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createBrowserClient();
  const strategyFactory = new StrategyFactory();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserIdAndStrategies = async () => {
      try {
        // Get current user id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        setUserId(user.id);

        // Fetch all available strategies
        const strategies = await strategyFactory.getAvailableStrategies();
        setAvailableStrategies(strategies);

        // Fetch user's strategy instances
        const userInstances = await strategyFactory.getUserStrategies(user.id);
        setUserStrategies(userInstances);
      } catch (error) {
        console.error('Error fetching strategies:', error);
        toast({
          title: 'Error',
          description: 'Failed to load strategies',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserIdAndStrategies();
  }, []);

  const handleCreateStrategy = async (formData: {
    strategyId: string;
    name: string;
    parameters: Record<string, any>;
    symbols: string[];
    timeframes: string[];
  }) => {
    if (!userId) return;

    try {
      setLoading(true);
      
      const result = await strategyFactory.createStrategyInstance(
        userId,
        formData.strategyId,
        formData.name,
        formData.parameters,
        formData.symbols,
        formData.timeframes as Timeframe[]
      );

      if (result) {
        setUserStrategies([...userStrategies, result]);
        toast({
          title: 'Strategy Created',
          description: `Successfully created strategy: ${result.name}`,
        });
        setShowCreateForm(false);
      } else {
        throw new Error('Failed to create strategy');
      }
    } catch (error) {
      console.error('Error creating strategy:', error);
      toast({
        title: 'Error',
        description: 'Failed to create strategy',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStrategy = async (instanceId: string, updates: Partial<StrategyInstance>) => {
    try {
      setLoading(true);
      
      const success = await strategyFactory.updateStrategyInstance(instanceId, updates);
      
      if (success) {
        // Update the local state
        setUserStrategies(userStrategies.map(strategy => 
          strategy.id === instanceId ? { ...strategy, ...updates } : strategy
        ));
        
        toast({
          title: 'Strategy Updated',
          description: 'Successfully updated strategy settings',
        });
        
        setShowEditForm(false);
      } else {
        throw new Error('Failed to update strategy');
      }
    } catch (error) {
      console.error('Error updating strategy:', error);
      toast({
        title: 'Error',
        description: 'Failed to update strategy',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStrategy = async (instanceId: string) => {
    if (!confirm('Are you sure you want to delete this strategy?')) return;
    
    try {
      setLoading(true);
      
      const success = await strategyFactory.deleteStrategyInstance(instanceId);
      
      if (success) {
        setUserStrategies(userStrategies.filter(strategy => strategy.id !== instanceId));
        toast({
          title: 'Strategy Deleted',
          description: 'Successfully deleted strategy',
        });
      } else {
        throw new Error('Failed to delete strategy');
      }
    } catch (error) {
      console.error('Error deleting strategy:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete strategy',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (instanceId: string, isCurrentlyActive: boolean) => {
    try {
      await handleUpdateStrategy(instanceId, { isActive: !isCurrentlyActive });
    } catch (error) {
      console.error('Error toggling active state:', error);
    }
  };

  const handleSelectForEdit = (strategy: StrategyInstance) => {
    setSelectedStrategy(strategy);
    setShowEditForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Strategy Manager</h2>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Strategy
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Strategies</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Strategies</TabsTrigger>
          <TabsTrigger value="all">All Strategies</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <StrategyList 
            strategies={userStrategies.filter(s => s.isActive)}
            onToggleActive={handleToggleActive}
            onEdit={handleSelectForEdit}
            onDelete={handleDeleteStrategy}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="inactive">
          <StrategyList 
            strategies={userStrategies.filter(s => !s.isActive)}
            onToggleActive={handleToggleActive}
            onEdit={handleSelectForEdit}
            onDelete={handleDeleteStrategy}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="all">
          <StrategyList 
            strategies={userStrategies}
            onToggleActive={handleToggleActive}
            onEdit={handleSelectForEdit}
            onDelete={handleDeleteStrategy}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {showCreateForm && (
        <StrategyFormDialog
          availableStrategies={availableStrategies}
          onSubmit={handleCreateStrategy}
          onCancel={() => setShowCreateForm(false)}
          mode="create"
        />
      )}

      {showEditForm && selectedStrategy && (
        <StrategyFormDialog
          availableStrategies={availableStrategies}
          onSubmit={(formData) => handleUpdateStrategy(selectedStrategy.id, {
            name: formData.name,
            parameters: formData.parameters,
            symbols: formData.symbols,
            timeframes: formData.timeframes as Timeframe[]
          })}
          onCancel={() => setShowEditForm(false)}
          mode="edit"
          initialData={selectedStrategy}
        />
      )}
    </div>
  );
}

type StrategyListProps = {
  strategies: StrategyInstance[];
  onToggleActive: (id: string, isActive: boolean) => void;
  onEdit: (strategy: StrategyInstance) => void;
  onDelete: (id: string) => void;
  loading: boolean;
};

function StrategyList({ strategies, onToggleActive, onEdit, onDelete, loading }: StrategyListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-8 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="flex items-center justify-center p-6">
          <p className="text-muted-foreground">No strategies found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {strategies.map((strategy) => (
        <Card key={strategy.id} className={strategy.isActive ? 'border-primary/50' : ''}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{strategy.name}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {strategy.strategyId}
                </CardDescription>
              </div>
              <Badge variant={strategy.isActive ? 'default' : 'outline'}>
                {strategy.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="font-medium">Symbols:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {strategy.symbols.slice(0, 3).map((symbol) => (
                    <Badge key={symbol} variant="secondary" className="text-xs">
                      {symbol}
                    </Badge>
                  ))}
                  {strategy.symbols.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{strategy.symbols.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="font-medium">Timeframes:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {strategy.timeframes.slice(0, 3).map((tf) => (
                    <Badge key={tf} variant="secondary" className="text-xs">
                      {tf}
                    </Badge>
                  ))}
                  {strategy.timeframes.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{strategy.timeframes.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {strategy.lastExecutedAt && (
              <div className="mt-2 text-xs text-muted-foreground">
                Last execution: {new Date(strategy.lastExecutedAt).toLocaleString()}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2 flex justify-between">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onToggleActive(strategy.id, strategy.isActive)}
              >
                {strategy.isActive ? (
                  <PauseCircle className="h-4 w-4" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit(strategy)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDelete(strategy.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              asChild
            >
              <a href={`/dashboard/strategies/${strategy.id}/backtest`}>
                <BarChart3 className="h-4 w-4 mr-2" /> Backtest
              </a>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
