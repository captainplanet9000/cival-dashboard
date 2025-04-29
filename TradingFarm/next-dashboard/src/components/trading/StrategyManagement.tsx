import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw, AlertTriangle, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { StrategyCard } from './StrategyCard';
import { StrategyFormDialog } from './StrategyFormDialog';
import { createBrowserClient } from '@/utils/supabase/client';
import { StrategyConfig } from '@/utils/trading/decision-engine';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';

interface PerformanceData {
  [key: string]: {
    winRate: number;
    profitFactor: number;
    totalReturns: number;
    maxDrawdown: number;
  };
}

export function StrategyManagement() {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<StrategyConfig | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [performance, setPerformance] = useState<PerformanceData>({});
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  // Load strategies
  const fetchStrategies = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*');
        
      if (error) {
        throw error;
      }
      
      // Map database data to StrategyConfig format
      const formattedStrategies: StrategyConfig[] = data.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        symbols: item.symbols || [],
        exchange: item.exchange,
        parameters: item.parameters || {},
        timeframes: item.timeframes || ['1h'],
        indicators: item.indicators || [],
        signalThresholds: item.signal_thresholds || { buy: 70, sell: 30 },
        position: item.position || {
          sizing: 'percentage',
          sizingValue: 5,
          maxPositions: 10
        },
        enabled: item.is_active
      }));
      
      setStrategies(formattedStrategies);
      
      // Fetch performance data
      await fetchPerformanceData(formattedStrategies.map(s => s.id));
    } catch (err) {
      console.error('Error fetching strategies:', err);
      setError('Failed to load strategies. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch performance data for strategies
  const fetchPerformanceData = async (strategyIds: string[]) => {
    try {
      if (strategyIds.length === 0) return;
      
      const { data, error } = await supabase
        .from('trading_signals')
        .select('*')
        .in('strategy_id', strategyIds)
        .eq('executed', true)
        .order('timestamp', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // Calculate performance metrics for each strategy
      const performanceData: PerformanceData = {};
      
      // Group signals by strategy
      const groupedSignals = data.reduce((acc, signal) => {
        const strategyId = signal.strategy_id;
        if (!acc[strategyId]) {
          acc[strategyId] = [];
        }
        acc[strategyId].push(signal);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Calculate metrics for each strategy
      for (const [strategyId, signals] of Object.entries(groupedSignals)) {
        // Basic metrics
        const wins = signals.filter(s => 
          (s.type === 'buy' && s.execution_details?.profitLoss > 0) || 
          (s.type === 'sell' && s.execution_details?.profitLoss < 0)
        );
        
        const totalTrades = signals.length;
        const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
        
        // Calculate profit factor (sum of profits / sum of losses)
        const profits = signals
          .filter(s => s.execution_details?.profitLoss > 0)
          .reduce((sum, s) => sum + (s.execution_details?.profitLoss || 0), 0);
          
        const losses = signals
          .filter(s => s.execution_details?.profitLoss < 0)
          .reduce((sum, s) => sum + Math.abs(s.execution_details?.profitLoss || 0), 0);
          
        const profitFactor = losses > 0 ? profits / losses : profits > 0 ? Infinity : 0;
        
        // Calculate total returns as percentage
        const initialValue = 10000; // Assuming a starting capital of $10,000
        const finalValue = signals.reduce((capital, s) => 
          capital + (s.execution_details?.profitLoss || 0), initialValue);
        const totalReturns = ((finalValue - initialValue) / initialValue) * 100;
        
        // Calculate max drawdown
        let peak = initialValue;
        let maxDrawdown = 0;
        let runningCapital = initialValue;
        
        for (const signal of signals) {
          runningCapital += (signal.execution_details?.profitLoss || 0);
          
          if (runningCapital > peak) {
            peak = runningCapital;
          }
          
          const drawdown = ((peak - runningCapital) / peak) * 100;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }
        
        performanceData[strategyId] = {
          winRate,
          profitFactor,
          totalReturns,
          maxDrawdown
        };
      }
      
      setPerformance(performanceData);
    } catch (err) {
      console.error('Error fetching performance data:', err);
    }
  };

  // Toggle strategy active status
  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('strategies')
        .update({ is_active: active })
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setStrategies(prev => 
        prev.map(strategy => 
          strategy.id === id ? { ...strategy, enabled: active } : strategy
        )
      );
      
      toast({
        title: active ? 'Strategy activated' : 'Strategy deactivated',
        description: `Strategy has been ${active ? 'activated' : 'deactivated'} successfully.`
      });
    } catch (err) {
      console.error('Error toggling strategy status:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to update strategy',
        description: 'There was an error updating the strategy status.'
      });
    }
  };

  // Delete strategy
  const handleDelete = async (id: string) => {
    try {
      // soft delete by setting is_active to false
      const { error } = await supabase
        .from('strategies')
        .update({ is_active: false })
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      // Remove from local state
      setStrategies(prev => prev.filter(strategy => strategy.id !== id));
      
      toast({
        title: 'Strategy deleted',
        description: 'Strategy has been deleted successfully.'
      });
    } catch (err) {
      console.error('Error deleting strategy:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to delete strategy',
        description: 'There was an error deleting the strategy.'
      });
    }
  };

  // Edit strategy
  const handleEdit = (id: string) => {
    const strategy = strategies.find(s => s.id === id);
    if (strategy) {
      setEditingStrategy(strategy);
      setIsFormOpen(true);
    }
  };

  // Save strategy (create or update)
  const handleSaveStrategy = async (strategy: StrategyConfig) => {
    try {
      // Convert to database format
      const dbStrategy = {
        name: strategy.name,
        type: strategy.type,
        symbols: strategy.symbols,
        exchange: strategy.exchange,
        parameters: strategy.parameters,
        timeframes: strategy.timeframes,
        indicators: strategy.indicators,
        signal_thresholds: strategy.signalThresholds,
        position: strategy.position,
        is_active: strategy.enabled
      };
      
      let result;
      
      if (strategy.id) {
        // Update existing
        const { data, error } = await supabase
          .from('strategies')
          .update(dbStrategy)
          .eq('id', strategy.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        
        // Update local state
        setStrategies(prev => 
          prev.map(s => s.id === strategy.id ? { ...strategy } : s)
        );
        
        toast({
          title: 'Strategy updated',
          description: 'Strategy has been updated successfully.'
        });
      } else {
        // Create new
        const { data, error } = await supabase
          .from('strategies')
          .insert(dbStrategy)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        
        // Add to local state with the new ID
        setStrategies(prev => [...prev, { ...strategy, id: result.id }]);
        
        toast({
          title: 'Strategy created',
          description: 'Strategy has been created successfully.'
        });
      }
      
      setIsFormOpen(false);
      setEditingStrategy(null);
    } catch (err) {
      console.error('Error saving strategy:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to save strategy',
        description: 'There was an error saving the strategy.'
      });
    }
  };

  // Filter strategies based on active tab
  const filteredStrategies = strategies.filter(strategy => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return strategy.enabled;
    if (activeTab === 'inactive') return !strategy.enabled;
    return true;
  });

  // Load strategies on mount
  useEffect(() => {
    fetchStrategies();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Trading Strategies</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStrategies} 
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => {
            setEditingStrategy(null);
            setIsFormOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            New Strategy
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>
            <Tabs 
              defaultValue="all" 
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="all">All Strategies</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredStrategies.length === 0 ? (
            <EmptyState
              icon={<ChevronUp className="h-12 w-12 text-muted-foreground" />}
              title="No strategies found"
              description={
                activeTab === 'all' 
                  ? "You haven't created any trading strategies yet." 
                  : activeTab === 'active' 
                    ? "You don't have any active strategies."
                    : "You don't have any inactive strategies."
              }
              action={
                <Button onClick={() => {
                  setEditingStrategy(null);
                  setIsFormOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create a Strategy
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onToggleActive={handleToggleActive}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  performance={performance[strategy.id]}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {isFormOpen && (
        <StrategyFormDialog
          strategy={editingStrategy}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveStrategy}
        />
      )}
    </div>
  );
}
