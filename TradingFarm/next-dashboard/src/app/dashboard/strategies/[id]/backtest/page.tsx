'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { BacktestForm } from '@/components/backtest/backtest-form';
import { BacktestResults } from '@/components/backtest/backtest-results';
import { getBacktestResults, BacktestResult } from '@/services/backtest-service';
import { createBrowserClient } from '@/utils/supabase/client';

interface Strategy {
  id: number;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings: any;
}

export default function StrategyBacktestPage() {
  const params = useParams();
  const router = useRouter();
  const strategyId = Number(params.id);
  
  const [loading, setLoading] = React.useState(true);
  const [strategy, setStrategy] = React.useState<Strategy | null>(null);
  const [backtestResults, setBacktestResults] = React.useState<BacktestResult[]>([]);
  const [selectedResult, setSelectedResult] = React.useState<BacktestResult | null>(null);
  const [activeTab, setActiveTab] = React.useState('new');
  
  // Fetch strategy and backtest results
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch strategy
        const supabase = createBrowserClient();
        const { data: strategyData, error: strategyError } = await supabase
          .from('strategies')
          .select('*')
          .eq('id', strategyId)
          .single();
        
        if (strategyError) throw strategyError;
        setStrategy(strategyData);
        
        // Fetch backtest results
        const results = await getBacktestResults(strategyId);
        setBacktestResults(results);
        
        // Select the most recent result if any
        if (results.length > 0) {
          setSelectedResult(results[0]);
        }
      } catch (error) {
        console.error('Error loading strategy and backtest data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (strategyId) {
      fetchData();
    }
  }, [strategyId]);
  
  // Handle new backtest completion
  const handleBacktestComplete = (result: BacktestResult) => {
    // Add the new result to the list
    setBacktestResults(prev => [result, ...prev]);
    
    // Select the new result
    setSelectedResult(result);
    
    // Switch to the results tab
    setActiveTab('results');
  };
  
  // Handle result selection
  const handleResultSelect = (result: BacktestResult) => {
    setSelectedResult(result);
    setActiveTab('results');
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="w-8 h-8 border-t-2 border-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading strategy and backtest data...</p>
        </div>
      </div>
    );
  }
  
  // Missing strategy
  if (!strategy) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
        <p className="text-xl font-medium">Strategy not found</p>
        <p className="text-muted-foreground">The requested strategy could not be found.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/strategies">Strategies</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/dashboard/strategies/${strategyId}`}>
              {strategy.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Backtest</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{strategy.name} - Backtesting</h1>
          <p className="text-muted-foreground">{strategy.description}</p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => router.push(`/dashboard/strategies/${strategyId}`)}
        >
          Back to Strategy
        </Button>
      </div>
      
      <Separator />
      
      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="new">New Backtest</TabsTrigger>
          <TabsTrigger value="results" disabled={!selectedResult}>
            Results {backtestResults.length > 0 ? `(${backtestResults.length})` : ''}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="new" className="mt-6">
          <BacktestForm
            strategyId={strategyId}
            strategyName={strategy.name}
            onBacktestComplete={handleBacktestComplete}
          />
        </TabsContent>
        
        <TabsContent value="results" className="mt-6 space-y-6">
          {selectedResult && (
            <BacktestResults result={selectedResult} />
          )}
          
          {backtestResults.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Previous Backtests</CardTitle>
                <CardDescription>Select a backtest to view its results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {backtestResults.map((result, index) => (
                    <Card 
                      key={result.id || index}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        selectedResult && selectedResult.id === result.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleResultSelect(result)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {result.symbol} {result.timeframe}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(result.startDate).toLocaleDateString()} - {new Date(result.endDate).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Return</p>
                            <p className={result.totalReturnPercentage >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {result.totalReturnPercentage.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Trades</p>
                            <p>{result.totalTrades}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Win Rate</p>
                            <p>{result.winRate.toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Drawdown</p>
                            <p className="text-red-500">{result.maxDrawdownPercentage.toFixed(2)}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {backtestResults.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[300px] space-y-4">
              <p className="text-xl font-medium">No backtest results</p>
              <p className="text-muted-foreground">Run a backtest to see results here.</p>
              <Button onClick={() => setActiveTab('new')}>Create New Backtest</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
